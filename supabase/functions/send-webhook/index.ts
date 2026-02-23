import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEBHOOK_URL =
  "https://hook.us2.make.com/70ue6hd4w2tnwrthfl4qwqgnvqswon6a";

const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;

async function sendWithRetry(
  payload: Record<string, unknown>
): Promise<{ status: string; response: string }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-source": "max-implantacoes",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await res.text();

      if (res.ok) {
        return { status: "success", response: text };
      }

      console.error(
        `Webhook attempt ${attempt + 1} failed: ${res.status} - ${text}`
      );
    } catch (err) {
      console.error(
        `Webhook attempt ${attempt + 1} error:`,
        err instanceof Error ? err.message : err
      );
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  return { status: "failed", response: "All retry attempts exhausted" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { evento, payload } = await req.json();

    if (!evento || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing evento or payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add timestamp to payload
    const fullPayload = {
      ...payload,
      evento,
      timestamp: new Date().toISOString(),
    };

    // Send webhook with retry
    const result = await sendWithRetry(fullPayload);

    // Log to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("webhook_logs").insert({
      evento,
      payload: fullPayload,
      status: result.status,
      response: result.response,
    });

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
