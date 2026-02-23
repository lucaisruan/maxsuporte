import { supabase } from "@/integrations/supabase/client";

/**
 * Sends a webhook event asynchronously via edge function.
 * Never blocks or impacts the user flow — errors are silently logged.
 */
export const WebhookService = {
  send(evento: string, payload: Record<string, unknown>) {
    // Fire and forget — don't await
    supabase.functions
      .invoke("send-webhook", {
        body: { evento, payload },
      })
      .then(({ error }) => {
        if (error) {
          console.error(`[Webhook] Failed to send "${evento}":`, error);
        }
      })
      .catch((err) => {
        console.error(`[Webhook] Error sending "${evento}":`, err);
      });
  },
};
