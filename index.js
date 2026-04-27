export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kwikUrl = url.searchParams.get("url");
    const keyUrl = url.searchParams.get("key");

    if (keyUrl) {
      const keyRes = await fetch(keyUrl, {
        headers: {
          "Referer": "https://kwik.cx/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        }
      });
      const keyData = await keyRes.arrayBuffer();
      return new Response(keyData, { headers: {"Content-Type": "application/octet-stream"} });
    }

    if (!kwikUrl) return new Response(JSON.stringify({error: "No url"}), {status: 400});

    let m3u8 = [];
    let pageTitle = "Unknown"; 

    // Handle Embed links
    if (kwikUrl.includes("/e/")) {
      const eRes = await fetch(kwikUrl, {
        headers: {
          "Referer": "https://animepahe.pw/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        }
      });
      const eHtml = await eRes.text();
      
      // Extract title from <title> tag
      const tMatch = eHtml.match(/<title>(.*?)<\/title>/);
      if (tMatch) {
        pageTitle = tMatch[1].replace("Watch ", "").replace(" - Kwik", "").trim();
      }

      const scripts = [...eHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
      for (const script of scripts) {
        const m = script.match(/\('([\s\S]+)',(\d+),(\d+),'([\s\S]+)'\.split\('\|'\)/);
        if (m) {
          const unpacked = unpackPacd(m[1], parseInt(m[2]), parseInt(m[3]), m[4]);
          m3u8 = [...unpacked.matchAll(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g)].map(x => x[0]);
          if (m3u8.length > 0) break;
        }
      }
    } 
    // Handle File links
    else if (kwikUrl.includes("/f/")) {
      const fRes = await fetch(kwikUrl, {
        headers: {
          "Referer": "https://animepahe.pw/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        }
      });
      const fHtml = await fRes.text();

      const tMatch = fHtml.match(/<title>(.*?)<\/title>/);
      if (tMatch) {
        pageTitle = tMatch[1].replace("Watch ", "").replace(" - Kwik", "").trim();
      }

      const fm = fHtml.match(/\("([^"]{50,})",(\d+),"([^"]{5,})",(\d+),(\d+),(\d+)\)\)/);
      if (fm) {
        const fDecoded = tryDecode(fm[1], parseInt(fm[2]), fm[3], parseInt(fm[4]), parseInt(fm[5]));
        const eMatch = fDecoded.match(/var url = '(\/e\/[^']+)'/);
        if (eMatch) {
          m3u8 = await getM3u8FromEmbed("https://kwik.cx" + eMatch[1], kwikUrl);
        }
      }
    }

    return new Response(JSON.stringify({ m3u8, title: pageTitle }));
  }
};
