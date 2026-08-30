import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Kpi, LevelBadge, Panel, PrValue, StatusDot, nf } from "@/components/shared";
import { alarmLevelCount, alarms, powerCurve, stations, summary, workOrders } from "@/lib/mock";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "运维总览 · 分布式光伏运维平台" },
      { name: "description", content: "运维视角总览：实时功率、今日发电、告警待办与低 PR 电站预警。" },
      { property: "og:title", content: "运维总览 · 分布式光伏运维平台" },
      { property: "og:description", content: "实时功率、今日发电、告警待办与低 PR 电站预警。" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const counts = alarmLevelCount();
  const curve = powerCurve("grid-total", summary.currentPowerKw * 1.9);
  const todo = alarms.filter((a) => a.status !== "resolved").slice(0, 8);
  const lowPr = [...stations].sort((a, b) => a.prToday - b.prToday).slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="实时总功率" value={nf(summary.currentPowerKw)} unit="kW" tone="brand" />
        <Kpi label="今日发电量" value={nf(summary.todayGenerationKwh)} unit="kWh" />
        <Kpi
          label="电站在线率"
          value={(summary.onlineRate * 100).toFixed(1)}
          unit="%"
          sub={`在线 ${summary.online} / 告警 ${summary.alarm} / 离线 ${summary.offline}`}
          tone="success"
        />
        <Kpi label="未处理告警" value={String(alarms.filter((a) => a.status === "open").length)} unit="条" tone="danger" />
        <Kpi label="处理中工单" value={String(workOrders.filter((w) => w.status !== "done").length)} unit="单" tone="warning" />
        <Kpi label="今日收益" value={nf(summary.todayRevenueYuan)} unit="元" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="全网实时功率趋势（24h）" className="xl:col-span-2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ left: 4, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="ap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" interval={5} fontSize={11} />
                <YAxis fontSize={11} width={60} label={{ value: "kW", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${nf(v)} kW`, "全网功率"]} />
                <Area type="monotone" dataKey="powerKw" stroke="var(--primary)" fill="url(#ap)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="告警待办"
          extra={
            <Link to="/admin/alarms" className="text-xs text-primary hover:underline">
              进入告警中心
            </Link>
          }
        >
          <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded border border-danger/30 py-1.5 text-danger">紧急 {counts.critical}</div>
            <div className="rounded border border-major/30 py-1.5 text-major">重要 {counts.major}</div>
            <div className="rounded border border-warning/40 py-1.5 text-warning">一般 {counts.minor}</div>
            <div className="rounded border py-1.5 text-muted-foreground">提示 {counts.info}</div>
          </div>
          <ul className="space-y-2">
            {todo.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-xs">
                <LevelBadge level={a.level} />
                <div className="min-w-0">
                  <div className="truncate">{a.description}</div>
                  <div className="text-muted-foreground">
                    {stations.find((s) => s.id === a.stationId)?.name} · {a.occurredAt}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="PR 偏低电站预警（PR = 实际发电量 / 理论发电量）">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2">电站</th>
              <th>区域</th>
              <th className="text-right">装机 (kWp)</th>
              <th className="text-right">今日发电 (kWh)</th>
              <th className="text-right">PR</th>
              <th className="text-right">等效小时 (h)</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {lowPr.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2">
                  <Link
                    to="/admin/stations/$stationId"
                    params={{ stationId: s.id }}
                    className="text-primary hover:underline"
                  >
                    {s.name}
                  </Link>
                </td>
                <td>{s.region}</td>
                <td className="num text-right">{nf(s.installedCapacityKwp)}</td>
                <td className="num text-right">{nf(s.todayGenerationKwh)}</td>
                <td className="text-right">
                  <PrValue pr={s.prToday} />
                </td>
                <td className="num text-right">{s.equivalentHoursMonth}</td>
                <td>
                  <StatusDot status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
