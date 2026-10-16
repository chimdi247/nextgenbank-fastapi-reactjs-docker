import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Field, PageHeader, Spinner } from "@/components/banking";
import { accountApi, errorMessage } from "@/lib/api";
import { tools } from "@/lib/config";
import { formatMoney, groupAccountNumber } from "@/lib/utils";

export default function TransferPage() {
  const qc = useQueryClient();
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => accountApi.list() });
  const active = (accounts.data ?? []).filter((a) => a.account_status === "active");
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [f, setF] = useState({ sender_account_id: "", receiver_account_number: "", amount: "", description: "", security_answer: "" });
  const [ref, setRef] = useState("");
  const [otp, setOtp] = useState("");
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const sender = active.find((a) => a.id === (f.sender_account_id || active[0]?.id));

  const initiate = useMutation({
    mutationFn: () => accountApi.initiateTransfer({ ...f, sender_account_id: sender!.id, amount: Number(f.amount) }),
    onSuccess: (r) => { setRef(r?.data?.reference ?? ""); setStep("otp"); toast.success("Check your e-mail for the confirmation code"); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const complete = useMutation({
    mutationFn: () => accountApi.completeTransfer({ transfer_reference: ref, otp }),
    onSuccess: (r) => { setResult(r?.data ?? {}); setStep("done"); qc.invalidateQueries(); toast.success("Transfer completed"); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const reset = () => { setStep("form"); setOtp(""); setRef(""); setF({ sender_account_id: "", receiver_account_number: "", amount: "", description: "", security_answer: "" }); };

  if (accounts.isLoading) return <Spinner />;
  if (!active.length) return <><PageHeader title="Send money" /><EmptyState title="You need an active account" text="Open an account and wait for activation by an account executive." /></>;

  return (
    <>
      <PageHeader title="Send money" description="Every transfer is screened for fraud and confirmed with a one-time code." />
      <div className="mx-auto max-w-xl">
        {step === "form" && (
          <Card><CardHeader><CardTitle>Transfer details</CardTitle></CardHeader><CardContent>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); initiate.mutate(); }}>
              <Field label="From" hint={sender ? `Available: ${formatMoney(sender.balance, sender.currency)}` : undefined}>
                <Select value={sender?.id ?? ""} onChange={(e) => setF({ ...f, sender_account_id: e.target.value })}>
                  {active.map((a) => <option key={a.id} value={a.id}>{a.account_name} · {groupAccountNumber(a.account_number)} · {a.currency}</option>)}
                </Select></Field>
              <Field label="Recipient account number" hint="16 digits"><Input className="font-mono" inputMode="numeric" minLength={16} maxLength={16} value={f.receiver_account_number} onChange={(e) => setF({ ...f, receiver_account_number: e.target.value.replace(/\D/g, "") })} required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Amount (${sender?.currency ?? ""})`}><Input type="number" min="0.01" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
                <Field label="Security answer" hint="From registration"><Input type="password" value={f.security_answer} onChange={(e) => setF({ ...f, security_answer: e.target.value })} required /></Field>
              </div>
              <Field label="Description"><Input value={f.description} maxLength={250} onChange={(e) => setF({ ...f, description: e.target.value })} required /></Field>
              <Button className="w-full" size="lg" disabled={initiate.isPending}>{initiate.isPending && <Loader2 className="animate-spin" />} Continue</Button>
            </form></CardContent></Card>
        )}
        {step === "otp" && (
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Confirm transfer</CardTitle><CardDescription>Reference <span className="font-mono">{ref}</span></CardDescription></CardHeader><CardContent>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); complete.mutate(); }}>
              <Field label="6-digit code sent to your e-mail"><Input inputMode="numeric" maxLength={6} autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="h-14 text-center font-mono text-2xl tracking-[0.5em]" required /></Field>
              <Button className="w-full" size="lg" disabled={complete.isPending || otp.length !== 6}>{complete.isPending && <Loader2 className="animate-spin" />} Confirm &amp; send</Button>
              <a href={tools.mailpit} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm text-muted-foreground underline"><Mail className="size-4" /> Development: open Mailpit</a>
              <button type="button" onClick={reset} className="w-full text-center text-sm text-muted-foreground underline">Cancel</button>
            </form></CardContent></Card>
        )}
        {step === "done" && (
          <Card><CardContent className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" /><h2 className="text-2xl font-semibold">Transfer complete</h2>
            <dl className="mx-auto grid max-w-xs grid-cols-2 gap-2 text-left text-sm">{Object.entries(result ?? {}).slice(0, 6).map(([k, v]) => (<div key={k} className="contents"><dt className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</dt><dd className="font-semibold">{String(v)}</dd></div>))}</dl>
            <Button onClick={reset}>Send another</Button></CardContent></Card>
        )}
      </div>
    </>
  );
}
