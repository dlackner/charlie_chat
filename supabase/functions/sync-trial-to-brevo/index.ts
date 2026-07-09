// supabase/functions/sync-trial-to-brevo/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Brevo sync function starting up...");

serve(async (req) => {
  console.log("📧 Brevo sync request received");

  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    const { email } = await req.json();

    if (!email) {
      console.error("❌ Missing email in request");
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("📧 Syncing trial user to Brevo:", email);

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("❌ BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Brevo API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        email: email,
        listIds: [6],
        updateEnabled: true,
      }),
    });

    const brevoResult = await brevoResponse.text();
    console.log("📧 Brevo response status:", brevoResponse.status);
    console.log("📧 Brevo response:", brevoResult);

    if (!brevoResponse.ok && brevoResponse.status !== 204) {
      console.error("❌ Brevo API error:", brevoResult);
      return new Response(
        JSON.stringify({ success: false, error: brevoResult }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Trial user synced to Brevo successfully");
    return new Response(
      JSON.stringify({ success: true, email }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("🔥 Error syncing to Brevo:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
