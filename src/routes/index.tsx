import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import { ScreenPanel, nf } from "@/components/shared";
import {
  CO2_FACTOR_KG_PER_KWH,
  LEVEL_LABEL,
  alarmLevelCount,
  alarms,
  deviceOnlineRates,
  powerCurve,
  stationPosition,
  stations,
  summary,
  type Alarm,
} from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "集团监控大屏 · 工商业分布式光伏电站监控系统" },
      {
        name: "description",
        content:
          "工商业分布式光伏集团监控大屏：总装机、实时功率、发电量与收益、电站分布地图、PR 排行与告警总览。",
      },
      { property: "og:title", content: "集团监控大屏 · 工商业分布式光伏电站监控系统" },
      {
        property: "og:description",
        content: "多电站汇总视角：装机容量、实时功率、发电量、收益、CO₂ 减排与告警统计。",
      },
    ],
  }),
  component: ScreenPage,
});

const AXIS = { stroke: "oklch(0.75 0.02 230)", fontSize: 11 };

function tooltipStyle() {
  return {
    contentStyle: {
      background: "oklch(0.22 0.03 250)",
      border: "1px solid oklch(0.62 0.12 190 / 0.35)",
      borderRadius: 6,
      fontSize: 12,
      color: "oklch(0.97 0.01 220)",
    },
    labelStyle: { color: "oklch(0.85 0.02 220)" },
  };
}

