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

    // Search for token in different formats
    const t1 = html.match(/name="_token"\s+value="([^"]+)"/);
    const t2 = html.match(/_token['":\s]+['"]([^'"]{10,})['"]/);
    const t3 = html.match(/token['":\s]+['"]([^'"]{10,})['"]/i);
    const forms = html.match(/<form[^>]+action="([^"]+)"/);

    return new Response(JSON.stringify({
      status: pageRes.status,
      t1: t1 ? t1[1] : null,
      t2: t2 ? t2[1] : null,
      t3: t3 ? t3[1] : null,
      form_action: forms ? forms[1] : null,
      preview: html.slice(0, 2000)
    }));
  }
};
