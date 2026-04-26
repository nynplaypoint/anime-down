function tryDecode(Bc, gY, dX_str, gj, xA) {
  // dX is the separator string, each char is a separator
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
  } catch(e) {
    return "decode_error: " + e.message;
  }
  try { return decodeURIComponent(escape(DC)); } catch(e) { return DC; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kwikUrl = url.searchParams.get("url");
    if (!kwikUrl) return new Response(JSON.stringify({error: "No url"}), {status: 400});

    const pageRes = await fetch(kwikUrl, {
      headers: {
        "Referer": "https://animepahe.pw/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      }
    });

    const html = await pageRes.text();

    // Match: ("encoded_bc", gY, "dX_string", gj, xA, last_num))
    const m = html.match(/\("([^"]{50,})",(\d+),"([^"]{5,})",(\d+),(\d+),(\d+)\)\)/);
    if (!m) {
      return new Response(JSON.stringify({error: "No match", tail: html.slice(-200)}));
    }

    const Bc = m[1];
    const gY = parseInt(m[2]);
    const dX_str = m[3];
    const gj = parseInt(m[4]);
    const xA = parseInt(m[5]);

    console.log("dX_str:", dX_str, "gj:", gj, "xA:", xA);

    const decoded = tryDecode(Bc, gY, dX_str, gj, xA);

    const mp4 = [...decoded.matchAll(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g)].map(m => m[0]);
    const m3u8 = [...decoded.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(m => m[0]);

    return new Response(JSON.stringify({
      mp4, m3u8,
      decoded_preview: decoded.slice(0, 500),
      dX_str, gj, xA
    }));
  }
};
