import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Field, PageHeader, Spinner, StatusBadge } from "@/components/banking";
import { accountApi, errorMessage, txnApi } from "@/lib/api";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

const PAGE = 15;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function TransactionsPage() {
  const [page, setPage] = useState(0);
  const [type, setType] = useState(""); const [status, setStatus] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const params: Record<string, unknown> = { skip: page * PAGE, limit: PAGE };
  if (type) params.transaction_type = type;
  if (status) params.status = status;
  if (from) params.start_date = `${from}T00:00:00Z`;
  if (to) params.end_date = `${to}T23:59:59Z`;
  const q = useQuery({ queryKey: ["history", params], queryFn: () => txnApi.history(params), placeholderData: (p) => p });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => accountApi.list() });
  const [stFrom, setStFrom] = useState(""); const [stTo, setStTo] = useState(""); const [stAcc, setStAcc] = useState("");

  // statements are rendered to PDF by a Celery worker: ask for one, then poll until it is ready
  const statement = useMutation({
    mutationFn: async () => {
      const r = await accountApi.generateStatement({ start_date: `${stFrom}T00:00:00Z`, end_date: `${stTo}T23:59:59Z`, ...(stAcc ? { account_number: stAcc } : {}) });
      const id = r.statement_id;
      for (let i = 0; i < 40; i++) {
        try {
          const res = await accountApi.statementBlob(id);
          if (res.headers["content-type"]?.includes("pdf")) return res.data as Blob;
        } catch { /* not ready yet */ }
        await sleep(1500);
      }
      throw new Error("The statement is taking longer than expected - try again shortly");
    },
    onSuccess: (blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "statement.pdf"; a.click(); toast.success("Statement downloaded"); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const total = q.data?.total ?? 0;
  return (
    <>
      <PageHeader title="Transactions" description="Everything that moved through your accounts." />
      <Card className="mb-6"><CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Type"><Select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}><option value="">All</option>{["deposit", "withdrawal", "transfer"].map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</Select></Field>
        <Field label="Status"><Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">All</option>{["completed", "pending", "failed"].map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</Select></Field>
        <Field label="From"><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} /></Field>
        <div className="flex items-end"><Button variant="outline" className="w-full" onClick={() => { setType(""); setStatus(""); setFrom(""); setTo(""); setPage(0); }}>Reset</Button></div>
      </CardContent></Card>

      {q.isLoading ? <Spinner /> : !q.data?.transactions.length ? <EmptyState title="No transactions" text="Try widening the filters." /> : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead /><TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
            <TableBody>{q.data.transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.transaction_category === "credit" ? <ArrowDownLeft className="size-4 text-success" /> : <ArrowUpRight className="size-4 text-destructive" />}</TableCell>
                <TableCell><p className="font-semibold">{t.description}</p><p className="text-xs text-muted-foreground">{titleCase(t.transaction_type)}{t.counterparty_name ? ` · ${t.counterparty_name}` : ""}</p></TableCell>
                <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                <TableCell><StatusBadge status={t.transaction_status} /></TableCell>
                <TableCell className={`num text-right font-semibold ${t.transaction_category === "credit" ? "text-success" : ""}`}>{t.transaction_category === "credit" ? "+" : "−"}{formatMoney(t.amount, t.currency ?? "USD")}</TableCell>
                <TableCell className="num text-right text-muted-foreground">{formatMoney(t.balance_after, t.currency ?? "USD")}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}</span>
            <div className="flex gap-2"><Button size="icon" variant="outline" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft /></Button><Button size="icon" variant="outline" aria-label="Next page" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}><ChevronRight /></Button></div>
          </div>
        </CardContent></Card>
      )}

      <Card className="mt-6"><CardHeader><CardTitle>Account statement</CardTitle><CardDescription>Generated as a PDF by a background worker (Celery + RabbitMQ).</CardDescription></CardHeader>
        <CardContent><form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); statement.mutate(); }}>
          <Field label="From"><Input type="date" value={stFrom} onChange={(e) => setStFrom(e.target.value)} required /></Field>
          <Field label="To"><Input type="date" value={stTo} onChange={(e) => setStTo(e.target.value)} required /></Field>
          <Field label="Account"><Select value={stAcc} onChange={(e) => setStAcc(e.target.value)}><option value="">All accounts</option>{(accounts.data ?? []).filter((a) => a.account_number).map((a) => <option key={a.id} value={a.account_number!}>{a.account_name}</option>)}</Select></Field>
          <div className="flex items-end"><Button className="w-full" disabled={statement.isPending}>{statement.isPending ? <Loader2 className="animate-spin" /> : <FileDown />} Download PDF</Button></div>
        </form></CardContent></Card>
    </>
  );
}
