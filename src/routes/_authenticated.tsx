import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/feisty/app-sidebar";
import { TopBar } from "@/components/feisty/top-bar";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const [{ data: roles }, { data: site }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin"),
      supabase.from("site_settings").select("access_enabled, disabled_message").eq("id", true).maybeSingle(),
      supabase.from("profiles").select("disabled").eq("id", data.user.id).maybeSingle(),
    ]);
    return {
      user: data.user,
      isAdmin: (roles?.length ?? 0) > 0,
      siteEnabled: site?.access_enabled ?? true,
      disabledMessage: site?.disabled_message ?? "The site is temporarily unavailable.",
      userDisabled: profile?.disabled ?? false,
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const ctx = Route.useRouteContext();
  if (ctx.userDisabled) {
    return <LockedScreen title="Account disabled" message="Your account has been disabled by an administrator." />;
  }
  if (!ctx.siteEnabled && !ctx.isAdmin) {
    return <LockedScreen title="Site unavailable" message={ctx.disabledMessage} />;
  }
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LockedScreen({ title, message }: { title: string; message: string }) {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }
  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto size-14 rounded-full bg-rose-500/10 grid place-items-center">
          <Shield className="size-7 text-rose-400" />
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" onClick={signOut}>Sign out</Button>
          <Link to="/" className="inline-flex items-center px-4 py-2 rounded-md border border-input text-sm hover:bg-accent">Home</Link>
        </div>
      </div>
    </div>
  );
}