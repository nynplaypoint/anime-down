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

    // Extract the packed script
    const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\).*?\)\)/s);
    if (!packedMatch) {
      return new Response(JSON.stringify({error: "No packed script found", tail: html.slice(-500)}));
    }

    // Eval the packed script to unpack it
    let unpacked = "";
    try {
      // Replace eval with a capture
      const captureScript = packedMatch[0].replace(/^eval/, "unpacked =");
      eval(captureScript);
    } catch(e) {
      return new Response(JSON.stringify({error: "Eval failed: " + e.message, packed: packedMatch[0].slice(0, 200)}));
    }

    // Find mp4/m3u8 in unpacked
    const mp4 = [...unpacked.matchAll(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g)].map(m => m[0]);
    const m3u8 = [...unpacked.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(m => m[0]);

    return new Response(JSON.stringify({
      mp4,
      m3u8,
      unpacked_preview: unpacked.slice(0, 1000)
    }));
  }
};
