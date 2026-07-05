import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Schema esperado da extração de medidas a partir da imagem.
const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome ou descrição curta do material" },
          comprimento_cm: { type: "number", description: "Maior lado no piso, em centímetros" },
          largura_cm: { type: "number", description: "Menor lado no piso, em centímetros" },
          altura_cm: { type: "number", description: "Altura em centímetros; 0 se não informada" },
          quantidade: { type: "integer", description: "Quantidade de peças; 1 se não informado" },
        },
        required: ["nome", "comprimento_cm", "largura_cm", "altura_cm", "quantidade"],
        additionalProperties: false,
      },
    },
    observacao: {
      type: "string",
      description: "Observação curta sobre a leitura (ex.: unidade assumida, incertezas)",
    },
  },
  required: ["items", "observacao"],
  additionalProperties: false,
} as const;

const PROMPT = `Você é um assistente de logística da transportadora Transfast.
A imagem contém as medidas de um ou mais materiais que um cliente quer transportar.

Extraia CADA material com suas medidas de PISO (comprimento e largura), pois os
materiais NÃO podem ser empilhados — só interessa a área ocupada no chão.

Regras:
- Converta tudo para CENTÍMETROS. Se a imagem estiver em mm, divida por 10; se em metros, multiplique por 100.
- comprimento_cm = maior lado no piso; largura_cm = menor lado no piso.
- altura_cm = altura da peça se estiver na imagem; use 0 se não houver altura informada.
- Se houver quantidade indicada (ex.: "x4", "4 peças"), use-a; caso contrário, use 1.
- Se um valor estiver ilegível, faça a melhor estimativa e registre isso em "observacao".
- Retorne apenas os materiais realmente presentes na imagem.`;

const MEDIA_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Análise automática indisponível: configure a variável ANTHROPIC_API_KEY. Você pode lançar as medidas manualmente.",
      },
      { status: 503 },
    );
  }

  let body: { imageBase64?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { imageBase64, mediaType } = body;
  if (!imageBase64) {
    return NextResponse.json({ error: "Imagem não enviada." }, { status: 400 });
  }

  const media = MEDIA_TYPES[(mediaType || "").toLowerCase()] ?? "image/jpeg";

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data: imageBase64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "Não foi possível analisar esta imagem. Lance as medidas manualmente." },
        { status: 422 },
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Resposta vazia da análise." }, { status: 502 });
    }

    const parsed = JSON.parse(textBlock.text);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido na análise.";
    return NextResponse.json({ error: `Falha na análise: ${message}` }, { status: 500 });
  }
}
