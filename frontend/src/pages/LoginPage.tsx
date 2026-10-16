import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ExternalLink, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/banking";
import { authApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tools } from "@/lib/config";

const QUESTIONS = [
  ["mother_maiden_name", "Mother's maiden name"], ["childhood_friend", "Name of a childhood friend"],
  ["favorite_color", "Favourite colour"], ["birth_city", "City where you were born"],
];

export default function LoginPage() {
  const { user, completeLogin } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [otp, setOtp] = useState("");
  const [tab, setTab] = useState("signin");
  const [reg, setReg] = useState({ email: "", username: "", first_name: "", last_name: "", id_no: "", security_question: "birth_city", security_answer: "", password: "", confirm_password: "" });
  const [registered, setRegistered] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }

  const requestOtp = (e: FormEvent) => { e.preventDefault(); run(async () => { await authApi.requestOtp(email, password); setStep("otp"); toast.success("Verification code sent"); }); };
  const verify = (e: FormEvent) => { e.preventDefault(); run(async () => { await completeLogin(email, otp); nav("/", { replace: true }); }); };
  const register = (e: FormEvent) => {
    e.preventDefault();
    run(async () => { await authApi.register({ ...reg, id_no: Number(reg.id_no) }); setRegistered(true); });
  };
  const setR = (k: keyof typeof reg) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setReg((r) => ({ ...r, [k]: e.target.value }));

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <aside className="guilloche relative hidden overflow-hidden bg-ink text-primary-foreground lg:block">
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-brass font-display text-xl font-bold text-ink">N</span>
            <span className="font-display text-xl font-semibold">NextGen Bank</span>
          </div>
          <div className="max-w-md">
            <h1 className="font-display text-5xl font-semibold leading-[1.05]">Banking that<br />shows its work.</h1>
            <p className="mt-5 text-lg text-primary-foreground/70">Every login is two-factor, every transfer is OTP-confirmed, and every payment is scored for fraud before it settles.</p>
            <ul className="mt-8 space-y-3 text-sm text-primary-foreground/85">
              <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-brass" /> AI fraud screening on every transfer</li>
              <li className="flex items-center gap-3"><KeyRound className="size-4 text-brass" /> Argon2-hashed credentials, httpOnly session cookies</li>
              <li className="flex items-center gap-3"><Mail className="size-4 text-brass" /> One-time codes by e-mail (Mailpit in this stack)</li>
            </ul>
          </div>
          <p className="text-xs text-primary-foreground/50">FastAPI · PostgreSQL + PgBouncer · Redis · RabbitMQ · OpenTelemetry</p>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 font-display text-xl font-semibold lg:hidden"><span className="grid size-9 place-items-center rounded-lg bg-ink text-brass">N</span> NextGen Bank</div>
          <h2 className="text-3xl font-semibold">{step === "otp" ? "Enter your code" : "Welcome back"}</h2>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{step === "otp" ? `We sent a 6-digit code to ${email}.` : "Sign in to manage your money."}</p>

          <Tabs value={tab} onValueChange={(v) => { setTab(v); setStep("credentials"); setRegistered(false); }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="register">Register</TabsTrigger><TabsTrigger value="forgot">Forgot</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {step === "credentials" ? (
                <form className="space-y-4" onSubmit={requestOtp}>
                  <Field label="Email" htmlFor="email"><Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
                  <Field label="Password" htmlFor="password"><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
                  <Button className="w-full" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Continue</Button>
                  <p className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">Demo administrator is pre-filled: <b>admin@example.com</b> / <b>password123</b>. Other demo users: executive@, teller@, manager@, alice@, bob@example.com (same password).</p>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={verify}>
                  <Field label="6-digit code" htmlFor="otp">
                    <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} autoFocus
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="h-14 text-center font-mono text-2xl tracking-[0.5em]" required />
                  </Field>
                  <Button className="w-full" size="lg" disabled={busy || otp.length !== 6}>{busy && <Loader2 className="animate-spin" />} Verify &amp; sign in</Button>
                  <a href={tools.mailpit} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                    <Mail className="size-4" /> Development: open Mailpit to read the code <ExternalLink className="size-3" />
                  </a>
                  <button type="button" className="w-full text-center text-sm text-muted-foreground underline" onClick={() => { setStep("credentials"); setOtp(""); }}>Use a different account</button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="register">
              {registered ? (
                <div className="space-y-3 rounded-lg border bg-card p-5 text-sm">
                  <p className="font-display text-lg font-semibold">Check your inbox</p>
                  <p className="text-muted-foreground">We sent an activation link to <b>{reg.email}</b>. Open it to activate your account, then sign in.</p>
                  <a href={tools.mailpit} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary underline">Open Mailpit <ExternalLink className="size-3" /></a>
                  <Button variant="outline" size="sm" onClick={() => run(async () => { await authApi.resendActivation(reg.email); toast.success("Activation e-mail re-sent"); })}>Resend e-mail</Button>
                </div>
              ) : (
                <form className="grid grid-cols-2 gap-3" onSubmit={register}>
                  <Field label="First name" className="col-span-1"><Input value={reg.first_name} onChange={setR("first_name")} maxLength={30} required /></Field>
                  <Field label="Last name" className="col-span-1"><Input value={reg.last_name} onChange={setR("last_name")} maxLength={30} required /></Field>
                  <Field label="Email" className="col-span-2"><Input type="email" value={reg.email} onChange={setR("email")} required /></Field>
                  <Field label="Username" hint="max 12 characters" className="col-span-1"><Input value={reg.username} onChange={setR("username")} maxLength={12} required /></Field>
                  <Field label="ID number" className="col-span-1"><Input type="number" min={1} value={reg.id_no} onChange={setR("id_no")} required /></Field>
                  <Field label="Security question" className="col-span-2"><Select value={reg.security_question} onChange={setR("security_question")}>{QUESTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
                  <Field label="Security answer" hint="Used to authorise transfers" className="col-span-2"><Input value={reg.security_answer} onChange={setR("security_answer")} maxLength={30} required /></Field>
                  <Field label="Password" className="col-span-1"><Input type="password" minLength={8} maxLength={40} value={reg.password} onChange={setR("password")} required /></Field>
                  <Field label="Confirm" className="col-span-1"><Input type="password" minLength={8} maxLength={40} value={reg.confirm_password} onChange={setR("confirm_password")} required /></Field>
                  <Button className="col-span-2" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Create account</Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="forgot">
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await authApi.requestReset(email); toast.success("If the account exists, a reset link was e-mailed"); }); }}>
                <Field label="Email" htmlFor="femail"><Input id="femail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
                <Button className="w-full" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Send reset link</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
