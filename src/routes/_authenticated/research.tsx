import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateResearch } from "@/lib/ai.functions";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/research")({
  component: ResearchPage,
});

type Source = { title: string; url?: string; note?: string };

function ResearchPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["research"],
    queryFn: async () => {
      const { data, error } = await supabase.from("research_briefs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const run = useMutation({
    mutationFn: async () => {
      const r = await generateResearch({ data: { query } });
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("research_briefs").insert({
        user_id: u.user.id, query, summary: r.summary, sources: r.sources,
      }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Brief ready");
      setSelectedId(id); setQuery("");
      qc.invalidateQueries({ queryKey: ["research"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("research_briefs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research"] }),
  });

  const selected = list.data?.find(r => r.id === selectedId) ?? list.data?.[0];

  return (
    <div>
      <PageHeader title="Research" description="Ask anything. Get structured briefs with citations and sources." />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader><CardTitle>New research brief</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="e.g., trends in AI productivity tools 2025" value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && query) run.mutate(); }} />
              <Button onClick={() => run.mutate()} disabled={!query || run.isPending}
                className="w-full bg-indigo-500 hover:bg-indigo-400">
                {run.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                Generate brief
              </Button>
            </CardContent>
          </Card>

          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4">History</h3>
          {list.isLoading && <Skeleton className="h-32" />}
          {list.data?.map((r) => (
            <Card key={r.id} className={`cursor-pointer ${selected?.id === r.id ? "border-indigo-500/60" : "hover:border-indigo-500/40"}`}
                  onClick={() => setSelectedId(r.id)}>
              <CardContent className="p-3 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.query}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del.mutate(r.id); }}>
                  <Trash2 className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader><CardTitle>{selected.query}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {selected.summary}
                </div>
                {Array.isArray(selected.sources) && (selected.sources as Source[]).length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sources</h4>
                    <ul className="space-y-2">
                      {(selected.sources as Source[]).map((s, i) => (
                        <li key={i} className="text-sm border-l-2 border-cyan-400 pl-3">
                          <div className="flex items-center gap-1.5 font-medium">
                            [{i + 1}] {s.title}
                            {s.url && <a href={s.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3 text-cyan-400" /></a>}
                          </div>
                          {s.note && <div className="text-xs text-muted-foreground">{s.note}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">No briefs yet. Run a research query to start.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}