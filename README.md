# ipcheck

IPv6 connectivity test and networking toolbox

This is a golang rewrite of the excellent ip6.biz project made by Ms. Laura Hausmann. This source produces a single binary that does almost everything except for TLS termination and serving DNS. Original parts are cloned from: https://git.ztn.sh/zotan/ip6.biz.git

## Installation

- clone
- get the fonts
- get the flags
- get geoip databases
- compile
- register a domain
- configure reverse proxy
- configure DNS zones
- set up the following subdomain-dns records and zones
	+ `v4` - A to server IPv4 only
	+ `v6` - AAAA to server IPv6 only
	+ `z4` - zone with IPv4 nameservers and glues only
		* `v4` and `v6` like above
	+ `z6` - zone with IPv4 nameservers and glues only
		* `v4` and `v6` like above
- get TLS certificates
- configure your PROXY Protocol compatible reverse proxy to route traffic to this binary
