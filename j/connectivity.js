function makeProgressBar(element, id) {
    element.innerHTML = `<div class="progress progress-striped active"><div class="progress-bar" id="progressbar_${element.id}" role="progressbar" style="width:100%"></div></div>`;
    return document.getElementById(`progressbar_${element.id}`)
}

function encodeAttr(text) {
    const elem = document.createElement('p');
    elem.setAttribute('title', text);
    const elemHtml = elem.outerHTML; // <p title="encodedText"> or maybe <p title='encodedText'>
    // Find out whether the browser used single or double quotes before encodedText
    const quote = elemHtml[elemHtml.search(/['"]/)];
    // Split up the generated HTML using the quote character; take item 1
    elem.remove()
    return elemHtml.split(new RegExp(quote))[1];
}


function spanCustomClass(className, text) {
    return `<span class="label label-${className}" style="font-size: 1em">${text}</abbr></span>`;
}

function spanError(text, title) {
    return `<span class="label label-danger" style="font-size: 1em"><abbr title="${encodeAttr(title)}">${text}</abbr></span>`;
}

function test_browser(timeout) {
    const field_fallback = document.getElementById("browser_fallback");
    const field_default = document.getElementById("browser_default");

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    const progressbar_fallback = makeProgressBar(field_fallback, "fallback");
    progressbar_fallback.style.setProperty("animation-duration", `${timeout}ms`);
    progressbar_fallback.style.setProperty("width", "100%");

    const timeoutTimer = setTimeout(() => {
        abortController.abort("request timed out");
    }, timeout);

    fetch(`//${window.base_fqdn}/myip.json`, {
        signal: abortSignal
    }).then((resp1) => {
        const fb_start = (new Date()).getTime();
        resp1.json().then((json1) => {
            field_default.innerHTML = spanCustomClass("success", `IPv${json1.family}`)
            window.iptest["default_family"] = json1.family
            const otherFamily = json1.family == 6 ? 4 : 6;
            window.iptest["fallback_family"] = otherFamily
            fetch(`//v${otherFamily}.${window.base_fqdn}/myip.json`, {
                signal: abortSignal
            }).then((resp2) => {
                clearTimeout(timeoutTimer);
                const fb_time = Math.round(((new Date()).getTime() - fb_start));
                const label = fb_time + " ms";
                var lclass = "success";
                if (fb_time > 1000) {
                    lclass = "warning";
                }
                resp2.json().then((json2) => {
                    if (json1.family == json2.family) {
                        field_fallback.innerHTML = spanCustomClass("danger", `Browser error, see <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1709564">this bug</a>`);
                    } else {
                        field_fallback.innerHTML = spanCustomClass(lclass, `To IPv${json2.family} in ${label}`);
                    }
                    fieldOtherFamilyAddress = document.getElementById(`ipv${otherFamily}_address`);
                    fieldOtherFamilyAddress.innerHTML = `<span class="address">${json2.address}</span>`;
                    fieldOtherFamilySupported = document.getElementById(`ipv${otherFamily}_supported`);
                    fieldOtherFamilySupported.innerHTML = spanCustomClass("success", "Supported");
                    return json2
                }).catch((err) => {
                    field_fallback.innerHTML = spanError("Error occoured", err);
                })
                return resp2
            }).catch((err) => {
                clearTimeout(timeoutTimer);
                field_fallback.innerHTML = spanError("Error occoured", err);
            })
            return json1
        }).catch((err) => {
            field_default.innerHTML = spanError("Error occoured", err);
        })
        return resp1
    }).catch((err) => {
        field_default.innerHTML = spanError("Error occoured", err);
    })

}

function hostnameLookup(family, timeout) {
    const field_hostname = document.getElementById(`ipv${family}_hostname`);
    const progressbar = makeProgressBar(field_hostname)

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    const timeoutTimer = setTimeout(() => {
        abortController.abort("request timed out");
    }, timeout);

    fetch(`//v${family}.${window.base_fqdn}/myhostname.json`, {
        signal: abortSignal
    }).then((resp) => {
        clearTimeout(timeoutTimer)
        resp.json().then((json) => {
            if (json.hostname == "") {
                field_hostname.innerHTML = spanError("Lookup failed", JSON.stringify(json.err));
            } else {
                field_hostname.innerHTML = json.hostname;
            }
            return json
        }).catch((err) => {
            field_hostname.innerHTML = spanError("Lookup failed", err)
        })
        return resp
    }).catch((err) => {
        clearTimeout(timeoutTimer)
        field_hostname.innerHTML = spanError("Lookup failed", err)
    })
}

function ispLookup(family, timeout) {
    const field_isp = document.getElementById(`ipv${family}_isp`);
    const progressbar = makeProgressBar(field_isp)

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    const timeoutTimer = setTimeout(() => {
        abortController.abort("request timed out");
    }, timeout);

    fetch(`//v${family}.${window.base_fqdn}/geoip.json`, {
        signal: abortSignal
    }).then((resp) => {
        clearTimeout(timeoutTimer)
        resp.json().then((json) => {
            if (json.asn == "") {
                field_isp.innerHTML = spanError("GeoIP lookup failed", JSON.stringify(json.err));
            } else {
                field_isp.innerHTML = `<img class="img-flag" src="p/i/f/${json.country}.png" title="${json.country}" />${json.asn}`;
            }
            return json
        }).catch((err) => {
            field_isp.innerHTML = spanError("Lookup failed", err)
        })
        return resp
    }).catch((err) => {
        clearTimeout(timeoutTimer)
        field_isp.innerHTML = spanError("Lookup failed", err)
    })
}

function dnsTest(zoneFamily, ipFamily, timeout) {
    const field_dns = document.getElementById(`dns_dns${zoneFamily}_ip${ipFamily}`);
    const progressbar = makeProgressBar(field_dns)

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    const timeoutTimer = setTimeout(() => {
        abortController.abort("request timed out");
    }, timeout);

    fetch(`//v${ipFamily}.z${zoneFamily}.${window.base_fqdn}/myip.json`, {
        signal: abortSignal
    }).then((resp) => {
        clearTimeout(timeoutTimer)
        resp.json().then((json) => {
            if (json.family == ipFamily) {
                field_dns.innerHTML = spanCustomClass("success", "Reachable");
            } else {
                field_dns.innerHTML = spanError("Test failed", "Family mismatch");
            }
            return json
        }).catch((err) => {
            field_dns.innerHTML = spanError("Lookup failed", err)
        })
        return resp
    }).catch((err) => {
        clearTimeout(timeoutTimer)
        field_dns.innerHTML = spanError("Lookup failed", err)
    })
}

function pingTest(timeout) {
    const field_dns = document.getElementById(`ipv6_icmp`);
    const progressbar = makeProgressBar(field_dns)

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    const timeoutTimer = setTimeout(() => {
        abortController.abort("request timed out");
    }, timeout);

    fetch(`//v6.${window.base_fqdn}/ping.json`, {
        signal: abortSignal
    }).then((resp) => {
        clearTimeout(timeoutTimer)
        resp.json().then((json) => {
            if (json.err == null) {
                field_dns.innerHTML = spanCustomClass("success", json.stats);
            } else {
                field_dns.innerHTML = spanError("Test failed", json.err);
            }
            return json
        }).catch((err) => {
            field_dns.innerHTML = spanError("Lookup failed", err)
        })
        return resp
    }).catch((err) => {
        clearTimeout(timeoutTimer)
        field_dns.innerHTML = spanError("Lookup failed", err)
    })
}


(() => {
    window.iptest = {}
    window.base_fqdn = URL.parse(document.URL).host;
    test_browser(15000);
    (()=>{hostnameLookup(6, 31000)})();
    (()=>{pingTest(31000)})();
    (()=>{hostnameLookup(4, 31000)})();
    (()=>{ispLookup(4, 31000)})();
    (()=>{ispLookup(6, 31000)})();
    (()=>{dnsTest(4,4,31000)})();
    (()=>{dnsTest(4,6,31000)})();
    (()=>{dnsTest(6,4,31000)})();
    (()=>{dnsTest(6,6,31000)})();
})()