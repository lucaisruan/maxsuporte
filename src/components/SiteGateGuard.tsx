import { Navigate, useLocation } from "react-router-dom";

interface SiteGateGuardProps {
  children: React.ReactNode;
}

export function SiteGateGuard({ children }: SiteGateGuardProps) {
  const location = useLocation();
  
  // Check if site access was granted this session
  const hasAccess = sessionStorage.getItem("site_access_granted") === "true";
  
  // If no access and not on gate page, redirect to gate
  if (!hasAccess && location.pathname !== "/gate") {
    return <Navigate to="/gate" replace />;
  }
  
  return <>{children}</>;
}
