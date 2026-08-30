import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  BatteryCharging,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Wrench,
  MonitorPlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { alarms } from "@/lib/mock";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "总览", icon: LayoutDashboard, exact: true },
  { to: "/admin/stations", label: "电站管理", icon: Building2 },
  { to: "/admin/alarms", label: "告警中心", icon: AlertTriangle },
  { to: "/admin/workorders", label: "工单管理", icon: ClipboardList },
  { to: "/admin/inspection", label: "巡检维护", icon: Wrench },
  { to: "/admin/reports", label: "报表中心", icon: FileBarChart },
  { to: "/admin/org", label: "组织与权限", icon: ShieldCheck },
  { to: "/admin/bess", label: "光储一体", icon: BatteryCharging },
  { to: "/admin/settings", label: "系统设置", icon: Settings },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openAlarms = alarms.filter((a) => a.status === "open").length;
  const current = [...NAV].reverse().find((n) => pathname.startsWith(n.to));

  return (
    <div className="flex min-h-screen bg-muted/40 text-foreground">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r bg-card">
        <div className="border-b px-4 py-4">
          <div className="text-sm font-bold tracking-wide text-primary">分布式光伏运维平台</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">C&amp;I Distributed PV O&amp;M</div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {n.label}
                {n.to === "/admin/alarms" && openAlarms > 0 ? (
                  <span className="num ml-auto rounded bg-danger px-1.5 text-[11px] text-danger-foreground">
                    {openAlarms}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-2">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <MonitorPlay className="size-4" />
            集团监控大屏
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-3">
          <div className="text-sm text-muted-foreground">
            运维管理后台 <span className="mx-1.5">/</span>
            <span className="text-foreground">{current?.label ?? "总览"}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link to="/portal" className="hover:text-primary">
              业主收益门户
            </Link>
            <span className="flex items-center gap-2 rounded-full border px-2 py-1">
              <span className="size-5 rounded-full bg-primary/15 text-center text-[11px] leading-5 text-primary">
                张
              </span>
              张伟 · 运维工程师
            </span>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
