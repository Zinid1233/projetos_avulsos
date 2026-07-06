import { useRef } from "react";

/**
 * Vista de cima do piso do caminhão. Cada retângulo é uma peça/pilha.
 * Quando `editavel`, as peças podem ser arrastadas (chama `onMover(id, x, y)`).
 * Ao passar o mouse aparecem as medidas; peças maiores mostram as medidas dentro.
 */
export default function TruckView({
  pecas,
  larguraPlanejamento,
  metrosLineares,
  comprimentoVeiculo,
  nomeVeiculo,
  claro = false,
  editavel = false,
  onMover,
  fator = 100,
  unidade = "cm",
}) {
  const svgRef = useRef(null);
  const drag = useRef(null);

  const comprimentoDesenho = Math.max(metrosLineares, comprimentoVeiculo || 0, 1);

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

  const c = claro
    ? { piso: "#f5f5f5", borda: "#cccccc", grade: "#e5e5e5", texto: "#888888" }
    : { piso: "#101010", borda: "#2f2f2f", grade: "#242424", texto: "#7a7a7a" };

  const round = (v) => Math.round(v * fator);
  // mostra sempre maior × menor (como o material foi informado)
  const dims = (p) => {
    const a = round(p.comprimento);
    const b = round(p.largura);
    return a >= b ? `${a}×${b}` : `${b}×${a}`;
  };
  const medida = (p) => `${dims(p)}${p.pilha > 1 ? ` ×${p.pilha}` : ""}`;

  function pontoEmMetros(clientX, clientY) {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { mx: (loc.x - padding) / escala, my: (loc.y - padding) / escala };
  }

  function aoPegar(e, p) {
    if (!editavel || !onMover) return;
    e.preventDefault();
    const { mx, my } = pontoEmMetros(e.clientX, e.clientY);
    drag.current = { id: p.id, offX: mx - p.x, offY: my - p.y, w: p.comprimento, h: p.largura };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignora */
    }
  }
  function aoArrastar(e) {
    const d = drag.current;
    if (!d) return;
    const { mx, my } = pontoEmMetros(e.clientX, e.clientY);
    const x = Math.max(0, mx - d.offX);
    const y = Math.min(Math.max(0, my - d.offY), Math.max(0, larguraPlanejamento - d.h));
    onMover(d.id, Number(x.toFixed(3)), Number(y.toFixed(3)));
  }
  function aoSoltar(e) {
    if (drag.current) {
      drag.current = null;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${larguraPx} ${alturaPx}`}
        width={larguraPx}
        height={alturaPx}
        style={{ maxWidth: "100%", height: "auto", touchAction: editavel ? "none" : "auto" }}
        role="img"
        aria-label="Vista de cima do carregamento"
      >
        <rect
          x={padding}
          y={padding}
          width={comprimentoDesenho * escala}
          height={larguraPlanejamento * escala}
          fill={c.piso}
          stroke={c.borda}
          strokeWidth={2}
          rx={6}
        />

        {Array.from({ length: Math.floor(comprimentoDesenho) + 1 }).map((_, i) => (
          <g key={`g${i}`}>
            <line
              x1={padding + i * escala}
              y1={padding}
              x2={padding + i * escala}
              y2={padding + larguraPlanejamento * escala}
              stroke={c.grade}
              strokeWidth={1}
            />
            <text x={padding + i * escala} y={padding - 10} fontSize={11} fill={c.texto} textAnchor="middle">
              {i}m
            </text>
          </g>
        ))}

        {comprimentoVeiculo !== undefined && comprimentoVeiculo < comprimentoDesenho && (
          <line
            x1={padding + comprimentoVeiculo * escala}
            y1={padding - 4}
            x2={padding + comprimentoVeiculo * escala}
            y2={padding + larguraPlanejamento * escala + 4}
            stroke="#e11d2a"
            strokeWidth={2.5}
            strokeDasharray="8 5"
          />
        )}

        {pecas.map((p) => {
          const w = p.comprimento * escala;
          const h = p.largura * escala;
          const x = padding + p.x * escala;
          const y = padding + p.y * escala;
          const grande = w > 40 && h > 20;
          const doisLinhas = grande && h > 38;
          return (
            <g
              key={p.id}
              onPointerDown={(e) => aoPegar(e, p)}
              onPointerMove={aoArrastar}
              onPointerUp={aoSoltar}
              style={{ cursor: editavel ? "grab" : "default" }}
            >
              <title>
                {p.nome} — {dims(p)} {unidade}
                {p.pilha > 1 ? ` (×${p.pilha} empilhado)` : ""}
              </title>
              <rect
                x={x + 1}
                y={y + 1}
                width={Math.max(w - 2, 1)}
                height={Math.max(h - 2, 1)}
                fill={p.cor}
                fillOpacity={0.9}
                stroke="#000"
                strokeOpacity={0.35}
                strokeWidth={1}
                rx={3}
              />
              {grande && (
                <text
                  x={x + w / 2}
                  y={doisLinhas ? y + h / 2 - 7 : y + h / 2}
                  fontSize={10}
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ pointerEvents: "none" }}
                >
                  {doisLinhas
                    ? p.nome.length > 12
                      ? p.nome.slice(0, 11) + "…"
                      : p.nome
                    : medida(p)}
                </text>
              )}
              {doisLinhas && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 8}
                  fontSize={9}
                  fill="#fff"
                  fillOpacity={0.85}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ pointerEvents: "none" }}
                >
                  {medida(p)} {unidade}
                </text>
              )}
              {!grande && p.pilha > 1 && w > 16 && h > 12 && (
                <text
                  x={x + w / 2}
                  y={y + h / 2}
                  fontSize={9}
                  fill="#fff"
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

        <text
          x={14}
          y={padding + (larguraPlanejamento * escala) / 2}
          fontSize={11}
          fill={c.texto}
          textAnchor="middle"
          transform={`rotate(-90 14 ${padding + (larguraPlanejamento * escala) / 2})`}
        >
          {larguraPlanejamento.toFixed(2)} m
        </text>
      </svg>

      {comprimentoVeiculo !== undefined && (
        <p style={{ marginTop: 8, fontSize: 14, color: cabeNoVeiculo ? "var(--green)" : "var(--red)" }}>
          {cabeNoVeiculo
            ? `✓ Cabe no ${nomeVeiculo} (linha vermelha = fim do baú)`
            : `✗ Ultrapassa o ${nomeVeiculo} (linha vermelha = fim do baú)`}
        </p>
      )}
    </div>
  );
}
