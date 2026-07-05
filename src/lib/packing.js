// Conversão de unidade para metros.
export function paraMetros(valor, unidade) {
  switch (unidade) {
    case "mm":
      return valor / 1000;
    case "cm":
      return valor / 100;
    default:
      return valor;
  }
}

// Paleta de cores para os materiais na vista de cima.
export const PALETA = [
  "#ef4444", // vermelho
  "#f59e0b", // âmbar
  "#3b82f6", // azul
  "#22c55e", // verde
  "#a855f7", // roxo
  "#06b6d4", // ciano
  "#ec4899", // rosa
  "#84cc16", // lima
  "#f97316", // laranja
  "#14b8a6", // teal
];

export function corPorIndice(indice) {
  return PALETA[indice % PALETA.length];
}

// Orienta a peça para caber na largura do caminhão (gira livremente no piso).
function orientar(comp, larg, larguraCaminhao) {
  const maior = Math.max(comp, larg);
  const menor = Math.min(comp, larg);
  if (maior <= larguraCaminhao) {
    return { along: menor, across: maior, foraDeMedida: false };
  }
  if (menor <= larguraCaminhao) {
    return { along: maior, across: menor, foraDeMedida: false };
  }
  return { along: maior, across: menor, foraDeMedida: true };
}

/**
 * Calcula metros lineares, volume e o arranjo (vista de cima).
 * materiais: [{id, nome, comprimento, largura, altura, quantidade, cor}] em metros.
 * opcoes: { remontar, alturaMaxRemonte }
 */
export function calcularCubagem(
  materiais,
  larguraPlanejamento,
  opcoes = { remontar: false, alturaMaxRemonte: 0 },
) {
  const pecasInternas = [];
  let volumeTotal = 0;
  let totalPecas = 0;

  for (const m of materiais) {
    const qtd = Math.max(0, Math.floor(m.quantidade || 0));
    const altura = Math.max(0, m.altura || 0);
    volumeTotal += m.comprimento * m.largura * altura * qtd;
    totalPecas += qtd;
    if (qtd === 0) continue;

    let porPilha = 1;
    if (opcoes.remontar && altura > 0 && opcoes.alturaMaxRemonte > 0) {
      porPilha = Math.max(1, Math.floor(opcoes.alturaMaxRemonte / altura));
    }

    const posicoes = Math.ceil(qtd / porPilha);
    let restante = qtd;
    for (let i = 0; i < posicoes; i++) {
      const pilha = Math.min(porPilha, restante);
      restante -= pilha;
      const o = orientar(m.comprimento, m.largura, larguraPlanejamento);
      pecasInternas.push({
        materialId: m.id,
        nome: m.nome,
        cor: m.cor,
        along: o.along,
        across: o.across,
        pilha,
        foraDeMedida: o.foraDeMedida,
      });
    }
  }

  pecasInternas.sort((a, b) => b.along - a.along);

  const prateleiras = [];
  const pecas = [];
  let comprimentoTotal = 0;
  let areaTotal = 0;
  let pecaMaiorLargura = 0;
  let algumaForaDeMedida = false;

  for (const p of pecasInternas) {
    areaTotal += p.along * p.across;
    pecaMaiorLargura = Math.max(pecaMaiorLargura, Math.min(p.along, p.across));
    if (p.foraDeMedida) algumaForaDeMedida = true;

    let prateleira = prateleiras.find(
      (s) => larguraPlanejamento - s.usado >= p.across - 1e-9 && s.altura >= p.along - 1e-9,
    );

    if (!prateleira) {
      prateleira = { x0: comprimentoTotal, altura: p.along, usado: 0 };
      prateleiras.push(prateleira);
      comprimentoTotal += p.along;
    }

    pecas.push({
      materialId: p.materialId,
      nome: p.nome,
      cor: p.cor,
      x: prateleira.x0,
      y: prateleira.usado,
      comprimento: p.along,
      largura: p.across,
      pilha: p.pilha,
    });

    prateleira.usado += p.across;
  }

  return {
    metrosLineares: Number(comprimentoTotal.toFixed(3)),
    larguraPlanejamento,
    areaTotal: Number(areaTotal.toFixed(3)),
    volumeTotal: Number(volumeTotal.toFixed(4)),
    pecas,
    totalPecas,
    totalPosicoes: pecasInternas.length,
    pecaMaiorLargura: Number(pecaMaiorLargura.toFixed(3)),
    algumaForaDeMedida,
  };
}
