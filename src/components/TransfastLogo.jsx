/**
 * Logo TransFAST (wordmark). Nítido em qualquer resolução, acessível.
 * "TRANS" em texto claro + "FAST" em vermelho da marca.
 */
export default function TransfastLogo({ width = 150, className = "" }) {
  const height = width * (48 / 214);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 214 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TransFAST"
      className={className}
    >
      <title>TransFAST</title>
      <text
        x="0"
        y="35"
        fill="var(--text-1, #F7F8FA)"
        fontFamily="var(--font), Arial, Helvetica, sans-serif"
        fontSize="32"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        TRANS
      </text>
      <text
        x="105"
        y="35"
        fill="var(--brand, #E30613)"
        fontFamily="var(--font), Arial, Helvetica, sans-serif"
        fontSize="32"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        FAST
      </text>
    </svg>
  );
}
