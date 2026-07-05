import { Material, Peca, ResultadoCubagem, Unidade } from "./types";

/** Converte um valor para metros a partir da unidade informada. */
export function paraMetros(valor: number, unidade: Unidade): number {
  switch (unidade) {
    case "mm":
      return valor / 1000;
    case "cm":
      return valor / 100;
    case "m":
      return valor;
  }
}

/** Paleta de cores para os materiais na vista de cima. */
export const PALETA = [
  "#2563eb", // azul
  "#16a34a", // verde
  "#f59e0b", // âmbar
  "#dc2626", // vermelho
  "#7c3aed", // roxo
  "#0891b2", // ciano
  "#db2777", // rosa
  "#65a30d", // lima
  "#ea580c", // laranja
  "#0d9488", // teal
];

export function corPorIndice(indice: number): string {
  return PALETA[indice % PALETA.length];
}

interface PecaInterna {
  materialId: string;
  nome: string;
  cor: string;
  along: number; // dimensão no eixo do comprimento do caminhão (m)
  across: number; // dimensão no eixo da largura do caminhão (m)
  foraDeMedida: boolean;
}

/**
 * Orienta uma peça para caber na largura do caminhão.
 * Como não há empilhamento, giramos a peça no piso livremente.
 * Preferimos colocar o maior lado atravessado (across) quando ele couber,
 * pois isso reduz o comprimento ocupado (along).
 */
function orientar(comp: number, larg: number, larguraCaminhao: number): {
  along: number;
  across: number;
  foraDeMedida: boolean;
} {
  const maior = Math.max(comp, larg);
  const menor = Math.min(comp, larg);

  if (maior <= larguraCaminhao) {
    // maior lado cabe atravessado → across = maior, along = menor
    return { along: menor, across: maior, foraDeMedida: false };
  }
  if (menor <= larguraCaminhao) {
    // só o menor lado cabe atravessado
    return { along: maior, across: menor, foraDeMedida: false };
  }
  // nenhum lado cabe na largura — material fora de medida
  return { along: maior, across: menor, foraDeMedida: true };
}

interface Prateleira {
  x0: number; // início no eixo do comprimento
  altura: number; // profundidade da prateleira (along)
  usado: number; // largura já ocupada (across)
}

/**
 * Calcula os metros lineares e o arranjo (vista de cima) de um conjunto de
 * materiais, considerando que nada empilha (só largura x comprimento no piso).
 *
 * Usa um empacotamento por prateleiras (First-Fit Decreasing Height): peças
 * são posicionadas lado a lado atravessando a largura; quando a largura enche,
 * abre-se uma nova faixa ao longo do comprimento.
 */
export function calcularCubagem(
  materiais: Material[],
  larguraPlanejamento: number,
): ResultadoCubagem {
  const pecasInternas: PecaInterna[] = [];

  for (const m of materiais) {
    const qtd = Math.max(0, Math.floor(m.quantidade || 0));
    for (let i = 0; i < qtd; i++) {
      const o = orientar(m.comprimento, m.largura, larguraPlanejamento);
      pecasInternas.push({
        materialId: m.id,
        nome: m.nome,
        cor: m.cor,
        along: o.along,
        across: o.across,
        foraDeMedida: o.foraDeMedida,
      });
    }
  }

  // Ordena por profundidade (along) decrescente — melhora o aproveitamento.
  pecasInternas.sort((a, b) => b.along - a.along);

  const prateleiras: Prateleira[] = [];
  const pecas: Peca[] = [];
  let comprimentoTotal = 0;
  let areaTotal = 0;
  let pecaMaiorLargura = 0;
  let algumaForaDeMedida = false;

  for (const p of pecasInternas) {
    areaTotal += p.along * p.across;
    pecaMaiorLargura = Math.max(pecaMaiorLargura, Math.min(p.along, p.across));
    if (p.foraDeMedida) algumaForaDeMedida = true;

    // procura a primeira prateleira onde a peça cabe (largura restante e profundidade)
    let prateleira = prateleiras.find(
      (s) => larguraPlanejamento - s.usado >= p.across - 1e-9 && s.altura >= p.along - 1e-9,
    );

    if (!prateleira) {
      // nova prateleira ao final do comprimento atual
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
    });

    prateleira.usado += p.across;
  }

  return {
    metrosLineares: Number(comprimentoTotal.toFixed(3)),
    larguraPlanejamento,
    areaTotal: Number(areaTotal.toFixed(3)),
    pecas,
    totalPecas: pecasInternas.length,
    pecaMaiorLargura: Number(pecaMaiorLargura.toFixed(3)),
    algumaForaDeMedida,
  };
}
