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
import { Plus, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/collaboration")({
  component: CollabPage,
});

function CollabPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["notebooks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notebooks").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("notebooks").insert({
        user_id: u.user.id, title: title || "Untitled notebook", content,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notebook created"); setTitle(""); setContent(""); qc.invalidateQueries({ queryKey: ["notebooks"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      await supabase.from("notebooks").update({ content, updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notebooks"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notebooks").delete().eq("id", id); },
    onSuccess: () => { setSelected(null); qc.invalidateQueries({ queryKey: ["notebooks"] }); },
  });

  const current = list.data?.find(n => n.id === selected);

  return (
    <div>
      <PageHeader title="Collaboration" description="Shared notebooks for your team. Capture meetings, decisions, and rituals." />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle>New notebook</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notebook title" />
              <Button onClick={() => create.mutate()} className="w-full bg-indigo-500 hover:bg-indigo-400">
                <Plus className="size-4 mr-2" /> Create
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            {list.data?.map((n) => (
              <button key={n.id} onClick={() => { setSelected(n.id); setContent(n.content ?? ""); }}
                className={`w-full text-left rounded-lg border p-3 text-sm flex items-center gap-2 transition ${selected === n.id ? "border-indigo-500/60 bg-indigo-500/5" : "border-border hover:border-indigo-500/40"}`}>
                <BookOpen className="size-4 shrink-0" />
                <span className="truncate flex-1">{n.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {current ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{current.title}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(current.id)}><Trash2 className="size-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label className="text-xs">Content</Label>
                <Textarea rows={18} value={content} onChange={(e) => setContent(e.target.value)} />
                <Button onClick={() => update.mutate({ id: current.id, content })} className="bg-indigo-500 hover:bg-indigo-400">Save</Button>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">Select a notebook or create one to begin.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}