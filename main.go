package main

import (
	"embed"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"golang.org/x/net/publicsuffix"

	"github.com/caarlos0/env/v11"
	"github.com/gin-gonic/gin"
	"github.com/pires/go-proxyproto"
)

//go:embed s/* t/* j/* f/* i/*
var f embed.FS
var tld string

type config struct {
	ListenAddr     string `env:"LISTEN_ADDR" envDefault:"[::]:27654"`
	Resolver       string `env:"DNS_RESOLVER" envDefault:"[2606:4700:4700::1111]:53"`
	HostedByString string `env:"HOSTED_BY"`
	GeoIPBaseDir   string `env:"GEOIP_DIR" envDefault:"geoip/"`
	BaseURL        string `env:"BASE_URL" envDefault:"*"`
	Label          string `env:"TITLE_LABEL"`
}

func family_of_address(ipaddress string) int {
	ipfamily := 4
	if strings.Contains(ipaddress, ":") {
		ipfamily = 6
	}
	return ipfamily
}

// returns: label, tld
func get_label(cfg *config, c *gin.Context) (string, string) {
	var tld string

	host := strings.SplitN(c.Request.Host, ":", 1)[0]
	etld, err := publicsuffix.EffectiveTLDPlusOne(host)
	fmt.Println(host, etld, err)

	if err == nil && etld != "" {
		tld = etld
	} else {
		fmt.Printf("error during converting TLD:\nhost: %q\ntld: %q\nerr: %q\n", host, etld, err)
	}

	if cfg.Label == "" {
		return tld, tld
	} else {
		return cfg.Label, tld
	}
}

func main() {
	var cfg config
	err := env.ParseWithOptions(&cfg, env.Options{
		PrefixTagName: "IPCHECK_",
	})
	if err != nil {
		log.Fatalf("couldn't parse environment variables: %q\n", err.Error())
	}

	addr := "[::]:27654"
	list, err := net.Listen("tcp", cfg.ListenAddr)
	if err != nil {
		log.Fatalf("couldn't listen to %q: %q\n", addr, err.Error())
	}

	// Wrap listener in a proxyproto listener
	proxyListener := &proxyproto.Listener{
		Listener:          list,
		ReadHeaderTimeout: 2 * time.Second,
	}
	defer proxyListener.Close()

	resolver := NewHostnameLookup(1000, 24*time.Hour, cfg.Resolver)
	geoip, err := NewGeoIPLookup(cfg.GeoIPBaseDir, 1000, 10*time.Hour)
	if err != nil {
		panic(err)
	}

	router := gin.Default()
	router.SetTrustedProxies([]string{})

	templ := template.Must(template.New("").ParseFS(f, "t/*.tmpl"))
	router.SetHTMLTemplate(templ)

	router.StaticFS("/p", http.FS(f))
	router.GET("/favicon.ico", func(c *gin.Context) {
		c.Request.URL.Path = "/p/i/favicon.ico"
		router.HandleContext(c)
		//		c.Redirect(http.StatusMovedPermanently, "p/i/favicon.ico")
	})
	router.GET("/", func(c *gin.Context) {
		remoteIP := c.RemoteIP()
		ipfamily := family_of_address(remoteIP)
		if c.Request.Header.Get("Accept") == "json" {
			c.JSON(http.StatusOK, gin.H{
				"family": ipfamily,
				"ip":     c.RemoteIP(),
			})
			return
		}
		if strings.Contains(c.Request.Header.Get("User-Agent"), "curl") {
			c.String(http.StatusOK, "%s", c.RemoteIP())
			return
		}

		label, tld := get_label(&cfg, c)

		c.HTML(http.StatusOK, "index.tmpl", gin.H{
			"label":  label,
			"tld":    tld,
			"family": ipfamily,
			"ip":     c.RemoteIP(),
		})
	})

	router.GET("/request", func(c *gin.Context) {

		requestDump, err := httputil.DumpRequest(c.Request, false)
		if err != nil {
			fmt.Println(err)
		}
		if strings.Contains(c.Request.Header.Get("User-Agent"), "curl") {
			c.String(http.StatusOK, "%s", string(requestDump))
			return
		}

		label, tld := get_label(&cfg, c)

		c.HTML(http.StatusOK, "request.tmpl", gin.H{
			"label":   label,
			"tld":     tld,
			"request": string(requestDump),
		})
	})

	router.GET("/tools", func(c *gin.Context) {
		label, tld := get_label(&cfg, c)

		remoteIP := c.RemoteIP()
		ipfamily := family_of_address(remoteIP)

		if ipfamily == 4 {
			remoteIP = "2001:db8::"
		}
		c.HTML(http.StatusOK, "tools.tmpl", gin.H{
			"remoteIP": remoteIP,
			"label":    label,
			"tld":      tld,
		})
	})

	router.GET("/request.json", func(c *gin.Context) {
		requestDump, err := httputil.DumpRequest(c.Request, false)
		if err != nil {
			fmt.Println(err)
		}

		c.JSON(http.StatusOK, gin.H{
			"request": strings.Split(string(requestDump), "\r\n"),
		})
	})

	router.GET("/request.txt", func(c *gin.Context) {
		requestDump, err := httputil.DumpRequest(c.Request, false)
		if err != nil {
			fmt.Println(err)
		}
		c.String(http.StatusOK, "%s", string(requestDump))
	})

	router.GET("/myhostname.json", func(c *gin.Context) {
		c.Writer.Header().Add("access-control-allow-origin", "*")
		ip, err := resolver.LookupPTR(c, c.RemoteIP())
		c.JSON(http.StatusOK, gin.H{
			"hostname": ip,
			"err":      err,
		})
	})

	router.GET("/geoip.json", func(c *gin.Context) {
		remoteIP := c.RemoteIP()
		parsedIP := net.ParseIP(remoteIP)
		if parsedIP == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"err": "could not parse remote IP address"})
			return
		}
		country, err := geoip.LookupCountry(remoteIP, parsedIP)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"err": err})
			return
		}
		asn, err := geoip.LookupISP(remoteIP, parsedIP)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"err": err})
			return
		}
		c.Writer.Header().Add("access-control-allow-origin", "*")

		c.JSON(http.StatusOK, gin.H{
			"country": country,
			"asn":     asn,
		})
	})

	router.GET("/ping.json", func(c *gin.Context) {
		remoteIP := c.RemoteIP()
		if family_of_address(remoteIP) != 6 {
			c.JSON(http.StatusBadRequest, gin.H{"err": "remote IP address is not an IPv6 address"})
		}

		stats, err := PingHost(c, remoteIP)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"err": err})
			return
		}
		c.Writer.Header().Add("access-control-allow-origin", "*")

		c.JSON(http.StatusOK, gin.H{
			"stats": stats,
			"err":   nil,
		})
	})

	router.GET("/myip.json", func(c *gin.Context) {
		remoteIP := c.RemoteIP()
		c.Writer.Header().Add("access-control-allow-origin", "*")
		family := family_of_address(remoteIP)
		c.JSON(http.StatusOK, gin.H{
			"family":  family,
			"address": remoteIP,
		})
	})

	router.RunListener(proxyListener)
}
