export interface Tools { mailpit: string; grafana: string; prometheus: string; rabbitmq: string; flower: string; mlflow: string; redisUi: string; apiDocs: string }
declare global { interface Window { __APP_CONFIG__?: { tools?: Partial<Tools> } } }

const defaults: Tools = {
  mailpit: "http://localhost:8025", grafana: "http://localhost:3000", prometheus: "http://localhost:9090",
  rabbitmq: "http://localhost:15672", flower: "http://localhost:5555", mlflow: "http://localhost:4000",
  redisUi: "http://localhost:8081", apiDocs: "http://localhost:8000/api/v1/docs",
};
export const tools: Tools = { ...defaults, ...(window.__APP_CONFIG__?.tools ?? {}) };
