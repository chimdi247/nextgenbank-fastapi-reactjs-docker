import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Field, PageHeader } from "@/components/banking";
import { errorMessage, kinApi, profileApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { titleCase } from "@/lib/utils";

export const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Ethiopia", "Tanzania", "Uganda", "United States", "Canada", "United Kingdom", "Ireland", "Germany", "France", "Spain", "Italy", "Netherlands", "India", "China", "Japan", "Brazil", "Australia", "United Arab Emirates"];
const opts = (xs: string[]) => xs.map((x) => [x, titleCase(x)] as [string, string]);

type F = { key: string; label: string; type?: "text" | "date" | "number" | "tel" | "select"; options?: [string, string][]; hint?: string };
const SECTIONS: { title: string; fields: F[] }[] = [
  { title: "Personal", fields: [
    { key: "title", label: "Title", type: "select", options: opts(["Mr", "Mrs", "Miss"]) },
    { key: "gender", label: "Gender", type: "select", options: opts(["Male", "Female", "Other"]) },
    { key: "date_of_birth", label: "Date of birth", type: "date" },
    { key: "marital_status", label: "Marital status", type: "select", options: opts(["Single", "Married", "Divorced", "Widowed"]) },
    { key: "country_of_birth", label: "Country of birth", type: "select", options: COUNTRIES.map((c) => [c, c]) },
    { key: "place_of_birth", label: "Place of birth" },
    { key: "nationality", label: "Nationality" },
    { key: "phone_number", label: "Phone", type: "tel", hint: "International format, e.g. +2348031234567" },
  ]},
  { title: "Identification", fields: [
    { key: "means_of_identification", label: "ID type", type: "select", options: opts(["National_ID", "Passport", "Drivers_License"]) },
    { key: "passport_number", label: "ID / passport number" },
    { key: "id_issue_date", label: "Issued", type: "date" },
    { key: "id_expiry_date", label: "Expires", type: "date" },
  ]},
  { title: "Address", fields: [
    { key: "address", label: "Street address" }, { key: "city", label: "City" }, { key: "country", label: "Country" },
  ]},
  { title: "Employment", fields: [
    { key: "employment_status", label: "Status", type: "select", options: opts(["Employed", "Self_Employed", "Unemployed", "Student", "Retired"]) },
    { key: "employer_name", label: "Employer" }, { key: "employer_address", label: "Employer address" }, { key: "employer_city", label: "Employer city" },
    { key: "employer_country", label: "Employer country", type: "select", options: COUNTRIES.map((c) => [c, c]) },
    { key: "annual_income", label: "Annual income", type: "number" },
    { key: "date_of_employment", label: "Employed since", type: "date" },
  ]},
];

const KIN_EMPTY = { full_name: "", relationship: "Spouse", email: "", phone_number: "", address: "", city: "", country: "Nigeria", nationality: "", is_primary: true };

function KinDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, any>>(KIN_EMPTY);
  const m = useMutation({
    mutationFn: () => kinApi.create(v),
    onSuccess: () => { toast.success("Next of kin saved"); qc.invalidateQueries({ queryKey: ["kin"] }); setOpen(false); setV(KIN_EMPTY); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus /> Add next of kin</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Next of kin</DialogTitle><DialogDescription>Required before an account can be opened.</DialogDescription></DialogHeader>
        <form className="grid grid-cols-2 gap-3" onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Full name" className="col-span-2"><Input value={v.full_name} onChange={set("full_name")} minLength={2} required /></Field>
          <Field label="Relationship"><Select value={v.relationship} onChange={set("relationship")}>{["Spouse", "Parent", "Child", "Sibling", "Other"].map((r) => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Phone"><Input type="tel" value={v.phone_number} onChange={set("phone_number")} placeholder="+2348031234567" required /></Field>
          <Field label="Email" className="col-span-2"><Input type="email" value={v.email} onChange={set("email")} required /></Field>
          <Field label="Address" className="col-span-2"><Input value={v.address} onChange={set("address")} required /></Field>
          <Field label="City"><Input value={v.city} onChange={set("city")} required /></Field>
          <Field label="Country"><Select value={v.country} onChange={set("country")}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Nationality" className="col-span-2"><Input value={v.nationality} onChange={set("nationality")} required /></Field>
          <Button className="col-span-2" disabled={m.isPending}>{m.isPending && <Loader2 className="animate-spin" />} Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const qc = useQueryClient();
  const kin = useQuery({ queryKey: ["kin"], queryFn: kinApi.list, enabled: user!.role === "customer" });
  const [form, setForm] = useState<Record<string, any>>({});
  const exists = !!user!.profile;
  useEffect(() => { if (user!.profile) setForm({ ...user!.profile }); }, [user]);

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, annual_income: Number(form.annual_income || 0) };
      return exists ? profileApi.update(body) : profileApi.create(body);
    },
    onSuccess: async () => { toast.success(exists ? "Profile updated" : "Profile created"); await refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({ mutationFn: (id: string) => kinApi.remove(id), onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["kin"] }); }, onError: (e) => toast.error(errorMessage(e)) });

  const customer = user!.role === "customer";
  return (
    <>
      <PageHeader title="Profile" description={`${user!.first_name} ${user!.last_name} · ${user!.email} · ${titleCase(user!.role)}`} />
      {customer ? (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          {SECTIONS.map((s) => (
            <Card key={s.title}>
              <CardHeader><CardTitle>{s.title}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.fields.map((f) => (
                  <Field key={f.key} label={f.label} hint={f.hint}>
                    {f.type === "select" ? (
                      <Select value={form[f.key] ?? ""} onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} required>
                        <option value="" disabled>Select…</option>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                    ) : (
                      <Input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} required />
                    )}
                  </Field>
                ))}
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end"><Button size="lg" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} {exists ? "Save changes" : "Create profile"}</Button></div>
        </form>
      ) : (
        <Card><CardContent className="grid gap-3 p-5 text-sm sm:grid-cols-2">
          {[["Username", user!.username], ["Email", user!.email], ["Role", titleCase(user!.role)], ["ID number", user!.id_no]].map(([k, v]) => <div key={k}><p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>)}
        </CardContent></Card>
      )}

      {customer && (
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between space-y-0"><div className="space-y-1"><CardTitle>Next of kin</CardTitle><CardDescription>Needed for KYC.</CardDescription></div><KinDialog /></CardHeader>
          <CardContent>
            {!kin.data?.length ? <EmptyState title="No next of kin yet" /> : (
              <ul className="divide-y">{kin.data.map((k) => (
                <li key={k.id} className="flex items-center gap-3 py-3"><div className="flex-1"><p className="font-semibold">{k.full_name} <span className="text-xs font-normal text-muted-foreground">· {k.relationship}</span></p><p className="text-sm text-muted-foreground">{k.email} · {k.phone_number}</p></div>
                  <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => del.mutate(k.id)}><Trash2 /></Button></li>))}</ul>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
