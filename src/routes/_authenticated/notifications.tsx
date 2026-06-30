import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("notifications").update({ read: true }).eq("user_id", u.user.id).eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      await supabase.from("notifications").update({ read }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notifications").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <div>
      <PageHeader title="Notifications" description="Activity and reminders across Feisty Hub." action={
        <Button variant="outline" onClick={() => markAll.mutate()}><Check className="size-4 mr-2" /> Mark all read</Button>
      } />
      {list.isLoading && <Skeleton className="h-20" />}
      {list.data?.length === 0 && (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
          <Bell className="size-8 text-muted-foreground/40" />
          You're all caught up.
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {list.data?.map((n) => (
          <Card key={n.id} className={n.read ? "opacity-60" : "border-indigo-500/40"}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{n.title}</div>
                {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                {n.link && <Link to={n.link} className="text-xs text-cyan-400 hover:underline">Open</Link>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: n.id, read: !n.read })}>
                  <Check className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(n.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}