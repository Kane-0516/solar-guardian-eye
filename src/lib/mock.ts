/**
 * 工商业分布式光伏电站监控系统 —— 本地 mock 数据层
 *
 * 字段命名贴近真实业务，后续可直接映射到后端 / MyEMS 采集点表。
 * 所有数字由确定性伪随机生成，保证大屏 / 后台 / 门户三端口径一致自洽。
 */

/* ------------------------------------------------------------------ 类型 */

export type StationStatus = "online" | "alarm" | "offline";
export type PriceModel = "selfUseFeedIn" | "fullFeedIn" | "distributedTrading";

export interface Station {
  id: string;
  name: string;
  region: string;
  address: string;
  /** 装机容量（DC 侧，组件标称功率之和） */
  installedCapacityKwp: number;
  /** 并网容量（电网核准 AC 侧容量） */
  gridCapacityKw: number;
  gridConnectedDate: string;
  status: StationStatus;
  todayGenerationKwh: number;
  monthGenerationKwh: number;
  yearGenerationKwh: number;
  totalGenerationKwh: number;
  currentPowerKw: number;
  /** 性能比 PR = 实际发电量 / 理论发电量 */
  prToday: number;
  /** 等效利用小时数（月） = 月发电量 / 装机容量，单位 h */
  equivalentHoursMonth: number;
  priceModel: PriceModel;
  /** 自用结算单价 元/kWh */
  selfUsePriceYuan: number;
  /** 上网电价 元/kWh */
  feedInPriceYuan: number;
  /** 自用比例 0~1（仅自发自用余电上网模式） */
  selfUseRatio: number;
  todayRevenueYuan: number;
  totalRevenueYuan: number;
  ownerCompany: string;
  roofLesseeCompany: string;
  /** 屋顶业主收益分成比例 */
  revenueShareRatio: number;
  contractStartDate: string;
  contractEndDate: string;
  hasBess: boolean;
}

export interface Inverter {
  id: string;
  stationId: string;
  name: string;
  model: string;
  ratedPowerKw: number;
  status: "running" | "standby" | "fault" | "offgrid" | "limited";
  currentPowerKw: number;
  dcVoltage: number;
  acVoltage: number;
  temperature: number;
  efficiency: number;
  faultCode: string | null;
  todayGenerationKwh: number;
}

export interface StringPV {
  id: string;
  inverterId: string;
  name: string;
  currentA: number;
  /** 同一逆变器下在线组串电流均值，作为横向对比基准 */
  referenceCurrentA: number;
  isAbnormal: boolean;
  suspectCause: string | null;
}

export type AlarmLevel = "critical" | "major" | "minor" | "info";
export type AlarmType = "设备故障" | "通信中断" | "效率异常" | "环境异常" | "安全类";

export interface Alarm {
  id: string;
  stationId: string;
  deviceId: string;
  deviceType: "逆变器" | "组串" | "采集网关" | "气象站" | "计量表" | "箱变" | "安防";
  level: AlarmLevel;
  type: AlarmType;
  description: string;
  occurredAt: string;
  status: "open" | "assigned" | "resolved";
  workOrderId: string | null;
}

export interface WorkOrder {
  id: string;
  alarmId: string | null;
  stationId: string;
  title: string;
  assignee: string;
  status: "new" | "processing" | "done";
  createdAt: string;
  resolvedAt: string | null;
  note: string;
}

export interface WeatherRecord {
  stationId: string;
  timestamp: string;
  irradianceWm2: number;
  moduleTempC: number;
  ambientTempC: number;
  windSpeedMs: number;
}

export interface MeterReading {
  stationId: string;
  meterType: "gridExport" | "gridImport" | "selfUse";
  timestamp: string;
  cumulativeKwh: number;
}

/* -------------------------------------------------------- 确定性随机工具 */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hash(str: string) {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 2147483647;
  return h;
}

export const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/* ------------------------------------------------------------ 常量配置 */

/** CO2 排放因子：按当地电网基准线排放因子估算，可在系统设置中配置 */
export const CO2_FACTOR_KG_PER_KWH = 0.581;
export const PR_HEALTHY = 0.8;
export const PR_WATCH = 0.65;
export const STRING_ABNORMAL_RATIO = 0.75;

export const REGIONS = ["江苏", "浙江", "广东", "山东", "安徽", "河北", "四川"] as const;

