import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  LEVEL_LABEL,
  PR_HEALTHY,
  PR_WATCH,
  STATUS_LABEL,
  type AlarmLevel,
  type StationStatus,
} from "@/lib/mock";

export const nf = (n: number, d = 0) =>
  n.toLocaleString("zh-CN", { minimumFractionDigits: d, maximumFractionDigits: d });

export function Kpi({
  label,
  value,
  unit,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger" | "brand";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    brand: "text-primary",
  }[tone];
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("num mt-2 text-2xl font-semibold", toneClass)}>
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function StatusDot({ status }: { status: StationStatus }) {
  const c =
    status === "online" ? "bg-success" : status === "alarm" ? "bg-major" : "bg-neutralstate";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("size-2 rounded-full", c)} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LevelBadge({ level }: { level: AlarmLevel }) {
  const map: Record<AlarmLevel, string> = {
    critical: "bg-danger/12 text-danger border-danger/35",
    major: "bg-major/12 text-major border-major/35",
    minor: "bg-warning/15 text-warning border-warning/40",
    info: "bg-brand-2/12 text-brand-2 border-brand-2/35",
  };
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium", map[level])}>
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function PrValue({ pr, className }: { pr: number; className?: string }) {
  const c = pr >= PR_HEALTHY ? "text-success" : pr >= PR_WATCH ? "text-warning" : "text-danger";
  return <span className={cn("num font-medium", c, className)}>{(pr * 100).toFixed(1)}%</span>;
}

export function Panel({
  title,
  extra,
  children,
  className,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        {extra}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ScreenPanel({
  title,
  extra,
  children,
  className,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel flex flex-col rounded-md", className)}>
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-primary">
          <span className="h-3 w-0.5 bg-primary" />
          {title}
        </h2>
        {extra}
      </header>
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </section>
  );
}
