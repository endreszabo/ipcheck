package main

import (
	"context"
	"fmt"
	"time"

	probing "github.com/prometheus-community/pro-bing"
)

func PingHost(ctx context.Context, remoteIP string) (string, error) {
	pinger := probing.New(remoteIP)
	pinger.Count = 3
	pinger.Interval = 300 * time.Millisecond
	pinger.ResolveTimeout = time.Duration(0)
	err := pinger.RunWithContext(ctx) // Blocks until finished.
	if err != nil {
		return "", err
	}
	stats := pinger.Statistics() // get send/receive/duplicate/rtt stats
	//return fmt.Sprintf("min: %s, avg: %s, max: %s", stats.MinRtt, stats.AvgRtt, stats.MaxRtt), nil
	return fmt.Sprintf("Reachable (%s)", stats.AvgRtt), nil
}
