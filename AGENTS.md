# Transfast · Cubagem

App **Vite + React** (JavaScript, CSS puro), sem login. Tema preto/vermelho da Transfast.

- UI em `src/pages/Cubagem.jsx` (+ `Cubagem.css`) e `src/components/`.
- Lógica em `src/lib/` (`packing.js`, `vehicles.js`).
- Leitura de medidas por imagem: função serverless `api/analyze.js` (Vercel) usando
  **Google Gemini** (nível gratuito). Precisa da env `GEMINI_API_KEY`. A imagem é
  reduzida no navegador antes de enviar. Lê tabelas (packing list) e fotos soltas.
- Imagens/logo em `src/assets/` (importe e use como `<img src={logo} />`).
- Deploy: Vercel detecta Vite automaticamente e serve `/api`.