const REGION_POS: Record<string, [number, number]> = {
  江苏: [72, 46],
  浙江: [73, 56],
  广东: [64, 76],
  山东: [68, 38],
  安徽: [66, 51],
  河北: [63, 30],
  四川: [45, 58],
};

const OWNERS = ["中控新能源投资", "远景绿电资产", "华瑞能源科技", "晶泰分布式能源"];
const ROOFS = [
  "宏达精密制造",
  "海联食品工业园",
  "永昌纺织",
  "启明汽车零部件",
  "南方物流仓储中心",
  "金鹏电子",
];
const SITE_TYPES = ["厂房屋顶", "产业园区屋顶", "商业综合体屋顶", "车棚+屋顶"];

/* --------------------------------------------------------------- 电站 */

function makeStation(i: number): Station {
  const rnd = seeded(hash("station" + i));
  const region = REGIONS[i % REGIONS.length];
  const cap = round(300 + rnd() * 4200, 0);
  // 超配比 1.10 ~ 1.30
  const ratio = 1.1 + rnd() * 0.2;
  const gridCap = round(cap / ratio, 0);
  const r = rnd();
  const status: StationStatus = r > 0.86 ? "offline" : r > 0.68 ? "alarm" : "online";
  const pr = status === "offline" ? 0 : round(0.6 + rnd() * 0.28, 3);
  const peakSunHours = 3.4 + rnd() * 1.3;
  const today = status === "offline" ? 0 : round(cap * peakSunHours * (pr || 0.8), 0);
  const month = round(cap * (95 + rnd() * 35), 0);
  const year = round(cap * (860 + rnd() * 260), 0);
  const total = round(year * (1.2 + rnd() * 3.5), 0);
  const priceModel: PriceModel =
    i % 7 === 3 ? "fullFeedIn" : i % 11 === 5 ? "distributedTrading" : "selfUseFeedIn";
  const selfUsePrice = round(0.52 + rnd() * 0.18, 3);
  const feedInPrice = round(0.36 + rnd() * 0.07, 3);
  const selfUseRatio =
    priceModel === "fullFeedIn" ? 0 : priceModel === "distributedTrading" ? 1 : round(0.6 + rnd() * 0.35, 2);
  const todayRevenue = round(
    today * (selfUseRatio * selfUsePrice + (1 - selfUseRatio) * feedInPrice),
    0,
  );
  const yearStart = 2016 + Math.floor(rnd() * 8);
  return {
    id: `ST${String(1001 + i)}`,
    name: `${region}·${ROOFS[i % ROOFS.length]}${SITE_TYPES[i % SITE_TYPES.length]}电站`,
    region,
    address: `${region}省 ${["苏州市", "宁波市", "佛山市", "潍坊市", "合肥市", "廊坊市", "德阳市"][i % 7]} 工业大道 ${100 + i} 号`,
    installedCapacityKwp: cap,
    gridCapacityKw: gridCap,
    gridConnectedDate: `${yearStart}-0${1 + (i % 9)}-1${i % 9}`,
    status,
    todayGenerationKwh: today,
    monthGenerationKwh: month,
    yearGenerationKwh: year,
    totalGenerationKwh: total,
    currentPowerKw: status === "offline" ? 0 : round(cap * (0.28 + rnd() * 0.45), 1),
    prToday: pr,
    equivalentHoursMonth: round(month / cap, 1),
    priceModel,
    selfUsePriceYuan: selfUsePrice,
    feedInPriceYuan: feedInPrice,
    selfUseRatio,
    todayRevenueYuan: todayRevenue,
    totalRevenueYuan: round(total * (selfUseRatio * selfUsePrice + (1 - selfUseRatio) * feedInPrice), 0),
    ownerCompany: OWNERS[i % OWNERS.length],
    roofLesseeCompany: ROOFS[i % ROOFS.length],
    revenueShareRatio: round(0.05 + (i % 4) * 0.03, 2),
    contractStartDate: `${yearStart}-01-01`,
    contractEndDate: `${yearStart + 25}-01-01`,
    hasBess: i % 5 === 2,
  };
}

export const stations: Station[] = Array.from({ length: 42 }, (_, i) => makeStation(i));

export const getStation = (id: string) => stations.find((s) => s.id === id);

export const stationPosition = (s: Station): [number, number] => {
  const rnd = seeded(hash(s.id));
  const [x, y] = REGION_POS[s.region] ?? [60, 50];
  return [x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 8];
};

