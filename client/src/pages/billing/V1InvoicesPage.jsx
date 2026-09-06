import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, Search, ArrowUpRight, Clock, CheckCircle2, AlertCircle, IndianRupee, FileText } from 'lucide-react';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';
import Spinner from '../../components/Spinner.jsx';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ISSUED: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOID: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function V1InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { params: { limit: 100 } });
      const data = res.data?.data;
      setInvoices(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.warn('Invoices fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return inv.invoiceNumber?.toLowerCase().includes(term) || inv.customerName?.toLowerCase().includes(term);
  });

  const totalBilled = filtered.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const totalCollected = filtered.reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);
  const totalOutstanding = totalBilled - totalCollected;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Invoices" />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Header with Title & Metrics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#008784]/10 text-[#008784]">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Invoices & Billing</h1>
              <p className="text-xs text-slate-500">Commercial invoices, recurring billing lines, and payment records</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Invoiced</span>
              <span className="font-bold text-slate-800">₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2 shadow-xs">
              <span className="text-[10px] text-emerald-600 font-bold uppercase block">Total Collected</span>
              <span className="font-bold text-emerald-700">₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2 shadow-xs">
              <span className="text-[10px] text-amber-600 font-bold uppercase block">Outstanding</span>
              <span className="font-bold text-amber-700">₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s ? 'bg-[#1e293b] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice # or customer..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#008784]/30"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <Spinner size="lg" variant="primary" />
              <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading invoices...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No invoices match this filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Invoice #</th>
                    <th className="text-left px-5 py-3 font-semibold">Customer</th>
                    <th className="text-left px-5 py-3 font-semibold">Order</th>
                    <th className="text-left px-5 py-3 font-semibold">Type</th>
                    <th className="text-left px-5 py-3 font-semibold">Due Date</th>
                    <th className="text-right px-5 py-3 font-semibold">Total Amount</th>
                    <th className="text-right px-5 py-3 font-semibold">Paid</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-right px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">{inv.customerName}</td>
                      <td className="px-5 py-3.5 text-slate-500">{inv.orderNumber || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {inv.invoiceType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{inv.dueDate || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                        ₹{Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">
                        ₹{Number(inv.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${STATUS_STYLES[inv.status] || STATUS_STYLES.DRAFT}`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/v1/invoices/${inv.id}`}
                          className="text-[#008784] font-bold hover:underline inline-flex items-center gap-0.5"
                        >
                          View <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
