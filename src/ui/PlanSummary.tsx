import {
  CheckCircle,
  FolderOpen,
  Prohibit,
  WarningCircle,
} from "@phosphor-icons/react";
import type { TransferPlan } from "../domain/types";
import { VirtualList } from "./VirtualList";

const decisionLabels = {
  transfer: "Se transferirá",
  reuse_folder: "Carpeta ya disponible",
  skip_duplicate: "Ya existe",
  rename_duplicate: "Se conservarán ambos",
  blocked: "Sin permiso",
} as const;

export function PlanSummary({ plan }: { readonly plan: TransferPlan }) {
  const counts = plan.operations.reduce(
    (result, operation) => ({
      ...result,
      [operation.decision]: result[operation.decision] + 1,
    }),
    {
      transfer: 0,
      reuse_folder: 0,
      skip_duplicate: 0,
      rename_duplicate: 0,
      blocked: 0,
    },
  );

  const metrics = [
    {
      label: "Preparados",
      value: counts.transfer + counts.rename_duplicate,
      icon: CheckCircle,
    },
    {
      label: "Carpetas disponibles",
      value: counts.reuse_folder,
      icon: FolderOpen,
    },
    { label: "Ya existen", value: counts.skip_duplicate, icon: WarningCircle },
    { label: "Sin permiso", value: counts.blocked, icon: Prohibit },
  ] as const;

  return (
    <section className="surface plan-summary" aria-labelledby="preview-title">
      <div className="surface__header">
        <div>
          <p>Resumen</p>
          <h2 id="preview-title">
            {plan.command === "copy" ? "Copia preparada" : "Traslado preparado"}
          </h2>
        </div>
      </div>
      <dl className="metrics">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <Icon size={20} weight="duotone" aria-hidden="true" />
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {plan.operations.length > 500 ? (
        <VirtualList
          items={plan.operations}
          itemHeight={58}
          height={520}
          getKey={(operation) => operation.operationKey}
          ariaLabel="Resultado previsto por archivo"
          renderItem={(operation) => (
            <div className="plan-virtual-row">
              <span>{operation.item.name}</span>
              <small>
                {operation.item.kind === "folder" ? "Carpeta" : "Archivo"}
              </small>
              <span className={"status status--" + operation.decision}>
                {decisionLabels[operation.decision]}
              </span>
            </div>
          )}
        />
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Archivo o carpeta</th>
              <th>Tipo</th>
              <th>Resultado previsto</th>
            </tr>
          </thead>
          <tbody>
            {(plan.operations.length > 500 ? [] : plan.operations).map(
              (operation) => (
                <tr key={operation.operationKey}>
                  <td data-label="Archivo o carpeta">{operation.item.name}</td>
                  <td data-label="Tipo">
                    {operation.item.kind === "folder" ? "Carpeta" : "Archivo"}
                  </td>
                  <td data-label="Resultado previsto">
                    <span className={`status status--${operation.decision}`}>
                      {decisionLabels[operation.decision]}
                    </span>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
