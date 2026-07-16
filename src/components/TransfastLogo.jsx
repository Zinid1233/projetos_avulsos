import logo from "../assets/transfast-logo.png";

/**
 * Logo oficial TransFAST (símbolo TF + wordmark "TransFast").
 * PNG transparente recortado — nítido no header escuro.
 */
export default function TransfastLogo({ width = 150, className = "" }) {
  const ratio = 89 / 414; // altura / largura do arquivo recortado
  return (
    <img
      src={logo}
      alt="TransFAST"
      width={width}
      height={Math.round(width * ratio)}
      className={className}
      draggable={false}
      style={{ display: "block", width, height: "auto" }}
    />
  );
}
