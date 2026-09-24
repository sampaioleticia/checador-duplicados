export default async function handler(req, res) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.DATABASE_ID;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return res.status(500).json({ error: "Variáveis de ambiente não configuradas." });
  }

  const nomes = [];
  let cursor = undefined;
  let hasMore = true;

  try {
    while (hasMore) {
      const body = cursor ? { start_cursor: cursor } : {};
      const resp = await fetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );
      const data = await resp.json();

      if (!resp.ok) {
        return res.status(resp.status).json({ error: data });
      }

      for (const page of data.results || []) {
        const title = page.properties?.["Nome do Artigo"]?.title;
        if (title && title.length > 0) {
          nomes.push(title[0].plain_text);
        }
      }

      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    const grupos = {};
    for (const nomeOriginal of nomes) {
      const nomeLimpo = nomeOriginal.trim();
      const chave = nomeLimpo.toLowerCase();

      if (!grupos[chave]) {
        grupos[chave] = { count: 0, variantes: new Set() };
      }
      grupos[chave].count += 1;
      grupos[chave].variantes.add(nomeLimpo);
    }

    const contagem = {};
    for (const chave of Object.keys(grupos)) {
      const variantesArray = Array.from(grupos[chave].variantes);
      contagem[chave] = {
        count: grupos[chave].count,
        exibicao: variantesArray[0],
        variantes: variantesArray
      };
    }

    res.status(200).json({ contagem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
