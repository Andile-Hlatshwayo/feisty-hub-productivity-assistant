import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateDailyBriefing } from "@/lib/ai.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Mail, ListTodo, CalendarDays, MessageSquareText, BookOpen, ArrowRight, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const [name, setName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string } | undefined;
      setName(meta?.full_name?.split(" ")[0] ?? data.user?.email?.split("@")[0] ?? "there");
    });
  }, []);

  const counts = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [e, t, m, n] = await Promise.all([
        supabase.from("emails").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
        supabase.from("meetings").select("id", { count: "exact", head: true }),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
      ]);
      return { emails: e.count ?? 0, tasks: t.count ?? 0, meetings: m.count ?? 0, notifications: n.count ?? 0 };
    },
  });

  const briefing = useQuery({
    queryKey: ["daily-briefing"],
    queryFn: () => generateDailyBriefing({ data: {} }),
    staleTime: 1000 * 60 * 15,
  });

  const tools = [
    { to: "/email", icon: Mail, label: "Draft email", color: "from-indigo-500 to-cyan-400" },
    { to: "/meetings", icon: MessageSquareText, label: "Summarize meeting", color: "from-cyan-400 to-emerald-400" },
    { to: "/tasks", icon: ListTodo, label: "Plan tasks", color: "from-fuchsia-500 to-indigo-500" },
    { to: "/research", icon: Sparkles, label: "Run research", color: "from-amber-400 to-rose-400" },
    { to: "/knowledge", icon: BookOpen, label: "Ask knowledge", color: "from-emerald-400 to-cyan-400" },
    { to: "/calendar", icon: CalendarDays, label: "Schedule", color: "from-purple-500 to-indigo-500" },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-3xl font-bold tracking-tight">Good to see you, {name}</h1>
        <p className="text-muted-foreground mt-1 italic">Automate the routine. Focus on what matters.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Email drafts" value={counts.data?.emails} icon={Mail} />
        <StatCard label="Open tasks" value={counts.data?.tasks} icon={ListTodo} />
        <StatCard label="Meetings logged" value={counts.data?.meetings} icon={MessageSquareText} />
        <StatCard label="Unread alerts" value={counts.data?.notifications} icon={TrendingUp} />
      </div>

      {/* Briefing */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-cyan-400" /> Daily briefing</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => briefing.refetch()} disabled={briefing.isFetching}>
            {briefing.isFetching ? "Generating…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {briefing.isLoading ? (
            <Skeleton className="h-16" />
          ) : briefing.isError ? (
            <p className="text-sm text-muted-foreground">Add AI credits to generate your briefing.</p>
          ) : (
            <p className="text-foreground/90 leading-relaxed">{briefing.data?.briefing}</p>
          )}
          {briefing.data && (
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Today's events</div>
                {briefing.data.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events scheduled.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {briefing.data.events.map((e, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {new Date(e.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Badge>
                        {e.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top tasks</div>
                {briefing.data.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All clear.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {briefing.data.tasks.slice(0, 5).map((t, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <span className={`size-1.5 rounded-full ${t.priority === "urgent" ? "bg-rose-400" : t.priority === "high" ? "bg-amber-400" : "bg-indigo-400"}`} />
                        {t.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t) => (
            <Link key={t.to} to={t.to}
                  className="group rounded-xl border border-border bg-card p-5 hover:border-indigo-500/50 transition flex items-center gap-4">
              <div className={`size-10 rounded-lg bg-gradient-to-br ${t.color} grid place-items-center`}>
                <t.icon className="size-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">Open tool</div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number | undefined; icon: typeof Mail }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold mt-1">{value ?? "—"}</div>
      </CardContent>
    </Card>
  );
}