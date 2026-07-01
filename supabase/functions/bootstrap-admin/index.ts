// Idempotent admin bootstrap. Safe to call repeatedly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Read admin credentials from environment variables
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
    const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check existing
    const { data: list } = await admin.auth.admin.listUsers();
    let user = list?.users.find((u) => u.email === ADMIN_EMAIL);

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Administrator" },
      });
      if (error) throw error;
      user = data.user!;
    }

    // Ensure admin role in both tables
    await admin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });

    await admin
      .from("user_accounts")
      .upsert({
        auth_user_id: user.id,
        email: user.email,
        full_name: "Administrator",
        role: "admin",
      }, { onConflict: "auth_user_id" });

    // Ensure profile exists
    await admin
      .from("profiles")
      .upsert({
        user_id: user.id,
        full_name: "Administrator",
      }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ ok: true, email: ADMIN_EMAIL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
