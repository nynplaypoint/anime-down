function decodeKwik(html) {
  const m = html.match(/eval\(function\(Bc,gY,dX,gj,xA,DC\)\{[\s\S]+?\}\("([\s\S]+?)","[\s\S]*?",(\[[\s\S]+?\]),(\d+),(\d+)\)\)/);
  if (!m) return null;

  const Bc = m[1];
  const dX = JSON.parse(m[2]);
  const gj = parseInt(m[3]);
  const xA = parseInt(m[4]);

  let DC = "";
  let i = 0;
  while (i < Bc.length) {
    let s = "";
    while (Bc[i] !== dX[xA]) {
      s += Bc[i];
      i++;
    }
    for (let j = 0; j < dX.length; j++) {
      s = s.split(dX[j]).join(String(j));
    }
    DC += String.fromCharCode(parseInt(s, xA) - gj);
    i++;
  }
  return decodeURIComponent(escape(DC));
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
    const decoded = decodeKwik(html);

    if (!decoded) {
      return new Response(JSON.stringify({error: "Decode failed", preview: html.slice(-500)}));
    }

    const mp4 = [...decoded.matchAll(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g)].map(m => m[0]);
    const m3u8 = [...decoded.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(m => m[0]);

    return new Response(JSON.stringify({
      mp4, m3u8,
      decoded_preview: decoded.slice(0, 500)
    }));
  }
};
