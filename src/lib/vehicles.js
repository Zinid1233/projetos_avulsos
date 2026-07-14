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

// Limites legais de trânsito (CONTRAN/DNIT). Acima disso, precisa de AET (licença).
export const LIMITE_ALTURA = 4.4; // m (do chão ao topo da carga)
export const LIMITE_LARGURA = 2.6; // m

/**
 * Verifica se a carga excede os limites legais e precisaria de licença (AET).
 * @param alturaTotal altura do chão ao topo da carga (m)
 * @param larguraCarga maior largura de um material (m)
 * @param metrosLineares comprimento ocupado (m)
 * @param comprimentoVeiculo comprimento útil do veículo (m); 0/undefined ignora
 */
export function checarLimites(alturaTotal, larguraCarga, metrosLineares, comprimentoVeiculo) {
  const motivos = [];
  if (alturaTotal > LIMITE_ALTURA + 1e-6) {
    motivos.push(`Altura ${alturaTotal.toFixed(2)} m acima do limite de ${LIMITE_ALTURA} m`);
  }
  if (larguraCarga > LIMITE_LARGURA + 1e-6) {
    motivos.push(`Largura ${larguraCarga.toFixed(2)} m acima do limite de ${LIMITE_LARGURA} m`);
  }
  if (comprimentoVeiculo && metrosLineares > comprimentoVeiculo + 1e-6) {
    motivos.push(
      `Comprimento excede o veículo em ${(metrosLineares - comprimentoVeiculo).toFixed(2)} m (balanço)`,
    );
  }
  return { precisa: motivos.length > 0, motivos };
}

// Frota de referência (medidas úteis aproximadas, em metros). Editável pela Transfast.
export const VEICULOS = [
  { id: "3-4", nome: "3/4", eixos: "2 eixos", comprimento: 4.5, largura: 2.2, altura: 2.0, alturaPiso: 1.1, carroceria: "bau", pesoMax: 3500 },
  { id: "toco", nome: "Toco", eixos: "2 eixos", comprimento: 7.0, largura: 2.4, altura: 2.4, alturaPiso: 1.2, carroceria: "bau", pesoMax: 6000 },
  { id: "truck", nome: "Truck", eixos: "3 eixos", comprimento: 8.5, largura: 2.4, altura: 2.6, alturaPiso: 1.3, carroceria: "sider", pesoMax: 12000 },
  { id: "bitruck", nome: "Bitruck (4 eixos)", eixos: "4 eixos", comprimento: 10.0, largura: 2.45, altura: 2.7, alturaPiso: 1.3, carroceria: "sider", pesoMax: 16000 },
  { id: "carreta-simples", nome: "Carreta simples", eixos: "5 eixos", comprimento: 12.5, largura: 2.45, altura: 2.7, alturaPiso: 1.2, carroceria: "sider", pesoMax: 27000 },
  { id: "carreta-4", nome: "Carreta 4 eixos", eixos: "7 eixos (c/ cavalo)", comprimento: 14.0, largura: 2.48, altura: 2.9, alturaPiso: 1.2, carroceria: "sider", pesoMax: 40000 },
  { id: "carreta-ls", nome: "Carreta LS", eixos: "6 eixos", comprimento: 15.0, largura: 2.48, altura: 2.9, alturaPiso: 1.2, carroceria: "sider", pesoMax: 33000 },
  { id: "bitrem", nome: "Bitrem", eixos: "7 eixos", comprimento: 19.0, largura: 2.48, altura: 2.9, alturaPiso: 1.2, carroceria: "graneleiro", pesoMax: 37000 },
  { id: "rodotrem", nome: "Rodotrem", eixos: "9 eixos", comprimento: 25.0, largura: 2.48, altura: 2.9, alturaPiso: 1.2, carroceria: "graneleiro", pesoMax: 45000 },
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
