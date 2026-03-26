/**
 * Oncenter Service Layer
 * 
 * Serviço preparado para consumir a API Oncenter via Edge Functions.
 * Enquanto a API externa não estiver validada (retornou 500),
 * as funções retornam dados vazios/mock com flag de status.
 * 
 * Quando a API estiver pronta, basta remover os fallbacks e
 * deixar as chamadas reais via supabase.functions.invoke().
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  OncenterUser,
  OncenterDepartment,
  OncenterTicket,
  OncenterFinishMotive,
} from "./oncenterTypes";

export interface OncenterServiceResult<T> {
  data: T | null;
  error: string | null;
  apiAvailable: boolean;
}

// Flag global — enquanto a API não for validada, retorna dados vazios
const API_VALIDATED = false;

/**
 * Buscar departamentos com usuários
 */
export async function fetchOncenterDepartments(): Promise<OncenterServiceResult<OncenterDepartment[]>> {
  if (!API_VALIDATED) {
    return {
      data: null,
      error: "Integração Oncenter aguardando validação da API pelo fornecedor.",
      apiAvailable: false,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("oncenter-departments");
    if (error) throw error;
    return { data: data?.data || data, error: null, apiAvailable: true };
  } catch (err: any) {
    return { data: null, error: err.message, apiAvailable: false };
  }
}

/**
 * Buscar usuários da Oncenter
 */
export async function fetchOncenterUsers(): Promise<OncenterServiceResult<OncenterUser[]>> {
  if (!API_VALIDATED) {
    return {
      data: null,
      error: "Integração Oncenter aguardando validação da API pelo fornecedor.",
      apiAvailable: false,
    };
  }

  // TODO: criar edge function oncenter-users
  return { data: null, error: "Edge function não implementada ainda.", apiAvailable: false };
}

/**
 * Buscar tickets da Oncenter com filtros
 */
export async function fetchOncenterTickets(filters?: {
  status?: string;
  user_id?: number;
  department_id?: number;
  date_from?: string;
  date_to?: string;
}): Promise<OncenterServiceResult<OncenterTicket[]>> {
  if (!API_VALIDATED) {
    return {
      data: null,
      error: "Integração Oncenter aguardando validação da API pelo fornecedor.",
      apiAvailable: false,
    };
  }

  // TODO: criar edge function oncenter-tickets
  return { data: null, error: "Edge function não implementada ainda.", apiAvailable: false };
}

/**
 * Buscar motivos de finalização
 */
export async function fetchOncenterFinishMotives(): Promise<OncenterServiceResult<OncenterFinishMotive[]>> {
  if (!API_VALIDATED) {
    return {
      data: null,
      error: "Integração Oncenter aguardando validação da API pelo fornecedor.",
      apiAvailable: false,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("oncenter-test-auth");
    if (error) throw error;
    return { data: data?.oncenter_body ? JSON.parse(data.oncenter_body)?.data : null, error: null, apiAvailable: true };
  } catch (err: any) {
    return { data: null, error: err.message, apiAvailable: false };
  }
}

/**
 * Buscar vínculos de usuários internos com Oncenter
 */
export async function fetchUserLinks() {
  const { data, error } = await supabase
    .from("oncenter_user_links" as any)
    .select("*");
  return { data, error };
}

/**
 * Buscar vínculos de clientes com contatos Oncenter
 */
export async function fetchClientLinks() {
  const { data, error } = await supabase
    .from("oncenter_client_links" as any)
    .select("*");
  return { data, error };
}

/**
 * Buscar link Oncenter de uma demanda específica
 */
export async function fetchDemandOncenterLinks(demandId: string) {
  const { data, error } = await supabase
    .from("demand_oncenter_links" as any)
    .select("*")
    .eq("demand_id", demandId);
  return { data, error };
}

/**
 * Buscar cache de tickets
 */
export async function fetchTicketCache(ticketId?: number) {
  let query = supabase.from("oncenter_ticket_cache" as any).select("*");
  if (ticketId) {
    query = query.eq("oncenter_ticket_id", ticketId);
  }
  const { data, error } = await query;
  return { data, error };
}

/**
 * Buscar histórico de status de um usuário Oncenter
 */
export async function fetchUserStatusHistory(oncenterUserId: number) {
  const { data, error } = await supabase
    .from("oncenter_user_status_history" as any)
    .select("*")
    .eq("oncenter_user_id", oncenterUserId)
    .order("recorded_at", { ascending: false })
    .limit(50);
  return { data, error };
}
