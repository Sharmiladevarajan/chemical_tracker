/**
 * REST client for the FastAPI backend (PostgreSQL).
 * Set VITE_API_URL in .env (e.g. http://127.0.0.1:8000)
 */

const baseUrl = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail ?? j);
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- Raw API shapes (snake_case from backend) ---

interface RawChemical {
  id: string;
  name: string;
  unit: string;
  default_can_size: number | string | null;
}

interface RawCustomer {
  id: string;
  name: string;
  contact: string | null;
  balance: number | string;
}

interface RawPurchaseItem {
  id: string;
  chemical_id: string;
  amount: number | string;
  rate: number | string;
  unit: string;
  can_size: number | string | null;
  subtotal: number | string;
}

interface RawPurchase {
  id: string;
  occurred_at: string;
  expense_food: number | string;
  expense_auto: number | string;
  expense_labour: number | string;
  total_cost: number | string;
  items: RawPurchaseItem[];
}

interface RawSaleItem {
  id: string;
  chemical_id: string;
  quantity: number | string;
  rate: number | string;
  unit: string;
  can_size: number | string | null;
  subtotal: number | string;
}

interface RawSale {
  id: string;
  occurred_at: string;
  customer_id: string;
  total: number | string;
  paid: boolean;
  expense_food?: number | string;
  expense_auto?: number | string;
  expense_labour?: number | string;
  items: RawSaleItem[];
}

interface RawLedger {
  id: string;
  customer_id: string;
  entry_type: 'credit' | 'debit';
  amount: number | string;
  occurred_at: string;
  balance_after: number | string;
  comment: string | null;
}

// --- Normalized types (match App.tsx) ---

export interface ChemicalRow {
  id: string;
  name: string;
  unit: 'liter' | 'kg' | 'cane';
  defaultCanSize?: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  contact: string;
  balance: number;
}

export interface PurchaseItemRow {
  chemicalId: string;
  amount: number;
  rate: number;
  unit: string;
  canSize?: number;
  subtotal: number;
}

export interface PurchaseRow {
  id: string;
  date: Date;
  items: PurchaseItemRow[];
  expenses: { food: number; auto: number; labour: number };
  totalCost: number;
}

export interface SaleItemRow {
  chemicalId: string;
  quantity: number;
  rate: number;
  unit: string;
  canSize?: number;
  subtotal: number;
}

export interface SaleRow {
  id: string;
  date: Date;
  customerId: string;
  items: SaleItemRow[];
  total: number;
  paid: boolean;
  expenses: { food: number; auto: number; labour: number };
}

export interface TransactionRow {
  id: string;
  customerId: string;
  type: 'credit' | 'debit';
  amount: number;
  date: Date;
  balanceAfter: number;
  comment?: string;
}

function num(v: number | string): number {
  return typeof v === 'number' ? v : parseFloat(v);
}

function mapChemical(c: RawChemical): ChemicalRow {
  return {
    id: c.id,
    name: c.name,
    unit: c.unit as ChemicalRow['unit'],
    defaultCanSize: c.default_can_size != null ? num(c.default_can_size as number | string) : undefined,
  };
}

function mapCustomer(c: RawCustomer): CustomerRow {
  return {
    id: c.id,
    name: c.name,
    contact: c.contact ?? '',
    balance: num(c.balance),
  };
}

function mapPurchase(p: RawPurchase): PurchaseRow {
  return {
    id: p.id,
    date: new Date(p.occurred_at),
    items: p.items.map((i) => ({
      chemicalId: i.chemical_id,
      amount: num(i.amount),
      rate: num(i.rate),
      unit: i.unit,
      canSize: i.can_size != null ? num(i.can_size) : undefined,
      subtotal: num(i.subtotal),
    })),
    expenses: {
      food: num(p.expense_food),
      auto: num(p.expense_auto),
      labour: num(p.expense_labour),
    },
    totalCost: num(p.total_cost),
  };
}

function mapSale(s: RawSale): SaleRow {
  return {
    id: s.id,
    date: new Date(s.occurred_at),
    customerId: s.customer_id,
    items: s.items.map((i) => ({
      chemicalId: i.chemical_id,
      quantity: num(i.quantity),
      rate: num(i.rate),
      unit: i.unit,
      canSize: i.can_size != null ? num(i.can_size) : undefined,
      subtotal: num(i.subtotal),
    })),
    total: num(s.total),
    paid: s.paid,
    expenses: {
      food: num(s.expense_food ?? 0),
      auto: num(s.expense_auto ?? 0),
      labour: num(s.expense_labour ?? 0),
    },
  };
}

function mapLedger(t: RawLedger): TransactionRow {
  return {
    id: t.id,
    customerId: t.customer_id,
    type: t.entry_type,
    amount: num(t.amount),
    date: new Date(t.occurred_at),
    balanceAfter: num(t.balance_after),
    comment: t.comment ?? undefined,
  };
}

