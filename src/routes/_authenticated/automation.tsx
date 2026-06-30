import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Workflow, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/automation")({
  component: AutomationPage,
});

function AutomationPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("schedule");
  const [actions, setActions] = useState("");

  const list = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("automations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("automations").insert({
        user_id: u.user.id, name, description,
        trigger_type: trigger, trigger_config: {},
        actions: actions.split("\n").map(a => a.trim()).filter(Boolean).map(a => ({ step: a })),
        enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Automation created"); setName(""); setDescription(""); setActions(""); qc.invalidateQueries({ queryKey: ["automations"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await supabase.from("automations").update({ enabled }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("automations").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  return (
    <div>
      <PageHeader title="Workflow Automation" description="Define triggers and AI-powered actions. Let Feisty Hub run the repeating work." />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Workflow className="size-4" /> New automation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Daily standup digest" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedule">On schedule</SelectItem>
                  <SelectItem value="meeting_summarized">When meeting summarized</SelectItem>
                  <SelectItem value="task_completed">When task completed</SelectItem>
                  <SelectItem value="email_drafted">When email drafted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Actions (one per line)</Label>
              <Textarea rows={5} value={actions} onChange={(e) => setActions(e.target.value)}
                placeholder={"Summarize today's meetings\nDraft email to team\nUpdate analytics dashboard"} />
            </div>
            <Button onClick={() => create.mutate()} disabled={!name} className="bg-indigo-500 hover:bg-indigo-400">
              <Plus className="size-4 mr-2" /> Create automation
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your automations</h3>
          {list.data?.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {list.data?.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{a.name}</div>
                    {a.description && <div className="text-sm text-muted-foreground">{a.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={a.enabled} onCheckedChange={(v) => toggle.mutate({ id: a.id, enabled: v })} />
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{a.trigger_type}</Badge>
                  {Array.isArray(a.actions) && (
                    <span className="text-xs text-muted-foreground">{(a.actions as unknown[]).length} steps</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}