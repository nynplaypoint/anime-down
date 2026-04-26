function tryDecode(Bc, gY, dX_str, gj, xA) {
  const dX = dX_str.split("");
  let DC = "";
  let i = 0;
  try {
    while (i < Bc.length) {
      let s = "";
      while (i < Bc.length && Bc[i] !== dX[xA]) {
        s += Bc[i];
        i++;
      }
      for (let j = 0; j < dX.length; j++) {
        s = s.split(dX[j]).join(String(j));
      }
      DC += String.fromCharCode(parseInt(s, xA) - gj);
      i++;
    }
  } catch(e) { return "decode_error: " + e.message; }
  try { return decodeURIComponent(escape(DC)); } catch(e) { return DC; }
}

async function fetchAndDecode(url, referer) {
  const res = await fetch(url, {
    headers: {
      "Referer": referer,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    }
  });
  const html = await res.text();
  const m = html.match(/\("([^"]{50,})",(\d+),"([^"]{5,})",(\d+),(\d+),(\d+)\)\)/);
  if (!m) return { html, decoded: null };
  const decoded = tryDecode(m[1], parseInt(m[2]), m[3], parseInt(m[4]), parseInt(m[5]));
  return { html, decoded };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kwikUrl = url.searchParams.get("url");
    if (!kwikUrl) return new Response(JSON.stringify({error: "No url"}), {status: 400});

    // Step 1: fetch /f/ page to get /e/ url
    const { decoded: fDecoded } = await fetchAndDecode(kwikUrl, "https://animepahe.pw/");
    if (!fDecoded) return new Response(JSON.stringify({error: "f page decode failed"}));

    // Extract /e/ url
    const eMatch = fDecoded.match(/var url = '(\/e\/[^']+)'/);
    if (!eMatch) return new Response(JSON.stringify({error: "e url not found", preview: fDecoded.slice(0,300)}));

    const eUrl = "https://kwik.cx" + eMatch[1];
    console.log("e url:", eUrl);

    // Step 2: fetch /e/ page and decode
    const { decoded: eDecoded } = await fetchAndDecode(eUrl, kwikUrl);
    if (!eDecoded) return new Response(JSON.stringify({error: "e page decode failed"}));

    // Extract mp4/m3u8
    const mp4 = [...eDecoded.matchAll(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g)].map(m => m[0]);
    const m3u8 = [...eDecoded.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(m => m[0]);
    const src = [...eDecoded.matchAll(/source\s*[=:]\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

    return new Response(JSON.stringify({
      e_url: eUrl,
      mp4, m3u8, src,
      decoded_preview: eDecoded.slice(0, 1000)
    }));
  }
};
