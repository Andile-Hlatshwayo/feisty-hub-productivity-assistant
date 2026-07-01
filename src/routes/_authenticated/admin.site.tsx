import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAdminOverview, setSiteAccess } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/site")({
  component: AdminSite,
});

function AdminSite() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getAdminOverview);
  const setFn = useServerFn(setSiteAccess);
  const { data } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => overviewFn() });

  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (data?.site) {
      setEnabled(data.site.access_enabled);
      setMessage(data.site.disabled_message ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => setFn({ data: { enabled, message } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); toast.success("Site settings saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Website access control</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/30">
          <div>
            <div className="font-medium">Site access</div>
            <div className="text-xs text-muted-foreground">When disabled, only admins can sign in.</div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-1.5">
          <Label>Disabled message</Label>
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Shown to users when the site is disabled" />
        </div>
        <Button onClick={() => save.mutate()} className="bg-indigo-500 hover:bg-indigo-400">Save changes</Button>
      </CardContent>
    </Card>
  );
}