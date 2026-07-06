import { useEffect, useRef, useState } from "react";

/**
 * Campo numérico com digitação livre: dá pra apagar tudo e digitar do zero,
 * aceita vírgula ou ponto, e não fica reformatando enquanto você digita.
 * Chama onChange(numero) só quando o texto vira um número válido.
 */
export default function NumInput({ value, onChange, className = "", min, ...rest }) {
  const [txt, setTxt] = useState(fmt(value));
  const focado = useRef(false);

  // Sincroniza com o valor externo quando o campo não está em edição.
  useEffect(() => {
    if (!focado.current) setTxt(fmt(value));
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      className={className}
      value={txt}
      onFocus={() => {
        focado.current = true;
      }}
      onBlur={() => {
        focado.current = false;
        setTxt(fmt(value));
      }}
      onChange={(e) => {
        const bruto = e.target.value;
        setTxt(bruto);
        const n = Number(bruto.replace(",", "."));
        if (bruto.trim() !== "" && Number.isFinite(n)) {
          onChange(min != null ? Math.max(min, n) : n);
        }
      }}
    />
  );
}

function fmt(v) {
  if (v == null || Number.isNaN(v)) return "";
  return String(v);
}
