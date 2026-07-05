# Transfast · Cubagem (metro linear)

Ferramenta para a transportadora **Transfast** calcular quantos **metros lineares**
de piso um conjunto de materiais ocupa em um caminhão — considerando que os
materiais **não empilham** (só largura × comprimento) — e indicar qual veículo
atende (3/4, toco, truck, bitruck, carreta, bitrem, rodotrem…).

## O que faz

- **Lançamento de medidas** em mm, cm ou m, com quantidade por material.
- **📷 Adicionar arquivo**: envia uma foto com as medidas e o sistema lê os
  valores automaticamente (via IA de visão) e preenche a lista.
- **Cálculo de metros lineares** com empacotamento no piso (peças lado a lado
  atravessando a largura útil; quando enche, avança no comprimento).
- **Vista de cima colorida** dos materiais, com o limite do veículo escolhido.
- **Comparação com a frota**: mostra em quais veículos a carga cabe, fica justa
  ou não cabe (comprimento, largura e peso opcional).

## Rodando localmente

```bash
npm install
npm run dev
# abre http://localhost:3000
```

## Análise automática de imagem (opcional)

O botão "Adicionar arquivo" usa a API da Anthropic (Claude) para ler as medidas
da foto. Para habilitar, defina a variável de ambiente:

```
ANTHROPIC_API_KEY=sua-chave-aqui
```

- **Local**: crie um arquivo `.env.local` com a linha acima.
- **Vercel**: em *Project → Settings → Environment Variables*, adicione
  `ANTHROPIC_API_KEY`.

Sem a chave, o lançamento **manual** continua funcionando normalmente; apenas a
leitura automática da imagem fica indisponível (com aviso na tela).

## Deploy na Vercel

O projeto é um app **Next.js** — a Vercel detecta e faz o build automaticamente.
Basta importar o repositório e (opcionalmente) configurar `ANTHROPIC_API_KEY`.

## Ajustando a frota

As medidas úteis dos veículos ficam em [`lib/vehicles.ts`](lib/vehicles.ts) e
podem ser ajustadas para a realidade da Transfast.

---

Feito com Next.js + Tailwind. Cálculo e visualização em `lib/` e `components/`.
