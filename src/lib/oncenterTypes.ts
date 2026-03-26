// ==============================================
// Oncenter API Types - baseado na documentação oficial
// Base URL: https://api.oncenterchat.com/api/external
// Auth: UUID da empresa no header Authorization (sem Bearer)
// ==============================================

// --- API Response Types ---

export interface OncenterPaginatedResponse<T> {
  success: boolean;
  data: {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

export interface OncenterSimpleResponse<T> {
  success: boolean;
  data: T;
}

// --- User ---

export interface OncenterUser {
  id: number;
  name: string;
  photo: string;
  email: string;
  role: "admin" | "supervisor" | "operador";
  companyId: number;
  active: boolean;
  full_photo: string;
  status_with_name: string; // ex: "🟢 João Silva"
  departments: OncenterDepartmentRef[];
}

export interface OncenterDepartmentRef {
  id: number;
  name: string;
}

// --- Department ---

export interface OncenterDepartment {
  id: number;
  name: string;
  color: string;
  message: string | null;
  route: string | null;
  is_default: boolean;
  active: boolean;
  companyId: number;
  parent_id: number | null;
  children: OncenterDepartmentChild[];
  users?: OncenterUser[];
}

export interface OncenterDepartmentChild {
  id: number;
  name: string;
  color: string;
  active: boolean;
  parent_id: number;
}

// --- Finish Motive ---

export interface OncenterFinishMotive {
  id: number;
  name: string;
}

// --- Ticket ---

export interface OncenterTicket {
  id: number;
  protocol: string;
  status: "active" | "pending" | "closed" | "bot" | "rating" | "ai";
  lastMessage: string;
  unreadMessages: number;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  attendedAt: string | null;
  userId: number | null;
  contactId: number;
  departmentId: number | null;
  companyId: number;
  motive: string | null;
  tag: string | null;
  user: OncenterTicketUser | null;
  contact: OncenterTicketContact;
  department: OncenterDepartmentRef | null;
  finish_motive: OncenterFinishMotive | null;
}

export interface OncenterTicketUser {
  id: number;
  name: string;
  photo: string;
  email: string;
  role: string;
}

export interface OncenterTicketContact {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  photo?: string;
}

// --- Ticket Status Labels ---

export const oncenterTicketStatusLabels: Record<string, string> = {
  active: "Em atendimento",
  pending: "Na fila",
  closed: "Encerrado",
  bot: "Bot",
  rating: "Avaliação",
  ai: "IA",
};

export const oncenterUserRoleLabels: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
};

export const oncenterChatStatusLabels: Record<string, { label: string; color: string }> = {
  online: { label: "Online", color: "text-green-600" },
  offline: { label: "Offline", color: "text-muted-foreground" },
};

// --- API Endpoints Reference ---
// GET  /users                    - Listar usuários (paginado)
// GET  /users/{id}               - Detalhar usuário
// PATCH /users/{id}/status       - Alterar status (online/offline)
// GET  /departments              - Listar departamentos
// GET  /departments/{id}         - Detalhar departamento
// GET  /finish-motives           - Listar motivos de finalização
// GET  /tickets                  - Listar tickets (paginado, filtros)
// GET  /tickets/{id}             - Detalhar ticket
// POST /tickets/{id}/close       - Finalizar ticket
// POST /tickets/{id}/transfer    - Transferir ticket

// --- Integration Status ---
export type OncenterIntegrationStatus = "pending_validation" | "connected" | "error";

export const ONCENTER_INTEGRATION_STATUS: OncenterIntegrationStatus = "pending_validation";
