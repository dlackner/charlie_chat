/*
 * Convert Trial to Core API
 * Converts a trial user's profile to the free Core tier
 */
import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_class")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile lookup error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });
    }

    if (profile.user_class !== "trial") {
      return new Response(
        JSON.stringify({ error: "Only trial users can convert to Core" }),
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ user_class: "core", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to convert user to core:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update profile" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Convert-to-core error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unexpected error" }),
      { status: 500 }
    );
  }
}
