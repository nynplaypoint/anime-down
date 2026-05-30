function unpackPacd(p, a, c, k) {
  const e = (n) => (n < a ? '' : e(parseInt(n / a))) + ((n = n % a) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
  const keys = k.split('|');
  let cc = c;
  while (cc--) {
    if (keys[cc]) p = p.replace(new RegExp('\\b' + e(cc) + '\\b', 'g'), keys[cc]);
  }
  return p;
}

function tryDecode(Bc, gY, dX_str, gj, xA) {
  const dX = dX_str.split("");
  let DC = "";
  let i = 0;
  try {
    while (i < Bc.length) {
      let s = "";
      while (i < Bc.length && Bc[i] !== dX[xA]) { s += Bc[i]; i++; }
      for (let j = 0; j < dX.length; j++) s = s.split(dX[j]).join(String(j));
      DC += String.fromCharCode(parseInt(s, xA) - gj);
      i++;
    }
  } catch(e) { return ""; }
  try { return decodeURIComponent(escape(DC)); } catch(e) { return DC; }
}

async function fetchHtml(targetUrl, referer) {
  // Try direct fetch first
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": referer,
    "Origin": new URL(referer).origin,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Upgrade-Insecure-Requests": "1",
  };

  const res = await fetch(targetUrl, { headers, redirect: "follow" });
  const html = await res.text();

  // Check if CF blocked
  if (html.includes("Attention Required") || html.includes("Just a moment") || html.includes("cf-browser-verification")) {
    // Try via allorigins proxy
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const proxyRes = await fetch(proxyUrl);
    const proxyData = await proxyRes.json();
    return proxyData.contents || "";
  }

  return html;
}

async function getM3u8FromEmbed(eUrl, referer) {
  try {
    const eHtml = await fetchHtml(eUrl, referer);
    const scripts = [...eHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    for (const script of scripts) {
      const m = script.match(/\('([\s\S]+)',(\d+),(\d+),'([\s\S]+)'\.split\('\|'\)/);
      if (m) {
        const unpacked = unpackPacd(m[1], parseInt(m[2]), parseInt(m[3]), m[4]);
        const m3u8 = [...unpacked.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(x => x[0]);
        if (m3u8.length > 0) return m3u8;
      }
    }
  } catch (e) { return []; }
  return [];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kwikUrl = url.searchParams.get("url");
    const keyUrl = url.searchParams.get("key");

    if (keyUrl) {
      const keyRes = await fetch(keyUrl, {
        headers: {
          "Referer": "https://kwik.cx/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        }
      });
      const keyData = await keyRes.arrayBuffer();
      return new Response(keyData, { headers: {"Content-Type": "application/octet-stream"} });
    }

    if (!kwikUrl) return new Response(JSON.stringify({error: "No url provided"}), { status: 400 });

    let m3u8 = [];
    let pageTitle = null;

    try {
      const html = await fetchHtml(kwikUrl, "https://animepahe.pw/");

      // Title extraction
      const tMatch = html.match(/<title>(.*?)<\/title>/i);
      if (tMatch) {
        pageTitle = tMatch[1]
          .replace(/^Watch\s+/i, "")
          .replace(/\s*-\s*Kwik\s*$/i, "")
          .trim();
        if (pageTitle.toLowerCase().includes("attention") || pageTitle.toLowerCase().includes("just a moment")) {
          pageTitle = null;
        }
      }

      if (kwikUrl.includes("/e/")) {
        const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
        for (const script of scripts) {
          const m = script.match(/\('([\s\S]+)',(\d+),(\d+),'([\s\S]+)'\.split\('\|'\)/);
          if (m) {
            const unpacked = unpackPacd(m[1], parseInt(m[2]), parseInt(m[3]), m[4]);
            m3u8 = [...unpacked.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(x => x[0]);
            if (m3u8.length > 0) break;
          }
        }
      } else if (kwikUrl.includes("/f/")) {
        const fm = html.match(/\("([^"]{50,})",(\d+),"([^"]{5,})",(\d+),(\d+),(\d+)\)\)/);
        if (fm) {
          const fDecoded = tryDecode(fm[1], parseInt(fm[2]), fm[3], parseInt(fm[4]), parseInt(fm[5]));
          const eMatch = fDecoded.match(/var url = '(\/e\/[^']+)'/);
          if (eMatch) {
            m3u8 = await getM3u8FromEmbed("https://kwik.cx" + eMatch[1], kwikUrl);
          }
        }
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message, m3u8: [], title: null }), { status: 500 });
    }

    return new Response(JSON.stringify({ m3u8, title: pageTitle }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
