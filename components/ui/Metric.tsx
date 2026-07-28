export function Metric({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  small?: boolean;
}) {
  const valueClass = ["value", small ? "small" : "", tone ?? ""].filter(Boolean).join(" ");
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className={valueClass}>{value}</div>
    </div>
  );
}
