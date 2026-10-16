import type { ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn, formatMoney, groupAccountNumber, titleCase } from "@/lib/utils";
import type { Account } from "@/lib/api";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
      <Inbox className="size-7" />
      <p className="font-semibold text-foreground">{title}</p>
      {text && <p className="max-w-sm text-sm">{text}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{label ?? "Loading…"}</div>;
}

const VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  active: "success", completed: "success", approved: "success", cleared: "success",
  pending: "warning", flagged: "warning", inactive: "secondary", closed: "secondary", cancelled: "secondary", reversed: "secondary",
  blocked: "danger", frozen: "danger", failed: "danger", expired: "danger",
};
export function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "").toLowerCase();
  return <Badge variant={VARIANT[s] ?? "secondary"}>{titleCase(s) || "–"}</Badge>;
}

/** The product's signature element: an account rendered like an engraved bank card. */
export function AccountCard({ account, onClick, selected }: { account: Account; onClick?: () => void; selected?: boolean }) {
  const active = account.account_status === "active";
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cn("guilloche relative w-full overflow-hidden rounded-xl bg-ink p-5 text-left text-primary-foreground shadow-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        onClick && "hover:-translate-y-0.5", selected && "ring-2 ring-brass")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/60">{titleCase(account.account_type)} · {account.currency}</p>
          <p className="mt-0.5 text-sm font-semibold">{account.account_name}</p>
        </div>
        <span className="grid size-8 place-items-center rounded-md bg-brass/90 text-ink">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M3 11h18M9 6v12" /></svg>
        </span>
      </div>
      <p className="num mt-6 font-display text-3xl font-semibold leading-none">{formatMoney(account.balance, account.currency)}</p>
      <div className="mt-5 flex items-end justify-between">
        <p className="font-mono text-sm tracking-wider text-primary-foreground/80">{groupAccountNumber(account.account_number) || "Pending number"}</p>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", active ? "bg-success/30 text-emerald-200" : "bg-brass/25 text-amber-200")}>{titleCase(account.account_status)}</span>
      </div>
      {account.is_primary && <span className="absolute right-5 top-14 text-[10px] uppercase tracking-widest text-brass">Primary</span>}
    </button>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="num mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
