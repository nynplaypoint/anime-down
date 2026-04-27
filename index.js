// Function to unpack p.a.c.k.e.r
function unpackPacd(p, a, c, k) {
  const e = (n) => (n < a ? '' : e(parseInt(n / a))) + ((n = n % a) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
  const keys = k.split('|');
  let cc = c;
  while (cc--) {
    if (keys[cc]) p = p.replace(new RegExp('\\b' + e(cc) + '\\b', 'g'), keys[cc]);
  }
  return p;
}

// Function to decode Kwik's custom encoding
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

async function getM3u8FromEmbed(eUrl, referer) {
  try {
    const eRes = await fetch(eUrl, {
      headers: {
        "Referer": referer,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      }
    });
    const eHtml = await eRes.text();
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

    // Handle Key requests for decryption
    if (keyUrl) {
      const keyRes = await fetch(keyUrl, {
        headers: { 
          "Referer": "https://kwik.cx/", 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36" 
        }
      });
      const keyData = await keyRes.arrayBuffer();
      return new Response(keyData, { headers: {"Content-Type": "application/octet-stream"} });
    }

    if (!kwikUrl) return new Response(JSON.stringify({error: "No url provided"}), { status: 400 });

    let m3u8 = [];
    let pageTitle = "Unknown";

    try {
      const res = await fetch(kwikUrl, {
        headers: {
          "Referer": "https://animepahe.pw/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        }
      });
      const html = await res.text();

      // --- TITLE EXTRACTION ---
      const tMatch = html.match(/<title>(.*?)<\/title>/);
      if (tMatch) {
        pageTitle = tMatch[1].replace("Watch ", "").replace(" - Kwik", "").trim();
      }

      // Handle Embed links directly
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
      } 
      // Handle File links by finding the inner embed
      else if (kwikUrl.includes("/f/")) {
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
      return new Response(JSON.stringify({ error: e.message, m3u8: [], title: "Error" }), { status: 500 });
    }

    // Return JSON with both the link and the clean anime title
    return new Response(JSON.stringify({ m3u8, title: pageTitle }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
