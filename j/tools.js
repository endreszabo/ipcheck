// --- local functions ---

let expandInp = document.getElementById('address_to_expand');
expandInp.oninput = expandChanged;

let compressInp = document.getElementById('address_to_compress');
compressInp.oninput = compressChanged;

let macToEui64Inp = document.getElementById('mac_to_eui64_in');
macToEui64Inp.oninput = macToEui64Changed;

let eui64ToMacInp = document.getElementById('eui64_to_mac_in');
eui64ToMacInp.oninput = eui64ToMacChanged;

let ptrInp = document.getElementById('ptr_to_generate');
ptrInp.oninput = ptrChanged;

let randomInput = document.getElementById('random_subnet_src');
randomInput.oninput = randomChanged;

randomInput.addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    randomChanged();
  }
});

let subnetInput = document.getElementById('subnet_in');
subnetInput.oninput = subnetChanged;

$(document).ready(function() {
	randomChanged();
   ptrChanged();
   subnetChanged();
   $("span.glyphicon-question-sign").each(function(k, el) {
   $(el).attr("data-title", $(el).closest("tr").find("th").text()).popover({
      placement: "auto right",
      container: "body",
   });
   });
});

function expandChanged(e){
	try {
		$("#expanded_address").text(normalize($("#address_to_expand").val()));
		$("#address_to_expand").parent().removeClass("has-warning");
	}
	catch {
		$("#address_to_expand").parent().addClass("has-warning");
	}
}

function compressChanged(e){
	try {
		$("#compressed_address").text(abbreviate($("#address_to_compress").val()));
		$("#address_to_compress").parent().removeClass("has-warning");
	}
	catch {
		$("#address_to_compress").parent().addClass("has-warning");
	}
}

function macToEui64Changed(e){
   try {
      $("#mac_to_eui64_out").text(encode_eui64($("#mac_to_eui64_in").val()));
      $("#mac_to_eui64_in").parent().removeClass("has-warning");
   }
   catch {
      $("#mac_to_eui64_in").parent().addClass("has-warning");
   }
}

function eui64ToMacChanged(e){
   try {
      $("#eui64_to_mac_out").text(decode_eui64($("#eui64_to_mac_in").val()));
      $("#eui64_to_mac_in").parent().removeClass("has-warning");
   }
   catch {
      $("#eui64_to_mac_in").parent().addClass("has-warning");
   }
}

function ptrChanged(e){
	try {
		$("#generated_ptr").html(ptr($("#ptr_to_generate").val()));
		$("#ptr_to_generate").parent().removeClass("has-warning");
	}
	catch {
		$("#ptr_to_generate").parent().addClass("has-warning");
	}
}

function randomChanged(e){
	try {
		split = $("#random_subnet_src").val().split("/");
		$("#random_subnet").text(randomSubnet(split[0], split[1], split[2], 1, true));
		$("#random_subnet_src").parent().removeClass("has-warning");
	}
	catch {
		$("#random_subnet_src").parent().addClass("has-warning");
	}
}

function subnetChanged(e){
	try {
		split = $("#subnet_in").val().split("/");
		var out = "";

		var r = range(split[0], split[1], 128);

		out += "Network Range: \n"
		out += formatAddress(r.start, split[1]) + "\n";
		out += formatAddress(r.end, split[1]) + "\n\n";
		if (split[1] >= 64){
			out += r.size + " addresses\n";
		}
		else if (split[1] >= 48){
			out += (r.size / 18446744073709552000) + " /64 subnets\n"
		}
		else {
			out += (r.size / 18446744073709552000 / 65536) + " /48 subnets\n"
		}

		$("#subnet_out").html(out);
		$("#subnet_in").parent().removeClass("has-warning");
	}
	catch {
		$("#subnet_in").parent().addClass("has-warning");
	}
}

// --- local helper functions ---

