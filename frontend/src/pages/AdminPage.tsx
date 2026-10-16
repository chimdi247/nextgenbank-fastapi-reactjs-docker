import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Spinner } from "@/components/banking";
import { errorMessage, isAdmin, mlApi, profileApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, titleCase } from "@/lib/utils";

function Customers() {
  const [skip, setSkip] = useState(0);
  const q = useQuery({ queryKey: ["profiles", skip], queryFn: () => profileApi.all(skip, 20), placeholderData: (p) => p });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <EmptyState title="Could not load customers" text={errorMessage(q.error)} />;
  const rows = q.data?.profiles ?? [];
  return (
    <Card><CardContent className="p-0">
      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Phone</TableHead><TableHead>Country</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((p) => (<TableRow key={p.email}><TableCell className="font-semibold">{p.first_name} {p.last_name}</TableCell><TableCell>{p.email}</TableCell><TableCell>{titleCase(p.role)}</TableCell><TableCell>{p.profile?.phone_number ?? "–"}</TableCell><TableCell>{p.profile?.country ?? "–"}</TableCell></TableRow>))}</TableBody></Table>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground"><span>{q.data?.total ?? 0} profiles</span>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 20))}>Previous</Button><Button size="sm" variant="outline" disabled={skip + 20 >= (q.data?.total ?? 0)} onClick={() => setSkip(skip + 20)}>Next</Button></div></div>
    </CardContent></Card>
  );
}

function FraudModel() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["ml", "status"], queryFn: mlApi.status });
  const models = useQuery({ queryKey: ["ml", "models"], queryFn: mlApi.models });
  const onErr = (e: unknown) => toast.error(errorMessage(e));
  const train = useMutation({ mutationFn: mlApi.trainDefault, onSuccess: () => { toast.success("Training started in the background (Celery). Refresh in a minute."); qc.invalidateQueries({ queryKey: ["ml"] }); }, onError: onErr });
  const deploy = useMutation({ mutationFn: mlApi.autoDeploy, onSuccess: () => { toast.success("Auto-deploy of the best model queued"); qc.invalidateQueries({ queryKey: ["ml"] }); }, onError: onErr });
  const list: any[] = Array.isArray(models.data) ? models.data : models.data?.models ?? [];
  return (
    <div className="space-y-6">
      <Card><CardHeader className="flex-row items-start justify-between space-y-0"><div className="space-y-1"><CardTitle className="flex items-center gap-2"><Brain className="size-5 text-primary" /> Fraud detection model</CardTitle><CardDescription>Scores every deposit, withdrawal and transfer. Without a deployed model the rule-based analyser is used.</CardDescription></div>
        <div className="flex gap-2"><Button onClick={() => train.mutate()} disabled={train.isPending}>{train.isPending && <Loader2 className="animate-spin" />} Train model</Button><Button variant="outline" onClick={() => deploy.mutate()} disabled={deploy.isPending}><Rocket /> Auto-deploy best</Button></div></CardHeader>
        <CardContent>{status.isLoading ? <Spinner /> : <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(status.data, null, 2)}</pre>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Models</CardTitle></CardHeader><CardContent className="p-0">{models.isLoading ? <Spinner /> : !list.length ? <div className="p-5"><EmptyState title="No models trained yet" text="Train the default model to get started." /></div> : (
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>AUC</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
          <TableBody>{list.map((m, i) => (<TableRow key={m.id ?? i}><TableCell className="font-semibold">{m.name}</TableCell><TableCell>{m.version}</TableCell><TableCell>{titleCase(String(m.status ?? ""))}</TableCell><TableCell className="num">{m.auc_score != null ? Number(m.auc_score).toFixed(3) : "–"}</TableCell><TableCell className="text-muted-foreground">{formatDate(m.created_at)}</TableCell></TableRow>))}</TableBody></Table>)}</CardContent></Card>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title={isAdmin(user!.role) ? "Customers & fraud model" : "Customers"} description="Customer profiles and machine-learning operations." />
      <Tabs defaultValue="customers">
        <TabsList><TabsTrigger value="customers">Customers</TabsTrigger>{isAdmin(user!.role) && <TabsTrigger value="ml">Fraud model</TabsTrigger>}</TabsList>
        <TabsContent value="customers"><Customers /></TabsContent>
        {isAdmin(user!.role) && <TabsContent value="ml"><FraudModel /></TabsContent>}
      </Tabs>
    </>
  );
}
