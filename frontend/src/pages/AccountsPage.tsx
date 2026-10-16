import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountCard, EmptyState, Field, PageHeader, Spinner, StatusBadge } from "@/components/banking";
import { accountApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney, groupAccountNumber, titleCase } from "@/lib/utils";

function OpenAccount() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ account_type: "savings", currency: "USD", account_name: "" });
  const m = useMutation({
    mutationFn: () => accountApi.create(v),
    onSuccess: () => { toast.success("Account requested. An account executive will activate it."); qc.invalidateQueries({ queryKey: ["accounts"] }); setOpen(false); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="brass"><Plus /> Open account</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Open a new account</DialogTitle><DialogDescription>Requires a completed profile and a next of kin. New accounts start as pending until an account executive activates them.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Account name"><Input value={v.account_name} onChange={(e) => setV({ ...v, account_name: e.target.value })} placeholder="e.g. Rainy day fund" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={v.account_type} onChange={(e) => setV({ ...v, account_type: e.target.value })}>{["savings", "current", "fixed_deposit", "business"].map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</Select></Field>
            <Field label="Currency"><Select value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>{["USD", "EUR", "GBP", "KES"].map((c) => <option key={c}>{c}</option>)}</Select></Field>
          </div>
          <Button className="w-full" disabled={m.isPending}>{m.isPending && <Loader2 className="animate-spin" />} Request account</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const customer = user!.role === "customer";
  const canActivate = user!.role === "account_executive" || user!.role === "admin" || user!.role === "super_admin";
  const [filter, setFilter] = useState("");
  const q = useQuery({ queryKey: ["accounts", filter], queryFn: () => accountApi.list(filter || undefined) });
  const activate = useMutation({
    mutationFn: (id: string) => accountApi.activate(id),
    onSuccess: () => { toast.success("Account activated"); qc.invalidateQueries({ queryKey: ["accounts"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Accounts" description={customer ? "Your accounts and balances." : "All customer accounts."} actions={customer ? <OpenAccount /> : (
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-44" aria-label="Filter by status">
          <option value="">All statuses</option>{["pending", "active", "inactive", "frozen", "closed"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>)} />
      {q.isLoading ? <Spinner /> : !q.data?.length ? <EmptyState title="No accounts" text={customer ? "Open your first account to start banking." : "Nothing matches this filter."} /> : customer ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{q.data.map((a) => <AccountCard key={a.id} account={a} />)}</div>
      ) : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Owner</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Opened</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{q.data.map((a) => (
            <TableRow key={a.id}>
              <TableCell><p className="font-semibold">{a.owner_name}</p><p className="text-xs text-muted-foreground">{a.owner_email}</p></TableCell>
              <TableCell className="font-mono text-xs">{groupAccountNumber(a.account_number)}</TableCell>
              <TableCell>{titleCase(a.account_type)} · {a.currency}</TableCell>
              <TableCell><StatusBadge status={a.account_status} /></TableCell>
              <TableCell className="num text-right font-semibold">{formatMoney(a.balance, a.currency)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(a.created_at, false)}</TableCell>
              <TableCell className="text-right">{canActivate && a.account_status === "pending" && (
                <Button size="sm" onClick={() => activate.mutate(a.id)} disabled={activate.isPending}><CheckCircle2 /> Activate</Button>)}</TableCell>
            </TableRow>))}</TableBody></Table></CardContent></Card>
      )}
    </>
  );
}
