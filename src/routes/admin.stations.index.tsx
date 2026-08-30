import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Panel, PrValue, StatusDot, nf } from "@/components/shared";
import {
  PRICE_MODEL_LABEL,
  REGIONS,
  round,
  stations,
  type StationStatus,
} from "@/lib/mock";

export const Route = createFileRoute("/admin/stations/")({
  head: () => ({
    meta: [
      { title: "电站管理 · 分布式光伏运维平台" },
      { name: "description", content: "全量工商业分布式光伏电站列表，可按区域、运行状态、PR 区间筛选并下钻。" },
      { property: "og:title", content: "电站管理 · 分布式光伏运维平台" },
      { property: "og:description", content: "电站列表：装机/并网容量、今日发电、PR、等效小时数与在线状态。" },
    ],
  }),
  component: StationList,
});

function StationList() {
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState<"all" | StationStatus>("all");
  const [prBand, setPrBand] = useState<"all" | "healthy" | "watch" | "bad">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      stations.filter((s) => {
        if (region !== "all" && s.region !== region) return false;
        if (status !== "all" && s.status !== status) return false;
        if (prBand === "healthy" && s.prToday < 0.8) return false;
        if (prBand === "watch" && !(s.prToday >= 0.65 && s.prToday < 0.8)) return false;
        if (prBand === "bad" && s.prToday >= 0.65) return false;
        if (q && !s.name.includes(q) && !s.id.includes(q.toUpperCase())) return false;
        return true;
      }),
    [region, status, prBand, q],
  );

  const sel = "rounded-md border bg-background px-2 py-1.5 text-sm";

  return (
    <Panel
      title={`电站列表（共 ${rows.length} 座）`}
      extra={<span className="text-xs text-muted-foreground">点击电站名进入详情下钻</span>}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className={sel}
          placeholder="搜索电站名称 / 编号"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={sel} value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="all">全部区域</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value as StationStatus)}>
          <option value="all">全部状态</option>
          <option value="online">在线</option>
          <option value="alarm">告警</option>
          <option value="offline">离线</option>
        </select>
        <select className={sel} value={prBand} onChange={(e) => setPrBand(e.target.value as "all")}>
          <option value="all">全部 PR 区间</option>
          <option value="healthy">PR ≥ 80%（健康）</option>
          <option value="watch">65% ≤ PR &lt; 80%（需关注）</option>
          <option value="bad">PR &lt; 65%（异常）</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2">电站名称</th>
              <th>区域</th>
              <th className="text-right">装机容量 (kWp)</th>
              <th className="text-right">并网容量 (kW)</th>
              <th className="text-right">超配比</th>
              <th className="text-right">今日发电 (kWh)</th>
              <th className="text-right">月等效小时 (h)</th>
              <th className="text-right">PR</th>
              <th>电价模式</th>
              <th>并网日期</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="py-2">
                  <Link
                    to="/admin/stations/$stationId"
                    params={{ stationId: s.id }}
                    className="text-primary hover:underline"
                  >
                    {s.name}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">{s.id}</div>
                </td>
                <td>{s.region}</td>
                <td className="num text-right">{nf(s.installedCapacityKwp)}</td>
                <td className="num text-right">{nf(s.gridCapacityKw)}</td>
                <td className="num text-right">{round(s.installedCapacityKwp / s.gridCapacityKw, 2)}</td>
                <td className="num text-right">{nf(s.todayGenerationKwh)}</td>
                <td className="num text-right">{s.equivalentHoursMonth}</td>
                <td className="text-right">
                  <PrValue pr={s.prToday} />
                </td>
                <td className="text-xs">{PRICE_MODEL_LABEL[s.priceModel]}</td>
                <td className="text-xs">{s.gridConnectedDate}</td>
                <td>
                  <StatusDot status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
