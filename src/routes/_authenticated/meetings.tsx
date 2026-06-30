import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { summarizeMeeting } from "@/lib/ai.functions";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/meetings")({
  component: MeetingsPage,
});

type ActionItem = { task: string; owner?: string; due?: string };

function MeetingsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("meetings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const run = useMutation({
    mutationFn: async () => {
      const r = await summarizeMeeting({ data: { transcript, title } });
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("meetings").insert({
        user_id: u.user.id,
        title: title || "Untitled meeting",
        transcript,
        summary: r.summary,
        decisions: r.decisions,
        action_items: r.action_items,
        attendees: r.attendees,
        meeting_date: new Date().toISOString(),
      }).select("id").single();
      if (error) throw error;
      // create tasks from action items
      if (r.action_items?.length) {
        await supabase.from("tasks").insert(
          r.action_items.map((a) => ({
            user_id: u.user!.id,
            title: a.task,
            description: a.owner ? `Owner: ${a.owner}` : null,
            priority: "medium" as const,
            status: "todo" as const,
            source_meeting_id: data.id,
            due_date: a.due ?? null,
          })),
        );
      }
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Meeting summarized");
      setSelectedId(id);
      setTitle(""); setTranscript("");
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const selected = list.data?.find((m) => m.id === selectedId) ?? list.data?.[0];

  return (
    <div>
      <PageHeader title="Meeting Intelligence" description="Paste a transcript and get a summary, decisions, attendees, and action items — instantly converted into tasks." />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle>New summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Meeting title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q3 planning sync" />
              </div>
              <div className="space-y-1.5">
                <Label>Transcript</Label>
                <Textarea rows={10} placeholder="Paste your meeting transcript or notes…"
                  value={transcript} onChange={(e) => setTranscript(e.target.value)} />
              </div>
              <Button onClick={() => run.mutate()} disabled={!transcript || run.isPending}
                className="bg-indigo-500 hover:bg-indigo-400">
                {run.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                Summarize meeting
              </Button>
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader><CardTitle>{selected.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{selected.summary}</p>
                {Array.isArray(selected.attendees) && selected.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.attendees as string[]).map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
                  </div>
                )}
                {Array.isArray(selected.decisions) && (selected.decisions as string[]).length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Decisions</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-sm">
                      {(selected.decisions as string[]).map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
                {Array.isArray(selected.action_items) && (selected.action_items as ActionItem[]).length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Action items</h4>
                    <ul className="space-y-2">
                      {(selected.action_items as ActionItem[]).map((a, i) => (
                        <li key={i} className="text-sm border-l-2 border-indigo-500 pl-3">
                          <div>{a.task}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.owner && <>Owner: {a.owner} · </>}{a.due && <>Due: {a.due}</>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">All meetings</h3>
          {list.isLoading && <Skeleton className="h-40" />}
          {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No meetings yet.</p>}
          {list.data?.map((m) => (
            <Card key={m.id}
                  className={`cursor-pointer transition ${selected?.id === m.id ? "border-indigo-500/60" : "hover:border-indigo-500/40"}`}
                  onClick={() => setSelectedId(m.id)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del.mutate(m.id); }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{m.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}