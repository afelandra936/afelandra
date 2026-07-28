export function Tag({ kind, children }: { kind: "calzado" | "accesorio" | "fijo" | "variable"; children: React.ReactNode }) {
  return <span className={`tag ${kind}`}>{children}</span>;
}
