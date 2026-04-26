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

function decodeP(html) {
  // Standard p,a,c,k,e,d packer
  const m = html.match(/\(function\(p,a,c,k,e,d\)[\s\S]+?'([^']{50,})'\.split\('\|'\),(\d+),\{\}\)\)/);
  if (!m) return null;
  const words = m[1].split('|');
  const packed = html.match(/\(function\(p,a,c,k,e,d\)([\s\S]+?'[^']+?'\.split)/);
  if (!packed) return null;
  
  // Get the encoded string and count
  const em = html.match(/\b(\w+)\|(\w+)\|(\w+)\|/);
  
  // Just return the split words to find urls
  return words.join(' ');
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

    // Extract from split('|') packer
    const splitMatch = eHtml.match(/'([^']{100,})'\.split\('\|'\)/);
    if (!splitMatch) return new Response(JSON.stringify({error: "split match failed", tail: eHtml.slice(-500)}));
    
    const words = splitMatch[1].split('|');
    
    // Find m3u8 url parts - look for vault/uwucdn + hash
    const hashMatch = words.find(w => w.length === 64); // sha256 hash
    const domain = words.find(w => w.includes('uwucdn') || w.includes('vault'));
    const m3u8Word = words.find(w => w === 'm3u8');
    
    // Find full url by looking for https pattern in words
    const httpsIdx = words.lastIndexOf('https');
    
    return new Response(JSON.stringify({
      e_url: eUrl,
      words_count: words.length,
      hash: hashMatch,
      domain,
      https_idx: httpsIdx,
      // show words around https
      url_words: httpsIdx >= 0 ? words.slice(Math.max(0,httpsIdx-2), httpsIdx+10) : [],
      all_words: words
    }));
  }
};
