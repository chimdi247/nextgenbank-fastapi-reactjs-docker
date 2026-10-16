import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { uuid } from "./utils";

/** The API authenticates with httpOnly cookies set by /auth/login/verify-otp. */
export const api = axios.create({ baseURL: "/api/v1", withCredentials: true, timeout: 60000 });

let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? "";
    const isAuthCall = url.includes("/auth/");
    if (err.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshing ??= api.post("/auth/refresh").then(() => undefined).finally(() => { refreshing = null; });
        await refreshing;
        return api(original);
      } catch {
        window.dispatchEvent(new Event("nextgen:unauthorized"));
      }
    }
    return Promise.reject(err);
  },
);

/** FastAPI errors come as {detail: {status, message, action}} | {detail: "text"} | {detail: [{loc, msg}]} */
export function errorMessage(e: unknown): string {
  const err = e as AxiosError<any>;
  const d = err.response?.data?.detail ?? err.response?.data;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => `${(x.loc ?? []).slice(1).join(".") || "field"}: ${x.msg}`).join("; ");
  if (d?.message) return d.action ? `${d.message}. ${d.action}` : d.message;
  if (err.code === "ECONNABORTED") return "The request timed out";
  if (err.response?.status === 429) return "Too many requests - please slow down";
  return err.message || "Something went wrong";
}

export type Role = "customer" | "account_executive" | "branch_manager" | "admin" | "super_admin" | "teller";

export interface Profile {
  title: string; gender: string; date_of_birth: string; country_of_birth: string; place_of_birth: string;
  marital_status: string; means_of_identification: string; id_issue_date: string; id_expiry_date: string;
  passport_number: string; nationality: string; phone_number: string; address: string; city: string; country: string;
  employment_status: string; employer_name: string; employer_address: string; employer_city: string;
  employer_country: string; annual_income: number; date_of_employment: string;
}
export interface Me {
  username: string; first_name: string; middle_name: string; last_name: string; email: string; id_no: string;
  role: Role; profile: Profile | null;
}
export interface Account {
  id: string; user_id: string; account_type: string; currency: string; account_status: string; account_number: string | null;
  account_name: string; balance: number; is_primary: boolean; kyc_verified: boolean; interest_rate: number;
  created_at: string; updated_at: string; owner_name?: string | null; owner_email?: string | null; owner_username?: string | null;
}
export interface Txn {
  id: string; reference: string; amount: string; description: string; transaction_type: string;
  transaction_category: "credit" | "debit"; transaction_status: string; created_at: string; completed_at?: string | null;
  balance_after: string; currency?: string | null; counterparty_name?: string | null; counterparty_account?: string | null;
}
export interface Card {
  id: string; bank_account_id: string; card_type: string; card_brand: string; currency: string; card_status: string;
  name_on_card: string; masked_card_number: string; expiry_date: string; available_balance: number; daily_limit: number;
  monthly_limit: number; total_spend_today: number; total_spent_this_month: number; is_active: boolean; created_at: string;
  owner_name?: string | null; owner_email?: string | null;
}
export interface NextOfKin {
  id: string; full_name: string; relationship: string; email: string; phone_number: string; address: string;
  city: string; country: string; nationality: string; is_primary: boolean;
}
export interface Flagged {
  id: string; reference: string; amount: string; description: string; created_at: string; risk_score: number;
  risk_factors: Record<string, unknown>; model_version: string; sender_name?: string | null; sender_email?: string | null;
}

const idem = () => ({ headers: { "Idempotency-Key": uuid() } });

export const authApi = {
  register: (b: Record<string, unknown>) => api.post("/auth/register", b).then((r) => r.data),
  resendActivation: (email: string) => api.post("/auth/resend-activation-link", { email }).then((r) => r.data),
  activate: (token: string) => api.get(`/auth/activate/${token}`, { headers: { Accept: "application/json" } }).then((r) => r.data),
  requestOtp: (email: string, password: string) => api.post("/auth/login/request-otp", { email, password }).then((r) => r.data),
  verifyOtp: (email: string, otp: string) => api.post("/auth/login/verify-otp", { email, otp }).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  requestReset: (email: string) => api.post("/auth/request-password-reset", { email }).then((r) => r.data),
  reset: (token: string, new_password: string, confirm_password: string) =>
    api.post(`/auth/reset-password/${token}`, { new_password, confirm_password }, { headers: { Accept: "application/json" } }).then((r) => r.data),
};

