import { useRef } from "react";
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
  downloadFileName?: string;
};

export function LinePanel({
  data,
  yDomain,
  title,
  lines,
  todayMarkerDate,
  threshold,
  downloadFileName,
}: LinePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const hasTodayMarker = Boolean(
    todayMarkerDate && data.some((row) => String(row.date ?? "") === todayMarkerDate)
  );

  const onDownloadGraphic = () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg || !downloadFileName) {
      return;
    }

    const serializer = new XMLSerializer();
    const svgContent = serializer.serializeToString(svg);
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${downloadFileName}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={containerRef} className="h-90 rounded-xl border border-(--line) bg-white p-2 md:p-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-2">
        <p className="text-sm font-semibold text-(--ink-soft)">{title}</p>
        {downloadFileName ? (
          <button
            type="button"
            onClick={onDownloadGraphic}
            disabled={!data.length}
            className="rounded-md border border-(--line) bg-white px-3 py-1 text-xs font-medium disabled:opacity-40"
          >
            Download Graph
          </button>
        ) : null}
      </div>
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
