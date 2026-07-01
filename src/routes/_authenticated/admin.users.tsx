import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllUsers, setUserDisabled, deleteUser, toggleAdminRole } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, ShieldCheck, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllUsers);
  const disableFn = useServerFn(setUserDisabled);
  const delFn = useServerFn(deleteUser);
  const roleFn = useServerFn(toggleAdminRole);

  const { data: users, isLoading } = useQuery({ queryKey: ["admin", "users"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const disableMut = useMutation({
    mutationFn: (v: { userId: string; disabled: boolean }) => disableFn({ data: v }),
    onSuccess: () => { invalidate(); toast.success("User updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (userId: string) => delFn({ data: { userId } }),
    onSuccess: () => { invalidate(); toast.success("User deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const roleMut = useMutation({
    mutationFn: (v: { userId: string; makeAdmin: boolean }) => roleFn({ data: v }),
    onSuccess: () => { invalidate(); toast.success("Role updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading users…</p>;

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last sign-in</TableHead>
            <TableHead className="text-center">Enabled</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users ?? []).map((u) => {
            const isAdmin = u.roles.includes("admin");
            const disabled = u.profile?.disabled ?? false;
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.profile?.full_name || u.profile?.username || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.length === 0 && <Badge variant="outline">user</Badge>}
                    {u.roles.map((r) => (
                      <Badge key={r} className={r === "admin" ? "bg-indigo-500/20 text-indigo-300" : ""}>{r}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "never"}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={!disabled}
                    onCheckedChange={(v) => disableMut.mutate({ userId: u.id, disabled: !v })}
                  />
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline"
                    onClick={() => roleMut.mutate({ userId: u.id, makeAdmin: !isAdmin })}>
                    {isAdmin ? <><ShieldOff className="size-3 mr-1" /> Revoke</> : <><ShieldCheck className="size-3 mr-1" /> Make admin</>}
                  </Button>
                  <Button size="sm" variant="outline" className="text-rose-400 hover:text-rose-300"
                    onClick={() => { if (confirm(`Delete ${u.email}? This cannot be undone.`)) deleteMut.mutate(u.id); }}>
                    <Trash2 className="size-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}