/* ------------------------------------------------------------- 逆变器 */

const INV_MODELS = ["SUN2000-100KTL", "SG110CX", "GW75K-MT", "SUN2000-60KTL"];

export function invertersOfStation(stationId: string): Inverter[] {
  const st = getStation(stationId);
  if (!st) return [];
  const rnd = seeded(hash("inv" + stationId));
  const count = Math.max(2, Math.min(12, Math.round(st.installedCapacityKwp / 320)));
  const rated = round(st.installedCapacityKwp / count / 1.15, 0);
  return Array.from({ length: count }, (_, i) => {
    const r = rnd();
    const status: Inverter["status"] =
      st.status === "offline"
        ? "offgrid"
        : r > 0.93
          ? "fault"
          : r > 0.86
            ? "limited"
            : r > 0.82
              ? "standby"
              : "running";
    const load = status === "running" ? 0.42 + rnd() * 0.45 : status === "limited" ? 0.7 : 0;
    return {
      id: `${stationId}-INV${String(i + 1).padStart(2, "0")}`,
      stationId,
      name: `${i + 1}# 逆变器`,
      model: INV_MODELS[i % INV_MODELS.length],
      ratedPowerKw: rated,
      status,
      currentPowerKw: round(rated * load, 1),
      dcVoltage: round(560 + rnd() * 180, 1),
      acVoltage: round(380 + rnd() * 12 - 6, 1),
      temperature: round(32 + rnd() * 28, 1),
      efficiency: round(96.2 + rnd() * 2.6, 2),
      faultCode: status === "fault" ? ["E-201 直流过压", "E-514 IGBT过温", "E-330 绝缘阻抗低"][i % 3] : null,
      todayGenerationKwh: round(rated * (3.1 + rnd() * 1.6), 1),
    };
  });
}

export function stringsOfInverter(inverterId: string): StringPV[] {
  const rnd = seeded(hash("str" + inverterId));
  const count = 8 + (hash(inverterId) % 5);
  const base = 8.2 + rnd() * 1.4;
  const raw = Array.from({ length: count }, (_, i) => {
    const dip = (hash(inverterId) + i) % 13 === 0 ? 0.45 + rnd() * 0.2 : 1;
    return round(base * (0.94 + rnd() * 0.12) * dip, 2);
  });
  const ref = round(raw.reduce((a, b) => a + b, 0) / raw.length, 2);
  return raw.map((currentA, i) => {
    const isAbnormal = currentA < ref * STRING_ABNORMAL_RATIO;
    return {
      id: `${inverterId}-PV${i + 1}`,
      inverterId,
      name: `PV${i + 1}`,
      currentA,
      referenceCurrentA: ref,
      isAbnormal,
      suspectCause: isAbnormal ? "疑似遮挡 / 污损 / 组件故障（待人工确认）" : null,
    };
  });
}

/* --------------------------------------------------------------- 曲线 */

/** 全网或单站 24h 功率曲线（kW），5 分钟采集，此处按 30 分钟聚合展示 */
export function powerCurve(seedKey: string, peakKw: number) {
  const rnd = seeded(hash(seedKey));
  const pts: { time: string; powerKw: number; irradianceWm2: number }[] = [];
  for (let h = 0; h < 24; h += 0.5) {
    const sun = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
    const cloud = 0.82 + rnd() * 0.22;
    const irr = round(Math.max(0, 1000 * sun * cloud), 0);
    pts.push({
      time: `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`,
      powerKw: round(peakKw * sun * cloud, 1),
      irradianceWm2: irr,
    });
  }
  return pts;
}

export function weatherCurve(stationId: string): (WeatherRecord & { time: string })[] {
  const rnd = seeded(hash("w" + stationId));
  return powerCurve("w" + stationId, 1).map((p, i) => ({
    stationId,
    time: p.time,
    timestamp: p.time,
    irradianceWm2: p.irradianceWm2,
    moduleTempC: round(18 + p.irradianceWm2 / 32 + rnd() * 3, 1),
    ambientTempC: round(14 + p.irradianceWm2 / 90 + rnd() * 2, 1),
    windSpeedMs: round(0.8 + rnd() * 4.2, 1),
    _i: i,
  })) as never;
}