export const profileApi = {
  me: () => api.get<Me>("/profile/me").then((r) => r.data),
  create: (b: Record<string, unknown>) => api.post("/profile/create", b).then((r) => r.data),
  update: (b: Record<string, unknown>) => api.patch("/profile/update", b).then((r) => r.data),
  all: (skip = 0, limit = 50) =>
    api.get<{ profiles: (Omit<Me, "profile"> & { profile: Profile | null })[]; total: number }>("/profile/all", { params: { skip, limit } }).then((r) => r.data),
};

export const kinApi = {
  list: () => api.get<NextOfKin[] | { items: NextOfKin[] }>("/next-of-kin/all").then((r) => (Array.isArray(r.data) ? r.data : r.data.items ?? [])),
  create: (b: Record<string, unknown>) => api.post("/next-of-kin/create", b).then((r) => r.data),
  remove: (id: string) => api.delete(`/next-of-kin/${id}`).then((r) => r.data),
};

export const accountApi = {
  list: (status?: string) => api.get<{ items: Account[]; total: number }>("/bank-account/all", { params: status ? { status } : {} }).then((r) => r.data.items),
  create: (b: { account_type: string; currency: string; account_name: string }) => api.post("/bank-account/create", b).then((r) => r.data),
  activate: (id: string) => api.patch(`/bank-account/${id}/activate`).then((r) => r.data),
  deposit: (b: { account_id: string; amount: number; description: string }) => api.post("/bank-account/deposit", b, idem()).then((r) => r.data),
  withdraw: (b: { account_number: string; amount: number; username: string; description: string }) => api.post("/bank-account/withdraw", b, idem()).then((r) => r.data),
  initiateTransfer: (b: Record<string, unknown>) => api.post("/bank-account/transfer/initiate", b, idem()).then((r) => r.data),
  completeTransfer: (b: { transfer_reference: string; otp: string }) => api.post("/bank-account/transfer/complete", b, idem()).then((r) => r.data),
  generateStatement: (b: { start_date: string; end_date: string; account_number?: string }) => api.post("/bank-account/statement/generate", b).then((r) => r.data),
  statementBlob: (id: string) => api.get(`/bank-account/statement/${id}`, { responseType: "blob" }),
};

export const txnApi = {
  history: (params: Record<string, unknown>) =>
    api.get<{ total: number; skip: number; limit: number; transactions: Txn[] }>("/transactions/history", { params }).then((r) => r.data),
  flagged: () => api.get<{ items: Flagged[] }>("/transaction/flagged").then((r) => r.data.items),
  review: (id: string, b: { is_fraud: boolean; notes?: string; approve_transaction: boolean }) => api.post(`/transaction/${id}/review`, b).then((r) => r.data),
  riskHistory: (params: Record<string, unknown>) => api.get("/transaction/risk-history", { params }).then((r) => r.data),
};

export const cardApi = {
  list: (status?: string) => api.get<{ items: Card[] }>("/virtual-card/all", { params: status ? { status } : {} }).then((r) => r.data.items),
  create: (b: Record<string, unknown>) => api.post("/virtual-card/create", b).then((r) => r.data),
  activate: (id: string) => api.patch(`/virtual-card/${id}/activate`).then((r) => r.data),
  block: (id: string, b: { block_reason: string; block_reason_description: string }) => api.post(`/virtual-card/${id}/block`, b).then((r) => r.data),
  remove: (id: string) => api.delete(`/virtual-card/${id}`).then((r) => r.data),
  topUp: (id: string, b: { account_number: string; amount: number; description: string }) => api.post(`/virtual-card/${id}/top-up`, b, idem()).then((r) => r.data),
};

export const mlApi = {
  status: () => api.get("/ml/status").then((r) => r.data),
  models: () => api.get("/ml/models", { params: { limit: 20 } }).then((r) => r.data),
  trainDefault: () => api.post("/ml/train/default").then((r) => r.data),
  autoDeploy: () => api.post("/ml/auto-deploy", null, { params: { performance_threshold: 0.7 } }).then((r) => r.data),
};

export const STAFF: Role[] = ["teller", "account_executive", "branch_manager", "admin", "super_admin"];
export const isAdmin = (r?: Role) => r === "admin" || r === "super_admin";