export async function fetchChemicals(): Promise<ChemicalRow[]> {
  const raw = await apiFetch<RawChemical[]>('/api/chemicals');
  return raw.map(mapChemical);
}

export async function createChemical(payload: {
  name: string;
  unit: string;
  default_can_size?: number | null;
}): Promise<ChemicalRow> {
  const raw = await apiFetch<RawChemical>('/api/chemicals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapChemical(raw);
}

export async function deleteChemical(id: string): Promise<void> {
  await apiFetch<void>(`/api/chemicals/${id}`, { method: 'DELETE' });
}

export async function fetchCustomers(): Promise<CustomerRow[]> {
  const raw = await apiFetch<RawCustomer[]>('/api/customers');
  return raw.map(mapCustomer);
}

export async function createCustomer(payload: { name: string; contact: string }): Promise<CustomerRow> {
  const raw = await apiFetch<RawCustomer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapCustomer(raw);
}

export async function updateCustomer(
  id: string,
  payload: { name: string; contact: string }
): Promise<CustomerRow> {
  const raw = await apiFetch<RawCustomer>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapCustomer(raw);
}

export interface CustomerProfitLine {
  saleId: string;
  occurredAt: Date;
  chemicalId: string;
  chemicalName: string;
  quantity: number;
  unit: string;
  saleRate: number;
  purchaseRate: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  saleExpenses: number;
  netProfit: number;
}

export interface SaleExpenseSummary {
  saleId: string;
  occurredAt: Date;
  saleTotal: number;
  expenseFood: number;
  expenseAuto: number;
  expenseLabour: number;
  expenseTotal: number;
}

export interface CustomerProfitReport {
  customerId: string;
  customerName: string;
  revenue: number;
  costOfGoods: number;
  saleExpenses: number;
  profit: number;
  sales: SaleExpenseSummary[];
  lines: CustomerProfitLine[];
}

interface RawCustomerProfitLine {
  sale_id: string;
  occurred_at: string;
  chemical_id: string;
  chemical_name: string;
  quantity: number | string;
  unit: string;
  sale_rate: number | string;
  purchase_rate: number | string;
  revenue: number | string;
  cost: number | string;
  gross_profit: number | string;
  sale_expenses: number | string;
  net_profit: number | string;
}

interface RawSaleExpenseSummary {
  sale_id: string;
  occurred_at: string;
  sale_total: number | string;
  expense_food: number | string;
  expense_auto: number | string;
  expense_labour: number | string;
  expense_total: number | string;
}

interface RawCustomerProfitReport {
  customer_id: string;
  customer_name: string;
  revenue: number | string;
  cost_of_goods: number | string;
  sale_expenses: number | string;
  profit: number | string;
  sales: RawSaleExpenseSummary[];
  lines: RawCustomerProfitLine[];
}

export async function fetchCustomerProfit(
  customerId: string,
  params?: { dateFrom?: string; dateTo?: string }
): Promise<CustomerProfitReport> {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set('date_from', params.dateFrom);
  if (params?.dateTo) q.set('date_to', params.dateTo);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const raw = await apiFetch<RawCustomerProfitReport>(
    `/api/reports/customer-profit/${customerId}${suffix}`
  );
  return {
    customerId: raw.customer_id,
    customerName: raw.customer_name,
    revenue: num(raw.revenue),
    costOfGoods: num(raw.cost_of_goods),
    saleExpenses: num(raw.sale_expenses),
    profit: num(raw.profit),
    sales: (raw.sales ?? []).map((s) => ({
      saleId: s.sale_id,
      occurredAt: new Date(s.occurred_at),
      saleTotal: num(s.sale_total),
      expenseFood: num(s.expense_food),
      expenseAuto: num(s.expense_auto),
      expenseLabour: num(s.expense_labour),
      expenseTotal: num(s.expense_total),
    })),
    lines: raw.lines.map((line) => ({
      saleId: line.sale_id,
      occurredAt: new Date(line.occurred_at),
      chemicalId: line.chemical_id,
      chemicalName: line.chemical_name,
      quantity: num(line.quantity),
      unit: line.unit,
      saleRate: num(line.sale_rate),
      purchaseRate: num(line.purchase_rate),
      revenue: num(line.revenue),
      cost: num(line.cost),
      grossProfit: num(line.gross_profit),
      saleExpenses: num(line.sale_expenses),
      netProfit: num(line.net_profit),
    })),
  };
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiFetch<void>(`/api/customers/${id}`, { method: 'DELETE' });
}

/** Clears ledger history and resets balance; keeps the customer record. */
export async function clearCustomerLedger(id: string): Promise<void> {
  await apiFetch<void>(`/api/customers/${id}/ledger`, { method: 'DELETE' });
}

export async function fetchPurchases(): Promise<PurchaseRow[]> {
  const raw = await apiFetch<RawPurchase[]>('/api/purchases');
  return raw.map(mapPurchase);
}

export async function deletePurchase(id: string): Promise<void> {
  await apiFetch<void>(`/api/purchases/${id}`, { method: 'DELETE' });
}

export async function updatePurchase(
  id: string,
  body: {
    expense_food: number;
    expense_auto: number;
    expense_labour: number;
    items: Array<{
      chemical_id: string;
      amount: number;
      rate: number;
      unit: string;
      can_size?: number | null;
    }>;
  }
): Promise<PurchaseRow> {
  const raw = await apiFetch<RawPurchase>(`/api/purchases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapPurchase(raw);
}

export async function createPurchase(body: {
  items: Array<{
    chemical_id: string;
    amount: number;
    rate: number;
    unit: string;
    can_size?: number | null;
  }>;
  expense_food: number;
  expense_auto: number;
  expense_labour: number;
}): Promise<PurchaseRow> {
  const raw = await apiFetch<RawPurchase>('/api/purchases', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapPurchase(raw);
}

export async function fetchSales(): Promise<SaleRow[]> {
  const raw = await apiFetch<RawSale[]>('/api/sales');
  return raw.map(mapSale);
}

export async function deleteSale(id: string): Promise<void> {
  await apiFetch<void>(`/api/sales/${id}`, { method: 'DELETE' });
}

export async function updateSale(
  id: string,
  body: {
    customer_id: string;
    paid: boolean;
    expense_food?: number;
    expense_auto?: number;
    expense_labour?: number;
    items: Array<{
      chemical_id: string;
      quantity: number;
      rate: number;
      unit: string;
      can_size?: number | null;
    }>;
  }
): Promise<SaleRow> {
  const raw = await apiFetch<RawSale>(`/api/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapSale(raw);
}

export async function createSale(body: {
  customer_id: string;
  paid: boolean;
  expense_food?: number;
  expense_auto?: number;
  expense_labour?: number;
  items: Array<{
    chemical_id: string;
    quantity: number;
    rate: number;
    unit: string;
    can_size?: number | null;
  }>;
}): Promise<SaleRow> {
  const raw = await apiFetch<RawSale>('/api/sales', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapSale(raw);
}

export async function fetchLedgerAll(): Promise<TransactionRow[]> {
  const raw = await apiFetch<RawLedger[]>('/api/ledger');
  return raw.map(mapLedger);
}

export interface ChemicalReportRow {
  chemicalId: string;
  chemicalName: string;
  unit: string;
  purchasedQty: number;
  soldQty: number;
  stockQty: number;
  revenue: number;
  purchaseCost: number;
  profit: number;
}

interface RawChemicalReport {
  chemical_id: string;
  chemical_name: string;
  unit: string;
  purchased_qty: number | string;
  sold_qty: number | string;
  stock_qty: number | string;
  revenue: number | string;
  purchase_cost: number | string;
  profit: number | string;
}

function mapChemicalReport(raw: RawChemicalReport): ChemicalReportRow {
  return {
    chemicalId: raw.chemical_id,
    chemicalName: raw.chemical_name,
    unit: raw.unit,
    purchasedQty: Number(raw.purchased_qty),
    soldQty: Number(raw.sold_qty),
    stockQty: Number(raw.stock_qty),
    revenue: Number(raw.revenue),
    purchaseCost: Number(raw.purchase_cost),
    profit: Number(raw.profit),
  };
}

export async function fetchChemicalReport(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ChemicalReportRow[]> {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set('date_from', params.dateFrom);
  if (params?.dateTo) q.set('date_to', params.dateTo);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const raw = await apiFetch<RawChemicalReport[]>(`/api/reports/chemical-summary${suffix}`);
  return raw.map(mapChemicalReport);
}

export interface ProfitSummary {
  revenue: number;
  costOfGoods: number;
  saleExpenses: number;
  profit: number;
}

interface RawProfitSummary {
  revenue: number | string;
  cost_of_goods: number | string;
  sale_expenses: number | string;
  profit: number | string;
}

export async function fetchProfitSummary(params?: {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}): Promise<ProfitSummary> {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set('date_from', params.dateFrom);
  if (params?.dateTo) q.set('date_to', params.dateTo);
  if (params?.customerId) q.set('customer_id', params.customerId);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const raw = await apiFetch<RawProfitSummary>(`/api/reports/profit-summary${suffix}`);
  return {
    revenue: num(raw.revenue),
    costOfGoods: num(raw.cost_of_goods),
    saleExpenses: num(raw.sale_expenses),
    profit: num(raw.profit),
  };
}

export async function recordPayment(
  customerId: string,
  payload: { amount: number; occurred_at: string; comment?: string }
): Promise<TransactionRow> {
  const raw = await apiFetch<RawLedger>(`/api/ledger/customers/${customerId}/payments`, {
    method: 'POST',
    body: JSON.stringify({
      amount: payload.amount,
      occurred_at: payload.occurred_at,
      comment: payload.comment ?? '',
    }),
  });
  return mapLedger(raw);
}
