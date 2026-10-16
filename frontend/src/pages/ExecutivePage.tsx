import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Field, PageHeader, Spinner, StatusBadge } from "@/components/banking";
import { accountApi, cardApi, errorMessage, txnApi, type Flagged } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney, groupAccountNumber, titleCase } from "@/lib/utils";

export default function ExecutivePage() {
  const { user } = useAuth();
  const canAct = user!.role === "account_executive";
  const qc = useQueryClient();
  const accounts = useQuery({ queryKey: ["accounts", "pending"], queryFn: () => accountApi.list("pending") });
  const cards = useQuery({ queryKey: ["cards", "pending"], queryFn: () => cardApi.list("pending") });
  const flagged = useQuery({ queryKey: ["flagged"], queryFn: txnApi.flagged });
  const onErr = (e: unknown) => toast.error(errorMessage(e));

  const act = useMutation({ mutationFn: (id: string) => accountApi.activate(id), onSuccess: () => { toast.success("Account activated"); qc.invalidateQueries({ queryKey: ["accounts"] }); }, onError: onErr });
  const actCard = useMutation({ mutationFn: (id: string) => cardApi.activate(id), onSuccess: () => { toast.success("Card activated"); qc.invalidateQueries({ queryKey: ["cards"] }); }, onError: onErr });

  const [rev, setRev] = useState<Flagged | null>(null);
  const [fraud, setFraud] = useState(false); const [approve, setApprove] = useState(true); const [notes, setNotes] = useState("");
  const review = useMutation({
    mutationFn: () => txnApi.review(rev!.id, { is_fraud: fraud, approve_transaction: approve && !fraud, notes }),
    onSuccess: () => { toast.success("Review recorded"); setRev(null); setNotes(""); qc.invalidateQueries({ queryKey: ["flagged"] }); }, onError: onErr,
  });

  return (
    <>
      <PageHeader title="Review desk" description="Activate new accounts and cards, and review transactions flagged by the fraud model." />
      <Tabs defaultValue="accounts">
        <TabsList><TabsTrigger value="accounts">Accounts ({accounts.data?.length ?? 0})</TabsTrigger><TabsTrigger value="cards">Cards ({cards.data?.length ?? 0})</TabsTrigger><TabsTrigger value="flagged">Flagged ({flagged.data?.length ?? 0})</TabsTrigger></TabsList>

        <TabsContent value="accounts">{accounts.isLoading ? <Spinner /> : !accounts.data?.length ? <EmptyState title="Nothing to activate" /> : (
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Owner</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead>Requested</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{accounts.data.map((a) => (<TableRow key={a.id}>
              <TableCell><p className="font-semibold">{a.owner_name}</p><p className="text-xs text-muted-foreground">{a.owner_email}</p></TableCell>
              <TableCell className="font-mono text-xs">{groupAccountNumber(a.account_number)}</TableCell><TableCell>{titleCase(a.account_type)} · {a.currency}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(a.created_at)}</TableCell>
              <TableCell className="text-right">{canAct && <Button size="sm" onClick={() => act.mutate(a.id)} disabled={act.isPending}><CheckCircle2 /> Activate</Button>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}</TabsContent>

        <TabsContent value="cards">{cards.isLoading ? <Spinner /> : !cards.data?.length ? <EmptyState title="No cards waiting" /> : (
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Owner</TableHead><TableHead>Card</TableHead><TableHead>Limits</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{cards.data.map((c) => (<TableRow key={c.id}>
              <TableCell><p className="font-semibold">{c.owner_name}</p><p className="text-xs text-muted-foreground">{c.owner_email}</p></TableCell>
              <TableCell className="font-mono text-xs">{c.masked_card_number} · {titleCase(c.card_type)}</TableCell>
              <TableCell>{formatMoney(c.daily_limit, c.currency)}/day</TableCell><TableCell><StatusBadge status={c.card_status} /></TableCell>
              <TableCell className="text-right">{canAct && <Button size="sm" onClick={() => actCard.mutate(c.id)} disabled={actCard.isPending}><CheckCircle2 /> Activate</Button>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}</TabsContent>

        <TabsContent value="flagged">{flagged.isLoading ? <Spinner /> : !flagged.data?.length ? <EmptyState title="No flagged transactions" text="Transactions the fraud model scores above the threshold appear here." /> : (
          <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Sender</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Risk</TableHead><TableHead>When</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{flagged.data.map((f) => (<TableRow key={f.id}>
              <TableCell className="font-mono text-xs">{f.reference}</TableCell><TableCell><p className="font-semibold">{f.sender_name ?? "–"}</p><p className="text-xs text-muted-foreground">{f.sender_email}</p></TableCell>
              <TableCell className="num text-right font-semibold">{formatMoney(f.amount)}</TableCell>
              <TableCell><span className={`inline-flex items-center gap-1 font-semibold ${f.risk_score >= 0.7 ? "text-destructive" : "text-accent-foreground"}`}><ShieldAlert className="size-4" />{Math.round(f.risk_score * 100)}%</span></TableCell>
              <TableCell className="text-muted-foreground">{formatDate(f.created_at)}</TableCell>
              <TableCell className="text-right">{canAct && <Button size="sm" variant="outline" onClick={() => { setRev(f); setFraud(false); setApprove(true); }}>Review</Button>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}</TabsContent>
      </Tabs>

      <Dialog open={!!rev} onOpenChange={(o) => !o && setRev(null)}><DialogContent>
        <DialogHeader><DialogTitle>Review {rev?.reference}</DialogTitle><DialogDescription>{rev && `${formatMoney(rev.amount)} from ${rev.sender_name ?? "unknown"} · risk ${Math.round(rev.risk_score * 100)}% · model ${rev.model_version}`}</DialogDescription></DialogHeader>
        {rev && <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(rev.risk_factors, null, 2)}</pre>}
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); review.mutate(); }}>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={fraud} onChange={(e) => setFraud(e.target.checked)} /> Confirm as fraud</label>
          {!fraud && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} /> Approve and release the transaction</label>}
          <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for the decision" /></Field>
          <Button className="w-full" variant={fraud ? "destructive" : "default"} disabled={review.isPending}>{review.isPending && <Loader2 className="animate-spin" />} Submit decision</Button>
        </form></DialogContent></Dialog>
    </>
  );
}
