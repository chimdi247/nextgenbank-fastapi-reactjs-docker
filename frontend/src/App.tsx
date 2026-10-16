import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/api";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import { ActivatePage, ResetPasswordPage } from "@/pages/EmailLinkPages";
import DashboardPage from "@/pages/DashboardPage";
import AccountsPage from "@/pages/AccountsPage";
import TransferPage from "@/pages/TransferPage";
import TransactionsPage from "@/pages/TransactionsPage";
import CardsPage from "@/pages/CardsPage";
import ProfilePage from "@/pages/ProfilePage";
import TellerPage from "@/pages/TellerPage";
import ExecutivePage from "@/pages/ExecutivePage";
import AdminPage from "@/pages/AdminPage";
import PlatformPage from "@/pages/PlatformPage";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

/** Route guard by role; anyone else is sent to their own landing page. */
function Only({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

function Home() {
  const { user } = useAuth();
  if (user?.role === "teller") return <Navigate to="/teller" replace />;
  if (user?.role === "account_executive") return <Navigate to="/executive" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activate/:token" element={<ActivatePage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route index element={<Home />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="transfer" element={<Only roles={["customer"]}><TransferPage /></Only>} />
        <Route path="transactions" element={<Only roles={["customer"]}><TransactionsPage /></Only>} />
        <Route path="cards" element={<Only roles={["customer"]}><CardsPage /></Only>} />
        <Route path="teller" element={<Only roles={["teller"]}><TellerPage /></Only>} />
        <Route path="executive" element={<Only roles={["account_executive", "admin", "super_admin"]}><ExecutivePage /></Only>} />
        <Route path="admin" element={<Only roles={["admin", "super_admin", "branch_manager"]}><AdminPage /></Only>} />
        <Route path="platform" element={<Only roles={["admin", "super_admin"]}><PlatformPage /></Only>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
