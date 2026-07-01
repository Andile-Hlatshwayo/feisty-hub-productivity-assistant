import { createFileRoute } from "@tanstack/react-router";

// Idempotent, one-shot public endpoint that provisions the single
// hardcoded platform administrator. Safe: it only ever creates the
// designated admin identity; it does not accept caller-supplied data
// and never returns credentials.
const ADMIN_EMAIL = "andilesidestuffemail02@gmail.com";
const ADMIN_PASSWORD = "AndileHive12345";
const ADMIN_USERNAME = "AdministrationUser";
const ADMIN_FULL_NAME = "Andile Hlatshwayo";

export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
        let user = existing?.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
        if (!user) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: ADMIN_FULL_NAME, username: ADMIN_USERNAME },
          });
          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
          user = data.user!;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(user.id, { password: ADMIN_PASSWORD, email_confirm: true });
        }
        await supabaseAdmin.from("profiles").upsert({ id: user.id, full_name: ADMIN_FULL_NAME, username: ADMIN_USERNAME });
        await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
        return Response.json({ ok: true, userId: user.id });
      },
    },
  },
});