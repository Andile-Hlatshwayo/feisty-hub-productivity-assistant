import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user!.id).maybeSingle();
      setName(p?.full_name ?? "");
      setTimezone(p?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    })();
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").upsert({
        id: u.user.id, full_name: name, timezone,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const initial = (name || email)[0]?.toUpperCase() ?? "U";

  return (
    <div>
      <PageHeader title="Profile" description="Manage how Feisty Hub knows you." />

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Personal information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-cyan-400 text-white text-xl font-bold">{initial}</AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
          <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Timezone</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} /></div>
          <Button onClick={() => save.mutate()} className="bg-indigo-500 hover:bg-indigo-400">Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}