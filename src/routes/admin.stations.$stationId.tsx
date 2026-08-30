import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Kpi, LevelBadge, Panel, PrValue, StatusDot, nf } from "@/components/shared";
import {
  PRICE_MODEL_LABEL,
  STRING_ABNORMAL_RATIO,
  alarms,
  generationSeries,
  getStation,
  invertersOfStation,
  meterComparison,
  powerCurve,
  round,
  stringsOfInverter,
  touPrices,
  weatherCurve,
} from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/stations/$stationId")({
  loader: ({ params }) => {
    const s = getStation(params.stationId);
    if (!s) throw notFound();
    return { name: s.name };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} · 电站详情` : "电站详情";
    return {
      meta: [
        { title },
        { name: "description", content: "单站详情：设备台账、组串电流对比、气象、收益结算与告警。" },
        { property: "og:title", content: title },
        { property: "og:description", content: "设备台账、组串电流对比、气象辐照、收益模式与告警工单。" },
      ],
    };
  },
  component: StationDetail,
});

const TABS = ["设备台账", "气象", "收益", "告警", "档案配置"] as const;

function StationDetail() {
  const { stationId } = Route.useParams();
  const station = getStation(stationId)!;
  const inverters = useMemo(() => invertersOfStation(stationId), [stationId]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("设备台账");
  const [invId, setInvId] = useState(inverters[0]?.id ?? "");
  const strings = useMemo(() => stringsOfInverter(invId), [invId]);
  const weather = useMemo(() => weatherCurve(stationId), [stationId]) as unknown as {
    time: string;
    irradianceWm2: number;
    moduleTempC: number;
    ambientTempC: number;
    windSpeedMs: number;
  }[];
  const stationAlarms = alarms.filter((a) => a.stationId === stationId);
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");
  const [compare, setCompare] = useState<"lastYear" | "lastPeriod">("lastYear");
  const gen = useMemo(
    () =>
      generationSeries(
        stationId,
        period,
        period === "day"
          ? station.todayGenerationKwh || station.monthGenerationKwh / 30
          : period === "month"
            ? station.monthGenerationKwh
            : station.yearGenerationKwh,
      ),
    [stationId, period, station],
  );
  const meters = useMemo(() => meterComparison(stationId), [stationId]);
  const dcAcRatio = round(station.installedCapacityKwp / station.gridCapacityKw, 2);

  const selfUseKwh = round(station.monthGenerationKwh * station.selfUseRatio, 0);
  const exportKwh = round(station.monthGenerationKwh * (1 - station.selfUseRatio), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">{station.name}</h1>
          <p className="text-xs text-muted-foreground">
            {station.id} · {station.address} · 并网日期 {station.gridConnectedDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot status={station.status} />
          <Link to="/admin/stations" className="text-xs text-primary hover:underline">
            返回电站列表
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
        <Kpi label="实时功率" value={nf(station.currentPowerKw, 1)} unit="kW" tone="brand" />
        <Kpi label="今日发电量" value={nf(station.todayGenerationKwh)} unit="kWh" />
        <Kpi label="本月发电量" value={nf(station.monthGenerationKwh)} unit="kWh" />
        <Kpi label="年发电量" value={nf(station.yearGenerationKwh)} unit="kWh" />
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">PR 性能比（今日）</div>
          <div className="mt-2 text-2xl font-semibold">
            <PrValue pr={station.prToday} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">≥80% 健康 / 65~80% 关注</div>
        </div>
        <Kpi label="月等效利用小时" value={String(station.equivalentHoursMonth)} unit="h" sub="= 月发电量 / 装机容量" />
        <Kpi
          label="装机 / 并网容量"
          value={`${nf(station.installedCapacityKwp)} / ${nf(station.gridCapacityKw)}`}
          unit="kWp / kW"
          sub={`超配比 DC/AC = ${dcAcRatio}`}
        />
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm",
              tab === t
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "设备台账" && (
        <div className="space-y-4">
          <Panel title="逆变器列表">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2">设备</th>
                    <th>型号</th>
                    <th className="text-right">额定功率 (kW)</th>
                    <th className="text-right">当前功率 (kW)</th>
                    <th className="text-right">直流电压 (V)</th>
                    <th className="text-right">交流电压 (V)</th>
                    <th className="text-right">机内温度 (℃)</th>
                    <th className="text-right">效率 (%)</th>
                    <th className="text-right">今日发电 (kWh)</th>
                    <th>状态 / 故障码</th>
                  </tr>
                </thead>
                <tbody>
                  {inverters.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2">
                        <Link
                          to="/admin/inverters/$inverterId"
                          params={{ inverterId: v.id }}
                          className="text-primary hover:underline"
                        >
                          {v.name}
                        </Link>
                      </td>
                      <td className="text-xs">{v.model}</td>
                      <td className="num text-right">{v.ratedPowerKw}</td>
                      <td className="num text-right">{v.currentPowerKw}</td>
                      <td className="num text-right">{v.dcVoltage}</td>
                      <td className="num text-right">{v.acVoltage}</td>
                      <td className="num text-right">{v.temperature}</td>
                      <td className="num text-right">{v.efficiency}</td>
                      <td className="num text-right">{v.todayGenerationKwh}</td>
                      <td className="text-xs">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5",
                            v.status === "running"
                              ? "border-success/40 text-success"
                              : v.status === "fault"
                                ? "border-danger/40 text-danger"
                                : v.status === "limited"
                                  ? "border-major/40 text-major"
                                  : "border-border text-muted-foreground",
                          )}
                        >
                          {{ running: "运行", standby: "待机", fault: "故障", offgrid: "离网", limited: "限功率" }[v.status]}
                        </span>
                        {v.faultCode ? <span className="ml-2 text-danger">{v.faultCode}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="组串电流对比（仅同一逆变器下多路组串可横向比较）"
            extra={
              <select
                className="rounded-md border bg-background px-2 py-1 text-xs"
                value={invId}
                onChange={(e) => setInvId(e.target.value)}
              >
                {inverters.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            }
          >
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strings} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} width={54} label={{ value: "A", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} A`, "组串电流"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="currentA" name="组串电流 (A)" radius={[3, 3, 0, 0]}>
                    {strings.map((s) => (
                      <Cell key={s.id} fill={s.isAbnormal ? "var(--danger)" : "var(--primary)"} />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="referenceCurrentA"
                    name="同组均值基准 (A)"
                    stroke="var(--major)"
                    dot={false}
                    strokeDasharray="4 4"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              诊断规则：单路电流持续低于同组均值 {STRING_ABNORMAL_RATIO * 100}%（阈值可在系统设置中配置）判定异常。
            </p>
            {strings.some((s) => s.isAbnormal) && (
              <ul className="mt-2 space-y-1 text-xs">
                {strings
                  .filter((s) => s.isAbnormal)
                  .map((s) => (
                    <li key={s.id} className="rounded border border-danger/30 bg-danger/5 px-2 py-1 text-danger">
                      {s.name}：{s.currentA} A（基准 {s.referenceCurrentA} A）— {s.suspectCause}
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "气象" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="辐照度与温度曲线（24h）">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weather} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" interval={5} fontSize={11} />
                  <YAxis yAxisId="l" fontSize={11} width={56} label={{ value: "W/m²", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <YAxis yAxisId="r" orientation="right" fontSize={11} width={44} unit="℃" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="l" dataKey="irradianceWm2" name="辐照度 (W/m²)" fill="var(--warning)" />
                  <Line yAxisId="r" dataKey="moduleTempC" name="组件温度 (℃)" stroke="var(--danger)" dot={false} />
                  <Line yAxisId="r" dataKey="ambientTempC" name="环境温度 (℃)" stroke="var(--brand-2)" dot={false} />
                  <Line yAxisId="r" dataKey="windSpeedMs" name="风速 (m/s)" stroke="var(--neutralstate)" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="理论发电量 vs 实际发电量（kW）">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={powerCurve(stationId, station.gridCapacityKw * 0.85).map((p) => ({
                    ...p,
                    theoreticalKw: round(
                      (p.irradianceWm2 / 1000) * station.installedCapacityKwp * 0.85,
                      1,
                    ),
                  }))}
                  margin={{ left: 4, right: 8, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" interval={5} fontSize={11} />
                  <YAxis fontSize={11} width={56} label={{ value: "kW", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="theoreticalKw" name="理论功率 (kW)" stroke="var(--neutralstate)" strokeDasharray="4 4" dot={false} />
                  <Line dataKey="powerKw" name="实际功率 (kW)" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              理论发电量 = 装机容量 × 有效辐照小时数 × 系统设计系数（当前系数 0.85，可配置）。
            </p>
          </Panel>
        </div>
      )}

      {tab === "收益" && (
        <div className="space-y-4">
          <Panel title="电价模式与结算参数">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-md border p-3 text-sm">
                <div className="text-xs text-muted-foreground">当前电价模式</div>
                <div className="mt-1 font-medium text-primary">{PRICE_MODEL_LABEL[station.priceModel]}</div>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">自用结算单价</dt>
                    <dd className="num">{station.selfUsePriceYuan} 元/kWh</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">余电上网电价</dt>
                    <dd className="num">{station.feedInPriceYuan} 元/kWh</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">自用比例</dt>
                    <dd className="num">{(station.selfUseRatio * 100).toFixed(0)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">屋顶业主分成</dt>
                    <dd className="num">{(station.revenueShareRatio * 100).toFixed(0)}%</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-md border p-3 text-sm md:col-span-2">
                <div className="mb-2 text-xs text-muted-foreground">
                  本月电量拆分与收益测算（收益 = 自用电量 × 自用单价 + 上网电量 × 上网电价）
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-1.5">自用电量</td>
                      <td className="num text-right">{nf(selfUseKwh)} kWh</td>
                      <td className="num text-right">× {station.selfUsePriceYuan} 元</td>
                      <td className="num text-right font-medium">
                        {nf(selfUseKwh * station.selfUsePriceYuan)} 元
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1.5">上网电量</td>
                      <td className="num text-right">{nf(exportKwh)} kWh</td>
                      <td className="num text-right">× {station.feedInPriceYuan} 元</td>
                      <td className="num text-right font-medium">
                        {nf(exportKwh * station.feedInPriceYuan)} 元
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 font-medium">本月合计收益</td>
                      <td />
                      <td />
                      <td className="num text-right font-semibold text-success">
                        {nf(selfUseKwh * station.selfUsePriceYuan + exportKwh * station.feedInPriceYuan)} 元
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-3 text-xs text-muted-foreground">分时电价（尖/峰/平/谷，可在系统设置修改）</div>
                <div className="mt-1 grid grid-cols-4 gap-2 text-xs">
                  {touPrices.map((t) => (
                    <div key={t.period} className="rounded border px-2 py-1">
                      <div className="font-medium">{t.period}：{t.priceYuan} 元</div>
                      <div className="text-[11px] text-muted-foreground">{t.hours}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="发电量与对比分析"
            extra={
              <div className="flex gap-2 text-xs">
                <select
                  className="rounded border bg-background px-2 py-1"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as "day")}
                >
                  <option value="day">按日（近 30 日）</option>
                  <option value="month">按月（本年度）</option>
                  <option value="year">按年</option>
                </select>
                <select
                  className="rounded border bg-background px-2 py-1"
                  value={compare}
                  onChange={(e) => setCompare(e.target.value as "lastYear")}
                >
                  <option value="lastYear">同比（去年同期）</option>
                  <option value="lastPeriod">环比（上一周期）</option>
                </select>
              </div>
            }
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={gen} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} width={62} label={{ value: "kWh", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${nf(v)} kWh`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="current" name="本期发电量 (kWh)" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                  <Line
                    dataKey={compare}
                    name={compare === "lastYear" ? "去年同期 (kWh)" : "上一周期 (kWh)"}
                    stroke="var(--major)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}

      {tab === "告警" && (
        <Panel title={`本站告警（${stationAlarms.length} 条）`}>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2">等级</th>
                <th>类型</th>
                <th>设备</th>
                <th>描述</th>
                <th>发生时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {stationAlarms.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2">
                    <LevelBadge level={a.level} />
                  </td>
                  <td className="text-xs">{a.type}</td>
                  <td className="text-xs">{a.deviceType} {a.deviceId}</td>
                  <td className="text-xs">{a.description}</td>
                  <td className="text-xs">{a.occurredAt}</td>
                  <td className="text-xs">
                    {a.status === "open" ? "待处理" : a.status === "assigned" ? `已派单 ${a.workOrderId}` : "已闭环"}
                  </td>
                </tr>
              ))}
              {stationAlarms.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                    暂无告警记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "档案配置" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="电站档案">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              {[
                ["电站编号", station.id],
                ["所属区域", station.region],
                ["详细地址", station.address],
                ["投资方 / 运营商", station.ownerCompany],
                ["屋顶业主", station.roofLesseeCompany],
                ["合同期限", `${station.contractStartDate} ~ ${station.contractEndDate}`],
                ["并网日期", station.gridConnectedDate],
                ["装机容量", `${nf(station.installedCapacityKwp)} kWp`],
                ["并网容量", `${nf(station.gridCapacityKw)} kW`],
                ["超配比 (DC/AC)", String(dcAcRatio)],
                ["储能子系统", station.hasBess ? "已配置（详情待扩展）" : "未配置"],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="计量点与采集点位">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2">计量点</th>
                  <th>类型</th>
                  <th className="text-right">累计电量 (kWh)</th>
                  <th>采集网关</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["关口表 / 上网表", "gridExport", meters.at(-1)!.exportKwh],
                  ["用户侧用电表", "gridImport", meters.at(-1)!.selfUseKwh],
                  ["光伏发电表（逆变器侧）", "selfUse", meters.at(-1)!.inverterSideKwh],
                ].map(([n, t, v]) => (
                  <tr key={n as string} className="border-b last:border-0">
                    <td className="py-2">{n}</td>
                    <td className="text-xs text-muted-foreground">{t}</td>
                    <td className="num text-right">{nf(v as number)}</td>
                    <td className="text-xs">{station.id}-GW01</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              点位配置仅系统管理员可编辑；字段建议对齐 MyEMS point/data 采集点表结构。
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
