const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const oncenterApiKey = Deno.env.get("ONCENTER_API_KEY");
    const oncenterBaseUrl = Deno.env.get("ONCENTER_BASE_URL");

    if (!oncenterApiKey || !oncenterBaseUrl) {
      return new Response(
        JSON.stringify({
          error: "Missing secrets",
          hasApiKey: !!oncenterApiKey,
          hasBaseUrl: !!oncenterBaseUrl,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `${oncenterBaseUrl}/finish-motives`;
    console.log("Calling:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": oncenterApiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const body = await response.text();

    return new Response(
      JSON.stringify({
        oncenter_status: response.status,
        oncenter_url_called: url,
        oncenter_body: body.length > 5000 ? body.substring(0, 5000) + "...[truncated]" : body,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
