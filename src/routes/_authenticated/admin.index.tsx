import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const fn = useServerFn(getAdminOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fn() });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading overview…</p>;
  if (!data) return null;

  const site = data.site;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Site status</CardTitle>
          <Badge className={site?.access_enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}>
            {site?.access_enabled ? "ONLINE" : "DISABLED"}
          </Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {site?.access_enabled
            ? "The site is currently accessible to all users."
            : `Users are currently locked out. Message: “${site?.disabled_message}”`}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(data.counts).map(([table, count]) => (
          <Card key={table}>
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{table.replace(/_/g, " ")}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}