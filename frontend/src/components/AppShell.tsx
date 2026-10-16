import { NavLink, Outlet } from "react-router-dom";
import { ArrowLeftRight, CreditCard, Gauge, History, LayoutDashboard, Landmark, LogOut, ShieldCheck, UserCog, UserRound, Users, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdmin, type Role } from "@/lib/api";
import { cn, titleCase } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof Wallet; end?: boolean };

function navFor(role: Role): Item[] {
  const profile: Item = { to: "/profile", label: "Profile", icon: UserRound };
  const accounts: Item = { to: "/accounts", label: "Accounts", icon: Landmark };
  switch (role) {
    case "teller": return [{ to: "/teller", label: "Teller desk", icon: Wallet }, accounts, profile];
    case "account_executive": return [{ to: "/executive", label: "Review desk", icon: ShieldCheck }, accounts, profile];
    case "branch_manager": return [{ to: "/", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/admin", label: "Customers", icon: Users }, accounts, profile];
    case "admin":
    case "super_admin":
      return [{ to: "/", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/admin", label: "Customers & AI", icon: UserCog },
        { to: "/executive", label: "Review desk", icon: ShieldCheck }, accounts, { to: "/platform", label: "Platform", icon: Gauge }, profile];
    default:
      return [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }, accounts, { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
        { to: "/transactions", label: "Transactions", icon: History }, { to: "/cards", label: "Cards", icon: CreditCard }, profile];
  }
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const items = navFor(user!.role);
  const initials = `${user!.first_name[0] ?? ""}${user!.last_name[0] ?? ""}`.toUpperCase();
  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="guilloche flex shrink-0 items-center gap-1 overflow-x-auto bg-ink px-2 py-2 text-primary-foreground md:w-64 md:flex-col md:items-stretch md:overflow-visible md:px-3 md:py-5">
        <div className="hidden items-center gap-3 px-2 pb-6 md:flex">
          <span className="grid size-9 place-items-center rounded-lg bg-brass font-display text-lg font-bold text-ink">N</span>
          <div><p className="font-display text-lg font-semibold leading-none">NextGen</p><p className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">Bank</p></div>
        </div>
        <nav className="flex flex-1 gap-1 md:flex-col" aria-label="Main">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn("flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-semibold text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground",
                isActive && "bg-white/[0.12] text-primary-foreground shadow-[inset_3px_0_0_hsl(var(--brass))]")}>
              <Icon className="size-4" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 md:ml-0 md:border-t md:border-white/10 md:px-2 md:pt-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold">{initials}</div>
          <div className="hidden min-w-0 flex-1 md:block">
            <p className="truncate text-sm font-semibold">{user!.first_name} {user!.last_name}</p>
            <p className="truncate text-xs text-primary-foreground/60">{titleCase(user!.role)}{isAdmin(user!.role) ? "" : ""}</p>
          </div>
          <button onClick={() => logout()} title="Sign out" aria-label="Sign out" className="rounded-md p-2 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      <main className="min-h-0 min-w-0 flex-1 overflow-auto"><div className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></div></main>
    </div>
  );
}
