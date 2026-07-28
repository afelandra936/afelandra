"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { fmt } from "@/lib/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export type BarChartEntry = { label: string; value: number };

export function BarChart({ entries }: { entries: BarChartEntry[] }) {
  if (entries.length === 0) {
    return <p className="empty">No hay datos todavía.</p>;
  }

  const data = {
    labels: entries.map((e) => e.label),
    datasets: [
      {
        data: entries.map((e) => e.value),
        backgroundColor: entries.map((e) => (e.value < 0 ? "#E2685C" : "#FF914E")),
        borderRadius: 4,
      },
    ],
  };

  return (
    <Bar
      data={data}
      options={{
        indexAxis: "y" as const,
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => fmt(ctx.parsed.x ?? 0),
            },
          },
        },
        scales: {
          x: {
            grid: { color: "#3E3E3E" },
            ticks: { color: "#ACA9A2" },
          },
          y: {
            grid: { display: false },
            ticks: { color: "#F1EEE9" },
          },
        },
      }}
    />
  );
}