/** 周期发电量 + 同比/环比 对比序列 */
export function generationSeries(
  seedKey: string,
  period: "day" | "month" | "year",
  scale: number,
) {
  const rnd = seeded(hash(seedKey + period));
  const labels =
    period === "day"
      ? Array.from({ length: 30 }, (_, i) => `${i + 1}日`)
      : period === "month"
        ? Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
        : Array.from({ length: 6 }, (_, i) => `${2020 + i}年`);
  return labels.map((label, i) => {
    const season = period === "month" ? 0.72 + 0.42 * Math.sin(((i - 2) / 12) * 2 * Math.PI) : 1;
    const current = round(scale * season * (0.82 + rnd() * 0.36), 0);
    return {
      label,
      current,
      lastYear: round(current * (0.82 + rnd() * 0.26), 0), // 同比：去年同期
      lastPeriod: round(current * (0.86 + rnd() * 0.24), 0), // 环比：上一周期
    };
  });
}

/* --------------------------------------------------------------- 告警 */

const ALARM_TEMPLATES: {
  level: AlarmLevel;
  type: AlarmType;
  deviceType: Alarm["deviceType"];
  description: string;
}[] = [
  { level: "critical", type: "设备故障", deviceType: "逆变器", description: "逆变器故障停机（E-201 直流过压）" },
  { level: "critical", type: "安全类", deviceType: "安防", description: "配电房烟感报警，需现场确认" },
  { level: "critical", type: "设备故障", deviceType: "箱变", description: "并网点保护动作，开关跳闸" },
  { level: "major", type: "效率异常", deviceType: "组串", description: "组串电流持续低于同组均值 75%，疑似遮挡/污损" },
  { level: "major", type: "效率异常", deviceType: "逆变器", description: "PR 连续 3 日低于 80% 阈值" },
  { level: "major", type: "设备故障", deviceType: "逆变器", description: "电网调度限功率，输出受限" },
  { level: "minor", type: "通信中断", deviceType: "采集网关", description: "采集网关通信中断超过 15 分钟" },
  { level: "minor", type: "环境异常", deviceType: "气象站", description: "辐照度传感器数据异常跳变" },
  { level: "minor", type: "通信中断", deviceType: "计量表", description: "关口表数据未上报" },
  { level: "info", type: "环境异常", deviceType: "组串", description: "组件清洗提醒：距上次清洗已超 90 天" },
  { level: "info", type: "设备故障", deviceType: "逆变器", description: "固件版本可升级至 V320R001C10" },
];

export const alarms: Alarm[] = Array.from({ length: 96 }, (_, i) => {
  const rnd = seeded(hash("alarm" + i));
  const st = stations[Math.floor(rnd() * stations.length)];
  const t = ALARM_TEMPLATES[Math.floor(rnd() * ALARM_TEMPLATES.length)];
  const st2 = rnd();
  const status: Alarm["status"] = st2 > 0.72 ? "resolved" : st2 > 0.45 ? "assigned" : "open";
  const d = new Date(Date.UTC(2026, 7, 30, 23, 0) - i * 3600_000 * (1 + rnd() * 5));
  return {
    id: `AL${String(20001 + i)}`,
    stationId: st.id,
    deviceId: `${st.id}-${t.deviceType === "逆变器" ? "INV0" + (1 + (i % 6)) : "DEV" + (10 + (i % 20))}`,
    deviceType: t.deviceType,
    level: t.level,
    type: t.type,
    description: t.description,
    occurredAt: d.toISOString().slice(0, 16).replace("T", " "),
    status,
    workOrderId: status === "open" ? null : `WO${String(30001 + (i % 24))}`,
  };
});

export const ASSIGNEES = ["张伟（华东运维一组）", "李强（华南运维组）", "王敏（华北运维组）", "陈晨（西南运维组）"];

export const workOrders: WorkOrder[] = Array.from({ length: 24 }, (_, i) => {
  const rnd = seeded(hash("wo" + i));
  const al = alarms.filter((a) => a.workOrderId === `WO${String(30001 + i)}`)[0] ?? alarms[i];
  const status: WorkOrder["status"] = rnd() > 0.66 ? "done" : rnd() > 0.3 ? "processing" : "new";
  return {
    id: `WO${String(30001 + i)}`,
    alarmId: al.id,
    stationId: al.stationId,
    title: al.description,
    assignee: ASSIGNEES[i % ASSIGNEES.length],
    status,
    createdAt: al.occurredAt,
    resolvedAt: status === "done" ? al.occurredAt.replace(/ \d{2}:/, " 18:") : null,
    note:
      status === "done"
        ? "已现场处理并复归，出具处理记录。"
        : status === "processing"
          ? "已派单，运维人员在途。"
          : "待派单。",
  };
});

