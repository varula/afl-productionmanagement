import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "admin@test.com";
  const password = "admin123456";

  // Check if user exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === email);

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Test Admin" },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    userId = data.user.id;
  }

  // Ensure admin role exists
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), { status: 400, headers: corsHeaders });
  }

  // Ensure profile exists
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ user_id: userId, full_name: "Test Admin", is_approved: true }, { onConflict: "user_id" });

  return new Response(
    JSON.stringify({ success: true, userId, email, message: "Test admin ready. Sign in with admin@test.com / admin123456" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