function formatAddress(fulladdr, mask){
	fulladdr = normalize(fulladdr).replaceAll(":","");
	last = 32-Math.floor((128-mask)/4);

	net = fulladdr.substr(0,last);
	addr = fulladdr.substr(last)
	both = "";

	tmpnet = "";
	tmpaddr = "";

	for (i = 0; i < last; i++){
		tmpnet+=net[i];
		
		if (i%4==3) {
			tmpnet+=":";
		}
	}

	for (i = last; i < last+(32-last); i++){
		tmpaddr+=addr[i-last];
		
		if (i%4==3 && i != (last+(32-last)-1)) {
			tmpaddr+=":";
		}
	}

	net = tmpnet;
	addr = tmpaddr;

	if (net.endsWith(":")){
		net = net.substring(0, net.length-1);
		if (mask <=124) {
			addr = ":" + addr;
		}
	}

	if (mask%4 == 0){
		return '<span class="split-addr-net">' + net + '</span><span class="split-addr-addr">' + addr + '</span>'
	}
	else {
		both = net[net.length - 1];
		net = net.substring(0, net.length-1);
		return '<span class="split-addr-net">' + net + '</span><span class="split-addr-both">' + both + '</span><span class="split-addr-addr">' + addr + '</span>'
	}
}

// --- library functions ---
// adapted under MIT from https://github.com/elgs/ip6, Copyright (c) 2016 Qian Chen

const normalize = function (a) {
   validate(a);

   a = a.toLowerCase()

   const nh = a.split(/\:\:/g);
   if (nh.length > 2) {
      throw new Error('Invalid address: ' + a);
   }

   let sections = [];
   if (nh.length === 1) {
      // full mode
      sections = a.split(/\:/g);
      if (sections.length !== 8) {
         throw new Error('Invalid address: ' + a);
      }
   } else if (nh.length === 2) {
      // compact mode
      const n = nh[0];
      const h = nh[1];
      const ns = n.split(/\:/g);
      const hs = h.split(/\:/g);
      for (let i in ns) {
         sections[i] = ns[i];
      }
      for (let i = hs.length; i > 0; --i) {
         sections[7 - (hs.length - i)] = hs[i - 1];
      }
   }
   for (let i = 0; i < 8; ++i) {
      if (sections[i] === undefined) {
         sections[i] = '0000';
      }
      sections[i] = _leftPad(sections[i], '0', 4);
   }
   return sections.join(':');
};

const abbreviate = function (a) {
   validate(a);
   a = normalize(a);
   a = a.replace(/0000/g, 'g');
   a = a.replace(/\:000/g, ':');
   a = a.replace(/\:00/g, ':');
   a = a.replace(/\:0/g, ':');
   a = a.replace(/g/g, '0');
   const sections = a.split(/\:/g);
   let zPreviousFlag = false;
   let zeroStartIndex = -1;
   let zeroLength = 0;
   let zStartIndex = -1;
   let zLength = 0;
   for (let i = 0; i < 8; ++i) {
      const section = sections[i];
      let zFlag = (section === '0');
      if (zFlag && !zPreviousFlag) {
         zStartIndex = i;
      }
      if (!zFlag && zPreviousFlag) {
         zLength = i - zStartIndex;
      }
      if (zLength > 1 && zLength > zeroLength) {
         zeroStartIndex = zStartIndex;
         zeroLength = zLength;
      }
      zPreviousFlag = (section === '0');
   }
   if (zPreviousFlag) {
      zLength = 8 - zStartIndex;
   }
   if (zLength > 1 && zLength > zeroLength) {
      zeroStartIndex = zStartIndex;
      zeroLength = zLength;
   }
   //console.log(zeroStartIndex, zeroLength);
   //console.log(sections);
   if (zeroStartIndex >= 0 && zeroLength > 1) {
      sections.splice(zeroStartIndex, zeroLength, 'g');
   }
   //console.log(sections);
   a = sections.join(':');
   //console.log(a);
   a = a.replace(/\:g\:/g, '::');
   a = a.replace(/\:g/g, '::');
   a = a.replace(/g\:/g, '::');
   a = a.replace(/g/g, '::');
   //console.log(a);
   return a;
};

// Basic validation
const validate = function (a) {
   const ns = [];
   const nh = a.split('::');
   if (nh.length > 2) {
      throw new Error('Invalid address: ' + a);
   } else if (nh.length === 2) {
      if (nh[0].startsWith(':') || nh[0].endsWith(':') || nh[1].startsWith(':') || nh[1].endsWith(':')) {
         throw new Error('Invalid address: ' + a);
      }

      ns.push(... (nh[0].split(':').filter(a => a)));
      ns.push(... (nh[1].split(':').filter(a => a)));
      if (ns.length > 7) {
         throw new Error('Invalid address: ' + a);
      }
   } else if (nh.length === 1) {
      ns.push(... (nh[0].split(':').filter(a => a)));
      if (ns.length !== 8) {
         throw new Error('Invalid address: ' + a);
      }
   }

   for (const n of ns) {
      const match = n.match(/^[a-f0-9]{1,4}$/i);
      if (!match || match[0] !== n) {
         throw new Error('Invalid address: ' + a);
      }
   }
};

