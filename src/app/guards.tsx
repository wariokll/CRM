import type { PropsWithChildren } from "react";
import { RefreshCw } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { logout } from "../api";
import { useAuth } from "../auth/AuthContext";
import { AuthPage } from "../features/auth/pages/AuthPage";
import { AccessDeniedPage } from "../features/layout/pages/AccessDeniedPage";
import { AccountStatusPage } from "../features/layout/pages/AccountStatusPage";
import { buildNavigation } from "../features/layout/navigation";

const knownPages = new Set([
  "requests",
  "calendar",
  "organizations",
  "stores",
  "my-boards",
  "team-boards",
  "reports",
  "templates",
  "staff",
  "telegram",
  "knowledge",
]);

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, setUser, booting } = useAuth();
  const exit = async () => {
    await logout();
    setUser(null);
  };

  if (booting)
    return (
      <main className="boot">
        <RefreshCw className="spin" /> Загрузка БАЗИС CRM…
      </main>
    );
  if (!user) return <AuthPage onAuth={setUser} />;
  if (user.status !== "ACTIVE")
    return <AccountStatusPage user={user} exit={exit} />;
  return children;
}

export function RequireRole({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const location = useLocation();
  const page = location.pathname.split("/").filter(Boolean)[0] ?? "dashboard";

  if (page !== "dashboard" && !knownPages.has(page))
    return <Navigate to="/" replace />;
  if (
    user?.status === "ACTIVE" &&
    page !== "dashboard" &&
    !buildNavigation(user).some((item) => item.id === page)
  )
    return <AccessDeniedPage />;
  return children;
}
