import { useEffect, useMemo, useRef, useState } from "react";
import { calcularCubagem, corPorIndice, paraMetros, MARGEM } from "../lib/packing.js";
import {
  avaliarVeiculos,
  VEICULOS,
  CARROCERIAS,
  carroceriaFechada,
  nomeCarroceria,
} from "../lib/vehicles.js";
import TruckView from "../components/TruckView.jsx";
import NumInput from "../components/NumInput.jsx";
import logo from "../assets/logo.svg";
import "./Cubagem.css";

let contador = 0;
const novoId = () => `m${++contador}-${Math.floor(performance.now())}`;

function novoMaterial(indice) {
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

const FROTA_KEY = "transfast_frota_v2";
function carregarFrota() {
  try {
    const s = localStorage.getItem(FROTA_KEY);
    const arr = s ? JSON.parse(s) : null;
    if (Array.isArray(arr) && arr.length) {
      // completa campos que possam faltar em versões antigas
      return arr.map((v) => ({ carroceria: "sider", altura: 2.7, ...v }));
    }
  } catch {
    /* ignora */
  }
  return VEICULOS.map((v) => ({ ...v }));
}

export default function Cubagem() {
  const [modo, setModo] = useState("veiculo");
  const [materiais, setMateriais] = useState([novoMaterial(0)]);
  const [unidade, setUnidade] = useState("cm");
  const [frota, setFrota] = useState(carregarFrota);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
  const [larguraManual, setLarguraManual] = useState(2.4);
  const [pesoTotal, setPesoTotal] = useState("");
  const [remontar, setRemontar] = useState(false);
  const [alturaMaxRemonte, setAlturaMaxRemonte] = useState(2.7);
  const [fatorCubagem, setFatorCubagem] = useState(300);
  const [analisando, setAnalisando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erroAnalise, setErroAnalise] = useState("");
  const [obsAnalise, setObsAnalise] = useState("");
  const [avisoConferir, setAvisoConferir] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [resumo, setResumo] = useState(false);
  const [dataResumo, setDataResumo] = useState("");
  const [posicoes, setPosicoes] = useState({});
  const [rotacoes, setRotacoes] = useState({});
  const inputArquivo = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(FROTA_KEY, JSON.stringify(frota));
    } catch {
      /* ignora */
    }
  }, [frota]);

  const fator = unidade === "mm" ? 1000 : unidade === "cm" ? 100 : 1;
  const empilhando = modo === "veiculo" && remontar;
  const mostrarAltura = modo === "cubico" || empilhando;

  const veiculo = frota.find((v) => v.id === veiculoSelecionado);
  const larguraPlanejamento = veiculo ? veiculo.largura : larguraManual;

  const resultado = useMemo(
    () =>
      calcularCubagem(materiais, larguraPlanejamento, {
        remontar: empilhando,
        alturaMaxRemonte,
      }),
    [materiais, larguraPlanejamento, empilhando, alturaMaxRemonte],
  );

  // Peças com rotação e posição manual aplicadas; metros lineares efetivos.
  const pecasFinais = useMemo(
    () =>
      resultado.pecas.map((p) => {
        let q = p;
        if (rotacoes[p.id]) q = { ...q, comprimento: p.largura, largura: p.comprimento };
        if (posicoes[p.id]) q = { ...q, x: posicoes[p.id].x, y: posicoes[p.id].y };
        return q;
      }),
    [resultado.pecas, posicoes, rotacoes],
  );
  const metrosLineares = useMemo(
    () => Number(pecasFinais.reduce((mx, p) => Math.max(mx, p.x + p.comprimento), 0).toFixed(3)),
    [pecasFinais],
  );
  const mover = (id, x, y) => setPosicoes((p) => ({ ...p, [id]: { x, y } }));
  const girar = (id) => setRotacoes((r) => ({ ...r, [id]: !r[id] }));
  const refazer = () => {
    setPosicoes({});
    setRotacoes({});
  };

  const pesoNum = Number(pesoTotal) || 0;
  const avaliacoes = useMemo(
    () => avaliarVeiculos(metrosLineares, resultado.pecaMaiorLargura, pesoNum, frota),
    [metrosLineares, resultado.pecaMaiorLargura, pesoNum, frota],
  );

  const pesoCubado = resultado.volumeTotal * fatorCubagem;

  // Capacidade volumétrica do veículo selecionado (só carroceria fechada).
  const capacidadeVol =
    veiculo && carroceriaFechada(veiculo.carroceria)
      ? veiculo.comprimento * veiculo.largura * veiculo.altura
      : null;
  const ocupacaoVol = capacidadeVol ? (resultado.volumeTotal / capacidadeVol) * 100 : null;
  const cabeVol = capacidadeVol != null ? resultado.volumeTotal <= capacidadeVol + 1e-9 : null;

  // ----- materiais -----
  function atualizar(id, campo, valor) {
    setMateriais((atual) => atual.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  }
  function exibir(valorMetros) {
    return Number((valorMetros * fator).toFixed(2));
  }
  function definirDimensao(id, campo, valorNaUnidade) {
    atualizar(id, campo, paraMetros(valorNaUnidade || 0, unidade));
  }
  function adicionar() {
    setMateriais((atual) => [...atual, novoMaterial(atual.length)]);
  }
  function remover(id) {
    setMateriais((atual) => (atual.length > 1 ? atual.filter((m) => m.id !== id) : atual));
  }

  // ----- veículos -----
  function atualizarVeiculo(id, campo, valor) {
    setFrota((f) => f.map((v) => (v.id === id ? { ...v, [campo]: valor } : v)));
  }
  function resetarFrota() {
    setFrota(VEICULOS.map((v) => ({ ...v })));
  }

  async function aoEscolherArquivo(e) {
    const arquivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (arquivos.length === 0) return;

    setErroAnalise("");
    setObsAnalise("");
    setAnalisando(true);

    const coletados = [];
    const observacoes = [];
    const falhas = [];

    try {
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        if (arquivos.length > 1) setProgresso(`${i + 1}/${arquivos.length}`);
        try {
          const { base64, mediaType } = await imagemReduzida(arquivo);
          const resp = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mediaType }),
          });
          const texto = await resp.text();
          let dados;
          try {
            dados = JSON.parse(texto);
          } catch {
            falhas.push(`${arquivo.name}: leitura indisponível (verifique a GEMINI_API_KEY)`);
            continue;
          }
          if (!resp.ok) {
            falhas.push(`${arquivo.name}: ${dados.error || "falha na leitura"}`);
            continue;
          }
          for (const it of dados.items || []) coletados.push(it);
          if (dados.observacao) observacoes.push(dados.observacao);
        } catch (err) {
          falhas.push(`${arquivo.name}: ${err instanceof Error ? err.message : "erro"}`);
        }
      }

      if (coletados.length === 0) {
        setErroAnalise(
          falhas[0] || "Não consegui identificar medidas na(s) imagem(ns). Lance manualmente.",
        );
        return;
      }

      // SOMA à lista atual (mantém manuais e de outras fotos)
      setMateriais((atual) => {
        const base = atual.length;
        const novos = coletados.map((it, i) => ({
          id: novoId(),
          nome: it.nome || `Material ${base + i + 1}`,
          comprimento: paraMetros(it.comprimento_cm || 0, "cm"),
          largura: paraMetros(it.largura_cm || 0, "cm"),
          altura: it.altura_cm ? paraMetros(it.altura_cm, "cm") : 0.5,
          quantidade: Math.max(1, Math.floor(it.quantidade || 1)),
          cor: corPorIndice(base + i),
        }));
        return [...atual, ...novos];
      });
      setUnidade("cm");
      setAvisoConferir(true);

      const partes = [`${coletados.length} item(ns) adicionado(s).`];
      if (observacoes.length) partes.push(observacoes.join(" · "));
      setObsAnalise(partes.join(" "));
      if (falhas.length) setErroAnalise(`Não lido(s): ${falhas.join(" | ")}`);
    } finally {
      setAnalisando(false);
      setProgresso("");
    }
  }

  function abrirResumo() {
    setDataResumo(new Date().toLocaleString("pt-BR"));
    setResumo(true);
  }

  // ---------- Tela de resumo (salvar / imprimir) ----------
  if (resumo) {
    const cabeVeiculo =
      modo === "veiculo" && veiculo ? metrosLineares <= veiculo.comprimento + 1e-6 : null;
    return (
      <div className="resumo-wrap">
        <div className="resumo-actions no-print">
          <button className="btn" onClick={() => setResumo(false)}>
            ✏️ Editar novamente
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ Salvar / Imprimir
          </button>
        </div>

        <div className="folha">
          <div className="folha-head">
            <div className="folha-brand">
              TRANS<span>FAST</span>
            </div>
            <div className="folha-title">
              <div className="folha-h1">Resumo de cubagem</div>
              <div className="folha-date">{dataResumo}</div>
            </div>
          </div>

          {observacao && (
            <div className="folha-obs">
              <strong>Cotação / Observações</strong>
              <div>{observacao}</div>
            </div>
          )}

          <div className="folha-result">
            {modo === "veiculo" ? (
              <>
                <div>
                  <span>Metros lineares</span>
                  <b>{metrosLineares.toFixed(2)} m</b>
                </div>
                <div>
                  <span>Área de piso</span>
                  <b>{resultado.areaTotal.toFixed(2)} m²</b>
                </div>
                <div>
                  <span>Largura útil</span>
                  <b>{larguraPlanejamento} m</b>
                </div>
                {empilhando && (
                  <div>
                    <span>Empilhado até</span>
                    <b>{alturaMaxRemonte} m</b>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <span>Volume total</span>
                  <b>{resultado.volumeTotal.toFixed(3)} m³</b>
                </div>
                <div>
                  <span>Peso cubado</span>
                  <b>
                    {Math.round(pesoCubado)} kg <small>({fatorCubagem} kg/m³)</small>
                  </b>
                </div>
              </>
            )}
            <div>
              <span>Total de peças</span>
              <b>{resultado.totalPecas}</b>
            </div>
            {pesoNum > 0 && (
              <div>
                <span>Peso informado</span>
                <b>{pesoNum} kg</b>
              </div>
            )}
          </div>

          {veiculo && (
            <div className="folha-veic">
              <strong>Veículo:</strong> {veiculo.nome} ({veiculo.eixos}) ·{" "}
              {veiculo.comprimento}×{veiculo.largura}
              {carroceriaFechada(veiculo.carroceria) ? `×${veiculo.altura}` : ""} m ·{" "}
              {nomeCarroceria(veiculo.carroceria)}
              {cabeVeiculo != null && <> — {cabeVeiculo ? "✓ cabe" : "✗ não cabe"}</>}
              {modo === "cubico" && capacidadeVol != null && (
                <> — {cabeVol ? "✓ cabe" : "✗ não cabe"} ({ocupacaoVol.toFixed(0)}% de{" "}
                  {capacidadeVol.toFixed(2)} m³)</>
              )}
            </div>
          )}

          {modo === "veiculo" && (
            <div className="folha-vista">
              <TruckView
                pecas={pecasFinais}
                larguraPlanejamento={larguraPlanejamento}
                metrosLineares={metrosLineares}
                comprimentoVeiculo={veiculo?.comprimento}
                nomeVeiculo={veiculo?.nome}
                fator={fator}
                unidade={unidade}
                claro
              />
            </div>
          )}

          <table className="folha-tab">
            <thead>
              <tr>
                <th>Material</th>
                <th>Compr. ({unidade})</th>
                <th>Larg. ({unidade})</th>
                <th>Alt. ({unidade})</th>
                <th>Qtd</th>
              </tr>
            </thead>
            <tbody>
              {materiais.map((m) => (
                <tr key={m.id}>
                  <td>{m.nome}</td>
                  <td>{exibir(m.comprimento)}</td>
                  <td>{exibir(m.largura)}</td>
                  <td>{exibir(m.altura)}</td>
                  <td>{m.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="folha-foot">
            Transfast · Cubagem — documento gerado pelo sistema. Confira os valores.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src={logo} alt="Transfast" />
            <span className="brand-sub">
              {modo === "veiculo" ? "Metros lineares e veículo ideal" : "Volume (m³) e peso cubado"}
            </span>
          </div>
          <div className="modo-tabs">
            <button
              className={`modo-tab ${modo === "veiculo" ? "ativo" : ""}`}
              onClick={() => setModo("veiculo")}
            >
              🚚 Medidas do veículo
            </button>
            <button
              className={`modo-tab ${modo === "cubico" ? "ativo" : ""}`}
              onClick={() => setModo("cubico")}
            >
              📦 Medidas cúbicas
            </button>
          </div>
        </div>
      </header>

      <div className="page">
        {/* Coluna principal */}
        <section className="col">
          <div className="card">
            <div className="toolbar">
              <h2 className="card-title" style={{ margin: 0 }}>
                Materiais
              </h2>
              <div className="toolbar-right">
                <span className="muted">Unidade:</span>
                <select className="select" value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </select>
                <button
                  className="btn btn-primary"
                  onClick={() => inputArquivo.current?.click()}
                  disabled={analisando}
                >
                  {analisando
                    ? progresso
                      ? `Analisando ${progresso}…`
                      : "Analisando…"
                    : "📷 Adicionar arquivo(s)"}
                </button>
                <input
                  ref={inputArquivo}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={aoEscolherArquivo}
                />
              </div>
            </div>

            {avisoConferir && (
              <p className="alert alert-warn">
                ⚠ Confira os valores lidos da imagem — a IA acerta muito, mas pode errar
                quantidades ou medidas.
                <button className="alert-x" onClick={() => setAvisoConferir(false)} title="Ok">
                  ✕
                </button>
              </p>
            )}
            {erroAnalise && <p className="alert alert-error">{erroAnalise}</p>}
            {obsAnalise && <p className="alert alert-info">🔍 {obsAnalise}</p>}

            <div className="table-wrap">
              <table className="mat">
                <thead>
                  <tr>
                    <th></th>
                    <th>Material</th>
                    <th>Compr. ({unidade})</th>
                    <th>Larg. ({unidade})</th>
                    {mostrarAltura && <th>Alt. ({unidade})</th>}
                    <th>Qtd</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {materiais.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className="swatch" style={{ backgroundColor: m.cor }} />
                      </td>
                      <td>
                        <input
                          className="inp inp-nome"
                          value={m.nome}
                          onChange={(e) => atualizar(m.id, "nome", e.target.value)}
                        />
                      </td>
                      <td>
                        <NumInput
                          className="inp inp-num"
                          min={0}
                          value={exibir(m.comprimento)}
                          onChange={(n) => definirDimensao(m.id, "comprimento", n)}
                        />
                      </td>
                      <td>
                        <NumInput
                          className="inp inp-num"
                          min={0}
                          value={exibir(m.largura)}
                          onChange={(n) => definirDimensao(m.id, "largura", n)}
                        />
                      </td>
                      {mostrarAltura && (
                        <td>
                          <NumInput
                            className="inp inp-num"
                            min={0}
                            value={exibir(m.altura)}
                            onChange={(n) => definirDimensao(m.id, "altura", n)}
                          />
                        </td>
                      )}
                      <td>
                        <NumInput
                          className="inp inp-qtd"
                          min={1}
                          value={m.quantidade}
                          onChange={(n) => atualizar(m.id, "quantidade", Math.max(1, Math.floor(n)))}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="remove-btn" onClick={() => remover(m.id)} title="Remover">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn" style={{ marginTop: 12 }} onClick={adicionar}>
              + Adicionar material
            </button>
          </div>

          {modo === "veiculo" ? (
            <div className="card">
              <div className="toolbar" style={{ marginBottom: 8 }}>
                <h2 className="card-title" style={{ margin: 0 }}>
                  Vista de cima
                </h2>
                <button className="link" onClick={refazer} title="Refazer o arranjo automático">
                  ↻ Refazer arranjo
                </button>
              </div>
              <p className="muted" style={{ marginTop: 0, marginBottom: 10 }}>
                Arraste para reposicionar (sem sobrepor, folga de 5 cm). Duplo clique gira o
                material. Passe o mouse para ver as medidas.
              </p>
              <TruckView
                pecas={pecasFinais}
                larguraPlanejamento={larguraPlanejamento}
                metrosLineares={metrosLineares}
                comprimentoVeiculo={veiculo?.comprimento}
                nomeVeiculo={veiculo?.nome}
                fator={fator}
                unidade={unidade}
                editavel
                onMover={mover}
                onGirar={girar}
                margem={MARGEM}
              />
              {empilhando && (
                <p className="muted" style={{ marginTop: 8 }}>
                  ×N indica quantas peças estão empilhadas na mesma posição (até {alturaMaxRemonte} m).
                </p>
              )}
              {resultado.algumaForaDeMedida && (
                <p className="warn">
                  ⚠ Algum material é mais largo que a largura útil ({larguraPlanejamento} m).
                </p>
              )}
            </div>
          ) : (
            <div className="card">
              <h2 className="card-title">Volume por material</h2>
              <ul className="vol-list">
                {materiais.map((m) => {
                  const vol =
                    m.comprimento * m.largura * m.altura * Math.max(0, Math.floor(m.quantidade || 0));
                  return (
                    <li key={m.id} className="vol-item">
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="swatch" style={{ backgroundColor: m.cor, height: 12, width: 12 }} />
                        {m.nome}
                        <span className="dim">
                          ({exibir(m.comprimento)}×{exibir(m.largura)}×{exibir(m.altura)} {unidade} · {m.quantidade}un)
                        </span>
                      </span>
                      <strong>{vol.toFixed(3)} m³</strong>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Coluna lateral */}
        <aside className="col">
          <div className="card">
            <h2 className="card-title">Resultado</h2>

            {modo === "veiculo" ? (
              <>
                <div className="hero">
                  <div className="hero-num">{metrosLineares.toFixed(2)} m</div>
                  <div className="hero-label">metros lineares</div>
                </div>
                <dl className="dl">
                  <div className="dl-row">
                    <dt>Área de piso</dt>
                    <dd>{resultado.areaTotal.toFixed(2)} m²</dd>
                  </div>
                  <div className="dl-row">
                    <dt>Peças</dt>
                    <dd>
                      {resultado.totalPecas}
                      {empilhando && ` em ${resultado.totalPosicoes} pilha(s)`}
                    </dd>
                  </div>
                  <div className="dl-row">
                    <dt>Largura útil</dt>
                    <dd>
                      {larguraPlanejamento} m{veiculo ? ` (${veiculo.nome})` : ""}
                    </dd>
                  </div>
                </dl>

                <div className="field-group">
                  {!veiculo && (
                    <label className="field">
                      <span>Largura útil (m)</span>
                      <NumInput
                        className="inp inp-mini"
                        min={0.5}
                        value={larguraManual}
                        onChange={(n) => setLarguraManual(n || 2.4)}
                      />
                    </label>
                  )}
                  <label className="field">
                    <span>Peso total (kg)</span>
                    <input
                      className="inp inp-mini"
                      type="text"
                      inputMode="decimal"
                      placeholder="opcional"
                      value={pesoTotal}
                      onChange={(e) => setPesoTotal(e.target.value)}
                    />
                  </label>

                  <div className="subbox">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={remontar}
                        onChange={(e) => setRemontar(e.target.checked)}
                      />
                      Material pode ser remontado (empilhado)?
                    </label>
                    {remontar && (
                      <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                        <label className="field">
                          <span>Empilhar até (m)</span>
                          <NumInput
                            className="inp inp-mini"
                            min={0}
                            value={alturaMaxRemonte}
                            onChange={(n) => setAlturaMaxRemonte(n || 0)}
                          />
                        </label>
                        {veiculo && carroceriaFechada(veiculo.carroceria) && (
                          <button className="link" onClick={() => setAlturaMaxRemonte(veiculo.altura)}>
                            ↧ usar altura interna do {veiculo.nome} ({veiculo.altura} m)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="hero">
                  <div className="hero-num">{resultado.volumeTotal.toFixed(3)} m³</div>
                  <div className="hero-label">volume total (cubagem)</div>
                </div>
                <dl className="dl">
                  <div className="dl-row">
                    <dt>Peso cubado</dt>
                    <dd>
                      <strong>{Math.round(pesoCubado)} kg</strong>
                    </dd>
                  </div>
                  <div className="dl-row">
                    <dt>Total de peças</dt>
                    <dd>{resultado.totalPecas}</dd>
                  </div>
                </dl>

                {/* Cabe no veículo? (só carroceria fechada) */}
                {veiculo && capacidadeVol != null ? (
                  <div className={`capbox ${cabeVol ? "cap-ok" : "cap-no"}`}>
                    <div className="cap-top">
                      <span>
                        {veiculo.nome} · {nomeCarroceria(veiculo.carroceria)}
                      </span>
                      <span className="cap-badge">{cabeVol ? "✓ cabe" : "✗ não cabe"}</span>
                    </div>
                    <div className="cap-bar">
                      <div
                        className="cap-fill"
                        style={{ width: `${Math.min(100, ocupacaoVol).toFixed(0)}%` }}
                      />
                    </div>
                    <div className="cap-meta">
                      {resultado.volumeTotal.toFixed(2)} / {capacidadeVol.toFixed(2)} m³ interno ·{" "}
                      {ocupacaoVol.toFixed(0)}%
                    </div>
                  </div>
                ) : veiculo ? (
                  <p className="muted" style={{ marginTop: 10 }}>
                    {veiculo.nome} tem carroceria aberta ({nomeCarroceria(veiculo.carroceria)}) — sem
                    limite de altura fixo para calcular volume interno.
                  </p>
                ) : (
                  <p className="muted" style={{ marginTop: 10 }}>
                    Selecione um veículo abaixo (baú/sider) para ver se a carga cabe pelo volume.
                  </p>
                )}

                <div className="field-group">
                  <label className="field">
                    <span>Fator de cubagem (kg/m³)</span>
                    <NumInput
                      className="inp inp-mini"
                      min={0}
                      value={fatorCubagem}
                      onChange={(n) => setFatorCubagem(n || 0)}
                    />
                  </label>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                    Peso cubado = volume × fator (padrão rodoviário ≈ 300 kg/m³).
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Veículos (nos dois modos) */}
          <div className="card">
            <div className="toolbar" style={{ marginBottom: 8 }}>
              <h2 className="card-title" style={{ margin: 0 }}>
                Veículos
              </h2>
              <button className="link" onClick={resetarFrota} title="Voltar às medidas padrão">
                restaurar padrão
              </button>
            </div>
            <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
              Clique para selecionar e editar as medidas (em metros).
            </p>
            <ul className="veic-list">
              {avaliacoes.map(({ veiculo: v, status, motivos, ocupacaoComprimento }) => {
                const ativo = v.id === veiculoSelecionado;
                const fechado = carroceriaFechada(v.carroceria);

                // status exibido depende do modo
                let cls = status;
                let badge = status === "cabe" ? "✓" : status === "justo" ? "≈" : "✗";
                if (modo === "cubico") {
                  if (fechado) {
                    const cap = v.comprimento * v.largura * v.altura;
                    const cabe = resultado.volumeTotal <= cap + 1e-9;
                    const oc = cap ? (resultado.volumeTotal / cap) * 100 : 0;
                    cls = cabe ? (oc >= 90 ? "justo" : "cabe") : "nao-cabe";
                    badge = cabe ? "✓" : "✗";
                  } else {
                    cls = "aberto";
                    badge = "↑";
                  }
                }

                return (
                  <li key={v.id}>
                    <button
                      className={`veic ${cls} ${ativo ? "ativo" : ""}`}
                      onClick={() => setVeiculoSelecionado(ativo ? "" : v.id)}
                    >
                      <div className="veic-top">
                        <span className="veic-nome">{v.nome}</span>
                        <span className={`badge ${cls}`}>{badge}</span>
                      </div>
                      <div className="veic-meta">
                        <span>
                          {v.comprimento}×{v.largura}
                          {fechado ? `×${v.altura}` : ""} m · {nomeCarroceria(v.carroceria)} ·{" "}
                          {v.eixos} · {(v.pesoMax / 1000).toFixed(0)} t
                        </span>
                        {modo === "veiculo" && status !== "nao-cabe" && (
                          <span>{ocupacaoComprimento.toFixed(0)}%</span>
                        )}
                      </div>
                      {modo === "veiculo" && status === "nao-cabe" && motivos[0] && (
                        <div className="veic-motivo">{motivos[0]}</div>
                      )}
                    </button>

                    {ativo && (
                      <div className="veic-edit">
                        <label className="field">
                          <span>Comprimento (m)</span>
                          <NumInput
                            className="inp inp-mini"
                            min={0.1}
                            value={v.comprimento}
                            onChange={(n) => atualizarVeiculo(v.id, "comprimento", n)}
                          />
                        </label>
                        <label className="field">
                          <span>Largura (m)</span>
                          <NumInput
                            className="inp inp-mini"
                            min={0.1}
                            value={v.largura}
                            onChange={(n) => atualizarVeiculo(v.id, "largura", n)}
                          />
                        </label>
                        <label className="field">
                          <span>Carroceria</span>
                          <select
                            className="select"
                            value={v.carroceria}
                            onChange={(e) => atualizarVeiculo(v.id, "carroceria", e.target.value)}
                          >
                            {CARROCERIAS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                          </select>
                        </label>
                        {fechado && (
                          <label className="field">
                            <span>Altura interna (m)</span>
                            <NumInput
                              className="inp inp-mini"
                              min={0.1}
                              value={v.altura}
                              onChange={(n) => atualizarVeiculo(v.id, "altura", n)}
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Cotação / observações + salvar/imprimir */}
          <div className="card">
            <h2 className="card-title">Cotação / Observações</h2>
            <textarea
              className="inp obs-area"
              rows={3}
              placeholder="Ex.: ID da cotação, cliente, prazo, observações…"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
            <button
              className="btn btn-primary"
              style={{ marginTop: 10, width: "100%" }}
              onClick={abrirResumo}
            >
              🖨️ Salvar / Imprimir
            </button>
          </div>
        </aside>
      </div>
    </>
  );

  // Reduz a imagem (máx. 1600px) e devolve base64 JPEG.
  function imagemReduzida(arquivo, maxDim = 1600) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível ler o arquivo."));
      };
      img.src = url;
    });
  }
}
