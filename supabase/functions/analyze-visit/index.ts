import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Create user-context client to verify auth
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Service role client for inserts
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { visita_id, user_message } = await req.json();
    if (!visita_id) throw new Error("visita_id is required");

    // Fetch visit details
    const { data: visita, error: visitaErr } = await supabase
      .from("visitas")
      .select("*, clients(name)")
      .eq("id", visita_id)
      .single();
    if (visitaErr || !visita) throw new Error("Visit not found");

    // Fetch existing interactions
    const { data: interacoes } = await supabase
      .from("visita_interacoes")
      .select("mensagem, origem, created_at")
      .eq("visita_id", visita_id)
      .order("created_at", { ascending: true });

    // Fetch active knowledge base
    const { data: knowledgeBase } = await supabase
      .from("base_conhecimento_ia")
      .select("titulo, contexto, diretriz_decisao, sugestao_servico, perfil_cliente, categoria")
      .eq("ativo", true);

    // Build context for AI
    const kbContext = (knowledgeBase || [])
      .map((kb) => `[${kb.categoria}] ${kb.titulo}: ${kb.contexto}${kb.diretriz_decisao ? ` | Diretriz: ${kb.diretriz_decisao}` : ""}${kb.sugestao_servico ? ` | Serviço sugerido: ${kb.sugestao_servico}` : ""}${kb.perfil_cliente ? ` | Perfil: ${kb.perfil_cliente}` : ""}`)
      .join("\n");

    const conversationHistory = (interacoes || [])
      .map((i) => `${i.origem === "ia" ? "Assistente" : "Usuário"}: ${i.mensagem}`)
      .join("\n");

    const systemPrompt = `Você é o assistente de IA do sistema MAX IMPLANTAÇÕES. Sua função é apoiar implantadores e administradores com análises, recomendações e sugestões de serviços.

REGRAS:
- Responda sempre em português do Brasil
- Priorize as diretrizes da base de conhecimento institucional abaixo sobre qualquer inferência genérica
- Quando identificar oportunidade, sugira serviços adicionais cadastrados na base de conhecimento
- Seja objetivo e prático nas respostas
- Considere o contexto do cliente e da visita

BASE DE CONHECIMENTO INSTITUCIONAL:
${kbContext || "Nenhuma diretriz cadastrada ainda."}

DADOS DA VISITA:
- Cliente: ${(visita as any).clients?.name || "N/A"}
- Título: ${visita.titulo}
- Tipo: ${visita.tipo}
- Descrição: ${visita.descricao_situacao}

HISTÓRICO DA CONVERSA:
${conversationHistory || "Nenhuma interação anterior."}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: user_message || visita.descricao_situacao },
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "Não foi possível gerar uma resposta.";

    // Save AI interaction
    await supabase.from("visita_interacoes").insert({
      visita_id,
      usuario_id: null,
      mensagem: aiMessage,
      origem: "ia",
    });

    // Update visit status to analyzed if it was open
    if (visita.status === "aberta") {
      await supabase.from("visitas").update({ status: "analisada" }).eq("id", visita_id);
    }

    // Check if AI suggests services and create recommendations
    const serviceKeywords = (knowledgeBase || [])
      .filter((kb) => kb.sugestao_servico)
      .map((kb) => ({ service: kb.sugestao_servico!, title: kb.titulo }));

    for (const svc of serviceKeywords) {
      if (aiMessage.toLowerCase().includes(svc.service!.toLowerCase())) {
        await supabase.from("recomendacoes_visita").insert({
          visita_id,
          tipo: "sugestao_servico",
          conteudo: `Serviço sugerido: ${svc.service} - Referência: ${svc.title}`,
          origem: "ia",
        });
      }
    }

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-visit error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
