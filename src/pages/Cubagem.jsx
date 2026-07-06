import { useMemo, useRef, useState } from "react";
import { calcularCubagem, corPorIndice, paraMetros } from "../lib/packing.js";
import { avaliarVeiculos, VEICULOS } from "../lib/vehicles.js";
import TruckView from "../components/TruckView.jsx";
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

export default function Cubagem() {
  const [modo, setModo] = useState("veiculo");
  const [materiais, setMateriais] = useState([novoMaterial(0)]);
  const [unidade, setUnidade] = useState("cm");
  const [larguraPlanejamento, setLarguraPlanejamento] = useState(2.4);
  const [pesoTotal, setPesoTotal] = useState("");
  const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
  const [remontar, setRemontar] = useState(false);
  const [alturaMaxRemonte, setAlturaMaxRemonte] = useState(2.7);
  const [fatorCubagem, setFatorCubagem] = useState(300);
  const [analisando, setAnalisando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erroAnalise, setErroAnalise] = useState("");
  const [obsAnalise, setObsAnalise] = useState("");
  const inputArquivo = useRef(null);

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
          const base64 = await lerBase64(arquivo);
          const resp = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mediaType: arquivo.type }),
          });
          const texto = await resp.text();
          let dados;
          try {
            dados = JSON.parse(texto);
          } catch {
            falhas.push(`${arquivo.name}: leitura indisponível`);
            continue;
          }
          if (!resp.ok) {
            falhas.push(`${arquivo.name}: ${dados.error || "falha na análise"}`);
            continue;
          }
          const items = dados.items || [];
          for (const it of items) coletados.push(it);
          if (dados.observacao) observacoes.push(dados.observacao);
        } catch (err) {
          falhas.push(`${arquivo.name}: ${err instanceof Error ? err.message : "erro"}`);
        }
      }

      if (coletados.length === 0) {
        setErroAnalise(
          falhas[0] ||
            "Leitura por foto indisponível neste ambiente. Configure a ANTHROPIC_API_KEY na Vercel ou lance as medidas manualmente.",
        );
        return;
      }

      const novos = coletados.map((it, i) => ({
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

      const partes = [];
      if (arquivos.length > 1) {
        partes.push(`${coletados.length} itens de ${arquivos.length - falhas.length} arquivo(s).`);
      }
      if (observacoes.length) partes.push(observacoes.join(" · "));
      setObsAnalise(partes.join(" — "));
      if (falhas.length) setErroAnalise(`Não lido(s): ${falhas.join(" | ")}`);
    } finally {
      setAnalisando(false);
      setProgresso("");
    }
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
          {/* Materiais */}
          <div className="card">
            <div className="toolbar">
              <h2 className="card-title" style={{ margin: 0 }}>
                Materiais
              </h2>
              <div className="toolbar-right">
                <span className="muted">Unidade:</span>
                <select
                  className="select"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                >
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
                        <input
                          className="inp inp-num"
                          type="number"
                          min={0}
                          value={exibir(m.comprimento)}
                          onChange={(e) => definirDimensao(m.id, "comprimento", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          className="inp inp-num"
                          type="number"
                          min={0}
                          value={exibir(m.largura)}
                          onChange={(e) => definirDimensao(m.id, "largura", Number(e.target.value))}
                        />
                      </td>
                      {mostrarAltura && (
                        <td>
                          <input
                            className="inp inp-num"
                            type="number"
                            min={0}
                            value={exibir(m.altura)}
                            onChange={(e) => definirDimensao(m.id, "altura", Number(e.target.value))}
                          />
                        </td>
                      )}
                      <td>
                        <input
                          className="inp inp-qtd"
                          type="number"
                          min={1}
                          value={m.quantidade}
                          onChange={(e) =>
                            atualizar(m.id, "quantidade", Math.max(1, Number(e.target.value)))
                          }
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

          {/* Vista de cima (veículo) ou volume por material (cúbico) */}
          {modo === "veiculo" ? (
            <div className="card">
              <h2 className="card-title">Vista de cima</h2>
              <TruckView
                pecas={resultado.pecas}
                larguraPlanejamento={larguraPlanejamento}
                metrosLineares={resultado.metrosLineares}
                comprimentoVeiculo={veiculo?.comprimento}
                nomeVeiculo={veiculo?.nome}
              />
              {empilhando && (
                <p className="muted" style={{ marginTop: 8 }}>
                  ×N indica quantas peças estão empilhadas na mesma posição (até {alturaMaxRemonte} m).
                </p>
              )}
              {resultado.algumaForaDeMedida && (
                <p className="warn">
                  ⚠ Algum material é mais largo que a largura de planejamento ({larguraPlanejamento} m).
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
                  <div className="hero-num">{resultado.metrosLineares.toFixed(2)} m</div>
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
                    <dt>Maior largura</dt>
                    <dd>
                      {(resultado.pecaMaiorLargura * fator).toFixed(0)} {unidade}
                    </dd>
                  </div>
                </dl>

                <div className="field-group">
                  <label className="field">
                    <span>Largura útil (m)</span>
                    <input
                      className="inp inp-mini"
                      type="number"
                      step={0.05}
                      min={1}
                      value={larguraPlanejamento}
                      onChange={(e) => setLarguraPlanejamento(Number(e.target.value) || 2.4)}
                    />
                  </label>
                  <label className="field">
                    <span>Peso total (kg)</span>
                    <input
                      className="inp inp-mini"
                      type="number"
                      min={0}
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
                          <input
                            className="inp inp-mini"
                            type="number"
                            step={0.1}
                            min={0}
                            value={alturaMaxRemonte}
                            onChange={(e) => setAlturaMaxRemonte(Number(e.target.value) || 0)}
                          />
                        </label>
                        {veiculo && (
                          <button className="link" onClick={() => setAlturaMaxRemonte(veiculo.altura)}>
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
                    <dt>Área de piso</dt>
                    <dd>{resultado.areaTotal.toFixed(2)} m²</dd>
                  </div>
                  <div className="dl-row">
                    <dt>Total de peças</dt>
                    <dd>{resultado.totalPecas}</dd>
                  </div>
                </dl>
                <div className="field-group">
                  <label className="field">
                    <span>Fator de cubagem (kg/m³)</span>
                    <input
                      className="inp inp-mini"
                      type="number"
                      min={0}
                      step={10}
                      value={fatorCubagem}
                      onChange={(e) => setFatorCubagem(Number(e.target.value) || 0)}
                    />
                  </label>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                    Peso cubado = volume × fator (padrão rodoviário ≈ 300 kg/m³).
                  </p>
                </div>
              </>
            )}
          </div>

          {modo === "veiculo" && (
            <div className="card">
              <h2 className="card-title">Veículos</h2>
              <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
                Clique para ver o limite na vista de cima.
              </p>
              <ul className="veic-list">
                {avaliacoes.map(({ veiculo: v, status, motivos, ocupacaoComprimento }) => {
                  const badge = status === "cabe" ? "✓" : status === "justo" ? "≈" : "✗";
                  const ativo = v.id === veiculoSelecionado;
                  return (
                    <li key={v.id}>
                      <button
                        className={`veic ${status} ${ativo ? "ativo" : ""}`}
                        onClick={() => setVeiculoSelecionado(ativo ? "" : v.id)}
                      >
                        <div className="veic-top">
                          <span className="veic-nome">{v.nome}</span>
                          <span className={`badge ${status}`}>{badge}</span>
                        </div>
                        <div className="veic-meta">
                          <span>
                            {v.comprimento} m · {v.largura} m · {v.altura} m · {(v.pesoMax / 1000).toFixed(0)} t
                          </span>
                          {status !== "nao-cabe" && <span>{ocupacaoComprimento.toFixed(0)}%</span>}
                        </div>
                        {status === "nao-cabe" && motivos[0] && (
                          <div className="veic-motivo">{motivos[0]}</div>
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
    </>
  );
}

function lerBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      const virgula = res.indexOf(",");
      resolve(virgula >= 0 ? res.slice(virgula + 1) : res);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(arquivo);
  });
}
