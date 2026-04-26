function decodeKwik(html) {
  // Match the full eval call and capture everything inside the outer parentheses
  const m = html.match(/eval\(function\(Bc,gY,dX,gj,xA,DC\)\{[\s\S]+?\}\(["']([\s\S]+?)["'],(\d+),["']([\s\S]*?)["'],(\[[\s\S]+?\]),(\d+),(\d+)\)\)/);
  if (!m) {
    // Try alternate format
    const raw = html.match(/\(["']([\s\S]+?)["'],(\d+),["']([\s\S]*?)["'],(\[[\s\S]+?\]),(\d+),(\d+)\)\)/);
    if (!raw) return null;
    return tryDecode(raw[1], parseInt(raw[2]), raw[3], JSON.parse(raw[4]), parseInt(raw[5]), parseInt(raw[6]));
  }
  return tryDecode(m[1], parseInt(m[2]), m[3], JSON.parse(m[4]), parseInt(m[5]), parseInt(m[6]));
}

function tryDecode(Bc, gY, gj_str, dX, gj, xA) {
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
  try {
    return decodeURIComponent(escape(DC));
  } catch(e) {
    return DC;
  }
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

    // Dump the last script tag raw for debugging
    const lastScript = html.match(/\(["']([\s\S]{100,})["'],(\d+),["']([\s\S]*?)["'],(\[[\s\S]+?\]),(\d+),(\d+)\)\)/);

    if (!lastScript) {
      return new Response(JSON.stringify({error: "No match", tail: html.slice(-300)}));
    }

    const Bc = lastScript[1];
    const gY = parseInt(lastScript[2]);
    const gj_str = lastScript[3];
    const dX = JSON.parse(lastScript[4]);
    const gj = parseInt(lastScript[5]);
    const xA = parseInt(lastScript[6]);

    console.log("dX:", JSON.stringify(dX));
    console.log("gj:", gj, "xA:", xA);

    const decoded = tryDecode(Bc, gY, gj_str, dX, gj, xA);

    const mp4 = [...decoded.matchAll(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g)].map(m => m[0]);
    const m3u8 = [...decoded.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(m => m[0]);

    return new Response(JSON.stringify({
      mp4, m3u8,
      decoded_preview: decoded.slice(0, 500),
      dX, gj, xA
    }));
  }
};
