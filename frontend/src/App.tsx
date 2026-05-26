import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import * as api from './api/chemicalApi';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Beaker, 
  Settings, 
  Plus, 
  Trash2, 
  Eye,
  Pencil,
  ChevronRight, 
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from './lib/utils';

// --- Types ---
interface Chemical {
  id: string;
  name: string;
  unit: 'liter' | 'kg' | 'cane';
  defaultCanSize?: number;
}

interface Customer {
  id: string;
  name: string;
  contact: string;
  balance: number;
}

interface PurchaseItem {
  chemicalId: string;
  amount: number;
  rate: number;
  unit: string;
  canSize?: number;
  subtotal: number;
}

interface Purchase {
  id: string;
  date: Date;
  items: PurchaseItem[];
  expenses: {
    food: number;
    auto: number;
    labour: number;
  };
  totalCost: number;
}

interface SaleItem {
  chemicalId: string;
  quantity: number;
  rate: number;
  unit: string;
  canSize?: number;
  subtotal: number;
}

interface Sale {
  id: string;
  date: Date;
  customerId: string;
  items: SaleItem[];
  total: number;
  paid: boolean;
  expenses: {
    food: number;
    auto: number;
    labour: number;
  };
}

interface Transaction {
  id: string;
  customerId: string;
  type: 'credit' | 'debit';
  amount: number;
  date: Date;
  balanceAfter: number;
  comment?: string;
}

function asDate(d: unknown): Date {
  if (d instanceof Date) return d;
  return new Date(d as string | number);
}

