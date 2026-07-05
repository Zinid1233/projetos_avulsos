# Transfast · Cubagem

App **Vite + React** (JavaScript, CSS puro), sem login. Tema preto/vermelho da Transfast.

- UI em `src/pages/Cubagem.jsx` (+ `Cubagem.css`) e `src/components/`.
- Lógica em `src/lib/` (`packing.js`, `vehicles.js`).
- Função serverless de leitura de imagem em `api/analyze.js` (Vercel, usa Claude — precisa de `ANTHROPIC_API_KEY`).
- Imagens/logo em `src/assets/` (importe e use como `<img src={logo} />`).
- Deploy: Vercel detecta Vite automaticamente e serve `/api`.
