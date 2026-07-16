# Transfast · Planejamento de Carga (WEG)

App **Vite + React** (JavaScript, CSS puro) — ferramenta operacional B2B, tema dark premium
(TransFAST × WEG). Sem login.

- UI em `src/pages/Cubagem.jsx` (+ `Cubagem.css`) e `src/components/`
  (`TruckView`, `NumInput`, `TransfastLogo`).
- Design tokens em `src/index.css` (variáveis CSS: --bg-*, --text-*, --brand, etc.).
- Ícones: **lucide-react** (sem emojis).
- Regras de negócio (NÃO alterar sem pedido): `src/lib/packing.js` (metros lineares,
  área, volume, folga/MARGEM, empacotamento), `src/lib/vehicles.js` (frota, avaliar,
  checarLimites/AET). Drag/rotação/encaixe no `TruckView`.
- Leitura por imagem/texto: serverless `api/analyze.js` (Vercel) via **Google Gemini**
  (env `GEMINI_API_KEY`). Aceita `{imageBase64}` ou `{texto}`.
- Frota editável salva em localStorage (`transfast_frota_v2`).
- Deploy: Vercel (framework **Vite**, saída `dist`, serve `/api`).
