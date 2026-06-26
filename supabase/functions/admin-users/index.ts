// Admin-only user CRUD. Requires caller to have 'admin' role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const admin = createClient(supabaseUrl, serviceKey);
    const [accountRole, legacyRole] = await Promise.all([
      admin
        .from("user_accounts")
        .select("role")
        .eq("auth_user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle(),
      admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle(),
    ]);
    const isAdmin = !!accountRole.data || !!legacyRole.data;
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const ids = users.users.map((u) => u.id);
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const { data: accounts } = await admin
        .from("user_accounts")
        .select("auth_user_id, role")
        .in("auth_user_id", ids);
      const { data: legacyRoles } = await admin.from("user_roles").select("user_id, role").in("user_id", ids);
      const result = users.users.map((u) => {
        const accountRole = accounts?.find((a) => a.auth_user_id === u.id)?.role;
        const legacyRole = legacyRoles?.find((r) => r.user_id === u.id)?.role;
        const role = accountRole || legacyRole || "user";
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          full_name: profiles?.find((p) => p.user_id === u.id)?.full_name ?? "",
          role,
        };
      });
      return json({ users: result });
    }

    if (action === "create") {
      const { email, password, full_name, role } = body;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });
      if (error) throw error;
      if (role) {
        await admin.from("user_accounts").upsert({
          auth_user_id: data.user.id,
          email: data.user.email,
          full_name: full_name || "",
          role,
        }, { onConflict: "auth_user_id" });
      }
      if (role && role !== "user") {
        await admin.from("user_roles").upsert({ user_id: data.user.id, role });
      }
      return json({ user: data.user });
    }

    if (action === "update") {
      const { user_id, email, password, full_name, role } = body;
      if (email || password) {
        const upd: Record<string, unknown> = {};
        if (email) upd.email = email;
        if (password) upd.password = password;
        const { error } = await admin.auth.admin.updateUserById(user_id, upd);
        if (error) throw error;
      }
      if (typeof full_name === "string") {
        await admin.from("profiles").update({ full_name }).eq("user_id", user_id);
      }
      if (role) {
        await admin.from("user_accounts").upsert({
          auth_user_id: user_id,
          email: undefined,
          full_name: undefined,
          role,
        }, { onConflict: "auth_user_id" });
        await admin.from("user_roles").delete().eq("user_id", user_id);
        await admin.from("user_roles").insert({ user_id, role });
      }
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body;
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    throw new Error("Unknown action");
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(obj: unknown) {
  return new Response(JSON.stringify(obj), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
