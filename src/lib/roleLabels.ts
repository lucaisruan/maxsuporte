// Maps internal role names to display labels
export function getRoleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "implantador":
      return "Analista";
    default:
      return role;
  }
}

export const MODULE_LABELS: Record<string, string> = {
  implantacoes: "Implantações",
  visitas: "Visitas",
  demandas: "Demandas",
  relatorios: "Relatórios",
  administracao: "Administração",
};

export const ALL_MODULES = Object.keys(MODULE_LABELS);
