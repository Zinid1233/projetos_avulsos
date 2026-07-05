// Tipos centrais do sistema de cubagem / metro linear da Transfast

export type Unidade = "mm" | "cm" | "m";

/** Um material informado pelo cliente. Medidas guardadas sempre em metros. */
export interface Material {
  id: string;
  nome: string;
  comprimento: number; // metros
  largura: number; // metros
  quantidade: number;
  cor: string; // cor usada na vista de cima
}

/** Retângulo posicionado no piso do caminhão (vista de cima). */
export interface Peca {
  materialId: string;
  nome: string;
  cor: string;
  x: number; // posição ao longo do comprimento (m)
  y: number; // posição ao longo da largura (m)
  comprimento: number; // ocupação no eixo X (m)
  largura: number; // ocupação no eixo Y (m)
}

export interface ResultadoCubagem {
  metrosLineares: number; // metros de piso ocupados
  larguraPlanejamento: number; // largura útil usada no cálculo (m)
  areaTotal: number; // m² de piso ocupado
  pecas: Peca[];
  totalPecas: number;
  pecaMaiorLargura: number; // maior largura de um material (m) — precisa caber no veículo
  algumaForaDeMedida: boolean; // algum material não cabe na largura de planejamento
}

/** Especificação de um veículo brasileiro (medidas úteis do compartimento de carga). */
export interface Veiculo {
  id: string;
  nome: string;
  eixos: string;
  comprimento: number; // comprimento útil do piso (m) = metros lineares disponíveis
  largura: number; // largura útil (m)
  pesoMax: number; // capacidade aproximada de carga (kg)
}
