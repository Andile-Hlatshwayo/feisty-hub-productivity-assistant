import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Mail, MessageSquareText, ListTodo, CalendarDays, Sparkles,
  BookOpen, BarChart3, Users, Workflow, Bell, User, Settings, Zap, Shield,
} from "lucide-react";

const groups = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Calendar", url: "/calendar", icon: CalendarDays },
      { title: "Notifications", url: "/notifications", icon: Bell },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { title: "Email", url: "/email", icon: Mail },
      { title: "Meetings", url: "/meetings", icon: MessageSquareText },
      { title: "Tasks", url: "/tasks", icon: ListTodo },
      { title: "Research", url: "/research", icon: Sparkles },
      { title: "Knowledge", url: "/knowledge", icon: BookOpen },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Collaboration", url: "/collaboration", icon: Users },
      { title: "Automation", url: "/automation", icon: Workflow },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profile", url: "/profile", icon: User },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
      setIsAdmin((data?.length ?? 0) > 0);
    })();
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1">
          <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 grid place-items-center shrink-0">
            <Zap className="size-4 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && <span className="font-bold tracking-tight">Feisty Hub</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.url || pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")}>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Shield className="size-4 text-indigo-400" />
                      <span>Admin Console</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground italic">
            Automate the routine. Focus on what matters.
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}