const _leftPad = function (d, p, n) {
   const padding = p.repeat(n);
   if (d.length < padding.length) {
      d = padding.substring(0, padding.length - d.length) + d;
   }
   return d;
};

const _hex2bin = function (hex) {
   return parseInt(hex, 16).toString(2)
};
const _bin2hex = function (bin) {
   return parseInt(bin, 2).toString(16)
};

const _addr2bin = function (addr) {
   const nAddr = normalize(addr);
   const sections = nAddr.split(":");
   let binAddr = '';
   for (const section of sections) {
      binAddr += _leftPad(_hex2bin(section), '0', 16);
   }
   return binAddr;
};

const _bin2addr = function (bin) {
   const addr = [];
   for (let i = 0; i < 8; ++i) {
      const binPart = bin.substr(i * 16, 16);
      const hexSection = _leftPad(_bin2hex(binPart), '0', 4);
      addr.push(hexSection);
   }
   return addr.join(':');
};

const divideSubnet = function (addr, mask0, mask1, limit, abbr) {
   validate(addr);
   mask0 *= 1;
   mask1 *= 1;
   limit *= 1;
   mask1 = mask1 || 128;
   if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
      throw new Error('Invalid masks.');
   }
   const ret = [];
   const binAddr = _addr2bin(addr);
   const binNetPart = binAddr.substr(0, mask0);
   const binHostPart = '0'.repeat(128 - mask1);
   const numSubnets = Math.pow(2, mask1 - mask0);
   for (let i = 0; i < numSubnets; ++i) {
      if (!!limit && i >= limit) {
         break;
      }
      const binSubnet = _leftPad(i.toString(2), '0', mask1 - mask0);
      const binSubAddr = binNetPart + binSubnet + binHostPart;
      const hexAddr = _bin2addr(binSubAddr);
      if (!!abbr) {
         ret.push(abbreviate(hexAddr));
      } else {
         ret.push(hexAddr);
      }

   }
   // console.log(numSubnets);
   // console.log(binNetPart, binSubnetPart, binHostPart);
   // console.log(binNetPart.length, binSubnetPart.length, binHostPart.length);
   // console.log(ret.length);
   return ret;
};

const range = function (addr, mask0, mask1, abbr) {
   validate(addr);
   mask0 *= 1;
   mask1 *= 1;
   mask1 = mask1 || 128;
   if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
      throw new Error('Invalid masks.');
   }
   const binAddr = _addr2bin(addr);
   const binNetPart = binAddr.substr(0, mask0);
   const binHostPart = '0'.repeat(128 - mask1);
   const binStartAddr = binNetPart + '0'.repeat(mask1 - mask0) + binHostPart;
   const binEndAddr = binNetPart + '1'.repeat(mask1 - mask0) + binHostPart;
   if (!!abbr) {
      return {
         start: abbreviate(_bin2addr(binStartAddr)),
         end: abbreviate(_bin2addr(binEndAddr)),
         size: Math.pow(2, mask1 - mask0)
      };
   } else {
      return {
         start: _bin2addr(binStartAddr),
         end: _bin2addr(binEndAddr),
         size: Math.pow(2, mask1 - mask0)
      };
   }
};

const rangeBigInt = function (addr, mask0, mask1, abbr) {
   if (typeof BigInt === 'undefined') {
      return range(addr, mask0, mask1, abbr);
   }

   validate(addr);
   mask0 *= 1;
   mask1 *= 1;
   mask1 = mask1 || 128;
   if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
      throw new Error('Invalid masks.');
   }
   const binAddr = _addr2bin(addr);
   const binNetPart = binAddr.substr(0, mask0);
   const binHostPart = '0'.repeat(128 - mask1);
   const binStartAddr = binNetPart + '0'.repeat(mask1 - mask0) + binHostPart;
   const binEndAddr = binNetPart + '1'.repeat(mask1 - mask0) + binHostPart;
   if (!!abbr) {
      return {
         start: abbreviate(_bin2addr(binStartAddr)),
         end: abbreviate(_bin2addr(binEndAddr)),
         size: BigInt(2 ** (mask1 - mask0)).toString()
      };
   } else {
      return {
         start: _bin2addr(binStartAddr),
         end: _bin2addr(binEndAddr),
         size: BigInt(2 ** (mask1 - mask0)).toString()
      };
   }
};

