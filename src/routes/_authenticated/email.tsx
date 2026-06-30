import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateEmail } from "@/lib/ai.functions";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Sparkles, Copy, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/email")({
  component: EmailPage,
});

function EmailPage() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const list = useQuery({
    queryKey: ["emails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("emails")
        .select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: () => generateEmail({ data: { prompt, recipient, tone, length } }),
    onSuccess: (d) => {
      setSubject(d.subject);
      setBody(d.body);
      toast.success("Draft generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("emails").insert({
        user_id: u.user.id,
        subject, body, recipient, tone, length, prompt,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved draft");
      qc.invalidateQueries({ queryKey: ["emails"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  return (
    <div>
      <PageHeader title="AI Email" description="Generate, refine, and save email drafts. Pick a tone and length and let Feisty Hub do the rest." />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle>Brief</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Recipient</Label>
                  <Input placeholder="e.g., the marketing team" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["professional","friendly","persuasive","apologetic","direct","casual"].map(t=>
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Length</Label>
                    <Select value={length} onValueChange={setLength}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["short","medium","long"].map(t=>
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>What is this email about?</Label>
                <Textarea rows={4} placeholder="Describe the email purpose, key points, and outcome you want…"
                  value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              </div>
              <Button onClick={() => generate.mutate()} disabled={!prompt || generate.isPending}
                className="bg-indigo-500 hover:bg-indigo-400">
                {generate.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                Generate draft
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Draft</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Textarea rows={12} placeholder="Body…" value={body} onChange={(e) => setBody(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => save.mutate()} disabled={!body || save.isPending}>Save draft</Button>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); toast.success("Copied"); }} disabled={!body}>
                  <Copy className="size-4 mr-2" /> Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent drafts</h3>
          {list.isLoading && <Skeleton className="h-40" />}
          {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No drafts yet.</p>}
          {list.data?.map((e) => (
            <Card key={e.id} className="hover:border-indigo-500/40 transition cursor-pointer"
                  onClick={() => { setSubject(e.subject ?? ""); setBody(e.body ?? ""); setRecipient(e.recipient ?? ""); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.subject || "(no subject)"}</div>
                    <div className="text-xs text-muted-foreground truncate">{e.recipient || "—"}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{e.tone}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{e.body}</p>
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); del.mutate(e.id); }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}