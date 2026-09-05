import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Filter, 
  Kanban, 
  List, 
  ArrowRight, 
  Calendar, 
  Building2, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';

const STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  UNDER_NEGOTIATION: 'bg-blue-100 text-blue-800 border-blue-300',
  CONFIRMED: 'bg-teal-100 text-teal-800 border-teal-300',
  FULFILLING: 'bg-purple-100 text-purple-800 border-purple-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-300',
  CANCELLED: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function QuotationsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [quotations, setQuotations] = useState([]);
  const [pipelineColumns, setPipelineColumns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Quote Form
  const [formData, setFormData] = useState({
    customerId: '',
    promisedDeliveryDate: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesRes, pipeRes, custRes] = await Promise.all([
        api.get('/quotations', { params: { limit: 100 } }),
        api.get('/quotations/pipeline'),
        api.get('/customers', { params: { limit: 100 } }),
      ]);
      setQuotations(quotesRes.data?.data || []);
      setPipelineColumns(pipeRes.data?.data?.columns || []);
      const custs = custRes.data?.data || [];
      setCustomers(custs);
      if (custs.length > 0 && !formData.customerId) {
        setFormData((prev) => ({ ...prev, customerId: custs[0].id }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error('Please select a customer account');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/quotations', {
        customerId: formData.customerId,
        promisedDeliveryDate: formData.promisedDeliveryDate || undefined,
      });
      toast.success('Draft quotation created');
      setShowCreateModal(false);
      const newId = res.data?.data?.quotation?.id || res.data?.data?.id;
      if (newId) {
        navigate(`/dashboard/quotations/${newId}`);
      } else {
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    const matchesSearch =
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.customerName.toLowerCase().includes(search.toLowerCase()) ||
      q.salesRepName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPipelineValue = quotations.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0);
  const pendingApprovalsCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const approvedCount = quotations.filter((q) => ['APPROVED', 'CONFIRMED', 'COMPLETED'].includes(q.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Quotations Hub & Sales Workspace"
          subtitle="Real-time multi-line quote builder, live deal margin calculations, and approval pipeline."
        />
        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-lg border border-(--app-color-border) bg-white p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-(--app-color-primary) text-white shadow-xs'
                  : 'text-(--app-color-text-muted) hover:text-(--app-color-text)'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-(--app-color-primary) text-white shadow-xs'
                  : 'text-(--app-color-text-muted) hover:text-(--app-color-text)'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Pipeline
            </button>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-lg border border-(--app-color-border) bg-white px-3 py-1.5 text-xs font-semibold text-(--app-color-text) hover:bg-(--app-color-surface-elevated) transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-(--app-color-primary) px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New Quotation
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Deal Pipeline" value={`₹${totalPipelineValue.toLocaleString('en-IN')}`} change={`${quotations.length} Deals`} trend="up" />
        <StatCard label="Pending Governance Sign-off" value={`${pendingApprovalsCount} Deals`} change="SLA Active" trend={pendingApprovalsCount > 0 ? 'down' : 'neutral'} />
        <StatCard label="Approved / Won Deals" value={`${approvedCount} Deals`} change="Ready for Fulfillment" trend="up" />
        <StatCard label="Live Margin Engine" value="Self-Governing" change="Active Thresholds" trend="up" />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-(--app-color-border) bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--app-color-text-muted)" />
          <input
            type="text"
            placeholder="Search by quote number (e.g. Q-2026-000001), customer name, or rep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-(--app-color-border) bg-(--app-color-surface-elevated)/40 pl-9.5 pr-4 py-2 text-xs font-medium text-(--app-color-text) placeholder:text-(--app-color-text-muted) focus:border-(--app-color-primary) focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-(--app-color-border) bg-white px-3 py-2 text-xs font-semibold text-(--app-color-text) focus:border-(--app-color-primary) focus:outline-none"
          >
            <option value="ALL">All Statuses ({quotations.length})</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="UNDER_NEGOTIATION">Under Negotiation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="FULFILLING">Fulfilling</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* View Mode 1: Table List View */}
      {viewMode === 'list' && (
        <div className="overflow-hidden rounded-xl border border-(--app-color-border) bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-(--app-color-border) bg-(--app-color-surface-elevated)/70 text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">
                <tr>
                  <th className="px-4 py-3">Quote #</th>
                  <th className="px-4 py-3">Customer & Tier</th>
                  <th className="px-4 py-3">Sales Rep</th>
                  <th className="px-4 py-3 text-right">Grand Total (INR)</th>
                  <th className="px-4 py-3 text-right">Margin %</th>
                  <th className="px-4 py-3 text-center">Governance Level</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--app-color-border)">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-xs text-(--app-color-text-muted)">
                      <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-(--app-color-primary)" />
                      Loading quotations...
                    </td>
                  </tr>
                ) : filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-xs text-(--app-color-text-muted)">
                      No quotations found. Click "+ New Quotation" to create your first deal.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => {
                    const margin = Number(q.estimatedMarginPct || 0);
                    return (
                      <tr
                        key={q.id}
                        onClick={() => navigate(`/dashboard/quotations/${q.id}`)}
                        className="cursor-pointer hover:bg-(--app-color-surface-elevated)/40 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-(--app-color-primary)">
                          {q.quoteNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-(--app-color-text)">{q.customerName}</div>
                          <span className="text-[10px] font-semibold text-(--app-color-text-muted)">
                            {q.customerTier} Tier
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-(--app-color-text)">
                          {q.salesRepName}
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-(--app-color-text)">
                          ₹{Number(q.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`font-bold ${
                              margin >= 20 ? 'text-teal-700' : margin >= 10 ? 'text-amber-700' : 'text-rose-700'
                            }`}
                          >
                            {margin}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                            {q.requiredApprovalLevel || 'NONE'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              STATUS_COLORS[q.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {q.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-(--app-color-primary)">
                          <span className="inline-flex items-center gap-1 hover:underline">
                            Open <ArrowRight className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Mode 2: Kanban Pipeline View */}
      {viewMode === 'kanban' && (
        <div className="grid gap-4 overflow-x-auto pb-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 min-w-[1200px]">
          {pipelineColumns.map((col) => (
            <div key={col.status} className="flex flex-col rounded-xl border border-(--app-color-border) bg-slate-50/70 p-3 shadow-xs min-h-[450px]">
              <div className="flex items-center justify-between pb-2 border-b border-(--app-color-border) mb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-(--app-color-text)">{col.label}</h4>
                  <span className="text-[10px] text-(--app-color-text-muted) font-semibold">
                    ₹{col.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold border border-(--app-color-border)">
                  {col.count}
                </span>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {col.quotations.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-[11px] text-(--app-color-text-muted) border-2 border-dashed border-(--app-color-border) rounded-lg">
                    No deals
                  </div>
                ) : (
                  col.quotations.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => navigate(`/dashboard/quotations/${q.id}`)}
                      className="cursor-pointer rounded-lg border border-(--app-color-border) bg-white p-3 shadow-xs hover:border-(--app-color-primary) transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[11px] font-bold text-(--app-color-primary)">
                          {q.quoteNumber}
                        </span>
                        <span className="text-[10px] font-bold text-teal-700">
                          {Number(q.estimatedMarginPct || 0)}%
                        </span>
                      </div>

                      <div className="font-semibold text-xs text-(--app-color-text) line-clamp-1">
                        {q.customerName}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-(--app-color-border)/60 text-[11px]">
                        <span className="font-extrabold text-(--app-color-text)">
                          ₹{Number(q.grandTotal).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-(--app-color-text-muted)">
                          {q.salesRepName}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Quotation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-(--app-color-border) bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-(--app-color-border)">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--app-color-primary-soft) text-(--app-color-primary)">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-(--app-color-text)">Create New Quotation</h3>
                  <p className="text-[11px] text-(--app-color-text-muted)">Initialize quotation header workspace</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-(--app-color-text-muted) hover:text-(--app-color-text) text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-4 pt-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                  Customer Account *
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tier} Tier — {c.tier === 'GOLD' ? '30%' : c.tier === 'SILVER' ? '20%' : '10%'} Cap)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                  Promised Delivery Target Date
                </label>
                <input
                  type="date"
                  value={formData.promisedDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, promisedDeliveryDate: e.target.value })}
                  className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-(--app-color-border) px-4 py-2 text-xs font-semibold text-(--app-color-text) hover:bg-(--app-color-surface-elevated)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-(--app-color-primary) px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {submitting ? 'Initializing...' : 'Open Quotation Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
