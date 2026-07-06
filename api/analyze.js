// Função serverless (Vercel) que lê medidas de uma imagem usando o
// Google Gemini (nível gratuito). A chave fica em GEMINI_API_KEY no servidor.

// Tenta vários modelos do plano gratuito, em ordem, até um responder
// (alguns podem estar com cota 0 dependendo da conta/região).
const MODELOS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
];

const SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nome: { type: "STRING" },
          comprimento_cm: { type: "NUMBER" },
          largura_cm: { type: "NUMBER" },
          altura_cm: { type: "NUMBER" },
          quantidade: { type: "INTEGER" },
        },
        required: ["nome", "comprimento_cm", "largura_cm", "altura_cm", "quantidade"],
      },
    },
    observacao: { type: "STRING" },
  },
  required: ["items", "observacao"],
};

const PROMPT = `Você extrai medidas de materiais para transporte (transportadora Transfast).

A imagem pode ser:
(a) uma TABELA / packing list com colunas como Identificação/Descrição, Compr(imento),
    Largura, Altura, Peso, Quantidade — leia CADA linha como um item; ou
(b) uma foto/rabisco com medidas soltas (ex.: "120 x 80 x 60", "1,20m x 0,80m").

Regras:
- Converta TODAS as medidas para CENTÍMETROS (cm). Se a tabela indicar a unidade
  (ex.: cm/kg, m/kg, in/lb), respeite-a: m→×100, mm→÷10, in→×2,54.
- Vírgula é separador decimal (22,00 = 22). Ponto pode ser separador de milhar.
- comprimento_cm, largura_cm, altura_cm: use as colunas Compr/Largura/Altura quando
  existirem; senão, o maior lado é o comprimento e o menor a largura, e a altura é 0
  se não houver.
- quantidade: use a coluna Quantidade (ou "x4", "4 peças"); se não houver, 1.
- nome: a descrição/identificação do item; se não houver, "Material N".
- NÃO invente linhas: retorne apenas o que está na imagem. Não inclua a linha de total.
- Em "observacao", escreva 1 frase curta (unidade assumida, dúvidas de leitura).`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "Leitura por imagem indisponível: configure a variável GEMINI_API_KEY (gratuita) na Vercel. Você pode lançar as medidas manualmente.",
    });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { imageBase64, mediaType } = body;
  if (!imageBase64) {
    res.status(400).json({ error: "Imagem não enviada." });
    return;
  }

  const corpo = JSON.stringify({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mediaType || "image/jpeg", data: imageBase64 } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });

  let ultimoErro = "falha na API do Gemini";

  try {
    for (const modelo of MODELOS) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: corpo,
        },
      );

      const dados = await resp.json();

      if (resp.ok) {
        const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!texto) {
          res.status(502).json({ error: "A leitura não retornou dados. Tente outra foto." });
          return;
        }
        res.status(200).json(JSON.parse(texto));
        return;
      }

      ultimoErro = dados?.error?.message || `falha (${resp.status})`;
      // 429 = cota/limite deste modelo → tenta o próximo; outros erros → para
      if (resp.status !== 429) break;
    }

    res.status(502).json({
      error:
        `Nenhum modelo gratuito do Gemini está disponível para esta chave (cota 0). ` +
        `Verifique no Google AI Studio se a chave tem plano gratuito ativo. Detalhe: ${ultimoErro}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    res.status(500).json({ error: `Erro na leitura: ${message}` });
  }
}
