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

    // Look for video sources
    const mp4 = [...html.matchAll(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g)].map(m => m[0]);
    const m3u8 = [...html.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(m => m[0]);
    const source = [...html.matchAll(/source:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
    const file = [...html.matchAll(/file:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

    // Get the script section
    const scriptSection = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];

    return new Response(JSON.stringify({
      mp4,
      m3u8,
      source,
      file,
      scripts_count: scriptSection.length,
      // dump last 2000 chars where video url usually is
      tail: html.slice(-2000)
    }));
  }
};
