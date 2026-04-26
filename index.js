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
    if (!fm) return new Response(JSON.stringify({error: "f decode failed", tail: fHtml.slice(-200)}));
    const fDecoded = tryDecode(fm[1], parseInt(fm[2]), fm[3], parseInt(fm[4]), parseInt(fm[5]));

    const eMatch = fDecoded.match(/var url = '(\/e\/[^']+)'/);
    if (!eMatch) return new Response(JSON.stringify({error: "e url not found", preview: fDecoded.slice(0,300)}));

    const eUrl = "https://kwik.cx" + eMatch[1];

    // Step 2: fetch /e/ page
    const eRes = await fetch(eUrl, {
      headers: {
        "Referer": kwikUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      }
    });
    const eHtml = await eRes.text();
    const em = eHtml.match(/\("([^"]{50,})",(\d+),"([^"]{5,})",(\d+),(\d+),(\d+)\)\)/);

    return new Response(JSON.stringify({
      e_url: eUrl,
      e_status: eRes.status,
      e_has_packed: !!em,
      e_preview: eHtml.slice(0, 500),
      e_tail: eHtml.slice(-300)
    }));
  }
};
