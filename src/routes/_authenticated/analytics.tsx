import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateCoachingTips } from "@/lib/ai.functions";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [tips, setTips] = useState<string[]>([]);

  const stats = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [e, t, m, r] = await Promise.all([
        supabase.from("emails").select("id, created_at"),
        supabase.from("tasks").select("id, status, created_at"),
        supabase.from("meetings").select("id, created_at"),
        supabase.from("research_briefs").select("id, created_at"),
      ]);
      const tasks = t.data ?? [];
      const done = tasks.filter(x => x.status === "done").length;
      return {
        emails: e.data?.length ?? 0,
        tasks: tasks.length,
        completed: done,
        completion: tasks.length ? Math.round(done / tasks.length * 100) : 0,
        meetings: m.data?.length ?? 0,
        research: r.data?.length ?? 0,
      };
    },
  });

  const coach = useMutation({
    mutationFn: () => generateCoachingTips({ data: {} }),
    onSuccess: (r) => setTips(r.tips),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Productivity Analytics" description="Track your output and let AI coach your habits." />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Stat label="Emails drafted" value={stats.data?.emails} />
        <Stat label="Tasks created" value={stats.data?.tasks} />
        <Stat label="Tasks completed" value={stats.data?.completed} />
        <Stat label="Completion rate" value={stats.data ? `${stats.data.completion}%` : undefined} />
        <Stat label="Meetings logged" value={stats.data?.meetings} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-cyan-400" /> AI productivity coach</CardTitle>
          <Button onClick={() => coach.mutate()} disabled={coach.isPending}>
            {coach.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Get tips
          </Button>
        </CardHeader>
        <CardContent>
          {tips.length === 0 ? (
            <p className="text-sm text-muted-foreground">Generate personalized tips based on your recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {tips.map((t, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-cyan-400 font-mono">{(i+1).toString().padStart(2,"0")}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value ?? <Skeleton className="h-7 w-12" />}</div>
    </CardContent></Card>
  );
}