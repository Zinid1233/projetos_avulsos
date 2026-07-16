import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Upload,
  ClipboardPaste,
  Ruler,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Sparkles,
  Truck,
  Package,
  Printer,
  Pencil,
  Search,
  Check,
  X,
  Grid3x3,
  Tag,
  ArrowUp,
  ShieldAlert,
  ShieldCheck,
  Box,
  Settings2,
} from "lucide-react";
import { calcularCubagem, corPorIndice, paraMetros, MARGEM } from "../lib/packing.js";
import {
  avaliarVeiculos,
  VEICULOS,
  CARROCERIAS,
  carroceriaFechada,
  nomeCarroceria,
  checarLimites,
  LIMITE_ALTURA,
} from "../lib/vehicles.js";
import TruckView from "../components/TruckView.jsx";
import NumInput from "../components/NumInput.jsx";
import TransfastLogo from "../components/TransfastLogo.jsx";
import "./Cubagem.css";

let contador = 0;
const novoId = () => `m${++contador}-${Math.floor(performance.now())}`;
const fmt = (n, d = 2) => Number(n || 0).toFixed(d).replace(".", ",");

function novoMaterial(indice) {
  return {
    id: novoId(),
    nome: `Material ${indice + 1}`,
    comprimento: 0,
    largura: 0,
    altura: 0,
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
      return arr.map((v) => {
        const padrao = VEICULOS.find((x) => x.id === v.id);
        return { carroceria: "sider", altura: 2.7, alturaPiso: 1.2, ...padrao, ...v };
      });
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
  const [considerarAltura, setConsiderarAltura] = useState(false);
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
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [textoMedidas, setTextoMedidas] = useState("");
  const [mostrarMedidas, setMostrarMedidas] = useState(true);
  const [mostrarGrade, setMostrarGrade] = useState(true);
  const inputArquivo = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(FROTA_KEY, JSON.stringify(frota));
    } catch {
      /* ignora */
    }
  }, [frota]);

  const fator = unidade === "mm" ? 1000 : unidade === "cm" ? 100 : 1;
  const empilhando = modo === "veiculo" && considerarAltura && remontar;
  const mostrarAltura = modo === "cubico" || (modo === "veiculo" && considerarAltura);

  const alturaCargaCalc = useMemo(() => {
    let h = 0;
    for (const m of materiais) {
      const q = Math.floor(m.quantidade || 0);
      if (q <= 0 || !m.altura || m.altura <= 0) continue;
      if (empilhando && alturaMaxRemonte > 0) {
        const porPilha = Math.max(1, Math.floor(alturaMaxRemonte / m.altura));
        h = Math.max(h, porPilha * m.altura);
      } else {
        h = Math.max(h, m.altura);
      }
    }
    return h;
  }, [materiais, empilhando, alturaMaxRemonte]);

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

  const capacidadeVol =
    veiculo && carroceriaFechada(veiculo.carroceria)
      ? veiculo.comprimento * veiculo.largura * veiculo.altura
      : null;
  const ocupacaoVol = capacidadeVol ? (resultado.volumeTotal / capacidadeVol) * 100 : null;
  const cabeVol = capacidadeVol != null ? resultado.volumeTotal <= capacidadeVol + 1e-9 : null;

  const alturaTotal = (veiculo ? veiculo.alturaPiso : 0) + alturaCargaCalc;
  const licenca = checarLimites(
    alturaTotal,
    resultado.pecaMaiorLargura,
    metrosLineares,
    veiculo?.comprimento,
  );

  // ----- derivações de UI para veículos (sem alterar regras) -----
  const veiculosUI = useMemo(
    () =>
      avaliacoes.map((a) => {
        const v = a.veiculo;
        const fechado = carroceriaFechada(v.carroceria);
        if (modo === "cubico") {
          if (fechado) {
            const cap = v.comprimento * v.largura * v.altura;
            const cabe = resultado.volumeTotal <= cap + 1e-9;
            const oc = cap ? (resultado.volumeTotal / cap) * 100 : 0;
            return {
              v,
              fechado,
              aberto: false,
              cabe,
              ocupacao: oc,
              motivo: cabe
                ? null
                : `Volume ${fmt(resultado.volumeTotal)} m³ acima do interno ${fmt(cap)} m³`,
              sev: cabe ? (oc >= 90 ? "tight" : "ok") : "no",
            };
          }
          return { v, fechado, aberto: true, cabe: true, ocupacao: null, motivo: null, sev: "open" };
        }
        const cabe = a.status !== "nao-cabe";
        const sev = a.status === "cabe" ? "ok" : a.status === "justo" ? "tight" : "no";
        return { v, fechado, aberto: false, cabe, ocupacao: a.ocupacaoComprimento, motivo: a.motivos[0] || null, sev };
      }),
    [avaliacoes, modo, resultado.volumeTotal],
  );

  const recomendadoId = useMemo(() => {
    const cand = veiculosUI.filter((x) => x.cabe && x.ocupacao != null);
    if (!cand.length) return null;
    return cand.reduce((b, x) => (x.ocupacao > b.ocupacao ? x : b)).v.id;
  }, [veiculosUI]);

  const rec = veiculosUI.find((x) => x.v.id === recomendadoId);
  const compat = veiculosUI.filter((x) => x.v.id !== recomendadoId && x.cabe);
  const incompat = veiculosUI.filter((x) => !x.cabe);

  const materiaisPreenchidos = materiais.filter((m) => m.comprimento > 0 && m.largura > 0);
  const totalUnidades = materiaisPreenchidos.reduce(
    (s, m) => s + Math.max(0, Math.floor(m.quantidade || 0)),
    0,
  );
  const cabeVeiculoLinear = veiculo ? metrosLineares <= veiculo.comprimento + 1e-6 : null;
  const ocupacaoLinear = veiculo && veiculo.comprimento ? (metrosLineares / veiculo.comprimento) * 100 : null;

  function labelStatus(x) {
    if (x.v.id === recomendadoId) return "Recomendado";
    if (!x.cabe) return "Incompatível";
    if (x.aberto) return "Compatível";
    if (x.ocupacao != null && x.ocupacao < 45) return "Sobredimensionado";
    return "Compatível";
  }
  function iconStatus(sev) {
    if (sev === "no") return <X size={13} />;
    if (sev === "open") return <ArrowUp size={13} />;
    return <Check size={13} />;
  }

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
      aplicarResultado(coletados, observacoes, falhas, "na(s) imagem(ns)");
    } finally {
      setAnalisando(false);
      setProgresso("");
    }
  }

  function aplicarResultado(coletados, observacoes, falhas, ondeVazio) {
    if (coletados.length === 0) {
      setErroAnalise(falhas[0] || `Não consegui identificar medidas ${ondeVazio}. Lance manualmente.`);
      return;
    }
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
    const partes = [`${coletados.length} item(ns) adicionado(s)`];
    if (observacoes.length) partes.push(observacoes.join(" · "));
    setObsAnalise(partes.join(" · "));
    setErroAnalise(falhas.length ? `Não lido(s): ${falhas.join(" | ")}` : "");
  }

  async function aoIdentificarTexto() {
    const t = textoMedidas.trim();
    if (!t) return;
    setErroAnalise("");
    setObsAnalise("");
    setAnalisando(true);
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: t }),
      });
      const bruto = await resp.text();
      let dados;
      try {
        dados = JSON.parse(bruto);
      } catch {
        setErroAnalise("Leitura indisponível (verifique a GEMINI_API_KEY na Vercel).");
        return;
      }
      if (!resp.ok) {
        setErroAnalise(dados.error || "Falha ao identificar as medidas.");
        return;
      }
      aplicarResultado(dados.items || [], dados.observacao ? [dados.observacao] : [], [], "no texto");
    } catch (err) {
      setErroAnalise(err instanceof Error ? err.message : "Erro ao processar o texto.");
    } finally {
      setAnalisando(false);
    }
  }

  function abrirResumo() {
    setDataResumo(new Date().toLocaleString("pt-BR"));
    setResumo(true);
  }

  // ---------- Resumo (salvar / imprimir) ----------
  if (resumo) {
    return (
      <div className="resumo-wrap">
        <div className="resumo-actions no-print">
          <button className="btn" onClick={() => setResumo(false)}>
            <Pencil size={15} /> Editar novamente
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Salvar / Imprimir
          </button>
        </div>

        <div className="folha">
          <div className="folha-head">
            <div className="folha-brand">
              TRANS<span>FAST</span>
            </div>
            <div className="folha-title">
              <div className="folha-h1">Planejamento de carga</div>
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
                  <b>{fmt(metrosLineares)} m</b>
                </div>
                <div>
                  <span>Área de piso</span>
                  <b>{fmt(resultado.areaTotal)} m²</b>
                </div>
                <div>
                  <span>Largura útil</span>
                  <b>{fmt(larguraPlanejamento)} m</b>
                </div>
                {empilhando && (
                  <div>
                    <span>Empilhado até</span>
                    <b>{fmt(alturaMaxRemonte)} m</b>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <span>Volume total</span>
                  <b>{fmt(resultado.volumeTotal, 3)} m³</b>
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
              <strong>Veículo:</strong> {veiculo.nome} ({veiculo.eixos}) · {fmt(veiculo.comprimento, 2)}×
              {fmt(veiculo.largura, 2)}
              {carroceriaFechada(veiculo.carroceria) ? `×${fmt(veiculo.altura, 2)}` : ""} m ·{" "}
              {nomeCarroceria(veiculo.carroceria)}
              {cabeVeiculoLinear != null && (
                <> — {cabeVeiculoLinear ? "cabe" : "não cabe"}</>
              )}
              {modo === "cubico" && capacidadeVol != null && (
                <> — {cabeVol ? "cabe" : "não cabe"} ({ocupacaoVol.toFixed(0)}% de {fmt(capacidadeVol)} m³)</>
              )}
              {modo === "veiculo" && considerarAltura && alturaCargaCalc > 0 && (
                <div style={{ marginTop: 6 }}>
                  <strong>Altura total:</strong> {fmt(alturaTotal)} m (limite {fmt(LIMITE_ALTURA)} m) —{" "}
                  {licenca.precisa ? "PRECISA DE LICENÇA (AET)" : "dentro do limite"}
                </div>
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
            TransFAST · Planejamento de carga — documento gerado pelo sistema. Confira os valores.
          </div>
        </div>
      </div>
    );
  }

  const semPecas = pecasFinais.length === 0;

  return (
    <div className="app">
      {/* ---------------- App bar ---------------- */}
      <header className="appbar">
        <div className="container appbar-inner">
          <div className="appbar-left">
            <TransfastLogo width={140} />
            <span className="divider-v" />
            <span className="tool-id">
              <b>Planejamento de Carga</b>
              <span>Cubagem, metros lineares e veículo ideal</span>
            </span>
          </div>
          <div className="appbar-right">
            <span className="weg-badge" title="Ferramenta exclusiva para a WEG">
              Exclusivo <b>WEG</b>
            </span>
            <div className="seg" role="tablist" aria-label="Tipo de cálculo">
              <button
                role="tab"
                aria-selected={modo === "veiculo"}
                className={`seg-btn ${modo === "veiculo" ? "on" : ""}`}
                onClick={() => setModo("veiculo")}
              >
                <Truck size={15} /> Medidas do veículo
              </button>
              <button
                role="tab"
                aria-selected={modo === "cubico"}
                className={`seg-btn ${modo === "cubico" ? "on" : ""}`}
                onClick={() => setModo("cubico")}
              >
                <Box size={15} /> Medidas cúbicas
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <div className="container">
        <div className="hero">
          <div className="hero-left">
            <span className="eyebrow">TransFAST × WEG</span>
            <h1 className="hero-title">Planeje a ocupação da carga com mais precisão.</h1>
            <p className="hero-desc">
              Insira as dimensões dos materiais, visualize o arranjo e identifique o veículo mais
              adequado para a operação.
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-num">{materiaisPreenchidos.length}</div>
              <div className="stat-label">Materiais</div>
            </div>
            <div className="stat">
              <div className="stat-num">{totalUnidades}</div>
              <div className="stat-label">Peças totais</div>
            </div>
            <div className="stat">
              <div className="stat-num">{unidade}</div>
              <div className="stat-label">Unidade</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Grid principal ---------------- */}
      <div className="container">
        <div className="grid">
          {/* ============ Coluna operacional ============ */}
          <section className="main-col">
            {/* --------- Materiais --------- */}
            <div className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">
                    <Package size={17} /> Materiais da carga
                  </h2>
                  <p className="card-desc">
                    Adicione manualmente ou importe as informações para calcular a ocupação.
                  </p>
                </div>
                <div className="card-actions">
                  <div className="input-suffix" title="Unidade de medida">
                    <select
                      className="select"
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value)}
                      aria-label="Unidade de medida"
                    >
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                  <button
                    className="btn"
                    onClick={() => inputArquivo.current?.click()}
                    disabled={analisando}
                    title="Importar imagem ou tabela"
                  >
                    <Upload size={15} />
                    {analisando ? (progresso ? `Lendo ${progresso}…` : "Lendo…") : "Importar arquivo"}
                  </button>
                  <button
                    className="btn"
                    onClick={() => setMostrarTexto((v) => !v)}
                    disabled={analisando}
                  >
                    <ClipboardPaste size={15} /> Colar texto
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

              {mostrarTexto && (
                <div className="texto-box">
                  <textarea
                    className="inp obs-area"
                    rows={3}
                    placeholder="Cole o texto com as medidas (ex.: '3 caixas de 1,20 x 0,80 x 0,50 m, palete 100x120, motor 45x45x60 - 2un')…"
                    value={textoMedidas}
                    onChange={(e) => setTextoMedidas(e.target.value)}
                  />
                  <div className="texto-box-acoes">
                    <button className="btn" onClick={() => setTextoMedidas("")} disabled={analisando}>
                      Limpar
                    </button>
                    <button className="btn btn-primary" onClick={aoIdentificarTexto} disabled={analisando}>
                      <Search size={15} /> {analisando ? "Identificando…" : "Identificar medidas"}
                    </button>
                  </div>
                </div>
              )}

              {avisoConferir && (
                <div className="ai-alert">
                  <Sparkles size={18} className="ai-alert-ic" />
                  <div className="ai-alert-body">
                    <div className="ai-alert-title">Revise os dados identificados</div>
                    <div className="ai-alert-desc">
                      As dimensões foram interpretadas automaticamente. Confirme medidas e
                      quantidades antes de continuar.
                    </div>
                    {obsAnalise && <div className="ai-alert-meta">{obsAnalise}</div>}
                  </div>
                  <button
                    className="ai-alert-x"
                    onClick={() => setAvisoConferir(false)}
                    aria-label="Fechar aviso"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {erroAnalise && <p className="alert alert-error">{erroAnalise}</p>}
              {!avisoConferir && obsAnalise && <p className="alert alert-info">{obsAnalise}</p>}

              <div className="table-wrap">
                <table className="mat">
                  <thead>
                    <tr>
                      <th aria-hidden></th>
                      <th>Material</th>
                      <th>Comprimento</th>
                      <th>Largura</th>
                      {mostrarAltura && <th>Altura</th>}
                      <th>Qtd</th>
                      <th aria-hidden></th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiais.map((m) => (
                      <tr key={m.id}>
                        <td data-label="">
                          <span
                            className="dot"
                            style={{ backgroundColor: m.cor }}
                            title={m.nome}
                          />
                        </td>
                        <td data-label="Material">
                          <input
                            className="inp inp-nome"
                            value={m.nome}
                            title={m.nome}
                            onChange={(e) => atualizar(m.id, "nome", e.target.value)}
                          />
                        </td>
                        <td data-label={`Comprimento (${unidade})`}>
                          <div className="input-suffix">
                            <NumInput
                              className="inp inp-num"
                              min={0}
                              value={exibir(m.comprimento)}
                              onChange={(n) => definirDimensao(m.id, "comprimento", n)}
                            />
                            <span className="suffix">{unidade}</span>
                          </div>
                        </td>
                        <td data-label={`Largura (${unidade})`}>
                          <div className="input-suffix">
                            <NumInput
                              className="inp inp-num"
                              min={0}
                              value={exibir(m.largura)}
                              onChange={(n) => definirDimensao(m.id, "largura", n)}
                            />
                            <span className="suffix">{unidade}</span>
                          </div>
                        </td>
                        {mostrarAltura && (
                          <td data-label={`Altura (${unidade})`}>
                            <div className="input-suffix">
                              <NumInput
                                className="inp inp-num"
                                min={0}
                                value={exibir(m.altura)}
                                onChange={(n) => definirDimensao(m.id, "altura", n)}
                              />
                              <span className="suffix">{unidade}</span>
                            </div>
                          </td>
                        )}
                        <td data-label="Quantidade">
                          <NumInput
                            className="inp inp-qtd"
                            min={1}
                            value={m.quantidade}
                            onChange={(n) => atualizar(m.id, "quantidade", Math.max(1, Math.floor(n)))}
                          />
                        </td>
                        <td className="cell-remove" data-label="">
                          <button
                            className="remove-btn"
                            onClick={() => remover(m.id)}
                            aria-label={`Remover ${m.nome}`}
                            title="Remover material"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="btn add-row" onClick={adicionar}>
                <Plus size={15} /> Adicionar material
              </button>
            </div>

            {/* --------- Vista superior / volume por material --------- */}
            {modo === "veiculo" ? (
              <div className="card">
                <div className="viz-head">
                  <div>
                    <h2 className="card-title">
                      <Ruler size={17} /> Distribuição da carga
                    </h2>
                  </div>
                  <div className="viz-toolbar">
                    <button
                      className={`iconbtn viz-tool ${mostrarMedidas ? "on" : ""}`}
                      onClick={() => setMostrarMedidas((v) => !v)}
                      aria-label="Mostrar medidas"
                      title="Mostrar medidas nas peças"
                    >
                      <Tag size={16} />
                    </button>
                    <button
                      className={`iconbtn viz-tool ${mostrarGrade ? "on" : ""}`}
                      onClick={() => setMostrarGrade((v) => !v)}
                      aria-label="Mostrar grade"
                      title="Mostrar grade"
                    >
                      <Grid3x3 size={16} />
                    </button>
                    <button
                      className="iconbtn viz-tool"
                      onClick={refazer}
                      aria-label="Refazer arranjo"
                      title="Recalcula a posição das peças dentro do veículo"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
                <p className="viz-hint">
                  Arraste para reposicionar — encaixa sozinho com folga de 2 cm, sem sobrepor. Duplo
                  clique gira o material. Passe o mouse para ver as medidas.
                </p>

                {semPecas ? (
                  <div className="empty">
                    <Package size={26} className="empty-ic" />
                    <div className="empty-title">Sem carga para exibir</div>
                    <div className="empty-desc">
                      A distribuição da carga aparecerá aqui após o cadastro dos materiais.
                    </div>
                  </div>
                ) : (
                  <div className="viz-body">
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
                      mostrarMedidas={mostrarMedidas}
                      mostrarGrade={mostrarGrade}
                      semStatus
                    />
                  </div>
                )}

                {!semPecas && veiculo && (
                  <div className={`load-status ${cabeVeiculoLinear ? "ok" : "no"}`}>
                    {cabeVeiculoLinear ? (
                      <Check size={18} className="load-status-ic" />
                    ) : (
                      <AlertTriangle size={18} className="load-status-ic" />
                    )}
                    <div>
                      <div className="load-status-title">
                        {cabeVeiculoLinear
                          ? `A carga cabe no ${veiculo.nome}`
                          : `A carga excede o ${veiculo.nome}`}
                      </div>
                      <div className="load-status-desc">
                        {cabeVeiculoLinear
                          ? `O arranjo utiliza aproximadamente ${ocupacaoLinear.toFixed(0)}% do comprimento disponível.`
                          : `A carga excede o comprimento disponível em ${fmt(metrosLineares - veiculo.comprimento)} m.`}
                      </div>
                    </div>
                  </div>
                )}
                {empilhando && (
                  <p className="muted" style={{ marginTop: 10 }}>
                    ×N indica quantas peças estão empilhadas na mesma posição (até {fmt(alturaMaxRemonte)} m).
                  </p>
                )}
                {resultado.algumaForaDeMedida && (
                  <p className="warn">
                    <AlertTriangle size={14} /> Algum material é mais largo que a largura útil (
                    {fmt(larguraPlanejamento)} m).
                  </p>
                )}
              </div>
            ) : (
              <div className="card">
                <h2 className="card-title">
                  <Box size={17} /> Volume por material
                </h2>
                {materiaisPreenchidos.length === 0 ? (
                  <p className="empty" style={{ marginTop: 12 }}>
                    Informe as medidas dos materiais para ver o volume.
                  </p>
                ) : (
                  <ul className="vol-list" style={{ marginTop: 14 }}>
                    {materiaisPreenchidos.map((m) => {
                      const vol =
                        m.comprimento * m.largura * m.altura * Math.max(0, Math.floor(m.quantidade || 0));
                      return (
                        <li key={m.id} className="vol-item">
                          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="dot" style={{ backgroundColor: m.cor }} />
                            {m.nome}
                            <span className="dim">
                              {exibir(m.comprimento)}×{exibir(m.largura)}×{exibir(m.altura)} {unidade} ·{" "}
                              {m.quantidade}un
                            </span>
                          </span>
                          <strong>{fmt(vol, 3)} m³</strong>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* ============ Painel lateral ============ */}
          <aside className="side-col">
            {/* --------- Resultado --------- */}
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: 16 }}>
                Resultado estimado
              </h2>

              {modo === "veiculo" ? (
                <>
                  <div className="metric">
                    <div className="metric-value">{fmt(metrosLineares)} m</div>
                    <div className="metric-label">Metros lineares</div>
                  </div>
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <div className="metric-item-l">Área ocupada</div>
                      <div className="metric-item-v">{fmt(resultado.areaTotal)} m²</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-item-l">Peças</div>
                      <div className="metric-item-v">
                        {resultado.totalPecas}
                        {empilhando && <small> · {resultado.totalPosicoes} pilha(s)</small>}
                      </div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-item-l">Largura útil</div>
                      <div className="metric-item-v">
                        {fmt(larguraPlanejamento)} m
                        {veiculo && <small> · {veiculo.nome}</small>}
                      </div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-item-l">Peso total</div>
                      <div className="metric-item-v">
                        {pesoNum > 0 ? `${pesoNum} kg` : <small>Não informado</small>}
                      </div>
                    </div>
                  </div>

                  <div className="field-group">
                    {!veiculo && (
                      <label className="field">
                        <span>Largura útil (m)</span>
                        <NumInput
                          className="inp"
                          min={0.5}
                          value={larguraManual}
                          onChange={(n) => setLarguraManual(n || 2.4)}
                        />
                      </label>
                    )}
                    <div className="weight-box">
                      <div className="weight-l">Peso total da carga</div>
                      <div className="weight-row">
                        <input
                          className="inp"
                          type="text"
                          inputMode="decimal"
                          placeholder="Digite o peso"
                          value={pesoTotal}
                          onChange={(e) => setPesoTotal(e.target.value)}
                        />
                        <span className="u">kg</span>
                      </div>
                    </div>

                    <div className="switch-card">
                      <label className="switch-row">
                        <input
                          type="checkbox"
                          checked={considerarAltura}
                          onChange={(e) => setConsiderarAltura(e.target.checked)}
                        />
                        <span className="switch" aria-hidden />
                        <span className="switch-txt">
                          <b>Considerar altura e restrições especiais</b>
                          <span>Verifica o limite legal e a possível necessidade de AET.</span>
                        </span>
                      </label>
                      {considerarAltura && (
                        <div className="switch-inner">
                          <span className="muted" style={{ fontSize: 12 }}>
                            Informe a altura de cada material (coluna Altura) para verificar o AET.
                          </span>
                          <label className="check-row">
                            <input
                              type="checkbox"
                              checked={remontar}
                              onChange={(e) => setRemontar(e.target.checked)}
                            />
                            Material pode ser remontado (empilhado)
                          </label>
                          {remontar && (
                            <>
                              <label className="field">
                                <span>Empilhar até (m)</span>
                                <NumInput
                                  className="inp"
                                  min={0}
                                  value={alturaMaxRemonte}
                                  onChange={(n) => setAlturaMaxRemonte(n || 0)}
                                />
                              </label>
                              {veiculo && carroceriaFechada(veiculo.carroceria) && (
                                <button
                                  className="link"
                                  onClick={() => setAlturaMaxRemonte(veiculo.altura)}
                                >
                                  <ArrowUp size={13} /> usar altura interna do {veiculo.nome} (
                                  {fmt(veiculo.altura)} m)
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="metric">
                    <div className="metric-value">{fmt(resultado.volumeTotal, 3)} m³</div>
                    <div className="metric-label">Volume total (cubagem)</div>
                  </div>
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <div className="metric-item-l">Peso cubado</div>
                      <div className="metric-item-v">{Math.round(pesoCubado)} kg</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-item-l">Peças</div>
                      <div className="metric-item-v">{resultado.totalPecas}</div>
                    </div>
                  </div>

                  {veiculo && capacidadeVol != null ? (
                    <div className={`capbox ${cabeVol ? "cap-ok" : "cap-no"}`}>
                      <div className="cap-top">
                        <span>
                          {veiculo.nome} · {nomeCarroceria(veiculo.carroceria)}
                        </span>
                        <span className="cap-badge">
                          {cabeVol ? <Check size={13} /> : <X size={13} />} {cabeVol ? "cabe" : "não cabe"}
                        </span>
                      </div>
                      <div className="bar">
                        <i style={{ width: `${Math.min(100, ocupacaoVol).toFixed(0)}%` }} />
                      </div>
                      <div className="cap-meta">
                        {fmt(resultado.volumeTotal)} / {fmt(capacidadeVol)} m³ interno · {ocupacaoVol.toFixed(0)}%
                      </div>
                    </div>
                  ) : veiculo ? (
                    <p className="muted" style={{ marginTop: 12 }}>
                      {veiculo.nome} tem carroceria aberta ({nomeCarroceria(veiculo.carroceria)}) — sem
                      limite de altura fixo para calcular o volume interno.
                    </p>
                  ) : (
                    <p className="muted" style={{ marginTop: 12 }}>
                      Selecione um veículo baú/sider abaixo para verificar se a carga cabe pelo volume.
                    </p>
                  )}

                  <div className="field-group">
                    <label className="field">
                      <span>Fator de cubagem (kg/m³)</span>
                      <NumInput
                        className="inp"
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

            {/* --------- Altura / AET --------- */}
            {modo === "veiculo" && considerarAltura && (
              <div className="card">
                <h2 className="card-title">
                  <ShieldAlert size={17} /> Altura e licença (AET)
                </h2>
                {alturaCargaCalc <= 0 ? (
                  <p className="muted" style={{ marginTop: 12 }}>
                    Informe a <strong>altura</strong> dos materiais (coluna Altura) para calcular a
                    altura da carga.
                  </p>
                ) : veiculo ? (
                  <>
                    <dl className="dl" style={{ marginTop: 14 }}>
                      <div className="dl-row">
                        <dt>Altura da carga {empilhando ? "(empilhada)" : "(maior material)"}</dt>
                        <dd>
                          {(alturaCargaCalc * fator).toFixed(0)} {unidade} · {fmt(alturaCargaCalc)} m
                        </dd>
                      </div>
                      <div className="dl-row">
                        <dt>Assoalho do {veiculo.nome}</dt>
                        <dd>{fmt(veiculo.alturaPiso)} m</dd>
                      </div>
                      <div className="dl-row">
                        <dt>Altura total (chão→topo)</dt>
                        <dd>
                          <strong>{fmt(alturaTotal)} m</strong>
                        </dd>
                      </div>
                      <div className="dl-row">
                        <dt>Limite legal</dt>
                        <dd>{fmt(LIMITE_ALTURA)} m</dd>
                      </div>
                    </dl>
                    {licenca.precisa ? (
                      <div className="aet-alert">
                        <div className="aet-alert-head">
                          <ShieldAlert size={16} /> Veículo precisa de licença (AET)
                        </div>
                        <ul>
                          {licenca.motivos.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="aet-ok">
                        <ShieldCheck size={16} /> Dentro dos limites — não precisa de licença
                      </div>
                    )}
                  </>
                ) : (
                  <p className="muted" style={{ marginTop: 12 }}>
                    Altura da carga: <strong>{fmt(alturaCargaCalc)} m</strong>. Selecione um veículo
                    para somar o assoalho e verificar a licença.
                  </p>
                )}
              </div>
            )}

            {/* --------- Veículos --------- */}
            <div className="card">
              <div className="card-head" style={{ marginBottom: 12 }}>
                <div>
                  <h2 className="card-title">
                    <Truck size={17} /> Veículos
                  </h2>
                  <p className="card-desc">Selecione para comparar e editar as medidas (em metros).</p>
                </div>
                <button className="btn" onClick={resetarFrota} title="Voltar às medidas padrão">
                  <RotateCcw size={14} /> Restaurar
                </button>
              </div>

              {rec && (
                <div className="veh-group">
                  <div className="veh-group-title">Recomendado</div>
                  <div className="rec">
                    <span className="rec-eyebrow">Veículo recomendado</span>
                    <div className="rec-top">
                      <span className="rec-name">{rec.v.nome}</span>
                      <span className="rec-tag">Melhor aproveitamento</span>
                    </div>
                    {rec.ocupacao != null && (
                      <>
                        <div className="rec-pct">
                          <b>{rec.ocupacao.toFixed(0)}%</b> de ocupação estimada
                        </div>
                        <div className="bar">
                          <i style={{ width: `${Math.min(100, rec.ocupacao).toFixed(0)}%` }} />
                        </div>
                      </>
                    )}
                    <div className="rec-info">
                      {fmt(rec.v.comprimento)} m × {fmt(rec.v.largura)} m
                      {rec.fechado ? ` × ${fmt(rec.v.altura)} m` : ""} · {nomeCarroceria(rec.v.carroceria)} ·{" "}
                      {rec.v.eixos} · {(rec.v.pesoMax / 1000).toFixed(0)} t
                    </div>
                    <div className="rec-status">
                      <Check size={15} /> Carga compatível
                    </div>
                    <button
                      className={`btn ${veiculoSelecionado === rec.v.id ? "" : "btn-primary"} btn-block`}
                      style={{ marginTop: 12 }}
                      onClick={() =>
                        setVeiculoSelecionado(veiculoSelecionado === rec.v.id ? "" : rec.v.id)
                      }
                    >
                      {veiculoSelecionado === rec.v.id ? "Selecionado" : "Selecionar veículo"}
                    </button>
                  </div>
                </div>
              )}

              {compat.length > 0 && (
                <div className="veh-group">
                  <div className="veh-group-title">Compatíveis</div>
                  <ul className="veh-list">
                    {compat.map((x) => (
                      <VehItem
                        key={x.v.id}
                        x={x}
                        ativo={veiculoSelecionado === x.v.id}
                        modo={modo}
                        label={labelStatus(x)}
                        icon={iconStatus(x.sev)}
                        onSelect={() =>
                          setVeiculoSelecionado(veiculoSelecionado === x.v.id ? "" : x.v.id)
                        }
                        atualizarVeiculo={atualizarVeiculo}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {incompat.length > 0 && (
                <div className="veh-group">
                  <div className="veh-group-title">Incompatíveis</div>
                  <ul className="veh-list">
                    {incompat.map((x) => (
                      <VehItem
                        key={x.v.id}
                        x={x}
                        ativo={veiculoSelecionado === x.v.id}
                        modo={modo}
                        label={labelStatus(x)}
                        icon={iconStatus(x.sev)}
                        onSelect={() =>
                          setVeiculoSelecionado(veiculoSelecionado === x.v.id ? "" : x.v.id)
                        }
                        atualizarVeiculo={atualizarVeiculo}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* --------- Cotação / salvar --------- */}
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                <Tag size={17} /> Cotação / Observações
              </h2>
              <textarea
                className="inp obs-area"
                rows={3}
                placeholder="Ex.: ID da cotação, cliente, prazo, observações…"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
              <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={abrirResumo}>
                <Printer size={15} /> Salvar / Imprimir
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
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

/* ---- Card de veículo (compatível / incompatível) com edição ---- */
function VehItem({ x, ativo, modo, label, icon, onSelect, atualizarVeiculo }) {
  const v = x.v;
  const fmt2 = (n, d = 2) => Number(n || 0).toFixed(d).replace(".", ",");
  return (
    <li>
      <button
        className={`veh ${x.sev} ${ativo ? "on" : ""}`}
        onClick={onSelect}
        aria-pressed={ativo}
      >
        <div className="veh-head">
          <span className="veh-name">{v.nome}</span>
          <span className={`veh-status ${x.sev}`}>
            {icon} {label}
          </span>
        </div>
        <div className="veh-meta">
          <span>
            {fmt2(v.comprimento)}×{fmt2(v.largura)}
            {x.fechado ? `×${fmt2(v.altura)}` : ""} m · {nomeCarroceria(v.carroceria)} · {v.eixos} ·{" "}
            {(v.pesoMax / 1000).toFixed(0)} t
          </span>
          {x.ocupacao != null && x.cabe && <span className="veh-pct">{x.ocupacao.toFixed(0)}%</span>}
        </div>
        {x.motivo && (
          <div className="veh-reason">
            <AlertTriangle size={12} /> {x.motivo}
          </div>
        )}
      </button>

      {ativo && (
        <div className="veh-settings">
          <div className="veh-settings-title">
            <Settings2 size={13} /> Configurações do veículo
          </div>
          <label className="field">
            <span>Comprimento (m)</span>
            <NumInput
              className="inp"
              min={0.1}
              value={v.comprimento}
              onChange={(n) => atualizarVeiculo(v.id, "comprimento", n)}
            />
          </label>
          <label className="field">
            <span>Largura (m)</span>
            <NumInput
              className="inp"
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
          {x.fechado && (
            <label className="field">
              <span>Altura interna (m)</span>
              <NumInput
                className="inp"
                min={0.1}
                value={v.altura}
                onChange={(n) => atualizarVeiculo(v.id, "altura", n)}
              />
            </label>
          )}
          <label className="field">
            <span>Altura do assoalho (m)</span>
            <NumInput
              className="inp"
              min={0}
              value={v.alturaPiso}
              onChange={(n) => atualizarVeiculo(v.id, "alturaPiso", n)}
            />
          </label>
        </div>
      )}
    </li>
  );
}
