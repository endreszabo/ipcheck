package main

import (
	"fmt"
	"net"
	"time"

	"github.com/hashicorp/golang-lru/v2/expirable"
	"github.com/oschwald/geoip2-golang"
)

type geoipLookup struct {
	cache        *expirable.LRU[string, string]
	geoipCountry *geoip2.Reader
	geoipISP     *geoip2.Reader
}

func (l *geoipLookup) LookupCountry(remoteIP string, parsedIP net.IP) (string, error) {
	rv, ok := l.cache.Get("CC/" + remoteIP)
	if ok {
		return rv, nil
	}

	country, err := l.geoipCountry.Country(parsedIP)
	if err != nil {
		return "", err
	}

	rv = country.Country.IsoCode
	l.cache.Add("CC/"+remoteIP, rv)

	return rv, nil
}

func (l *geoipLookup) LookupISP(remoteIP string, parsedIP net.IP) (string, error) {
	rv, ok := l.cache.Get("ASN/" + remoteIP)
	if ok {
		return rv, nil
	}

	asn, err := l.geoipISP.ASN(parsedIP)
	if err != nil {
		return "", err
	}

	rv = fmt.Sprintf("AS%d %s", asn.AutonomousSystemNumber, asn.AutonomousSystemOrganization)
	l.cache.Add("ASN/"+remoteIP, rv)

	return rv, nil
}

func NewGeoIPLookup(baseDir string, cacheSize int, cacheTTL time.Duration) (*geoipLookup, error) {
	geoipCountry, err := geoip2.Open(baseDir + "/GeoLite2-Country.mmdb")
	if err != nil {
		return nil, err
	}

	geoipISP, err := geoip2.Open(baseDir + "/GeoLite2-ASN.mmdb")
	if err != nil {
		return nil, err
	}

	return &geoipLookup{
		cache:        expirable.NewLRU[string, string](cacheSize, nil, cacheTTL),
		geoipCountry: geoipCountry,
		geoipISP:     geoipISP,
	}, nil
}

func (l *geoipLookup) Close() {
	l.cache.Purge()
}
