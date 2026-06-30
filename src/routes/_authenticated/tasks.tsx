import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { breakdownTasks } from "@/lib/ai.functions";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Priority = Database["public"]["Enums"]["task_priority"];
type Status = Database["public"]["Enums"]["task_status"];

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

const columns: { key: Status; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

function TasksPage() {
  const qc = useQueryClient();
  const [brief, setBrief] = useState("");
  const [quick, setQuick] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("medium");

  const list = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const r = await breakdownTasks({ data: { brief } });
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tasks").insert(
        r.tasks.map((t) => ({
          user_id: u.user!.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: "todo" as Status,
        })),
      );
      if (error) throw error;
      return r.tasks.length;
    },
    onSuccess: (n) => {
      toast.success(`Created ${n} tasks`);
      setBrief("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tasks").insert({
        user_id: u.user.id, title: quick, priority: quickPriority, status: "todo",
      });
      if (error) throw error;
    },
    onSuccess: () => { setQuick(""); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div>
      <PageHeader title="Tasks" description="Plan with AI, then track in a kanban view." />

      <Card className="mb-6">
        <CardHeader><CardTitle>AI task planner</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} placeholder="Describe a project or goal. We'll break it into actionable tasks."
            value={brief} onChange={(e) => setBrief(e.target.value)} />
          <Button onClick={() => generate.mutate()} disabled={!brief || generate.isPending}
            className="bg-indigo-500 hover:bg-indigo-400">
            {generate.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
            Generate tasks
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4 flex gap-2">
          <Input placeholder="Quick add a task…" value={quick} onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && quick) add.mutate(); }} />
          <Select value={quickPriority} onValueChange={(v) => setQuickPriority(v as Priority)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["low","medium","high","urgent"] as Priority[]).map(p =>
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => add.mutate()} disabled={!quick}><Plus className="size-4" /></Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const items = (list.data ?? []).filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="rounded-xl border border-border bg-card/50 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              </div>
              <div className="space-y-2 min-h-20">
                {items.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-background p-3 group">
                    <div className="flex items-start gap-2">
                      <Checkbox checked={t.status === "done"}
                        onCheckedChange={(c) => update.mutate({ id: t.id, status: c ? "done" : "todo" })} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                        {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={`text-[10px] capitalize ${t.priority === "urgent" ? "border-rose-500 text-rose-400" : t.priority === "high" ? "border-amber-500 text-amber-400" : ""}`}>
                            {t.priority}
                          </Badge>
                          <Select value={t.status} onValueChange={(v) => update.mutate({ id: t.id, status: v as Status })}>
                            <SelectTrigger className="h-6 text-[10px] w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {columns.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => del.mutate(t.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}