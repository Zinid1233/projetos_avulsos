# Transfast · Cubagem

Dashboard da transportadora **Transfast** para cubagem: calcula **metros lineares**
(carga no piso, sem/com empilhamento) ou **volume (m³) + peso cubado**, mostra uma
**vista de cima colorida** e indica o **veículo ideal** (3/4 a rodotrem).

Feito em **Vite + React** (JavaScript, CSS puro), tema preto/vermelho, sem login.

## Modos

- **🚚 Medidas do veículo (metro linear):** materiais no piso sem empilhar. Se marcar
  *"pode ser remontado"*, empilha até a altura informada (ou a altura do baú do veículo)
  e recalcula os metros lineares; a vista mostra `×N` por pilha.
- **📦 Medidas cúbicas (m³):** volume total (C×L×A×qtd) e **peso cubado**
  (volume × fator, padrão ≈ 300 kg/m³), com volume por material.

## Rodando localmente

```bash
npm install
npm run dev
# abre http://localhost:5173
```

> A leitura de medidas por **foto** usa uma função serverless em `api/` — ela só roda
> quando publicada na Vercel (ou via `vercel dev`). Localmente, use o lançamento manual.

## Leitura de medidas por imagem (grátis, opcional)

O botão **📷 Adicionar arquivo(s)** reduz a imagem no navegador e envia para
`api/analyze.js`, que usa o **Google Gemini** (nível gratuito) para ler as medidas —
funciona tanto em **tabelas / packing list** quanto em fotos soltas. Aceita vários
arquivos de uma vez. Configure na Vercel a variável (chave **gratuita**, sem cartão):

```
GEMINI_API_KEY=sua-chave-do-google-ai-studio
```

Gere a chave em https://aistudio.google.com/apikey (grátis). Sem a chave, o app
funciona 100% no modo manual.

## Deploy na Vercel

Framework **Vite** (detectado automaticamente). Build: `npm run build` · saída: `dist`.
As funções em `api/` são servidas como serverless. Configure `GEMINI_API_KEY` para a foto.

## Onde mexer

- Interface: `src/pages/Cubagem.jsx` + `src/pages/Cubagem.css`
- Cálculo: `src/lib/packing.js` · Frota/veículos: `src/lib/vehicles.js`
- Vista de cima: `src/components/TruckView.jsx`
- **Logo:** troque `src/assets/logo.svg` pelo logo da Transfast (o import está em `Cubagem.jsx`).
