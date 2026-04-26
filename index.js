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
  } catch(e) { return "decode_error: " + e.message; }
  try { return decodeURIComponent(escape(DC)); } catch(e) { return DC; }
}

function unpackPacd(p, a, c, k) {
  const e = (c) => (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
  const keys = k.split('|');
  while (c--) {
    if (keys[c]) p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), keys[c]);
  }
  return p;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kwikUrl = url.searchParams.get("url");
    if (!kwikUrl) return new Response(JSON.stringify({error: "No url"}), {status: 400});

    const fRes = await fetch(kwikUrl, {
      headers: {
        "Referer": "https://animepahe.pw/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      }
    });
    const fHtml = await fRes.text();
    const fm = fHtml.match(/\("([^"]{50,})",(\d+),"([^"]{5,})",(\d+),(\d+),(\d+)\)\)/);
    if (!fm) return new Response(JSON.stringify({error: "f decode failed"}));
    const fDecoded = tryDecode(fm[1], parseInt(fm[2]), fm[3], parseInt(fm[4]), parseInt(fm[5]));
    const eMatch = fDecoded.match(/var url = '(\/e\/[^']+)'/);
    if (!eMatch) return new Response(JSON.stringify({error: "e url not found"}));
    const eUrl = "https://kwik.cx" + eMatch[1];

    const eRes = await fetch(eUrl, {
      headers: {
        "Referer": kwikUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      }
    });
    const eHtml = await eRes.text();

    // Decode ALL pacd scripts
    const scripts = [...eHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    const results = [];

    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i];
      const m = s.match(/\('([^']+)',(\d+),(\d+),'([^']+)'\.split\('\|'\)/);
      if (m) {
        const unpacked = unpackPacd(m[1], parseInt(m[2]), parseInt(m[3]), m[4]);
        const mp4 = [...unpacked.matchAll(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g)].map(x => x[0]);
        const m3u8 = [...unpacked.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(x => x[0]);
        results.push({script_idx: i, mp4, m3u8, preview: unpacked.slice(0, 300)});
      }
    }

    return new Response(JSON.stringify({e_url: eUrl, results}));
  }
};
