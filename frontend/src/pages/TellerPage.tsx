import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, PageHeader, Spinner } from "@/components/banking";
import { accountApi, errorMessage } from "@/lib/api";
import { formatMoney, groupAccountNumber } from "@/lib/utils";

export default function TellerPage() {
  const qc = useQueryClient();
  const accounts = useQuery({ queryKey: ["accounts", "active"], queryFn: () => accountApi.list("active") });
  const [id, setId] = useState(""); const [amount, setAmount] = useState(""); const [desc, setDesc] = useState("");
  const selected = accounts.data?.find((a) => a.id === (id || accounts.data?.[0]?.id));
  const done = (m: string) => { toast.success(m); setAmount(""); setDesc(""); qc.invalidateQueries({ queryKey: ["accounts"] }); };

  const deposit = useMutation({ mutationFn: () => accountApi.deposit({ account_id: selected!.id, amount: Number(amount), description: desc }), onSuccess: () => done("Deposit completed"), onError: (e) => toast.error(errorMessage(e)) });
  const withdraw = useMutation({
    mutationFn: () => accountApi.withdraw({ account_number: selected!.account_number!, amount: Number(amount), username: selected!.owner_username ?? "", description: desc }),
    onSuccess: () => done("Withdrawal completed"), onError: (e) => toast.error(errorMessage(e)),
  });

  if (accounts.isLoading) return <Spinner />;
  const picker = (
    <>
      <Field label="Customer account"><Select value={selected?.id ?? ""} onChange={(e) => setId(e.target.value)}>
        {(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.owner_name} · {groupAccountNumber(a.account_number)} · {a.currency}</option>)}</Select></Field>
      {selected && <p className="rounded-md bg-muted px-3 py-2 text-sm">Current balance <b className="num">{formatMoney(selected.balance, selected.currency)}</b> · username <b>{selected.owner_username}</b></p>}
    </>
  );
  const row = (label: string, onSubmit: () => void, pending: boolean, variant: "default" | "destructive" = "default") => (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      {picker}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount"><Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        <Field label="Description"><Input value={desc} maxLength={250} onChange={(e) => setDesc(e.target.value)} required /></Field>
      </div>
      <Button variant={variant} size="lg" className="w-full" disabled={pending || !selected}>{pending && <Loader2 className="animate-spin" />} {label}</Button>
    </form>
  );
  return (
    <>
      <PageHeader title="Teller desk" description="Cash deposits and withdrawals over the counter. Large amounts are scored by the fraud model." />
      <Card className="mx-auto max-w-xl"><CardHeader><CardTitle>Counter transaction</CardTitle><CardDescription>Only active accounts are listed.</CardDescription></CardHeader><CardContent>
        <Tabs defaultValue="deposit"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="deposit">Deposit</TabsTrigger><TabsTrigger value="withdraw">Withdraw</TabsTrigger></TabsList>
          <TabsContent value="deposit">{row("Deposit cash", () => deposit.mutate(), deposit.isPending)}</TabsContent>
          <TabsContent value="withdraw">{row("Pay out cash", () => withdraw.mutate(), withdraw.isPending, "destructive")}</TabsContent>
        </Tabs></CardContent></Card>
    </>
  );
}
