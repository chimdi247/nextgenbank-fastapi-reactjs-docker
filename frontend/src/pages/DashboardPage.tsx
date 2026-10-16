import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownLeft, ArrowUpRight, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AccountCard, EmptyState, PageHeader, Spinner, Stat, StatusBadge } from "@/components/banking";
import { accountApi, cardApi, isAdmin, txnApi, type Txn } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/utils";

function CustomerDashboard() {
  const { user } = useAuth();
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => accountApi.list() });
  const history = useQuery({ queryKey: ["history", "dash"], queryFn: () => txnApi.history({ skip: 0, limit: 100 }) });

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    (accounts.data ?? []).filter((a) => a.account_status === "active").forEach((a) => { t[a.currency] = (t[a.currency] ?? 0) + a.balance; });
    return t;
  }, [accounts.data]);

  const chart = useMemo(() => {
    const days: Record<string, { day: string; in: number; out: number }> = {};
    (history.data?.transactions ?? []).forEach((t) => {
      if (t.transaction_status !== "completed") return;
      const day = t.created_at.slice(0, 10);
      days[day] ??= { day, in: 0, out: 0 };
      if (t.transaction_category === "credit") days[day].in += Number(t.amount); else days[day].out += Number(t.amount);
    });
    return Object.values(days).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  }, [history.data]);

  return (
    <>
      <PageHeader title={`Good day, ${user!.first_name}`} description="Your money at a glance."
        actions={<><Button asChild variant="outline"><Link to="/accounts">Open an account</Link></Button><Button asChild variant="brass"><Link to="/transfer">Send money</Link></Button></>} />
      {!user!.profile && (
        <Card className="mb-6 border-brass/60 bg-accent"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div><p className="font-semibold text-accent-foreground">Finish your profile to open an account</p><p className="text-sm text-accent-foreground/80">We need your personal details and a next of kin before an account can be opened (KYC).</p></div>
          <Button asChild><Link to="/profile">Complete profile</Link></Button></CardContent></Card>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(totals).map(([cur, v]) => <Stat key={cur} label={`Total ${cur}`} value={formatMoney(v, cur)} />)}
        <Stat label="Accounts" value={accounts.data?.length ?? 0} hint={`${(accounts.data ?? []).filter((a) => a.account_status === "pending").length} awaiting activation`} />
      </div>

      <h2 className="mb-3 text-xl font-semibold">Accounts</h2>
      {accounts.isLoading ? <Spinner /> : !accounts.data?.length ? (
        <EmptyState title="No accounts yet" text="Complete your profile, add a next of kin, then open your first account." action={<Button asChild><Link to="/accounts">Open an account</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{accounts.data.map((a) => <AccountCard key={a.id} account={a} />)}</div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Cash flow</CardTitle><CardDescription>Completed credits and debits, last days with activity</CardDescription></CardHeader>
          <CardContent className="h-64">
            {chart.length === 0 ? <EmptyState title="No activity yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={48} />
                  <Tooltip />
                  <Area type="monotone" dataKey="in" name="Money in" stroke="hsl(var(--success))" fill="hsl(var(--success) / .2)" />
                  <Area type="monotone" dataKey="out" name="Money out" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / .15)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {history.isLoading ? <Spinner /> : !history.data?.transactions.length ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
              <ul className="divide-y">{history.data.transactions.slice(0, 6).map((t: Txn) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className={`grid size-8 place-items-center rounded-full ${t.transaction_category === "credit" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {t.transaction_category === "credit" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.description}</p><p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p></div>
                  <div className="text-right"><p className="num text-sm font-semibold">{t.transaction_category === "credit" ? "+" : "−"}{formatMoney(t.amount, t.currency ?? "USD")}</p><StatusBadge status={t.transaction_status} /></div>
                </li>))}</ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StaffDashboard() {
  const { user } = useAuth();
  const pending = useQuery({ queryKey: ["accounts", "pending"], queryFn: () => accountApi.list("pending") });
  const all = useQuery({ queryKey: ["accounts"], queryFn: () => accountApi.list() });
  const cards = useQuery({ queryKey: ["cards", "pending"], queryFn: () => cardApi.list("pending"), enabled: isAdmin(user!.role) });
  const flagged = useQuery({ queryKey: ["flagged"], queryFn: txnApi.flagged, enabled: isAdmin(user!.role) });
  return (
    <>
      <PageHeader title={`Welcome, ${user!.first_name}`} description="Operations overview" actions={isAdmin(user!.role) && <Button asChild variant="outline"><Link to="/platform">Observability</Link></Button>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accounts" value={all.data?.length ?? "…"} />
        <Stat label="Awaiting activation" value={pending.data?.length ?? "…"} />
        {isAdmin(user!.role) && <Stat label="Cards awaiting activation" value={cards.data?.length ?? "…"} />}
        {isAdmin(user!.role) && <Stat label="Flagged transactions" value={flagged.data?.length ?? "…"} hint="Fraud model" />}
      </div>
      <Card className="mt-6"><CardContent className="flex items-center gap-4 p-5">
        <UserCog className="size-8 text-primary" /><div className="flex-1"><p className="font-semibold">Customers &amp; fraud model</p><p className="text-sm text-muted-foreground">Browse customer profiles{isAdmin(user!.role) ? ", train and deploy the fraud model" : ""}.</p></div>
        <Button asChild><Link to="/admin">Open</Link></Button></CardContent></Card>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return user!.role === "customer" ? <CustomerDashboard /> : <StaffDashboard />;
}