function inDateRange(date: Date, from: string, to: string): boolean {
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

const RecordFiltersBar: React.FC<{
  customers?: Customer[];
  customerId: string;
  onCustomerChange: (id: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  showCustomer?: boolean;
}> = ({
  customers = [],
  customerId,
  onCustomerChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showCustomer = true,
}) => (
  <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
    {showCustomer && (
      <div className="space-y-1 min-w-[180px] flex-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase">Customer</label>
        <Select value={customerId} onChange={(e) => onCustomerChange(e.target.value)}>
          <option value="">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>
    )}
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">From date</label>
      <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="py-1.5" />
    </div>
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">To date</label>
      <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="py-1.5" />
    </div>
    {(dateFrom || dateTo || customerId) && (
      <Button
        variant="ghost"
        className="text-xs"
        onClick={() => {
          onDateFromChange('');
          onDateToChange('');
          onCustomerChange('');
        }}
      >
        Clear filters
      </Button>
    )}
  </div>
);

// --- Auth Context ---
const ALLOWED_NAMES = ['pavithra', 'sharmila', 'devarajan', 'kavitha arumugum'];

interface AuthContextType {
  user: string | null;
  login: (name: string) => Promise<boolean>;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(localStorage.getItem('chemical_app_user'));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const login = async (name: string) => {
    const normalized = name.toLowerCase().trim();
    if (ALLOWED_NAMES.includes(normalized)) {
      setUser(normalized);
      localStorage.setItem('chemical_app_user', normalized);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chemical_app_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden", className)}>
    {children}
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };
  return (
    <button 
      className={cn("px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input 
    className={cn("w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all", className)}
    {...props}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className, ...props }) => (
  <select 
    className={cn("w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white", className)}
    {...props}
  >
    {children}
  </select>
);

// --- Modules ---

const Home: React.FC = () => {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(name);
    if (!success) setError('Access denied. Please enter an authorized name.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
              <Beaker className="text-indigo-600 w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Chemical Tracker</h1>
            <p className="text-slate-500 text-center mt-2">Enter your name to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input 
                placeholder="Your Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              {error && <p className="text-rose-500 text-sm mt-2">{error}</p>}
            </div>
            <Button type="submit" className="w-full py-3">
              Access Tracker
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

function unitLabel(unit: string): string {
  if (unit === 'cane') return 'L (from cans)';
  if (unit === 'kg') return 'kg';
  return 'L';
}

const Dashboard: React.FC<{ 
  sales: Sale[]; 
  purchases: Purchase[]; 
  customers: Customer[]; 
  chemicals: Chemical[];
  transactions: Transaction[];
  onEditSale?: (sale: Sale) => void;
}> = ({ sales, purchases, customers, chemicals, transactions, onEditSale }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [chemicalReport, setChemicalReport] = useState<api.ChemicalReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [profitSummary, setProfitSummary] = useState<api.ProfitSummary | null>(null);
  const [profitLoading, setProfitLoading] = useState(false);

  const filteredSales = useMemo(
    () =>
      sales.filter((s) => {
        if (customerFilter && s.customerId !== customerFilter) return false;
        return inDateRange(asDate(s.date), dateFrom, dateTo);
      }),
    [sales, customerFilter, dateFrom, dateTo]
  );

  const filteredPurchases = useMemo(
    () => purchases.filter((p) => inDateRange(asDate(p.date), dateFrom, dateTo)),
    [purchases, dateFrom, dateTo]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        if (customerFilter && t.customerId !== customerFilter) return false;
        return inDateRange(asDate(t.date), dateFrom, dateTo);
      }),
    [transactions, customerFilter, dateFrom, dateTo]
  );

  const stats = useMemo(() => {
    const totalSales = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalPurchases = filteredPurchases.reduce((acc, p) => acc + p.totalCost, 0);
    const totalBalance = customerFilter
      ? customers.find((c) => c.id === customerFilter)?.balance ?? 0
      : customers.reduce((acc, c) => acc + c.balance, 0);
    const totalReceived = filteredTransactions
      .filter((t) => t.type === 'credit')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalOutstanding = customers.reduce((acc, c) => acc + Math.max(0, c.balance), 0);

    return {
      totalSales,
      totalPurchases,
      totalBalance,
      totalReceived,
      totalOutstanding,
    };
  }, [filteredSales, filteredPurchases, filteredTransactions, customers, customerFilter]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'MMM dd');
    }).reverse();

    return last7Days.map((day) => {
      const daySales = filteredSales
        .filter((s) => format(asDate(s.date), 'MMM dd') === day)
        .reduce((acc, s) => acc + s.total, 0);
      const dayPurchases = filteredPurchases
        .filter((p) => format(asDate(p.date), 'MMM dd') === day)
        .reduce((acc, p) => acc + p.totalCost, 0);
      return { name: day, sales: daySales, purchases: dayPurchases };
    });
  }, [filteredSales, filteredPurchases]);

  useEffect(() => {
    let cancelled = false;
    setReportLoading(true);
    setProfitLoading(true);
    void api
      .fetchChemicalReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then((rows) => {
        if (!cancelled) setChemicalReport(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e);
          setChemicalReport([]);
        }
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    void api
      .fetchProfitSummary({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        customerId: customerFilter || undefined,
      })
      .then((summary) => {
        if (!cancelled) setProfitSummary(summary);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e);
          setProfitSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setProfitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, customerFilter]);

  const reportTotals = useMemo(() => {
    return chemicalReport.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.revenue,
        cost: acc.cost + row.purchaseCost,
        profit: acc.profit + row.profit,
      }),
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [chemicalReport]);

  return (
    <div className="space-y-6">
      <RecordFiltersBar
        customers={customers}
        customerId={customerFilter}
        onCustomerChange={setCustomerFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Sales', value: stats.totalSales, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Received', value: stats.totalReceived, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Purchases', value: stats.totalPurchases, icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          {
            label: 'Total Outstanding',
            value: stats.totalOutstanding,
            icon: DollarSign,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            hint: 'All customers still owe',
          },
          {
            label: customerFilter ? 'Customer profit' : 'Total profit',
            value: profitSummary?.profit ?? 0,
            icon: ArrowUpRight,
            color:
              (profitSummary?.profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600',
            bg: (profitSummary?.profit ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-rose-50',
            hint: customerFilter
              ? 'Revenue − cost − sale expenses (this customer)'
              : 'Revenue − cost − sale expenses (all customers)',
            loading: profitLoading,
          },
        ].map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            {'loading' in stat && stat.loading ? (
              <p className="text-sm text-slate-400 mt-2">Calculating…</p>
            ) : (
              <h3 className={cn('text-2xl font-bold mt-1', stat.color)}>₹{stat.value.toLocaleString()}</h3>
            )}
            {'hint' in stat && stat.hint && (
              <p className="text-[10px] text-slate-400 mt-1">{stat.hint}</p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue vs Expenses</h3>
          <div className="h-[300px] w-full min-w-0 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="purchases" fill="#6366f1" radius={[4, 4, 0, 0]} name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Sales</h3>
          <div className="space-y-4">
            {filteredSales.slice(0, 5).map((sale) => {
              const customer = customers.find(c => c.id === sale.customerId);
              return (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", sale.paid ? "bg-emerald-100" : "bg-amber-100")}>
                      {sale.paid ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Calendar className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{customer?.name || 'Unknown'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sale.items.slice(0, 2).map((item, i) => {
                          const chem = chemicals.find(c => c.id === item.chemicalId);
                          return (
                            <span key={i} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {chem?.name} ({item.quantity})
                            </span>
                          );
                        })}
                        {sale.items.length > 2 && <span className="text-[10px] text-slate-400">+{sale.items.length - 2} more</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onEditSale && (
                      <Button variant="ghost" className="p-2 text-indigo-600" title="Edit sale" onClick={() => onEditSale(sale)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="text-right">
                      <p className="font-bold text-slate-900">₹{sale.total.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{format(asDate(sale.date), 'MMM dd, HH:mm')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Package className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Stock &amp; profit by chemical</h3>
              <p className="text-xs text-slate-500">
                Uses dashboard date filters. Stock = purchased − sold through &quot;To&quot; date (or all time).
                Profit = sales revenue − purchase cost in range.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-slate-500">Revenue </span>
              <span className="font-bold text-emerald-600">₹{reportTotals.revenue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Cost </span>
              <span className="font-bold text-indigo-600">₹{reportTotals.cost.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Profit </span>
              <span className={cn('font-bold', reportTotals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                ₹{reportTotals.profit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {reportLoading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading stock &amp; profit…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Chemical</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Purchased</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Sold</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Stock on hand</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Revenue</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Cost</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chemicalReport.map((row) => (
                  <tr key={row.chemicalId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.chemicalName}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {row.purchasedQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unitLabel(row.unit)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {row.soldQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unitLabel(row.unit)}
                    </td>
                    <td className={cn('px-4 py-3 text-right font-semibold', row.stockQty < 0 ? 'text-rose-600' : 'text-violet-700')}>
                      {row.stockQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unitLabel(row.unit)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">₹{row.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-indigo-600">₹{row.purchaseCost.toLocaleString()}</td>
                    <td className={cn('px-4 py-3 text-right font-bold', row.profit >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                      ₹{row.profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {chemicalReport.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No chemicals defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

const PurchaseModule: React.FC<{ chemicals: Chemical[]; purchases: Purchase[]; onSaved: () => void }> = ({
  chemicals,
  purchases,
  onSaved,
}) => {
  const [items, setItems] = useState<Omit<PurchaseItem, 'subtotal'>[]>([
    { chemicalId: '', amount: 0, rate: 0, unit: 'liter', canSize: 45 }
  ]);
  const [expenses, setExpenses] = useState({ food: 0, auto: 0, labour: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [histDateFrom, setHistDateFrom] = useState('');
  const [histDateTo, setHistDateTo] = useState('');
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editItems, setEditItems] = useState<Omit<PurchaseItem, 'subtotal'>[]>([]);
  const [editExpenses, setEditExpenses] = useState({ food: 0, auto: 0, labour: 0 });
  const [editLoading, setEditLoading] = useState(false);

  const openEditPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setEditExpenses({ ...purchase.expenses });
    setEditItems(
      purchase.items.map((item) => ({
        chemicalId: item.chemicalId,
        amount: item.amount,
        rate: item.rate,
        unit: item.unit,
        canSize: item.canSize ?? 45,
      }))
    );
  };

  const addItem = () => {
    setItems([...items, { chemicalId: '', amount: 0, rate: 0, unit: 'liter', canSize: 45 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    if (field === 'chemicalId') {
      const chem = chemicals.find(c => c.id === value);
      if (chem) {
        newItems[index].unit = chem.unit;
        newItems[index].canSize = chem.defaultCanSize || 45;
      }
    }
    setItems(newItems);
  };

  const calculateSubtotal = (item: any) => {
    const qty = item.amount || 0;
    const rate = item.rate || 0;
    return qty * rate;
  };

  const grandTotal = useMemo(() => {
    const itemsTotal = items.reduce((acc, item) => acc + calculateSubtotal(item), 0);
    return itemsTotal + (expenses.food || 0) + (expenses.auto || 0) + (expenses.labour || 0);
  }, [items, expenses]);

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (!confirm(`Delete this purchase (₹${purchase.totalCost})?`)) return;
    try {
      await api.deletePurchase(purchase.id);
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const addEditItem = () => {
    setEditItems([...editItems, { chemicalId: '', amount: 0, rate: 0, unit: 'liter', canSize: 45 }]);
  };

  const removeEditItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateEditItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...editItems];
    (newItems[index] as any)[field] = value;
    if (field === 'chemicalId') {
      const chem = chemicals.find((c) => c.id === value);
      if (chem) {
        newItems[index].unit = chem.unit;
        newItems[index].canSize = chem.defaultCanSize || 45;
      }
    }
    setEditItems(newItems);
  };

  const handleSaveEditPurchase = async () => {
    if (!editingPurchase || editItems.some((item) => !item.chemicalId || !item.amount || !item.rate)) {
      alert('Please fill all item details');
      return;
    }
    setEditLoading(true);
    try {
      await api.updatePurchase(editingPurchase.id, {
        items: editItems.map((item) => ({
          chemical_id: item.chemicalId,
          amount: item.amount,
          rate: item.rate,
          unit: item.unit,
          can_size: item.unit === 'cane' ? item.canSize ?? null : null,
        })),
        expense_food: editExpenses.food || 0,
        expense_auto: editExpenses.auto || 0,
        expense_labour: editExpenses.labour || 0,
      });
      setEditingPurchase(null);
      onSaved();
      alert('Purchase updated!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  const editGrandTotal = useMemo(() => {
    const itemsTotal = editItems.reduce((acc, item) => acc + (item.amount || 0) * (item.rate || 0), 0);
    return itemsTotal + (editExpenses.food || 0) + (editExpenses.auto || 0) + (editExpenses.labour || 0);
  }, [editItems, editExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(item => !item.chemicalId || !item.amount || !item.rate)) {
      alert('Please fill all item details');
      return;
    }

    setLoading(true);
    try {
      await api.createPurchase({
        items: items.map((item) => ({
          chemical_id: item.chemicalId,
          amount: item.amount,
          rate: item.rate,
          unit: item.unit,
          can_size: item.unit === 'cane' ? item.canSize ?? null : null,
        })),
        expense_food: expenses.food || 0,
        expense_auto: expenses.auto || 0,
        expense_labour: expenses.labour || 0,
      });

      setItems([{ chemicalId: '', amount: 0, rate: 0, unit: 'liter', canSize: 45 }]);
      setExpenses({ food: 0, auto: 0, labour: 0 });
      onSaved();
      alert('Purchase added successfully!');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error adding purchase');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!inDateRange(asDate(p.date), histDateFrom, histDateTo)) return false;
    const chemNames = p.items.map((item) => chemicals.find((c) => c.id === item.chemicalId)?.name || '').join(' ');
    return chemNames.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <ShoppingCart className="text-indigo-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">New Purchase</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-xl relative group">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Chemical</label>
                  <Select 
                    value={item.chemicalId} 
                    onChange={(e) => updateItem(index, 'chemicalId', e.target.value)}
                    required
                  >
                    <option value="">Select Chemical</option>
                    {chemicals.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                  <Select 
                    value={item.unit} 
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                  >
                    <option value="liter">Liter</option>
                    <option value="kg">KG</option>
                    <option value="cane">Cane</option>
                  </Select>
                </div>
                {item.unit === 'cane' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Can Size</label>
                    <Input 
                      type="number" 
                      value={item.canSize} 
                      onChange={(e) => updateItem(index, 'canSize', parseFloat(e.target.value))}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={item.amount || ''} 
                    onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
                  <Input 
                    type="number" 
                    placeholder="Rate" 
                    value={item.rate || ''} 
                    onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="flex items-end justify-between md:justify-end gap-2">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Subtotal</p>
                    <p className="font-bold text-slate-900">₹{calculateSubtotal(item).toLocaleString()}</p>
                  </div>
                  {items.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="p-2 text-rose-500" 
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addItem} className="w-full border-2 border-dashed border-slate-200 bg-transparent hover:bg-slate-50">
              <Plus className="w-4 h-4" /> Add Another Chemical
            </Button>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Additional Expenses</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Food</label>
                <Input 
                  type="number" 
                  value={expenses.food || ''} 
                  onChange={(e) => setExpenses({ ...expenses, food: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Auto/Transport</label>
                <Input 
                  type="number" 
                  value={expenses.auto || ''} 
                  onChange={(e) => setExpenses({ ...expenses, auto: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Labour</label>
                <Input 
                  type="number" 
                  value={expenses.labour || ''} 
                  onChange={(e) => setExpenses({ ...expenses, labour: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-xl flex items-center justify-between text-white">
            <div>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Grand Total</p>
              <h3 className="text-3xl font-black">₹{grandTotal.toLocaleString()}</h3>
            </div>
            <Button type="submit" className="bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-4" disabled={loading}>
              {loading ? 'Processing...' : 'Record Purchase'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900">Purchase History</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search chemicals..." 
              className="pl-10 py-1.5 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <RecordFiltersBar
          customerId=""
          onCustomerChange={() => {}}
          dateFrom={histDateFrom}
          dateTo={histDateTo}
          onDateFromChange={setHistDateFrom}
          onDateToChange={setHistDateTo}
          showCustomer={false}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Chemicals</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Total Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {format(asDate(p.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {p.items.map((item, i) => {
                        const chem = chemicals.find(c => c.id === item.chemicalId);
                        return (
                          <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                            {chem?.name} ({item.amount} {item.unit})
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹{p.totalCost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" className="p-2" title="View" onClick={() => setViewPurchase(p)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" className="p-2 text-indigo-600" title="Edit" onClick={() => openEditPurchase(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" className="p-2 text-rose-500" title="Delete" onClick={() => handleDeletePurchase(p)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editingPurchase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">Edit purchase</h3>
              <Button variant="ghost" onClick={() => setEditingPurchase(null)} className="p-1">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {editItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-xl">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Chemical</label>
                    <Select value={item.chemicalId} onChange={(e) => updateEditItem(index, 'chemicalId', e.target.value)}>
                      <option value="">Select</option>
                      {chemicals.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                    <Select value={item.unit} onChange={(e) => updateEditItem(index, 'unit', e.target.value)}>
                      <option value="liter">Liter</option>
                      <option value="kg">KG</option>
                      <option value="cane">Cane</option>
                    </Select>
                  </div>
                  {item.unit === 'cane' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Can Size</label>
                      <Input type="number" value={item.canSize} onChange={(e) => updateEditItem(index, 'canSize', parseFloat(e.target.value))} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                    <Input type="number" value={item.amount || ''} onChange={(e) => updateEditItem(index, 'amount', parseFloat(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
                    <Input type="number" value={item.rate || ''} onChange={(e) => updateEditItem(index, 'rate', parseFloat(e.target.value))} />
                  </div>
                  <div className="flex items-end justify-end">
                    {editItems.length > 1 && (
                      <Button type="button" variant="ghost" className="p-2 text-rose-500" onClick={() => removeEditItem(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addEditItem} className="w-full border-2 border-dashed">
                <Plus className="w-4 h-4" /> Add chemical line
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Food</label>
                  <Input type="number" value={editExpenses.food || ''} onChange={(e) => setEditExpenses({ ...editExpenses, food: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Auto/Transport</label>
                  <Input type="number" value={editExpenses.auto || ''} onChange={(e) => setEditExpenses({ ...editExpenses, auto: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Labour</label>
                  <Input type="number" value={editExpenses.labour || ''} onChange={(e) => setEditExpenses({ ...editExpenses, labour: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="bg-indigo-600 p-4 rounded-xl flex items-center justify-between text-white">
                <span className="font-bold">Total: ₹{editGrandTotal.toLocaleString()}</span>
                <Button onClick={handleSaveEditPurchase} disabled={editLoading} className="bg-white text-indigo-600">
                  {editLoading ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {viewPurchase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Purchase details</h3>
              <Button variant="ghost" onClick={() => setViewPurchase(null)} className="p-1"><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p><span className="text-slate-500">Date:</span> {format(asDate(viewPurchase.date), 'MMM dd, yyyy HH:mm')}</p>
              <p><span className="text-slate-500">Total:</span> ₹{viewPurchase.totalCost.toLocaleString()}</p>
              <p><span className="text-slate-500">Expenses:</span> Food ₹{viewPurchase.expenses.food}, Auto ₹{viewPurchase.expenses.auto}, Labour ₹{viewPurchase.expenses.labour}</p>
              <div className="pt-2 border-t">
                <p className="font-bold mb-2">Items</p>
                {viewPurchase.items.map((item, i) => {
                  const chem = chemicals.find((c) => c.id === item.chemicalId);
                  return (
                    <p key={i} className="text-slate-700">
                      {chem?.name} — {item.amount} {item.unit} @ ₹{item.rate}
                    </p>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const SalesModule: React.FC<{
  chemicals: Chemical[];
  customers: Customer[];
  sales: Sale[];
  onSaved: () => void;
  saleToEdit?: Sale | null;
  onSaleEditOpened?: () => void;
}> = ({ chemicals, customers, sales, onSaved, saleToEdit, onSaleEditOpened }) => {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<Omit<SaleItem, 'subtotal'>[]>([
    { chemicalId: '', quantity: 0, rate: 0, unit: 'liter', canSize: 45 }
  ]);
  const [paid, setPaid] = useState(false);
  const [expenses, setExpenses] = useState({ food: 0, auto: 0, labour: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [histDateFrom, setHistDateFrom] = useState('');
  const [histDateTo, setHistDateTo] = useState('');
  const [histCustomer, setHistCustomer] = useState('');
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editItems, setEditItems] = useState<Omit<SaleItem, 'subtotal'>[]>([]);
  const [editPaid, setEditPaid] = useState(false);
  const [editExpenses, setEditExpenses] = useState({ food: 0, auto: 0, labour: 0 });
  const [editLoading, setEditLoading] = useState(false);

  const openEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditCustomerId(sale.customerId);
    setEditPaid(sale.paid);
    setEditExpenses({ ...(sale.expenses ?? { food: 0, auto: 0, labour: 0 }) });
    setEditItems(
      sale.items.map((item) => ({
        chemicalId: item.chemicalId,
        quantity: item.quantity,
        rate: item.rate,
        unit: item.unit,
        canSize: item.canSize ?? 45,
      }))
    );
  };

  useEffect(() => {
    if (saleToEdit) {
      openEditSale(saleToEdit);
      onSaleEditOpened?.();
    }
  }, [saleToEdit?.id]);

  const addItem = () => {
    setItems([...items, { chemicalId: '', quantity: 0, rate: 0, unit: 'liter', canSize: 45 }]);
  };

  const addEditItem = () => {
    setEditItems([...editItems, { chemicalId: '', quantity: 0, rate: 0, unit: 'liter', canSize: 45 }]);
  };

  const removeEditItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateEditItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...editItems];
    (newItems[index] as any)[field] = value;
    if (field === 'chemicalId') {
      const chem = chemicals.find((c) => c.id === value);
      if (chem) {
        newItems[index].unit = chem.unit;
        newItems[index].canSize = chem.defaultCanSize || 45;
      }
    }
    setEditItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    if (field === 'chemicalId') {
      const chem = chemicals.find(c => c.id === value);
      if (chem) {
        newItems[index].unit = chem.unit;
        newItems[index].canSize = chem.defaultCanSize || 45;
      }
    }
    setItems(newItems);
  };

  const calculateSubtotal = (item: any) => {
    const qty = item.quantity || 0;
    const rate = item.rate || 0;
    return qty * rate;
  };

  const grandTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + calculateSubtotal(item), 0);
  }, [items]);

  const handleDeleteSale = async (sale: Sale) => {
    const customer = customers.find((c) => c.id === sale.customerId);
    if (!confirm(`Delete this sale for ${customer?.name ?? 'customer'} (₹${sale.total})?`)) return;
    try {
      await api.deleteSale(sale.id);
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleSaveEditSale = async () => {
    if (!editingSale || !editCustomerId || editItems.some((i) => !i.chemicalId || !i.quantity || !i.rate)) {
      alert('Please fill all details');
      return;
    }
    setEditLoading(true);
    try {
      await api.updateSale(editingSale.id, {
        customer_id: editCustomerId,
        paid: editPaid,
        expense_food: editExpenses.food || 0,
        expense_auto: editExpenses.auto || 0,
        expense_labour: editExpenses.labour || 0,
        items: editItems.map((item) => ({
          chemical_id: item.chemicalId,
          quantity: item.quantity,
          rate: item.rate,
          unit: item.unit,
          can_size: item.unit === 'cane' ? item.canSize ?? null : null,
        })),
      });
      setEditingSale(null);
      onSaved();
      alert('Sale updated!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  const editGrandTotal = useMemo(
    () => editItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.rate || 0), 0),
    [editItems]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.some(item => !item.chemicalId || !item.quantity || !item.rate)) {
      alert('Please fill all details');
      return;
    }

    setLoading(true);
    try {
      await api.createSale({
        customer_id: customerId,
        paid,
        expense_food: expenses.food || 0,
        expense_auto: expenses.auto || 0,
        expense_labour: expenses.labour || 0,
        items: items.map((item) => ({
          chemical_id: item.chemicalId,
          quantity: item.quantity,
          rate: item.rate,
          unit: item.unit,
          can_size: item.unit === 'cane' ? item.canSize ?? null : null,
        })),
      });

      setCustomerId('');
      setItems([{ chemicalId: '', quantity: 0, rate: 0, unit: 'liter', canSize: 45 }]);
      setPaid(false);
      setExpenses({ food: 0, auto: 0, labour: 0 });
      onSaved();
      alert('Sale recorded successfully!');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error recording sale');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (histCustomer && s.customerId !== histCustomer) return false;
    if (!inDateRange(asDate(s.date), histDateFrom, histDateTo)) return false;
    const customer = customers.find((c) => c.id === s.customerId);
    const chemNames = s.items.map((item) => chemicals.find((c) => c.id === item.chemicalId)?.name || '').join(' ');
    const q = searchTerm.toLowerCase();
    return (
      customer?.name.toLowerCase().includes(q) ||
      chemNames.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <TrendingUp className="text-emerald-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">New Sale</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 max-w-md">
            <label className="text-sm font-medium text-slate-700">Customer</label>
            <Select 
              value={customerId} 
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-xl relative group">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Chemical</label>
                  <Select 
                    value={item.chemicalId} 
                    onChange={(e) => updateItem(index, 'chemicalId', e.target.value)}
                    required
                  >
                    <option value="">Select Chemical</option>
                    {chemicals.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                  <Select 
                    value={item.unit} 
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                  >
                    <option value="liter">Liter</option>
                    <option value="kg">KG</option>
                    <option value="cane">Cane</option>
                  </Select>
                </div>
                {item.unit === 'cane' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Can Size</label>
                    <Input 
                      type="number" 
                      value={item.canSize} 
                      onChange={(e) => updateItem(index, 'canSize', parseFloat(e.target.value))}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={item.quantity || ''} 
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
                  <Input 
                    type="number" 
                    placeholder="Rate" 
                    value={item.rate || ''} 
                    onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="flex items-end justify-between md:justify-end gap-2">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Subtotal</p>
                    <p className="font-bold text-slate-900">₹{calculateSubtotal(item).toLocaleString()}</p>
                  </div>
                  {items.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="p-2 text-rose-500" 
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addItem} className="w-full border-2 border-dashed border-slate-200 bg-transparent hover:bg-slate-50">
              <Plus className="w-4 h-4" /> Add Another Chemical
            </Button>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wider">Sale expenses (profit only)</h3>
            <p className="text-xs text-slate-500 mb-4">Food, transport, labour for this delivery — not added to customer bill.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Food</label>
                <Input type="number" value={expenses.food || ''} onChange={(e) => setExpenses({ ...expenses, food: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Auto / transport</label>
                <Input type="number" value={expenses.auto || ''} onChange={(e) => setExpenses({ ...expenses, auto: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Labour</label>
                <Input type="number" value={expenses.labour || ''} onChange={(e) => setExpenses({ ...expenses, labour: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
            <input 
              type="checkbox" 
              id="paid" 
              className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
            />
            <label htmlFor="paid" className="text-sm font-medium text-slate-700 cursor-pointer">
              Payment received immediately
            </label>
          </div>

          <div className="bg-emerald-600 p-6 rounded-xl flex items-center justify-between text-white">
            <div>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Grand Total</p>
              <h3 className="text-3xl font-black">₹{grandTotal.toLocaleString()}</h3>
            </div>
            <Button type="submit" className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-4" disabled={loading}>
              {loading ? 'Processing...' : 'Record Sale'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900">Sales History</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search customers or chemicals..." 
              className="pl-10 py-1.5 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <RecordFiltersBar
          customers={customers}
          customerId={histCustomer}
          onCustomerChange={setHistCustomer}
          dateFrom={histDateFrom}
          dateTo={histDateTo}
          onDateFromChange={setHistDateFrom}
          onDateToChange={setHistDateTo}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Chemicals</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((s) => {
                const customer = customers.find(c => c.id === s.customerId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {format(asDate(s.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{customer?.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {s.items.map((item, i) => {
                          const chem = chemicals.find(c => c.id === item.chemicalId);
                          return (
                            <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">
                              {chem?.name} ({item.quantity} {item.unit})
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">₹{s.total.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      {s.paid ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">PAID</span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">DUE</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" className="p-2" title="View" onClick={() => setViewSale(s)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" className="p-2 text-indigo-600" title="Edit" onClick={() => openEditSale(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" className="p-2 text-rose-500" title="Delete" onClick={() => handleDeleteSale(s)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editingSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">Edit sale</h3>
              <Button variant="ghost" onClick={() => setEditingSale(null)} className="p-1">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium text-slate-700">Customer</label>
                <Select value={editCustomerId} onChange={(e) => setEditCustomerId(e.target.value)}>
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              {editItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-xl">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Chemical</label>
                    <Select value={item.chemicalId} onChange={(e) => updateEditItem(index, 'chemicalId', e.target.value)}>
                      <option value="">Select</option>
                      {chemicals.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                    <Select value={item.unit} onChange={(e) => updateEditItem(index, 'unit', e.target.value)}>
                      <option value="liter">Liter</option>
                      <option value="kg">KG</option>
                      <option value="cane">Cane</option>
                    </Select>
                  </div>
                  {item.unit === 'cane' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Can Size</label>
                      <Input type="number" value={item.canSize} onChange={(e) => updateEditItem(index, 'canSize', parseFloat(e.target.value))} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                    <Input type="number" value={item.quantity || ''} onChange={(e) => updateEditItem(index, 'quantity', parseFloat(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
                    <Input type="number" value={item.rate || ''} onChange={(e) => updateEditItem(index, 'rate', parseFloat(e.target.value))} />
                  </div>
                  <div className="flex items-end justify-end">
                    {editItems.length > 1 && (
                      <Button type="button" variant="ghost" className="p-2 text-rose-500" onClick={() => removeEditItem(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addEditItem} className="w-full border-2 border-dashed">
                <Plus className="w-4 h-4" /> Add chemical line
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Food expense</label>
                  <Input type="number" value={editExpenses.food || ''} onChange={(e) => setEditExpenses({ ...editExpenses, food: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Auto expense</label>
                  <Input type="number" value={editExpenses.auto || ''} onChange={(e) => setEditExpenses({ ...editExpenses, auto: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Labour expense</label>
                  <Input type="number" value={editExpenses.labour || ''} onChange={(e) => setEditExpenses({ ...editExpenses, labour: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <input type="checkbox" className="w-5 h-5" checked={editPaid} onChange={(e) => setEditPaid(e.target.checked)} />
                <label className="text-sm font-medium">Payment received immediately</label>
              </div>
              <div className="bg-emerald-600 p-4 rounded-xl flex items-center justify-between text-white">
                <span className="font-bold">Total: ₹{editGrandTotal.toLocaleString()}</span>
                <Button onClick={handleSaveEditSale} disabled={editLoading} className="bg-white text-emerald-600">
                  {editLoading ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {viewSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Sale details</h3>
              <Button variant="ghost" onClick={() => setViewSale(null)} className="p-1"><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p><span className="text-slate-500">Customer:</span> {customers.find((c) => c.id === viewSale.customerId)?.name}</p>
              <p><span className="text-slate-500">Date:</span> {format(asDate(viewSale.date), 'MMM dd, yyyy HH:mm')}</p>
              <p><span className="text-slate-500">Status:</span> {viewSale.paid ? 'Paid' : 'Due'}</p>
              <p><span className="text-slate-500">Total:</span> ₹{viewSale.total.toLocaleString()}</p>
              <p><span className="text-slate-500">Expenses:</span> Food ₹{viewSale.expenses?.food ?? 0}, Auto ₹{viewSale.expenses?.auto ?? 0}, Labour ₹{viewSale.expenses?.labour ?? 0}</p>
              <div className="pt-2 border-t">
                <p className="font-bold mb-2">Items</p>
                {viewSale.items.map((item, i) => {
                  const chem = chemicals.find((c) => c.id === item.chemicalId);
                  return (
                    <p key={i} className="text-slate-700">
                      {chem?.name} — {item.quantity} {item.unit} @ ₹{item.rate} = ₹{(item.quantity * item.rate).toLocaleString()}
                    </p>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const QuickPayModal: React.FC<{ 
  customer: Customer; 
  onClose: () => void;
  onPaid: () => void;
}> = ({ customer, onClose, onPaid }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      const val = parseFloat(amount);
      await api.recordPayment(customer.id, {
        amount: val,
        occurred_at: new Date(date).toISOString(),
        comment: comment.trim(),
      });
      onPaid();
      alert('Payment recorded!');
      onClose();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Quick Pay: {customer.name}</h3>
          <Button variant="ghost" onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Amount (₹)</label>
            <Input 
              type="number" 
              placeholder="0.00" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Date & Time</label>
            <Input 
              type="datetime-local" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Comments</label>
            <Input 
              placeholder="Cash, GPay, etc." 
              value={comment} 
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handlePay} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

function CustomerProfitSalesTable({ sales }: { sales: api.SaleExpenseSummary[] }) {
  if (!sales.length) return null;
  return (
    <div className="mb-4">
      <h5 className="text-sm font-bold text-slate-800 mb-2">Expenses on each sale</h5>
      <p className="text-xs text-slate-500 mb-2">
        Enter food, auto, and labour when recording or editing a sale (Sales tab → pencil). Purchase expenses are not used here.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-amber-50 text-xs font-bold text-slate-600 uppercase">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Sale total</th>
              <th className="px-3 py-2 text-right">Food</th>
              <th className="px-3 py-2 text-right">Auto</th>
              <th className="px-3 py-2 text-right">Labour</th>
              <th className="px-3 py-2 text-right">Expense total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((s) => (
              <tr key={s.saleId}>
                <td className="px-3 py-2 text-slate-500">{format(s.occurredAt, 'MMM dd, yyyy')}</td>
                <td className="px-3 py-2 text-right">₹{s.saleTotal.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">₹{s.expenseFood.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">₹{s.expenseAuto.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">₹{s.expenseLabour.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-bold text-amber-700">₹{s.expenseTotal.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CustomerManageModal: React.FC<{
  customer: Customer;
  onClose: () => void;
  onSaved: () => void;
  onOpenLedger: () => void;
}> = ({ customer, onClose, onSaved, onOpenLedger }) => {
  const [name, setName] = useState(customer.name);
  const [contact, setContact] = useState(customer.contact || '');
  const [saving, setSaving] = useState(false);
  const [profitFrom, setProfitFrom] = useState('');
  const [profitTo, setProfitTo] = useState('');
  const [profit, setProfit] = useState<api.CustomerProfitReport | null>(null);
  const [profitLoading, setProfitLoading] = useState(false);

  useEffect(() => {
    setName(customer.name);
    setContact(customer.contact || '');
  }, [customer.id, customer.name, customer.contact]);

  useEffect(() => {
    let cancelled = false;
    setProfitLoading(true);
    void api
      .fetchCustomerProfit(customer.id, {
        dateFrom: profitFrom || undefined,
        dateTo: profitTo || undefined,
      })
      .then((report) => {
        if (!cancelled) setProfit(report);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e);
          setProfit(null);
        }
      })
      .finally(() => {
        if (!cancelled) setProfitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id, profitFrom, profitTo]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.updateCustomer(customer.id, { name: name.trim(), contact: contact.trim() });
      onSaved();
      alert('Customer updated');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto"
      >
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold">Customer details</h3>
          <Button variant="ghost" onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-rose-50 border-rose-100">
              <p className="text-xs font-bold text-rose-600 uppercase">Outstanding</p>
              <p className="text-2xl font-black text-rose-700">
                ₹{Math.max(0, customer.balance).toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 bg-emerald-50 border-emerald-100 md:col-span-2">
              <p className="text-xs text-slate-500 mb-2">
                Profit = sale price minus average purchase rate per chemical, minus expenses entered on each sale (food, auto, labour).
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Contact</label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="secondary" onClick={onOpenLedger}>
              Open ledger <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-bold text-slate-900 mb-3">Profit breakdown</h4>
            <RecordFiltersBar
              customerId=""
              onCustomerChange={() => {}}
              dateFrom={profitFrom}
              dateTo={profitTo}
              onDateFromChange={setProfitFrom}
              onDateToChange={setProfitTo}
              showCustomer={false}
            />

            {profitLoading ? (
              <p className="text-sm text-slate-500 py-6 text-center">Calculating profit…</p>
            ) : profit ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Revenue</p>
                    <p className="font-bold text-emerald-600">₹{profit.revenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Cost (purchase rate)</p>
                    <p className="font-bold text-indigo-600">₹{profit.costOfGoods.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Sale expenses</p>
                    <p className="font-bold text-amber-600">₹{profit.saleExpenses.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Net profit</p>
                    <p className={cn('font-bold', profit.profit >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                      ₹{profit.profit.toLocaleString()}
                    </p>
                  </div>
                </div>

                <CustomerProfitSalesTable sales={profit.sales} />

                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Chemical</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Sale rate</th>
                        <th className="px-3 py-2 text-right">Buy rate</th>
                        <th className="px-3 py-2 text-right">Net profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profit.lines.map((line, i) => (
                        <tr key={`${line.saleId}-${i}`}>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                            {format(line.occurredAt, 'MMM dd, yyyy')}
                          </td>
                          <td className="px-3 py-2 font-medium">{line.chemicalName}</td>
                          <td className="px-3 py-2 text-right">
                            {line.quantity} {line.unit}
                          </td>
                          <td className="px-3 py-2 text-right">₹{line.saleRate}</td>
                          <td className="px-3 py-2 text-right text-slate-500">₹{line.purchaseRate.toFixed(2)}</td>
                          <td
                            className={cn(
                              'px-3 py-2 text-right font-bold',
                              line.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            )}
                          >
                            ₹{line.netProfit.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {profit.lines.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                            No sales in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AdminModule: React.FC<{ 
  chemicals: Chemical[]; 
  customers: Customer[];
  transactions: Transaction[];
  onSelectCustomer: (id: string) => void;
  onDataChange: () => void;
}> = ({ chemicals, customers, transactions, onSelectCustomer, onDataChange }) => {
  const [newChemical, setNewChemical] = useState({ name: '', unit: 'liter' as any, defaultCanSize: 45 });
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '' });
  const [activeTab, setActiveTab] = useState<'customers' | 'payments' | 'chemicals'>('customers');
  const [quickPayCustomer, setQuickPayCustomer] = useState<Customer | null>(null);
  const [manageCustomer, setManageCustomer] = useState<Customer | null>(null);

  const creditPayments = useMemo(
    () =>
      [...transactions]
        .filter((t) => t.type === 'credit')
        .sort((a, b) => asDate(b.date).getTime() - asDate(a.date).getTime()),
    [transactions]
  );

  const totalCredits = useMemo(
    () => creditPayments.reduce((acc, t) => acc + t.amount, 0),
    [creditPayments]
  );

  const addChemical = async () => {
    if (!newChemical.name) return;
    try {
      await api.createChemical({
        name: newChemical.name.trim(),
        unit: newChemical.unit,
        default_can_size: newChemical.unit === 'cane' ? newChemical.defaultCanSize : null,
      });
      setNewChemical({ name: '', unit: 'liter', defaultCanSize: 45 });
      onDataChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add chemical');
    }
  };

  const addCustomer = async () => {
    if (!newCustomer.name) return;
    try {
      await api.createCustomer({ name: newCustomer.name.trim(), contact: newCustomer.contact });
      setNewCustomer({ name: '', contact: '' });
      onDataChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add customer');
    }
  };

  const totalPending = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0);
  }, [customers]);

  return (
    <div className="space-y-6">
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-rose-50 border-rose-100">
            <p className="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Total Pending Amount</p>
            <h3 className="text-3xl font-black text-rose-700">₹{totalPending.toLocaleString()}</h3>
          </Card>
          <Card className="p-6 bg-blue-50 border-blue-100">
            <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Total Credit Received</p>
            <h3 className="text-3xl font-black text-blue-700">₹{totalCredits.toLocaleString()}</h3>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <Button 
          variant={activeTab === 'customers' ? 'primary' : 'ghost'} 
          onClick={() => setActiveTab('customers')}
          className="px-6"
        >
          Customers
        </Button>
        <Button 
          variant={activeTab === 'payments' ? 'primary' : 'ghost'} 
          onClick={() => setActiveTab('payments')}
          className="px-6"
        >
          Credit / Payments
        </Button>
        <Button 
          variant={activeTab === 'chemicals' ? 'primary' : 'ghost'} 
          onClick={() => setActiveTab('chemicals')}
          className="px-6"
        >
          Chemicals
        </Button>
      </div>

      {activeTab === 'payments' ? (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Credit payment records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Comment</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Balance after</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creditPayments.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-500 whitespace-nowrap">
                      {format(asDate(t.date), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {customers.find((c) => c.id === t.customerId)?.name ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500 italic">{t.comment || '—'}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-600">₹{t.amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-700">₹{t.balanceAfter.toLocaleString()}</td>
                  </tr>
                ))}
                {creditPayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No credit payments recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            Add New {activeTab === 'customers' ? 'Customer' : 'Chemical'}
          </h3>
          {activeTab === 'customers' ? (
            <div className="space-y-4">
              <Input 
                placeholder="Customer Name" 
                value={newCustomer.name} 
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
              <Input 
                placeholder="Contact Info" 
                value={newCustomer.contact} 
                onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })}
              />
              <Button onClick={addCustomer} className="w-full">Add Customer</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input 
                placeholder="Chemical Name" 
                value={newChemical.name} 
                onChange={(e) => setNewChemical({ ...newChemical, name: e.target.value })}
              />
              <Select 
                value={newChemical.unit} 
                onChange={(e) => setNewChemical({ ...newChemical, unit: e.target.value as any })}
              >
                <option value="liter">Liter</option>
                <option value="kg">KG</option>
                <option value="cane">Cane</option>
              </Select>
              {newChemical.unit === 'cane' && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Default Can Size (KG/L)</label>
                  <Input 
                    type="number" 
                    value={newChemical.defaultCanSize} 
                    onChange={(e) => setNewChemical({ ...newChemical, defaultCanSize: parseFloat(e.target.value) })}
                  />
                </div>
              )}
              <Button onClick={addChemical} className="w-full">Add Chemical</Button>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  {activeTab === 'customers' ? (
                    <>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Balance</th>
                    </>
                  ) : (
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                  )}
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === 'customers' ? customers : chemicals).map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                    {activeTab === 'customers' ? (
                      <>
                        <td className="px-6 py-4 text-slate-500">{item.contact || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-xs font-bold",
                            item.balance > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            ₹{Math.abs(item.balance).toLocaleString()} {item.balance > 0 ? 'Debit' : 'Credit'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <td className="px-6 py-4 text-slate-500 uppercase text-xs">{item.unit}</td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'customers' && (
                          <>
                            <Button
                              variant="ghost"
                              className="p-2 text-indigo-600"
                              onClick={() => setManageCustomer(item)}
                              title="View / Edit"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="p-2 text-indigo-600"
                              onClick={() => setManageCustomer(item)}
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              className="p-2 text-emerald-600 hover:bg-emerald-50" 
                              onClick={() => setQuickPayCustomer(item)}
                              title="Quick Pay"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" className="p-2" onClick={() => onSelectCustomer(item.id)} title="View Ledger">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          className="p-2 text-rose-500 hover:text-rose-600"
                          title={activeTab === 'customers' ? 'Clear transaction history' : 'Delete chemical'}
                          onClick={async () => {
                            const message =
                              activeTab === 'customers'
                                ? `Clear all history for "${item.name}"?\n\nThis removes sales + ledger records and resets balance to ₹0. The customer stays in your list.`
                                : `Delete chemical "${item.name}"?`;
                            if (!confirm(message)) return;
                            try {
                              if (activeTab === 'chemicals') await api.deleteChemical(item.id);
                              else await api.clearCustomerLedger(item.id);
                              onDataChange();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : 'Action failed');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      )}
      {quickPayCustomer && (
        <QuickPayModal 
          customer={quickPayCustomer} 
          onClose={() => setQuickPayCustomer(null)} 
          onPaid={onDataChange}
        />
      )}
      {manageCustomer && (
        <CustomerManageModal
          customer={manageCustomer}
          onClose={() => setManageCustomer(null)}
          onSaved={onDataChange}
          onOpenLedger={() => {
            const id = manageCustomer.id;
            setManageCustomer(null);
            onSelectCustomer(id);
          }}
        />
      )}
    </div>
  );
};

const CustomerDetail: React.FC<{ 
  customerId: string; 
  customers: Customer[]; 
  transactions: Transaction[];
  onBack: () => void;
  onRefresh: () => void;
}> = ({ customerId, customers, transactions, onBack, onRefresh }) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [comment, setComment] = useState('');
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [profitFrom, setProfitFrom] = useState('');
  const [profitTo, setProfitTo] = useState('');
  const [profit, setProfit] = useState<api.CustomerProfitReport | null>(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const customer = customers.find(c => c.id === customerId);

  useEffect(() => {
    if (customer) {
      setEditName(customer.name);
      setEditContact(customer.contact || '');
    }
  }, [customer?.id, customer?.name, customer?.contact]);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setProfitLoading(true);
    void api
      .fetchCustomerProfit(customerId, {
        dateFrom: profitFrom || undefined,
        dateTo: profitTo || undefined,
      })
      .then((report) => {
        if (!cancelled) setProfit(report);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setProfitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, profitFrom, profitTo]);

  const ledgerRows = useMemo(
    () => transactions.filter((t) => t.customerId === customerId),
    [transactions, customerId]
  );

  const handleSaveCustomer = async () => {
    if (!customer || !editName.trim()) return;
    setEditSaving(true);
    try {
      await api.updateCustomer(customer.id, { name: editName.trim(), contact: editContact.trim() });
      onRefresh();
      alert('Customer updated');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || !customer) return;
    const amount = parseFloat(paymentAmount);
    try {
      await api.recordPayment(customerId, {
        amount,
        occurred_at: new Date(paymentDate).toISOString(),
        comment: comment.trim(),
      });
      setPaymentAmount('');
      setComment('');
      onRefresh();
      alert('Payment recorded!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Payment failed');
    }
  };

  if (!customer) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowDownLeft className="w-4 h-4 rotate-90" /> Back
        </Button>
        <h2 className="text-2xl font-bold text-slate-900">{customer.name}'s Ledger</h2>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Edit customer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
          <Input value={editContact} onChange={(e) => setEditContact(e.target.value)} placeholder="Contact" />
        </div>
        <Button className="mt-4" onClick={handleSaveCustomer} disabled={editSaving}>
          {editSaving ? 'Saving…' : 'Save customer'}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-slate-900 mb-2">Profit (sales vs purchase cost + sale expenses)</h3>
        <p className="text-xs text-slate-500 mb-4">
          Each line: sale price minus average purchase rate, minus that sale&apos;s expenses (food, auto, labour entered on the sale).
        </p>
        <RecordFiltersBar
          customerId=""
          onCustomerChange={() => {}}
          dateFrom={profitFrom}
          dateTo={profitTo}
          onDateFromChange={setProfitFrom}
          onDateToChange={setProfitTo}
          showCustomer={false}
        />
        {profitLoading ? (
          <p className="text-sm text-slate-500">Loading profit…</p>
        ) : profit ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Revenue</p>
                <p className="text-lg font-bold text-emerald-700">₹{profit.revenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Cost</p>
                <p className="text-lg font-bold text-indigo-700">₹{profit.costOfGoods.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Sale expenses</p>
                <p className="text-lg font-bold text-amber-700">₹{profit.saleExpenses.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Net profit</p>
                <p className={cn('text-lg font-bold', profit.profit >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                  ₹{profit.profit.toLocaleString()}
                </p>
              </div>
            </div>
            <CustomerProfitSalesTable sales={profit.sales} />
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Chemical</th>
                    <th className="px-3 py-2 text-right">Sale @</th>
                    <th className="px-3 py-2 text-right">Buy @</th>
                    <th className="px-3 py-2 text-right">Net profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profit.lines.map((line, i) => (
                    <tr key={`${line.saleId}-${i}`}>
                      <td className="px-3 py-2">{line.chemicalName}</td>
                      <td className="px-3 py-2 text-right">₹{line.saleRate}</td>
                      <td className="px-3 py-2 text-right text-slate-500">₹{line.purchaseRate.toFixed(2)}</td>
                      <td className={cn('px-3 py-2 text-right font-bold', line.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        ₹{line.netProfit.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Current Balance</h3>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-4xl font-black", customer.balance > 0 ? "text-rose-500" : "text-emerald-500")}>
              ₹{Math.abs(customer.balance).toLocaleString()}
            </span>
            <span className="text-slate-400 font-medium">{customer.balance > 0 ? 'Due' : 'Credit'}</span>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 mb-4">Record Payment</h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Amount</label>
                <Input 
                  type="number" 
                  placeholder="Amount Paid" 
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Date & Time</label>
                <Input 
                  type="datetime-local" 
                  value={paymentDate} 
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Comments</label>
                <Input 
                  placeholder="e.g. Cash payment, GPay..." 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <Button onClick={handlePayment} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Receive Payment
              </Button>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Transaction History</h3>
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Comments</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerRows.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {format(asDate(t.date), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        t.type === 'debit' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 italic">
                      {t.comment || '-'}
                    </td>
                    <td className={cn("px-6 py-4 text-right font-bold", t.type === 'debit' ? "text-rose-500" : "text-emerald-500")}>
                      {t.type === 'debit' ? '+' : '-'}₹{t.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 font-medium">
                      ₹{t.balanceAfter.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Main App ---

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<'dashboard' | 'purchase' | 'sales' | 'admin'>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);

  // Data State
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [ch, cu, pu, sa, le] = await Promise.all([
        api.fetchChemicals(),
        api.fetchCustomers(),
        api.fetchPurchases(),
        api.fetchSales(),
        api.fetchLedgerAll(),
      ]);
      setChemicals(ch as Chemical[]);
      setCustomers(cu as Customer[]);
      setPurchases(pu as Purchase[]);
      setSales(sa as Sale[]);
      setTransactions(le as Transaction[]);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Could not load data from API. Is the backend running?');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user, loadData]);

  if (!user) return <Home />;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'purchase', label: 'Purchases', icon: ShoppingCart },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'admin', label: 'Admin Panel', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Beaker className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900">ChemTracker</span>
            </div>
            <Button variant="ghost" className="lg:hidden p-1" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id as any);
                  setSelectedCustomerId(null);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeModule === item.id && !selectedCustomerId
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Logged in as</p>
              <p className="font-bold text-slate-900 capitalize">{user}</p>
              <button onClick={logout} className="text-xs text-rose-500 font-bold mt-2 hover:underline">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="lg:hidden p-2" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <h2 className="text-xl font-bold text-slate-900 capitalize">
              {selectedCustomerId ? 'Customer Ledger' : activeModule}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
              <Calendar className="w-3 h-3" />
              {format(new Date(), 'EEEE, MMM dd')}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCustomerId || activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedCustomerId ? (
                <CustomerDetail 
                  customerId={selectedCustomerId} 
                  customers={customers} 
                  transactions={transactions}
                  onBack={() => setSelectedCustomerId(null)} 
                  onRefresh={loadData}
                />
              ) : (
                <>
                  {activeModule === 'dashboard' && (
                    <Dashboard
                      sales={sales}
                      purchases={purchases}
                      customers={customers}
                      chemicals={chemicals}
                      transactions={transactions}
                      onEditSale={(sale) => {
                        setSaleToEdit(sale);
                        setActiveModule('sales');
                      }}
                    />
                  )}
                  {activeModule === 'purchase' && <PurchaseModule chemicals={chemicals} purchases={purchases} onSaved={loadData} />}
                  {activeModule === 'sales' && (
                    <SalesModule
                      chemicals={chemicals}
                      customers={customers}
                      sales={sales}
                      onSaved={loadData}
                      saleToEdit={saleToEdit}
                      onSaleEditOpened={() => setSaleToEdit(null)}
                    />
                  )}
                  {activeModule === 'admin' && (
                    <AdminModule 
                      chemicals={chemicals} 
                      customers={customers}
                      transactions={transactions}
                      onSelectCustomer={setSelectedCustomerId}
                      onDataChange={loadData}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
