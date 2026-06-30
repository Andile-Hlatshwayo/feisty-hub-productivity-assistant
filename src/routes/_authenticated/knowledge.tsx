import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { askKnowledge, ingestDocument } from "@/lib/ai.functions";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Upload, FileText, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/knowledge")({
  component: KnowledgePage,
});

function KnowledgePage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data: doc, error } = await supabase.from("documents").insert({
        user_id: u.user.id, title: title || "Untitled", content_text: text,
        size_bytes: text.length, file_type: "text/plain", indexed: false,
      }).select("id").single();
      if (error) throw error;
      const r = await ingestDocument({ data: { documentId: doc.id, text } });
      return r.chunks;
    },
    onSuccess: (chunks) => {
      toast.success(`Indexed ${chunks} chunks`);
      setTitle(""); setText("");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ask = useMutation({
    mutationFn: () => askKnowledge({ data: { question } }),
    onSuccess: (r) => setAnswer(r.answer),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("document_chunks").delete().eq("document_id", id);
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  return (
    <div>
      <PageHeader title="Knowledge" description="Upload documents and ask Feisty Hub questions grounded in your own files." />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="size-4" /> Add document</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product spec v3" /></div>
            <div className="space-y-1.5"><Label>Paste content</Label><Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste document text here…" /></div>
            <Button onClick={() => upload.mutate()} disabled={!text || upload.isPending} className="bg-indigo-500 hover:bg-indigo-400">
              {upload.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
              Ingest & embed
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-cyan-400" /> Ask your knowledge base</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Ask anything about your documents…" value={question} onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && question) ask.mutate(); }} />
            <Button onClick={() => ask.mutate()} disabled={!question || ask.isPending} className="bg-indigo-500 hover:bg-indigo-400">
              {ask.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
              Ask
            </Button>
            {answer && (
              <div className="mt-3 rounded-lg border border-border p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-8 mb-3">Documents</h3>
      {docs.isLoading && <Skeleton className="h-20" />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {docs.data?.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium truncate"><FileText className="size-4 text-cyan-400 shrink-0" />{d.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{(d.size_bytes ?? 0).toLocaleString()} chars</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(d.id)}><Trash2 className="size-3.5" /></Button>
              </div>
              <Badge variant={d.indexed ? "default" : "outline"} className="mt-2 text-[10px]">
                {d.indexed ? "Indexed" : "Pending"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}