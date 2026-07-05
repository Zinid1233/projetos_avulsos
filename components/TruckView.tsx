"use client";

import { Peca } from "@/lib/types";

interface Props {
  pecas: Peca[];
  larguraPlanejamento: number;
  metrosLineares: number;
  comprimentoVeiculo?: number; // se informado, desenha o limite do veículo escolhido
  nomeVeiculo?: string;
}

/**
 * Vista de cima do piso do caminhão. O eixo horizontal é o comprimento
 * (metros lineares) e o vertical é a largura útil. Cada retângulo é uma peça.
 */
export default function TruckView({
  pecas,
  larguraPlanejamento,
  metrosLineares,
  comprimentoVeiculo,
  nomeVeiculo,
}: Props) {
  const comprimentoDesenho = Math.max(
    metrosLineares,
    comprimentoVeiculo ?? 0,
    1,
  );

  // Escala em px/m que respeita uma caixa máxima (largura e altura), para o
  // piso manter proporção de caminhão em qualquer tamanho de carga.
  const padding = 44;
  const maxLarguraPx = 900;
  const maxAlturaPx = 300;
  const escala = Math.min(
    (maxLarguraPx - padding * 2) / comprimentoDesenho,
    (maxAlturaPx - padding * 2) / larguraPlanejamento,
  );
  const larguraPx = comprimentoDesenho * escala + padding * 2;
  const alturaPx = larguraPlanejamento * escala + padding * 2;

  const cabeNoVeiculo =
    comprimentoVeiculo === undefined || metrosLineares <= comprimentoVeiculo + 1e-6;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${larguraPx} ${alturaPx}`}
        width={larguraPx}
        height={alturaPx}
        className="max-w-full h-auto"
        role="img"
        aria-label="Vista de cima do carregamento"
      >
        {/* piso do caminhão (largura de planejamento) */}
        <rect
          x={padding}
          y={padding}
          width={comprimentoDesenho * escala}
          height={larguraPlanejamento * escala}
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth={2}
          rx={6}
        />

        {/* grade a cada 1 metro */}
        {Array.from({ length: Math.floor(comprimentoDesenho) + 1 }).map((_, i) => (
          <g key={`g${i}`}>
            <line
              x1={padding + i * escala}
              y1={padding}
              x2={padding + i * escala}
              y2={padding + larguraPlanejamento * escala}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text
              x={padding + i * escala}
              y={padding - 10}
              fontSize={11}
              fill="#94a3b8"
              textAnchor="middle"
            >
              {i}m
            </text>
          </g>
        ))}

        {/* limite do veículo escolhido */}
        {comprimentoVeiculo !== undefined && comprimentoVeiculo < comprimentoDesenho && (
          <line
            x1={padding + comprimentoVeiculo * escala}
            y1={padding - 4}
            x2={padding + comprimentoVeiculo * escala}
            y2={padding + larguraPlanejamento * escala + 4}
            stroke="#dc2626"
            strokeWidth={2.5}
            strokeDasharray="8 5"
          />
        )}

        {/* peças */}
        {pecas.map((p, i) => {
          const w = p.comprimento * escala;
          const h = p.largura * escala;
          const x = padding + p.x * escala;
          const y = padding + p.y * escala;
          const mostraTexto = w > 34 && h > 18;
          return (
            <g key={i}>
              <rect
                x={x + 1}
                y={y + 1}
                width={Math.max(w - 2, 1)}
                height={Math.max(h - 2, 1)}
                fill={p.cor}
                fillOpacity={0.82}
                stroke="#0f172a"
                strokeOpacity={0.25}
                strokeWidth={1}
                rx={3}
              />
              {mostraTexto && (
                <text
                  x={x + w / 2}
                  y={y + h / 2}
                  fontSize={10}
                  fill="#ffffff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ pointerEvents: "none" }}
                >
                  {p.nome.length > 10 ? p.nome.slice(0, 9) + "…" : p.nome}
                  {p.pilha > 1 ? ` ×${p.pilha}` : ""}
                </text>
              )}
              {p.pilha > 1 && !mostraTexto && w > 16 && h > 12 && (
                <text
                  x={x + w / 2}
                  y={y + h / 2}
                  fontSize={9}
                  fill="#ffffff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ pointerEvents: "none" }}
                >
                  ×{p.pilha}
                </text>
              )}
            </g>
          );
        })}

        {/* rótulo da largura */}
        <text
          x={14}
          y={padding + (larguraPlanejamento * escala) / 2}
          fontSize={11}
          fill="#64748b"
          textAnchor="middle"
          transform={`rotate(-90 14 ${padding + (larguraPlanejamento * escala) / 2})`}
        >
          {larguraPlanejamento.toFixed(2)} m
        </text>
      </svg>

      {comprimentoVeiculo !== undefined && (
        <p className={`mt-2 text-sm ${cabeNoVeiculo ? "text-green-600" : "text-red-600"}`}>
          {cabeNoVeiculo
            ? `✓ Cabe no ${nomeVeiculo} (linha vermelha = fim do baú)`
            : `✗ Ultrapassa o ${nomeVeiculo} (linha vermelha = fim do baú)`}
        </p>
      )}
    </div>
  );
}
