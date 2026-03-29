import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LineConfig = {
  dataKey: string;
  name: string;
  color: string;
};

type LinePanelProps = {
  data: Array<Record<string, number | string | undefined>>;
  yDomain?: [number, number] | undefined;
  title: string;
  lines: LineConfig[];
  todayMarkerDate?: string;
  threshold?: number;
};

export function LinePanel({ data, yDomain, title, lines, todayMarkerDate, threshold }: LinePanelProps) {
  const hasTodayMarker = Boolean(
    todayMarkerDate && data.some((row) => String(row.date ?? "") === todayMarkerDate)
  );

  return (
    <div className="h-90 rounded-xl border border-(--line) bg-white p-2 md:p-3">
      <p className="mb-2 px-2 text-sm font-semibold text-(--ink-soft)">{title}</p>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dfd5c0" />
          <XAxis dataKey="date" />
          <YAxis domain={yDomain} />
          <Tooltip />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              name={line.name}
            />
          ))}
          {hasTodayMarker && todayMarkerDate ? (
            <ReferenceLine
              x={todayMarkerDate}
              stroke="#0f766e"
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{ value: "Today", position: "insideTopRight", fill: "#0f766e", fontSize: 11 }}
            />
          ) : null}
          {typeof threshold === "number" ? (
            <Line
              type="linear"
              dataKey={() => threshold}
              stroke="#13212c"
              strokeDasharray="8 4"
              dot={false}
              name="Threshold"
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
