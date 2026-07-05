"use client";

import { useMemo, useRef, useState } from "react";
import { Material, Modo, Unidade } from "@/lib/types";
import { calcularCubagem, corPorIndice, paraMetros } from "@/lib/packing";
import { avaliarVeiculos, VEICULOS } from "@/lib/vehicles";
import TruckView from "@/components/TruckView";

let contador = 0;
const novoId = () => `m${++contador}-${Math.floor(performance.now())}`;

function novoMaterial(indice: number): Material {
  return {
    id: novoId(),
    nome: `Material ${indice + 1}`,
    comprimento: 1,
    largura: 0.5,
    altura: 0.5,
    quantidade: 1,
    cor: corPorIndice(indice),
  };
}

export default function Home() {
  const [modo, setModo] = useState<Modo>("veiculo");
  const [materiais, setMateriais] = useState<Material[]>([novoMaterial(0)]);
  const [unidade, setUnidade] = useState<Unidade>("cm");
  const [larguraPlanejamento, setLarguraPlanejamento] = useState(2.4);
  const [pesoTotal, setPesoTotal] = useState<string>("");
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<string>("");
  const [remontar, setRemontar] = useState(false);
  const [alturaMaxRemonte, setAlturaMaxRemonte] = useState(2.7);
  const [fatorCubagem, setFatorCubagem] = useState(300);
  const [analisando, setAnalisando] = useState(false);
  const [erroAnalise, setErroAnalise] = useState<string>("");
  const [obsAnalise, setObsAnalise] = useState<string>("");
  const inputArquivo = useRef<HTMLInputElement>(null);

  const fator = unidade === "mm" ? 1000 : unidade === "cm" ? 100 : 1;
  const empilhando = modo === "veiculo" && remontar;
  const mostrarAltura = modo === "cubico" || empilhando;

  const resultado = useMemo(
    () =>
      calcularCubagem(materiais, larguraPlanejamento, {
        remontar: empilhando,
        alturaMaxRemonte,
      }),
    [materiais, larguraPlanejamento, empilhando, alturaMaxRemonte],
  );

  const pesoNum = Number(pesoTotal) || 0;
  const avaliacoes = useMemo(
    () => avaliarVeiculos(resultado.metrosLineares, resultado.pecaMaiorLargura, pesoNum),
    [resultado.metrosLineares, resultado.pecaMaiorLargura, pesoNum],
  );

  const veiculo = VEICULOS.find((v) => v.id === veiculoSelecionado);
  const pesoCubado = resultado.volumeTotal * fatorCubagem;

  function atualizar(id: string, campo: keyof Material, valor: number | string) {
    setMateriais((atual) =>
      atual.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)),
    );
  }

  function exibir(valorMetros: number): number {
    return Number((valorMetros * fator).toFixed(2));
  }
  function definirDimensao(
    id: string,
    campo: "comprimento" | "largura" | "altura",
    valorNaUnidade: number,
  ) {
    atualizar(id, campo, paraMetros(valorNaUnidade || 0, unidade));
  }

  function adicionar() {
    setMateriais((atual) => [...atual, novoMaterial(atual.length)]);
  }
  function remover(id: string) {
    setMateriais((atual) => (atual.length > 1 ? atual.filter((m) => m.id !== id) : atual));
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setErroAnalise("");
    setObsAnalise("");
    setAnalisando(true);
    try {
      const base64 = await lerBase64(arquivo);
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: arquivo.type }),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        setErroAnalise(dados.error || "Falha na análise da imagem.");
        return;
      }
      const items: Array<{
        nome: string;
        comprimento_cm: number;
        largura_cm: number;
        altura_cm?: number;
        quantidade: number;
      }> = dados.items || [];
      if (items.length === 0) {
        setErroAnalise("Nenhuma medida encontrada na imagem.");
        return;
      }
      const novos: Material[] = items.map((it, i) => ({
        id: novoId(),
        nome: it.nome || `Material ${i + 1}`,
        comprimento: paraMetros(it.comprimento_cm || 0, "cm"),
        largura: paraMetros(it.largura_cm || 0, "cm"),
        altura: it.altura_cm ? paraMetros(it.altura_cm, "cm") : 0.5,
        quantidade: Math.max(1, Math.floor(it.quantidade || 1)),
        cor: corPorIndice(i),
      }));
      setMateriais(novos);
      setUnidade("cm");
      if (dados.observacao) setObsAnalise(dados.observacao);
    } catch (err) {
      setErroAnalise(err instanceof Error ? err.message : "Erro ao processar a imagem.");
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Transfast · Cubagem
            </h1>
            <p className="text-sm text-slate-500">
              {modo === "veiculo"
                ? "Metros lineares e veículo ideal"
                : "Volume (m³) e peso cubado"}
            </p>
          </div>

          {/* seletor de modo */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-sm">
            <button
              onClick={() => setModo("veiculo")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                modo === "veiculo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              🚚 Medidas do veículo
            </button>
            <button
              onClick={() => setModo("cubico")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                modo === "cubico" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              📦 Medidas cúbicas
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Coluna principal */}
        <section className="space-y-6">
          {/* Materiais */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-slate-900">Materiais</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-500">Unidade:</label>
                <select
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value as Unidade)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </select>
                <button
                  onClick={() => inputArquivo.current?.click()}
                  disabled={analisando}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {analisando ? "Analisando…" : "📷 Adicionar arquivo"}
                </button>
                <input
                  ref={inputArquivo}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={aoEscolherArquivo}
                />
              </div>
            </div>

            {erroAnalise && (
              <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroAnalise}</p>
            )}
            {obsAnalise && (
              <p className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">🔍 {obsAnalise}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2 pr-2 font-medium"></th>
                    <th className="pb-2 pr-2 font-medium">Material</th>
                    <th className="pb-2 pr-2 font-medium">Compr. ({unidade})</th>
                    <th className="pb-2 pr-2 font-medium">Larg. ({unidade})</th>
                    {mostrarAltura && (
                      <th className="pb-2 pr-2 font-medium">Alt. ({unidade})</th>
                    )}
                    <th className="pb-2 pr-2 font-medium">Qtd</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {materiais.map((m) => (
                    <tr key={m.id} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <span
                          className="inline-block h-4 w-4 rounded"
                          style={{ backgroundColor: m.cor }}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={m.nome}
                          onChange={(e) => atualizar(m.id, "nome", e.target.value)}
                          className="w-32 rounded-md border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={exibir(m.comprimento)}
                          onChange={(e) => definirDimensao(m.id, "comprimento", Number(e.target.value))}
                          className="w-24 rounded-md border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={exibir(m.largura)}
                          onChange={(e) => definirDimensao(m.id, "largura", Number(e.target.value))}
                          className="w-24 rounded-md border border-slate-300 px-2 py-1"
                        />
                      </td>
                      {mostrarAltura && (
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0}
                            value={exibir(m.altura)}
                            onChange={(e) => definirDimensao(m.id, "altura", Number(e.target.value))}
                            className="w-24 rounded-md border border-slate-300 px-2 py-1"
                          />
                        </td>
                      )}
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={1}
                          value={m.quantidade}
                          onChange={(e) =>
                            atualizar(m.id, "quantidade", Math.max(1, Number(e.target.value)))
                          }
                          className="w-16 rounded-md border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => remover(m.id)}
                          className="text-slate-400 hover:text-red-600"
                          title="Remover"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={adicionar}
              className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              + Adicionar material
            </button>
          </div>

          {/* Segunda card: vista de cima (veículo) ou volume por material (cúbico) */}
          {modo === "veiculo" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">Vista de cima</h2>
              <TruckView
                pecas={resultado.pecas}
                larguraPlanejamento={larguraPlanejamento}
                metrosLineares={resultado.metrosLineares}
                comprimentoVeiculo={veiculo?.comprimento}
                nomeVeiculo={veiculo?.nome}
              />
              {empilhando && (
                <p className="mt-2 text-sm text-slate-500">
                  ×N indica quantas peças estão empilhadas na mesma posição (até {alturaMaxRemonte} m).
                </p>
              )}
              {resultado.algumaForaDeMedida && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠ Algum material é mais largo que a largura de planejamento ({larguraPlanejamento} m).
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">Volume por material</h2>
              <ul className="space-y-2 text-sm">
                {materiais.map((m) => {
                  const vol = m.comprimento * m.largura * m.altura * Math.max(0, Math.floor(m.quantidade || 0));
                  return (
                    <li key={m.id} className="flex items-center justify-between border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: m.cor }} />
                        {m.nome}
                        <span className="text-slate-400">
                          ({exibir(m.comprimento)}×{exibir(m.largura)}×{exibir(m.altura)} {unidade} · {m.quantidade}un)
                        </span>
                      </span>
                      <span className="font-medium">{vol.toFixed(3)} m³</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Coluna lateral */}
        <aside className="space-y-6">
          {/* Resultado */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Resultado</h2>

            {modo === "veiculo" ? (
              <>
                <div className="rounded-lg bg-slate-900 p-4 text-white">
                  <div className="text-3xl font-bold">{resultado.metrosLineares.toFixed(2)} m</div>
                  <div className="text-sm text-slate-300">metros lineares</div>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Área de piso</dt>
                    <dd>{resultado.areaTotal.toFixed(2)} m²</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Peças</dt>
                    <dd>
                      {resultado.totalPecas}
                      {empilhando && ` em ${resultado.totalPosicoes} pilha(s)`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Maior largura</dt>
                    <dd>{(resultado.pecaMaiorLargura * fator).toFixed(0)} {unidade}</dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 text-sm">
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Largura útil (m)</span>
                    <input
                      type="number"
                      step={0.05}
                      min={1}
                      value={larguraPlanejamento}
                      onChange={(e) => setLarguraPlanejamento(Number(e.target.value) || 2.4)}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Peso total (kg)</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="opcional"
                      value={pesoTotal}
                      onChange={(e) => setPesoTotal(e.target.value)}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1"
                    />
                  </label>

                  {/* remontar / empilhar */}
                  <div className="rounded-lg bg-slate-50 p-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={remontar}
                        onChange={(e) => setRemontar(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="font-medium text-slate-700">
                        Material pode ser remontado (empilhado)?
                      </span>
                    </label>
                    {remontar && (
                      <div className="mt-2 space-y-1">
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">Empilhar até (m)</span>
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            value={alturaMaxRemonte}
                            onChange={(e) => setAlturaMaxRemonte(Number(e.target.value) || 0)}
                            className="w-24 rounded-md border border-slate-300 px-2 py-1"
                          />
                        </label>
                        {veiculo && (
                          <button
                            onClick={() => setAlturaMaxRemonte(veiculo.altura)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            ↧ usar altura do baú do {veiculo.nome} ({veiculo.altura} m)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-slate-900 p-4 text-white">
                  <div className="text-3xl font-bold">{resultado.volumeTotal.toFixed(3)} m³</div>
                  <div className="text-sm text-slate-300">volume total (cubagem)</div>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Peso cubado</dt>
                    <dd className="font-medium">{Math.round(pesoCubado)} kg</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Área de piso</dt>
                    <dd>{resultado.areaTotal.toFixed(2)} m²</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Total de peças</dt>
                    <dd>{resultado.totalPecas}</dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Fator de cubagem (kg/m³)</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={fatorCubagem}
                      onChange={(e) => setFatorCubagem(Number(e.target.value) || 0)}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <p className="mt-1 text-xs text-slate-400">
                    Peso cubado = volume × fator (padrão rodoviário ≈ 300 kg/m³).
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Veículos — só no modo veículo */}
          {modo === "veiculo" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">Veículos</h2>
              <p className="mb-3 text-xs text-slate-500">Clique para ver o limite na vista de cima.</p>
              <ul className="space-y-2">
                {avaliacoes.map(({ veiculo: v, status, motivos, ocupacaoComprimento }) => {
                  const cor =
                    status === "cabe"
                      ? "border-green-200 bg-green-50"
                      : status === "justo"
                        ? "border-amber-200 bg-amber-50"
                        : "border-red-200 bg-red-50";
                  const badge = status === "cabe" ? "✓" : status === "justo" ? "≈" : "✗";
                  const badgeCor =
                    status === "cabe"
                      ? "text-green-600"
                      : status === "justo"
                        ? "text-amber-600"
                        : "text-red-600";
                  const ativo = v.id === veiculoSelecionado;
                  return (
                    <li key={v.id}>
                      <button
                        onClick={() => setVeiculoSelecionado(ativo ? "" : v.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${cor} ${
                          ativo ? "ring-2 ring-slate-900" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">{v.nome}</span>
                          <span className={`font-bold ${badgeCor}`}>{badge}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-xs text-slate-500">
                          <span>
                            {v.comprimento} m · {v.largura} m · {v.altura} m · {(v.pesoMax / 1000).toFixed(0)} t
                          </span>
                          {status !== "nao-cabe" && <span>{ocupacaoComprimento.toFixed(0)}%</span>}
                        </div>
                        {status === "nao-cabe" && motivos[0] && (
                          <div className="mt-1 text-xs text-red-600">{motivos[0]}</div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function lerBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const virgula = res.indexOf(",");
      resolve(virgula >= 0 ? res.slice(virgula + 1) : res);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(arquivo);
  });
}
