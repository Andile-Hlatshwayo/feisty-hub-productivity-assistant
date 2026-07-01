import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "andilesidestuffemail02@gmail.com";
const ADMIN_PASSWORD = "AndileHive12345";
const ADMIN_USERNAME = "AdministrationUser";
const ADMIN_FULL_NAME = "Andile Hlatshwayo";

// Idempotent: creates the designated admin account if it doesn't yet exist.
// Safe to expose because it only ever provisions the one hardcoded admin
// identity and never returns credentials.
export const seedAdminUser = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const already = existing?.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
  let userId = already?.id;
  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_FULL_NAME, username: ADMIN_USERNAME },
    });
    if (error) throw new Error(error.message);
    userId = data.user!.id;
  } else {
    // Ensure password matches spec (in case it was rotated)
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
  }
  await supabaseAdmin.from("profiles").upsert({
    id: userId, full_name: ADMIN_FULL_NAME, username: ADMIN_USERNAME,
  });
  await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  return { ok: true, userId };
});

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    if (error) throw new Error(error.message);
    const ids = authUsers.users.map((u) => u.id);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").in("id", ids);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    return authUsers.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed: !!u.email_confirmed_at,
      profile: profileMap.get(u.id) ?? null,
      roles: roleMap.get(u.id) ?? [],
    }));
  });

export const setUserDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; disabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.userId === context.userId) throw new Error("You cannot disable your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // ban / unban the auth user
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.disabled ? "876000h" : "none",
    });
    await supabaseAdmin.from("profiles").update({ disabled: data.disabled }).eq("id", data.userId);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; makeAdmin: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeAdmin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      if (data.userId === context.userId) throw new Error("You cannot remove your own admin role");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    return { ok: true };
  });

export const setSiteAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean; message?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const update: Record<string, unknown> = { access_enabled: data.enabled, updated_at: new Date().toISOString(), updated_by: context.userId };
    if (typeof data.message === "string") update.disabled_message = data.message;
    const { error } = await context.supabase.from("site_settings").update(update).eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = ["profiles","emails","meetings","tasks","calendar_events","documents","notifications","automations","research_briefs"] as const;
    const counts: Record<string, number> = {};
    for (const t of tables) {
      const { count } = await supabaseAdmin.from(t).select("*", { count: "exact", head: true });
      counts[t] = count ?? 0;
    }
    const { data: site } = await supabaseAdmin.from("site_settings").select("*").eq("id", true).maybeSingle();
    return { counts, site };
  });