function ScreenPage() {
  const [rankBy, setRankBy] = useState<"gen" | "pr">("gen");
  const curve = useMemo(() => powerCurve("grid-total", summary.currentPowerKw * 1.9), []);
  const counts = alarmLevelCount();
  const ranking = useMemo(() => {
    const list = [...stations];
    list.sort((a, b) =>
      rankBy === "gen" ? b.todayGenerationKwh - a.todayGenerationKwh : b.prToday - a.prToday,
    );
    return list.slice(0, 8);
  }, [rankBy]);
  const latest: Alarm[] = alarms.slice(0, 14);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div
        className="min-h-screen bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--brand)_16%,transparent),transparent_60%)] p-4"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        <header className="mb-3 flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-baseline gap-3">
            <h1 className="glow-text text-2xl font-bold tracking-[0.2em] text-primary">
              工商业分布式光伏电站监控中心
            </h1>
            <span className="text-xs text-muted-foreground">
              集团级汇总视角 · 数据采集周期 5min
            </span>
          </div>
          <nav className="flex items-center gap-2 text-xs">
            <Link
              to="/admin"
              className="rounded border border-border px-3 py-1.5 text-primary transition-colors hover:bg-primary/10"
            >
              运维管理后台
            </Link>
            <Link
              to="/portal"
              className="rounded border border-border px-3 py-1.5 text-primary transition-colors hover:bg-primary/10"
            >
              业主收益门户
            </Link>
          </nav>
        </header>

        {/* KPI 条 */}
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {[
            { l: "总装机容量", v: nf(summary.totalCapacityKwp), u: "kWp" },
            { l: "今日发电量", v: nf(summary.todayGenerationKwh), u: "kWh" },
            { l: "实时总功率", v: nf(summary.currentPowerKw), u: "kW" },
            { l: "累计发电量", v: nf(summary.totalGenerationKwh / 10000, 1), u: "万 kWh" },
            { l: "今日收益", v: nf(summary.todayRevenueYuan), u: "元" },
            { l: "累计收益", v: nf(summary.totalRevenueYuan / 10000, 1), u: "万元" },
            { l: "累计 CO₂ 减排", v: nf(summary.totalCo2Ton, 1), u: "吨" },
            {
              l: "电站数 / 在线率",
              v: `${summary.stationCount} / ${(summary.onlineRate * 100).toFixed(1)}%`,
              u: "",
            },
          ].map((k) => (
            <div key={k.l} className="panel rounded-md px-3 py-2.5">
              <div className="text-[11px] tracking-wide text-muted-foreground">{k.l}</div>
              <div className="glow-text num mt-1 text-xl font-bold text-primary">
                {k.v}
                {k.u ? <span className="ml-1 text-[11px] font-normal text-muted-foreground">{k.u}</span> : null}
              </div>
            </div>
          ))}
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          CO₂ 减排按当地电网基准线排放因子估算（当前系数 {CO2_FACTOR_KG_PER_KWH} kgCO₂/kWh，可在系统设置中配置）
        </p>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.35fr_1fr]">
          {/* 左列 */}
          <div className="flex flex-col gap-3">
            <ScreenPanel title="电站运行状态">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { l: "在线", v: summary.online, c: "text-success" },
                  { l: "告警", v: summary.alarm, c: "text-major" },
                  { l: "离线", v: summary.offline, c: "text-neutralstate" },
                ].map((s) => (
                  <div key={s.l} className="rounded border border-border py-2">
                    <div className={cn("num text-2xl font-bold", s.c)}>{s.v}</div>
                    <div className="text-[11px] text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </ScreenPanel>

            <ScreenPanel title="设备在线率" className="flex-1">
              <div className="grid grid-cols-2 gap-2">
                {deviceOnlineRates.map((d) => {
                  const rate = d.online / d.total;
                  const data = [
                    { name: "在线", value: d.online },
                    { name: "离线", value: d.total - d.online },
                  ];
                  return (
                    <div key={d.name} className="relative h-[104px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            dataKey="value"
                            innerRadius={30}
                            outerRadius={42}
                            startAngle={90}
                            endAngle={-270}
                            stroke="none"
                          >
                            <Cell fill="oklch(0.82 0.16 178)" />
                            <Cell fill="oklch(0.35 0.03 250)" />
                          </Pie>
                          <Tooltip {...tooltipStyle()} formatter={(v: number) => [`${v} 台`, ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="num text-sm font-bold text-primary">
                          {(rate * 100).toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">{d.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScreenPanel>

            <ScreenPanel title="光储一体（预留）">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded border border-border py-2">
                  <div className="num text-xl font-bold text-brand-2">{summary.bessCount}</div>
                  <div className="text-[11px] text-muted-foreground">接入储能站点</div>
                </div>
                <div className="rounded border border-border py-2">
                  <div className="num text-xl font-bold text-brand-2">-1,240</div>
                  <div className="text-[11px] text-muted-foreground">当前充放电 kW</div>
                </div>
                <div className="rounded border border-border py-2">
                  <div className="num text-xl font-bold text-brand-2">63%</div>
                  <div className="text-[11px] text-muted-foreground">平均 SOC</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                储能（PCS / 电池簇 / SOC / SOH）详情待扩展 ——
                <Link to="/admin/bess" className="ml-1 text-primary underline-offset-2 hover:underline">
                  进入储能子模块占位页
                </Link>
              </p>
            </ScreenPanel>
          </div>

          {/* 中列 */}
          <div className="flex flex-col gap-3">
            <ScreenPanel title="区域电站分布（气泡大小 = 装机容量）" className="min-h-[360px]">
              <div className="relative h-[320px] w-full overflow-hidden rounded border border-border bg-[linear-gradient(0deg,color-mix(in_oklch,var(--brand)_6%,transparent),transparent)]">
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, oklch(0.62 0.12 190 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.62 0.12 190 / 0.25) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                {stations.map((s) => {
                  const [x, y] = stationPosition(s);
                  const size = 8 + (s.installedCapacityKwp / 4500) * 26;
                  const color =
                    s.status === "online"
                      ? "oklch(0.82 0.17 165)"
                      : s.status === "alarm"
                        ? "oklch(0.75 0.18 52)"
                        : "oklch(0.6 0.02 240)";
                  return (
                    <Link
                      key={s.id}
                      to="/admin/stations/$stationId"
                      params={{ stationId: s.id }}
                      className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: size,
                        height: size,
                        background: color,
                        opacity: 0.75,
                        boxShadow: `0 0 ${size}px ${color}`,
                      }}
                    >
                      <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden w-52 -translate-x-1/2 translate-y-1 rounded border border-border bg-card p-2 text-left text-[11px] group-hover:block">
                        <b className="text-primary">{s.name}</b>
                        <br />
                        装机 {nf(s.installedCapacityKwp)} kWp · 今日 {nf(s.todayGenerationKwh)} kWh
                        <br />
                        PR {(s.prToday * 100).toFixed(1)}%
                      </span>
                    </Link>
                  );
                })}
                <div className="absolute bottom-2 left-2 flex gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <i className="size-2 rounded-full bg-success" />正常
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="size-2 rounded-full bg-major" />告警
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="size-2 rounded-full bg-neutralstate" />离线
                  </span>
                </div>
              </div>
            </ScreenPanel>

            <ScreenPanel title="全网实时功率趋势（24h · kW / 辐照度 W/m²）" className="flex-1">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={curve} margin={{ left: 4, right: 4, top: 8 }}>
                    <defs>
                      <linearGradient id="pw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.82 0.16 178)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="oklch(0.82 0.16 178)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="oklch(0.62 0.12 190 / 0.15)" vertical={false} />
                    <XAxis dataKey="time" tick={AXIS} interval={5} />
                    <YAxis yAxisId="l" tick={AXIS} width={54} label={{ value: "kW", position: "insideTopLeft", fill: AXIS.stroke, fontSize: 11 }} />
                    <YAxis yAxisId="r" orientation="right" tick={AXIS} width={46} />
                    <Tooltip {...tooltipStyle()} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      yAxisId="l"
                      type="monotone"
                      dataKey="powerKw"
                      name="全网功率 (kW)"
                      stroke="oklch(0.82 0.16 178)"
                      fill="url(#pw)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="r"
                      type="monotone"
                      dataKey="irradianceWm2"
                      name="辐照度 (W/m²)"
                      stroke="oklch(0.85 0.16 92)"
                      dot={false}
                      strokeWidth={1.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ScreenPanel>
          </div>

          {/* 右列 */}
          <div className="flex flex-col gap-3">
            <ScreenPanel
              title="电站排行 Top 8"
              extra={
                <div className="flex gap-1 text-[11px]">
                  {(
                    [
                      ["gen", "今日发电量"],
                      ["pr", "PR 性能比"],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setRankBy(k)}
                      className={cn(
                        "rounded border border-border px-2 py-0.5",
                        rankBy === k ? "bg-primary/15 text-primary" : "text-muted-foreground",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ranking.map((s) => ({
                      name: s.name.slice(0, 6),
                      value: rankBy === "gen" ? s.todayGenerationKwh : Math.round(s.prToday * 1000) / 10,
                    }))}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid stroke="oklch(0.62 0.12 190 / 0.15)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={AXIS}
                      unit={rankBy === "gen" ? " kWh" : " %"}
                    />
                    <YAxis type="category" dataKey="name" tick={AXIS} width={70} />
                    <Tooltip {...tooltipStyle()} formatter={(v: number) => [rankBy === "gen" ? `${nf(v)} kWh` : `${v}%`, rankBy === "gen" ? "今日发电量" : "PR"]} />
                    <Bar dataKey="value" fill="oklch(0.72 0.15 235)" radius={[0, 3, 3, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                跨电站可比性建议看等效利用小时数（kWh/kWp），发电量绝对值受装机容量影响。
              </p>
            </ScreenPanel>

            <ScreenPanel title="告警总览" className="flex-1">
              <div className="mb-2 grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ["critical", counts.critical, "text-danger border-danger/40"],
                    ["major", counts.major, "text-major border-major/40"],
                    ["minor", counts.minor, "text-warning border-warning/40"],
                    ["info", counts.info, "text-brand-2 border-brand-2/40"],
                  ] as const
                ).map(([lv, v, c]) => (
                  <div key={lv} className={cn("rounded border py-1.5", c)}>
                    <div className="num text-lg font-bold">{v}</div>
                    <div className="text-[11px] opacity-80">{LEVEL_LABEL[lv]}</div>
                  </div>
                ))}
              </div>
              <div className="h-[230px] overflow-hidden">
                <div className="animate-[marquee_28s_linear_infinite] space-y-1">
                  {latest.concat(latest).map((a, i) => (
                    <Link
                      key={a.id + i}
                      to="/admin/alarms"
                      className="flex items-center gap-2 rounded border border-border px-2 py-1 text-[11px] hover:bg-primary/5"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          a.level === "critical"
                            ? "bg-danger"
                            : a.level === "major"
                              ? "bg-major"
                              : a.level === "minor"
                                ? "bg-warning"
                                : "bg-brand-2",
                        )}
                      />
                      <span className="w-24 shrink-0 truncate text-muted-foreground">{a.occurredAt.slice(5)}</span>
                      <span className="truncate">{a.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <style>{`@keyframes marquee{0%{transform:translateY(0)}100%{transform:translateY(-50%)}}`}</style>
            </ScreenPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
