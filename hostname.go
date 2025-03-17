package main

import (
	"context"
	"net"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hashicorp/golang-lru/v2/expirable"
)

type hostnameLookup struct {
	cache    *expirable.LRU[string, string]
	resolver *net.Resolver
}

func (l *hostnameLookup) LookupPTR(c *gin.Context) {
	remoteIP := c.RemoteIP()
	rv, ok := l.cache.Get(remoteIP)
	if ok {
		c.JSON(http.StatusOK, gin.H{
			"status":       "success",
			"msg":          rv,
			"hint":         "",
			"x-from-cache": true,
		})
		return
	}

	rsp, err := l.resolver.LookupAddr(c, remoteIP)
	if perr, ok := err.(*net.DNSError); ok {
		if perr.IsNotFound {
			c.JSON(http.StatusOK, gin.H{
				"status": "warning",
				"msg":    "Host not found",
				"hint":   "Record was not found in zone: " + perr.Err,
			})
			return
		}
		if perr.IsTimeout {
			c.JSON(http.StatusOK, gin.H{
				"status": "warning",
				"msg":    "Timed out",
				"hint":   "DNS lookup timed out: " + perr.Err,
			})
			return
		}
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":       "warning",
			"msg":          "Lookup failed",
			"hint":         err, //fixme
			"x-from-cache": false,
		})
		return
	}
	rv = rsp[0]
	l.cache.Add(remoteIP, rv)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"msg":    rv,
		"hint":   "",
	})
}

func NewHostnameLookup(cacheSize int, cacheTTL time.Duration, resolverIP string) *hostnameLookup {
	return &hostnameLookup{
		cache: expirable.NewLRU[string, string](cacheSize, nil, cacheTTL),
		resolver: &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
				d := net.Dialer{
					Timeout: time.Millisecond * time.Duration(2000),
				}
				return d.DialContext(ctx, "udp", resolverIP)
			},
		},
	}
}
