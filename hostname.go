package main

import (
	"context"
	"net"
	"time"

	"github.com/hashicorp/golang-lru/v2/expirable"
)

type hostnameLookup struct {
	cache    *expirable.LRU[string, string]
	resolver *net.Resolver
}

func (l *hostnameLookup) LookupPTR(ctx context.Context, remoteIP string) (string, error) {
	rv, ok := l.cache.Get(remoteIP)
	if ok {
		return rv, nil
	}

	rsp, err := l.resolver.LookupAddr(ctx, remoteIP)
	if err != nil {
		return "", err
	}
	rv = rsp[0]
	l.cache.Add(remoteIP, rv)

	return rv, nil
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
