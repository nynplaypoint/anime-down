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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kwikUrl = url.searchParams.get("url");
    if (!kwikUrl) return new Response(JSON.stringify({error: "No url"}), {status: 400});

    // Step 1: fetch /f/ page
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

    // Step 2: fetch /e/ page
    const eRes = await fetch(eUrl, {
      headers: {
        "Referer": kwikUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      }
    });
    const eHtml = await eRes.text();

    // Find ALL script tags and decode each one
    const scripts = [...eHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    
    const results = [];
    for (const script of scripts) {
      // Try custom decoder
      const cm = script.match(/\("([^"]{50,})",(\d+),"([^"]{5,})",(\d+),(\d+),(\d+)\)\)/);
      if (cm) {
        const decoded = tryDecode(cm[1], parseInt(cm[2]), cm[3], parseInt(cm[4]), parseInt(cm[5]));
        results.push({type: "custom", decoded: decoded.slice(0, 500)});
      }
      // Look for uwu/vault/m3u8 directly
      if (script.includes('uwu') || script.includes('vault') || script.includes('m3u8') || script.includes('stream')) {
        results.push({type: "raw", preview: script.slice(0, 500)});
      }
    }

    return new Response(JSON.stringify({
      e_url: eUrl,
      scripts_count: scripts.length,
      results
    }));
  }
};
