// Tipos de carroceria. Fechada (baú/sider) tem altura interna e volume útil;
// aberta (grade baixa/graneleiro) não tem teto fixo.
export const CARROCERIAS = [
  { id: "bau", nome: "Baú", fechado: true },
  { id: "sider", nome: "Sider", fechado: true },
  { id: "grade-baixa", nome: "Grade baixa", fechado: false },
  { id: "graneleiro", nome: "Graneleiro", fechado: false },
];

export const carroceriaFechada = (id) => id === "bau" || id === "sider";
export const nomeCarroceria = (id) => CARROCERIAS.find((c) => c.id === id)?.nome || "—";

// Frota de referência (medidas úteis aproximadas, em metros). Editável pela Transfast.
export const VEICULOS = [
  { id: "3-4", nome: "3/4", eixos: "2 eixos", comprimento: 4.5, largura: 2.2, altura: 2.0, carroceria: "bau", pesoMax: 3500 },
  { id: "toco", nome: "Toco", eixos: "2 eixos", comprimento: 7.0, largura: 2.4, altura: 2.4, carroceria: "bau", pesoMax: 6000 },
  { id: "truck", nome: "Truck", eixos: "3 eixos", comprimento: 8.5, largura: 2.4, altura: 2.6, carroceria: "sider", pesoMax: 12000 },
  { id: "bitruck", nome: "Bitruck (4 eixos)", eixos: "4 eixos", comprimento: 10.0, largura: 2.45, altura: 2.7, carroceria: "sider", pesoMax: 16000 },
  { id: "carreta-simples", nome: "Carreta simples", eixos: "5 eixos", comprimento: 12.5, largura: 2.45, altura: 2.7, carroceria: "sider", pesoMax: 27000 },
  { id: "carreta-4", nome: "Carreta 4 eixos", eixos: "7 eixos (c/ cavalo)", comprimento: 14.0, largura: 2.48, altura: 2.9, carroceria: "sider", pesoMax: 40000 },
  { id: "carreta-ls", nome: "Carreta LS", eixos: "6 eixos", comprimento: 15.0, largura: 2.48, altura: 2.9, carroceria: "sider", pesoMax: 33000 },
  { id: "bitrem", nome: "Bitrem", eixos: "7 eixos", comprimento: 19.0, largura: 2.48, altura: 2.9, carroceria: "graneleiro", pesoMax: 37000 },
  { id: "rodotrem", nome: "Rodotrem", eixos: "9 eixos", comprimento: 25.0, largura: 2.48, altura: 2.9, carroceria: "graneleiro", pesoMax: 45000 },
];

/**
 * Avalia se a cubagem cabe em cada veículo.
 * Retorna [{ veiculo, status: 'cabe'|'justo'|'nao-cabe', motivos[], ocupacaoComprimento }]
 */
export function avaliarVeiculos(metrosLineares, maiorLargura, pesoTotal, frota = VEICULOS) {
  return frota.map((veiculo) => {
    const motivos = [];

    const cabeComprimento = metrosLineares <= veiculo.comprimento + 1e-6;
    const cabeLargura = maiorLargura <= veiculo.largura + 1e-6;
    const cabePeso = pesoTotal <= 0 || pesoTotal <= veiculo.pesoMax;

    if (!cabeComprimento) {
      motivos.push(`Faltam ${(metrosLineares - veiculo.comprimento).toFixed(2)} m de comprimento`);
    }
    if (!cabeLargura) {
      motivos.push(`Material com ${maiorLargura.toFixed(2)} m não cabe na largura de ${veiculo.largura} m`);
    }
    if (!cabePeso) {
      motivos.push(
        `Peso ${(pesoTotal / 1000).toFixed(1)} t acima do limite de ${(veiculo.pesoMax / 1000).toFixed(1)} t`,
      );
    }

    const ocupacaoComprimento = veiculo.comprimento
      ? (metrosLineares / veiculo.comprimento) * 100
      : 0;

    let status;
    if (!cabeComprimento || !cabeLargura || !cabePeso) {
      status = "nao-cabe";
    } else if (ocupacaoComprimento >= 90) {
      status = "justo";
    } else {
      status = "cabe";
    }

    return { veiculo, status, motivos, ocupacaoComprimento };
  });
}
