import { getSession } from "@/lib/auth";
import { getConfig, getCoeficientesPorMarca } from "@/lib/config";
import { listarCambios, listarNotasCredito } from "@/lib/actions/cambios";
import { serialize } from "@/lib/serialize";
import { CambiosView } from "./CambiosView";

export default async function CambiosPage() {
  const session = await getSession();
  const [cambios, notasCredito, config, coeficientesPorMarca] = await Promise.all([
    listarCambios(),
    listarNotasCredito(),
    getConfig(),
    getCoeficientesPorMarca(),
  ]);

  return (
    <CambiosView
      role={session!.role}
      cambios={cambios}
      notasCredito={notasCredito}
      vendedoresNombres={config.vendedores}
      config={serialize({ debito: config.debito, credito3: config.credito3, credito6: config.credito6, contado: config.contado })}
      coeficientesPorMarca={serialize(coeficientesPorMarca)}
    />
  );
}
