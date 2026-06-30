import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [tone, setTone] = useState("professional");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: p } = await supabase.from("profiles").select("default_tone").eq("id", u.user!.id).maybeSingle();
      if (p?.default_tone) setTone(p.default_tone);
    })();
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      await supabase.from("profiles").upsert({ id: u.user.id, default_tone: tone });
    },
    onSuccess: () => toast.success("Preferences saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div>
      <PageHeader title="Settings" description="Preferences for your Feisty Hub workspace." />

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle>AI preferences</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Default email tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["professional","friendly","persuasive","direct","casual"].map(t =>
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => save.mutate()} className="bg-indigo-500 hover:bg-indigo-400">Save preferences</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Session</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" onClick={signOut}><LogOut className="size-4 mr-2" /> Sign out</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}