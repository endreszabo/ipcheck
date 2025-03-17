package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	probing "github.com/prometheus-community/pro-bing"
)

func PingHost(c *gin.Context) {
	remoteIP := c.RemoteIP()
	if family_of_address(remoteIP) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{"err": "remote IP address is not an IPv6 address"})
	}
	pinger := probing.New(remoteIP)
	pinger.Count = 3
	pinger.Interval = 300 * time.Millisecond
	pinger.ResolveTimeout = time.Duration(0) // this disables DNS resolution
	pinger.Timeout = 500 * time.Millisecond
	err := pinger.RunWithContext(c) // Blocks until finished.
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "danger",
			"msg":    "Failed",
			"hint":   err.Error(),
		})
		return
	}
	stats := pinger.Statistics() // get send/receive/duplicate/rtt stats
	fmt.Println(stats)
	if stats.PacketsRecv > 0 {
		fmt.Printf("min: %s, avg: %s, max: %s\n", stats.MinRtt, stats.AvgRtt, stats.MaxRtt)
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"msg":    fmt.Sprintf("Reachable (%dms)", stats.AvgRtt.Milliseconds()),
			"hint":   "",
		})
		return
	} else {
		c.JSON(http.StatusOK, gin.H{
			"status": "warning",
			"msg":    "Filtered",
			"hint":   "", //fixme
		})
	}
}
