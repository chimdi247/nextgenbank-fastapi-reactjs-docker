import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/banking";
import { tools } from "@/lib/config";

const GROUPS: { title: string; items: { name: string; desc: string; href: string }[] }[] = [
  { title: "Observability (Grafana)", items: [
    { name: "Grafana", desc: "Dashboards, logs → traces, alerts. Login admin / admin.", href: tools.grafana },
    { name: "Service overview", desc: "Uptime, latency, SLI/SLO, error rates, containers, business KPIs.", href: `${tools.grafana}/d/nextgen-overview` },
    { name: "PostgreSQL", desc: "Replication lag, TPS, connections, active sessions.", href: `${tools.grafana}/d/nextgen-postgres` },
    { name: "PgBouncer", desc: "Client / server connections, waiting clients, pool usage.", href: `${tools.grafana}/d/nextgen-pgbouncer` },
    { name: "Redis", desc: "Clients, hit ratio, throughput, memory.", href: `${tools.grafana}/d/nextgen-redis` },
    { name: "RabbitMQ", desc: "Queue depth, publish / ack rates, unacked messages.", href: `${tools.grafana}/d/nextgen-rabbitmq` },
    { name: "Alert rules", desc: "Grafana-managed alerts: CPU / memory > 40 %.", href: `${tools.grafana}/alerting/list` },
    { name: "Prometheus", desc: "Raw metrics and targets.", href: tools.prometheus },
  ]},
  { title: "Infrastructure", items: [
    { name: "Mailpit", desc: "Every e-mail the bank sends: OTP codes, activation, alerts.", href: tools.mailpit },
    { name: "RabbitMQ management", desc: "Queues, exchanges, consumers (guest / guest).", href: tools.rabbitmq },
    { name: "Flower", desc: "Celery tasks and workers (admin / admin).", href: tools.flower },
    { name: "MLflow", desc: "Fraud model experiments and registry.", href: tools.mlflow },
    { name: "Redis UI", desc: "Browse Redis keys.", href: tools.redisUi },
    { name: "API docs", desc: "OpenAPI / Swagger.", href: tools.apiDocs },
  ]},
];

export default function PlatformPage() {
  return (
    <>
      <PageHeader title="Platform" description="Jump to the tooling that runs the bank." />
      <div className="space-y-8">{GROUPS.map((g) => (
        <section key={g.title}><h2 className="mb-3 text-xl font-semibold">{g.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{g.items.map((i) => (
            <a key={i.name} href={i.href} target="_blank" rel="noreferrer" className="group block focus-visible:outline-none">
              <Card className="h-full transition-colors group-hover:border-brass group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-base">{i.name}<ExternalLink className="size-4 text-muted-foreground" /></CardTitle></CardHeader>
                <CardContent><CardDescription>{i.desc}</CardDescription></CardContent></Card></a>))}</div></section>))}</div>
    </>
  );
}