/* ------------------------------------------------------------ 汇总口径 */

export const summary = (() => {
  const totalCapacityKwp = stations.reduce((a, s) => a + s.installedCapacityKwp, 0);
  const todayGenerationKwh = stations.reduce((a, s) => a + s.todayGenerationKwh, 0);
  const totalGenerationKwh = stations.reduce((a, s) => a + s.totalGenerationKwh, 0);
  const currentPowerKw = stations.reduce((a, s) => a + s.currentPowerKw, 0);
  const todayRevenueYuan = stations.reduce((a, s) => a + s.todayRevenueYuan, 0);
  const totalRevenueYuan = stations.reduce((a, s) => a + s.totalRevenueYuan, 0);
  const online = stations.filter((s) => s.status === "online").length;
  const alarm = stations.filter((s) => s.status === "alarm").length;
  const offline = stations.filter((s) => s.status === "offline").length;
  return {
    totalCapacityKwp,
    todayGenerationKwh,
    totalGenerationKwh,
    currentPowerKw,
    todayRevenueYuan,
    totalRevenueYuan,
    todayCo2Ton: (todayGenerationKwh * CO2_FACTOR_KG_PER_KWH) / 1000,
    totalCo2Ton: (totalGenerationKwh * CO2_FACTOR_KG_PER_KWH) / 1000,
    stationCount: stations.length,
    online,
    alarm,
    offline,
    onlineRate: online / stations.length,
    bessCount: stations.filter((s) => s.hasBess).length,
  };
})();

export const alarmLevelCount = (list: Alarm[] = alarms) => ({
  critical: list.filter((a) => a.level === "critical").length,
  major: list.filter((a) => a.level === "major").length,
  minor: list.filter((a) => a.level === "minor").length,
  info: list.filter((a) => a.level === "info").length,
});

export const LEVEL_LABEL: Record<AlarmLevel, string> = {
  critical: "紧急",
  major: "重要",
  minor: "一般",
  info: "提示",
};

export const PRICE_MODEL_LABEL: Record<PriceModel, string> = {
  selfUseFeedIn: "自发自用、余电上网",
  fullFeedIn: "全额上网",
  distributedTrading: "分布式交易 / 隔墙售电",
};

export const STATUS_LABEL: Record<StationStatus, string> = {
  online: "在线",
  alarm: "告警",
  offline: "离线",
};

/** 设备在线率（按设备类型统计） */
export const deviceOnlineRates = [
  { name: "逆变器", online: 386, total: 412 },
  { name: "采集网关", online: 38, total: 42 },
  { name: "气象站", online: 33, total: 38 },
  { name: "计量表", online: 118, total: 124 },
];

/** 分时电价（尖/峰/平/谷），系统设置页可配置 */
export const touPrices = [
  { period: "尖", hours: "11:00-13:00 / 19:00-21:00", priceYuan: 1.132 },
  { period: "峰", hours: "08:00-11:00 / 13:00-19:00", priceYuan: 0.925 },
  { period: "平", hours: "07:00-08:00 / 21:00-23:00", priceYuan: 0.618 },
  { period: "谷", hours: "23:00-07:00", priceYuan: 0.331 },
];

/** 计量点读数（关口表 vs 逆变器侧，用于核对线损/自用比例） */
export function meterComparison(stationId: string) {
  const st = getStation(stationId)!;
  const rnd = seeded(hash("m" + stationId));
  return Array.from({ length: 12 }, (_, i) => {
    const inv = round((st.yearGenerationKwh / 12) * (0.85 + rnd() * 0.3), 0);
    const meter = round(inv * (0.972 + rnd() * 0.018), 0);
    return {
      label: `${i + 1}月`,
      inverterSideKwh: inv,
      meterSideKwh: meter,
      selfUseKwh: round(meter * st.selfUseRatio, 0),
      exportKwh: round(meter * (1 - st.selfUseRatio), 0),
      lossRate: round(((inv - meter) / inv) * 100, 2),
    };
  });
}

export const prColor = (pr: number) =>
  pr >= PR_HEALTHY ? "text-success" : pr >= PR_WATCH ? "text-warning" : "text-danger";
