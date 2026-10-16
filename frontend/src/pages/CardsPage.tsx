import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Field, PageHeader, Spinner, StatusBadge } from "@/components/banking";
import { accountApi, cardApi, errorMessage, type Card } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatMoney, titleCase } from "@/lib/utils";

function VisaCard({ card }: { card: Card }) {
  const dead = card.card_status === "blocked" || card.card_status === "expired";
  return (
    <div className={cn("guilloche relative aspect-[1.6/1] w-full overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-md", dead ? "bg-neutral-700" : "bg-gradient-to-br from-ink to-primary")}>
      <div className="flex items-start justify-between"><span className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">{titleCase(card.card_type)} · virtual</span><span className="font-display text-xl font-bold italic tracking-wider text-brass">VISA</span></div>
      <p className="mt-7 font-mono text-lg tracking-[0.18em]">{card.masked_card_number}</p>
      <div className="absolute inset-x-5 bottom-4 flex items-end justify-between">
        <div><p className="text-[10px] uppercase tracking-widest text-primary-foreground/50">Card holder</p><p className="text-sm font-semibold uppercase">{card.name_on_card}</p></div>
        <div className="text-right"><p className="text-[10px] uppercase tracking-widest text-primary-foreground/50">Expires</p><p className="font-mono text-sm">{card.expiry_date.slice(5, 7)}/{card.expiry_date.slice(2, 4)}</p></div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const cards = useQuery({ queryKey: ["cards"], queryFn: () => cardApi.list() });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => accountApi.list() });
  const active = (accounts.data ?? []).filter((a) => a.account_status === "active");
  const refresh = () => qc.invalidateQueries({ queryKey: ["cards"] });
  const onErr = (e: unknown) => toast.error(errorMessage(e));

  const [create, setCreate] = useState(false);
  const [cv, setCv] = useState({ bank_account_id: "", card_type: "debit", currency: "USD", daily_limit: "1000", monthly_limit: "5000", name_on_card: `${user!.first_name} ${user!.last_name}`.toUpperCase().slice(0, 50) });
  const [made, setMade] = useState<Record<string, any> | null>(null);
  const createM = useMutation({
    mutationFn: () => cardApi.create({ ...cv, bank_account_id: cv.bank_account_id || active[0]?.id, daily_limit: Number(cv.daily_limit), monthly_limit: Number(cv.monthly_limit) }),
    onSuccess: (r) => { setCreate(false); setMade(r); refresh(); toast.success("Card requested - an account executive must activate it"); }, onError: onErr,
  });

  const [topup, setTopup] = useState<Card | null>(null);
  const [tu, setTu] = useState({ account_number: "", amount: "", description: "Card top-up" });
  const topM = useMutation({
    mutationFn: () => cardApi.topUp(topup!.id, { account_number: tu.account_number || active.find((a) => a.id === topup!.bank_account_id)?.account_number || "", amount: Number(tu.amount), description: tu.description }),
    onSuccess: () => { toast.success("Card topped up"); setTopup(null); refresh(); qc.invalidateQueries({ queryKey: ["accounts"] }); }, onError: onErr,
  });

  const [block, setBlock] = useState<Card | null>(null);
  const [bk, setBk] = useState({ block_reason: "lost", block_reason_description: "" });
  const blockM = useMutation({ mutationFn: () => cardApi.block(block!.id, bk), onSuccess: () => { toast.success("Card blocked"); setBlock(null); refresh(); }, onError: onErr });
  const delM = useMutation({ mutationFn: (id: string) => cardApi.remove(id), onSuccess: () => { toast.success("Card deleted"); refresh(); }, onError: onErr });

  return (
    <>
      <PageHeader title="Virtual cards" description="Spend online from a card that is funded from your account." actions={<Button variant="brass" onClick={() => setCreate(true)} disabled={!active.length}><Plus /> New card</Button>} />
      {made && <div className="mb-6 rounded-lg border border-brass/60 bg-accent p-4 text-sm text-accent-foreground"><b>Card created.</b> Number: <span className="font-mono">{String(made.card_number ?? "")}</span> - store it safely, the full number is not shown again.</div>}
      {cards.isLoading ? <Spinner /> : !cards.data?.length ? <EmptyState title="No cards yet" text={active.length ? "Create your first virtual card." : "You need an active account first."} /> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{cards.data.map((c) => (
          <div key={c.id} className="space-y-3">
            <VisaCard card={c} />
            <div className="flex items-center justify-between"><StatusBadge status={c.card_status} /><span className="num text-sm font-semibold">{formatMoney(c.available_balance, c.currency)}</span></div>
            <p className="text-xs text-muted-foreground">Limits {formatMoney(c.daily_limit, c.currency)}/day · {formatMoney(c.monthly_limit, c.currency)}/month</p>
            {c.card_status === "pending" && <p className="text-xs text-muted-foreground">Awaiting activation by an account executive.</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={c.card_status !== "active"} onClick={() => setTopup(c)}><Wallet /> Top up</Button>
              <Button size="sm" variant="outline" disabled={c.card_status === "blocked"} onClick={() => setBlock(c)}><Ban /> Block</Button>
              <Button size="sm" variant="ghost" aria-label="Delete card" onClick={() => confirm("Delete this card?") && delM.mutate(c.id)}><Trash2 /></Button>
            </div>
          </div>))}</div>
      )}

      <Dialog open={create} onOpenChange={setCreate}><DialogContent>
        <DialogHeader><DialogTitle>New virtual card</DialogTitle><DialogDescription>Linked to one of your active accounts.</DialogDescription></DialogHeader>
        <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); createM.mutate(); }}>
          <Field label="Account" className="col-span-2"><Select value={cv.bank_account_id || active[0]?.id || ""} onChange={(e) => { const a = active.find((x) => x.id === e.target.value); setCv({ ...cv, bank_account_id: e.target.value, currency: a?.currency ?? cv.currency }); }}>{active.map((a) => <option key={a.id} value={a.id}>{a.account_name} · {a.currency}</option>)}</Select></Field>
          <Field label="Type"><Select value={cv.card_type} onChange={(e) => setCv({ ...cv, card_type: e.target.value })}><option value="debit">Debit</option><option value="credit">Credit</option></Select></Field>
          <Field label="Currency (must match account)"><Input value={active.find((a) => a.id === (cv.bank_account_id || active[0]?.id))?.currency ?? cv.currency} readOnly /></Field>
          <Field label="Daily limit"><Input type="number" min="1" value={cv.daily_limit} onChange={(e) => setCv({ ...cv, daily_limit: e.target.value })} required /></Field>
          <Field label="Monthly limit"><Input type="number" min="1" value={cv.monthly_limit} onChange={(e) => setCv({ ...cv, monthly_limit: e.target.value })} required /></Field>
          <Field label="Name on card" className="col-span-2"><Input maxLength={50} value={cv.name_on_card} onChange={(e) => setCv({ ...cv, name_on_card: e.target.value })} required /></Field>
          <Button className="col-span-2" disabled={createM.isPending}>{createM.isPending && <Loader2 className="animate-spin" />} Create card</Button>
        </form></DialogContent></Dialog>

      <Dialog open={!!topup} onOpenChange={(o) => !o && setTopup(null)}><DialogContent>
        <DialogHeader><DialogTitle>Top up card</DialogTitle><DialogDescription>Moves money from your account onto the card.</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); topM.mutate(); }}>
          <Field label="From account"><Select value={tu.account_number || active.find((a) => a.id === topup?.bank_account_id)?.account_number || ""} onChange={(e) => setTu({ ...tu, account_number: e.target.value })}>{active.filter((a) => a.currency === topup?.currency).map((a) => <option key={a.id} value={a.account_number!}>{a.account_name} · {formatMoney(a.balance, a.currency)}</option>)}</Select></Field>
          <Field label="Amount"><Input type="number" min="0.01" step="0.01" value={tu.amount} onChange={(e) => setTu({ ...tu, amount: e.target.value })} required /></Field>
          <Field label="Description"><Input value={tu.description} onChange={(e) => setTu({ ...tu, description: e.target.value })} required /></Field>
          <Button className="w-full" disabled={topM.isPending}>{topM.isPending && <Loader2 className="animate-spin" />} Top up</Button>
        </form></DialogContent></Dialog>

      <Dialog open={!!block} onOpenChange={(o) => !o && setBlock(null)}><DialogContent>
        <DialogHeader><DialogTitle>Block card</DialogTitle><DialogDescription>A blocked card cannot be used.</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); blockM.mutate(); }}>
          <Field label="Reason"><Select value={bk.block_reason} onChange={(e) => setBk({ ...bk, block_reason: e.target.value })}>{["lost", "stolen", "suspicious_activity", "customer_request"].map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}</Select></Field>
          <Field label="Details"><Input value={bk.block_reason_description} maxLength={250} onChange={(e) => setBk({ ...bk, block_reason_description: e.target.value })} required /></Field>
          <Button variant="destructive" className="w-full" disabled={blockM.isPending}>{blockM.isPending && <Loader2 className="animate-spin" />} Block card</Button>
        </form></DialogContent></Dialog>
    </>
  );
}
