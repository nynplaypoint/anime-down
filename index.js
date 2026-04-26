export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kwikUrl = url.searchParams.get("url");
    if (!kwikUrl) return new Response(JSON.stringify({error: "No url"}), {status: 400});

    const pageRes = await fetch(kwikUrl.replace("/e/", "/f/"), {
      headers: {
        "Referer": "https://animepahe.pw/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      }
    });

    const html = await pageRes.text();
    const tokenMatch = html.match(/name="_token"\s+value="([^"]+)"/);
    if (!tokenMatch) return new Response(JSON.stringify({error: "Token not found", preview: html.slice(0,300)}));

    const token = tokenMatch[1];
    const cookies = pageRes.headers.get("set-cookie") || "";

    const postRes = await fetch(kwikUrl.replace("/e/", "/f/"), {
      method: "POST",
      headers: {
        "Referer": kwikUrl.replace("/e/", "/f/"),
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Cookie": cookies,
      },
      body: `_token=${encodeURIComponent(token)}`,
      redirect: "manual",
    });

    const mp4Url = postRes.headers.get("location");
    if (!mp4Url) return new Response(JSON.stringify({error: "No redirect", post_status: postRes.status, preview: (await postRes.text()).slice(0,300)}));

    return new Response(JSON.stringify({mp4_url: mp4Url}));
  }
};
