export type BarListEntry = { label: string; value: number; display?: string };

export function BarList({ entries }: { entries: BarListEntry[] }) {
  if (entries.length === 0) {
    return <p className="empty">No hay datos todavía.</p>;
  }

  const max = Math.max(...entries.map((e) => Math.abs(e.value)), 1);

  return (
    <div>
      {entries.map((e) => (
        <div className="bar-row" key={e.label}>
          <div className="bar-label">{e.label}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.min(100, (Math.abs(e.value) / max) * 100)}%` }}
            />
          </div>
          <div className="bar-value">{e.display ?? e.value}</div>
        </div>
      ))}
    </div>
  );
}