const randomSubnet = function (addr, mask0, mask1, limit, abbr) {
   validate(addr);
   mask0 *= 1;
   mask1 *= 1;
   limit *= 1;
   mask1 = mask1 || 128;
   limit = limit || 1;
   if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
      throw new Error('Invalid masks.');
   }
   const ret = [];
   const binAddr = _addr2bin(addr);
   const binNetPart = binAddr.substr(0, mask0);
   const binHostPart = '0'.repeat(128 - mask1);
   const numSubnets = Math.pow(2, mask1 - mask0);
   for (let i = 0; i < numSubnets && i < limit; ++i) {
      // generate an binary string with length of mask1 - mask0
      let binSubnet = '';
      for (let j = 0; j < mask1 - mask0; ++j) {
         binSubnet += Math.floor(Math.random() * 2);
      }
      const binSubAddr = binNetPart + binSubnet + binHostPart;
      const hexAddr = _bin2addr(binSubAddr);
      if (!!abbr) {
         ret.push(abbreviate(hexAddr));
      } else {
         ret.push(hexAddr);
      }
   }
   // console.log(numSubnets);
   // console.log(binNetPart, binSubnetPart, binHostPart);
   // console.log(binNetPart.length, binSubnetPart.length, binHostPart.length);
   // console.log(ret.length);
   return ret + "/" + mask1;
};

const ptr = function (addr) {
   validate(addr);
   const fullAddr = normalize(addr);
   const reverse = fullAddr.replace(/:/g, '').split('').reverse();
   const sliced = reverse.slice(0, 128 / 4).join('.');
   return sliced.replace(/(([0-9a-f]\.?){16})\.(.*)/, '<span class="split-ptr-addr">$1</span>.<span class="split-ptr-net">$3</span>') + ".ip6.arpa";
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
   exports.validate = validate;
   exports.normalize = normalize;
   exports.abbreviate = abbreviate;
   exports.divideSubnet = divideSubnet;
   exports.range = range;
   exports.rangeBigInt = rangeBigInt;
   exports.randomSubnet = randomSubnet;
   exports.ptr = ptr;
} else {
   window.ip6_validate = validate;
   window.ip6_normalize = normalize;
   window.ip6_abbreviate = abbreviate;
   window.ip6_divideSubnet = divideSubnet;
   window.ip6_range = range;
   window.ip6_rangeBigInt = rangeBigInt;
   window.ip6_randomSubnet = randomSubnet;
   window.ip6_ptr = ptr;
}

// Credits to iiidefix.net
function decode_eui64(a) { // see rfc7042 Section 2.2
  a = normalize(a).substring(20).replace(/:/g, '');
  if (a.substring(6, 10) == 'fffe') {
    a = a.split('');
    a.splice(6, 4);
    a[1] = (parseInt(a[1], 16) ^ 2).toString(16);
    return a.join('').replace(/(..)/g, ':$1').substring(1);
  }
  else if (a.match(/^0[0123]005efe/)) {
    return a.substring(8,16).replace(/(..)/g, x => parseInt(x, 16)+'.').replace(/\.$/, '');
  }
  else throw new Error('Invalid address: ' + a);
}

function encode_eui64(a) {
  if (a.match(/^([0-9a-f]{2}[:.-]?){6}$/i)) {
    a = a.replace(/[:.-]/g, '').split("");
    a.splice(6, 0, 'fffe');
    a[1] = (parseInt(a[1], 16) ^ 2).toString(16);
    return abbreviate('fe80:' + a.join('').replace(/(....)/g, ':$1'));
  }
  else if (a.match(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/)) {
    a = a.split('.').map(x => _leftPad(parseInt(x).toString(16), '0', 2));
    return abbreviate('fe80::0200:5efe'+a.join('').replace(/(....)/g, ':$1'));
  }
  else throw new Error('Invalid address: ' + a);
}
