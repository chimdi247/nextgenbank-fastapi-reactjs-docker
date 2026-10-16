import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/banking";
import { authApi, errorMessage } from "@/lib/api";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-full place-items-center p-6"><div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">{children}</div></div>;
}

export function ActivatePage() {
  const { token = "" } = useParams();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [msg, setMsg] = useState("");
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return; // the token is single-use: StrictMode must not call it twice
    once.current = true;
    authApi.activate(token).then((r) => { setMsg(r?.message ?? "Account activated"); setState("ok"); }).catch((e) => { setMsg(errorMessage(e)); setState("error"); });
  }, [token]);
  return (
    <Shell>
      <div className="space-y-3 text-center">
        {state === "working" && <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />}
        {state === "ok" && <CheckCircle2 className="mx-auto size-10 text-success" />}
        {state === "error" && <XCircle className="mx-auto size-10 text-destructive" />}
        <h1 className="text-2xl font-semibold">{state === "ok" ? "Account activated" : state === "error" ? "Activation failed" : "Activating…"}</h1>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <Button asChild className="w-full"><Link to="/login">Go to sign in</Link></Button>
      </div>
    </Shell>
  );
}

export function ResetPasswordPage() {
  const { token = "" } = useParams();
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await authApi.reset(token, pw, pw2); setDone(true); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Shell>
      {done ? (
        <div className="space-y-3 text-center"><CheckCircle2 className="mx-auto size-10 text-success" /><h1 className="text-2xl font-semibold">Password updated</h1>
          <Button asChild className="w-full"><Link to="/login">Sign in</Link></Button></div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
          <Field label="New password"><Input type="password" minLength={8} maxLength={40} value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
          <Field label="Confirm password"><Input type="password" minLength={8} maxLength={40} value={pw2} onChange={(e) => setPw2(e.target.value)} required /></Field>
          <Button className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Update password</Button>
        </form>
      )}
    </Shell>
  );
}
