import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/costs";

/**
 * The Spend Dashboard's two charts, split into their own chunk so recharts
 * (~340 kB) only loads when a user actually visits /dashboard with saved trips.
 */

export interface BarDatum {
  name: string;
  fuel?: number;
  flights?: number;
  lodging: number;
  activities: number;
  food: number;
}

export interface PieDatum {
  name: string;
  value: number;
  color: string;
}

export interface CategoryColors {
  fuel: string;
  flights: string;
  lodging: string;
  activities: string;
  food: string;
}

interface TooltipEntry {
  fill?: string;
  dataKey?: string;
  value: number;
}

/** Custom bar-chart tooltip with a per-category breakdown (bundle `C1e`). */
function CostTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: entry.fill }}
          />
          <span className="text-[var(--color-text-muted)] capitalize">
            {entry.dataKey}
          </span>
          <span className="font-bold ml-auto pl-4">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
      <div className="border-t border-[var(--color-border)] mt-2 pt-2 flex justify-between font-bold">
        <span>Total</span>
        <span>
          {formatCurrency(payload.reduce((sum, e) => sum + e.value, 0))}
        </span>
      </div>
    </div>
  );
}

interface SpendingChartsProps {
  barData: BarDatum[];
  pieData: PieDatum[];
  totalFuel: number;
  totalFlights: number;
  colors: CategoryColors;
}

export default function SpendingCharts({
  barData,
  pieData,
  totalFuel,
  totalFlights,
  colors,
}: SpendingChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
      <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4">Cost by Trip</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CostTooltip />} />
            {totalFuel > 0 && (
              <Bar
                dataKey="fuel"
                stackId="a"
                fill={colors.fuel}
                radius={[0, 0, 0, 0]}
                name="Fuel"
              />
            )}
            {totalFlights > 0 && (
              <Bar dataKey="flights" stackId="a" fill={colors.flights} name="Flights" />
            )}
            <Bar dataKey="lodging" stackId="a" fill={colors.lodging} name="Lodging" />
            <Bar
              dataKey="activities"
              stackId="a"
              fill={colors.activities}
              name="Activities"
            />
            <Bar
              dataKey="food"
              stackId="a"
              fill={colors.food}
              radius={[4, 4, 0, 0]}
              name="Food"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4">Spend Mix</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={75}
              innerRadius={35}
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 mt-3">
          {pieData.map((entry) => (
            <div
              key={entry.name}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: entry.color }}
                />
                <span className="text-[var(--color-text-muted)]">{entry.name}</span>
              </span>
              <span className="font-semibold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
