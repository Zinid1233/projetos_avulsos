// Frota de referência (medidas úteis aproximadas). Editável conforme a Transfast.
export const VEICULOS = [
  { id: "3-4", nome: "3/4", eixos: "2 eixos", comprimento: 4.5, largura: 2.2, altura: 2.0, pesoMax: 3500 },
  { id: "toco", nome: "Toco", eixos: "2 eixos", comprimento: 7.0, largura: 2.4, altura: 2.4, pesoMax: 6000 },
  { id: "truck", nome: "Truck", eixos: "3 eixos", comprimento: 8.5, largura: 2.4, altura: 2.6, pesoMax: 12000 },
  { id: "bitruck", nome: "Bitruck (4 eixos)", eixos: "4 eixos", comprimento: 10.0, largura: 2.45, altura: 2.7, pesoMax: 16000 },
  { id: "carreta-simples", nome: "Carreta simples", eixos: "2 eixos", comprimento: 12.5, largura: 2.45, altura: 2.7, pesoMax: 25000 },
  { id: "carreta-3", nome: "Carreta (3 eixos)", eixos: "3 eixos", comprimento: 14.0, largura: 2.48, altura: 2.9, pesoMax: 27000 },
  { id: "carreta-5", nome: "Carreta 5 eixos (LS)", eixos: "5 eixos", comprimento: 15.0, largura: 2.48, altura: 2.9, pesoMax: 30000 },
  { id: "bitrem", nome: "Bitrem", eixos: "7 eixos", comprimento: 19.0, largura: 2.48, altura: 2.9, pesoMax: 37000 },
  { id: "rodotrem", nome: "Rodotrem", eixos: "9 eixos", comprimento: 25.0, largura: 2.48, altura: 2.9, pesoMax: 45000 },
];

/**
 * Avalia se a cubagem cabe em cada veículo.
 * Retorna [{ veiculo, status: 'cabe'|'justo'|'nao-cabe', motivos[], ocupacaoComprimento }]
 */
export function avaliarVeiculos(metrosLineares, maiorLargura, pesoTotal) {
  return VEICULOS.map((veiculo) => {
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
