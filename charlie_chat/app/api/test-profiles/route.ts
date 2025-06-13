// app/api/test-profiles/route.ts
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  console.log("▶️ SUPABASE_URL:", process.env.SUPABASE_URL);
  console.log("▶️ SERVICE-ROLE KEY (first 10 chars):", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0,10));
  const { data, error } = await createSupabaseAdminClient()
    .from("profiles")
    .select("user_id, stripe_customer_id, credits")
    .limit(5);
  console.log("👀 fetched profiles:", data, error);
  return NextResponse.json({ data, error });
}
