import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/feisty/page-header";
import { Shield, Users, Settings2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/site", label: "Site Access", icon: Settings2 },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2"><Shield className="size-6 text-indigo-400" /> Admin Console</span>}
        description="Manage users, roles, and site-wide access for Feisty Hub."
      />
      <nav className="flex gap-1 border-b border-border mb-6 -mt-2">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname === t.to || pathname.startsWith(t.to + "/");
          return (
            <Link key={t.to} to={t.to} className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              active ? "border-indigo-400 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}>
              <t.icon className="size-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}