import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  UserCheck, 
  RefreshCw,
  Award,
  Filter,
  ArrowUpRight,
  FileSpreadsheet,
  X,
  User,
  Tag,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1CustomersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [customers, setCustomers] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tier: 'BRONZE',
    priceListId: '',
    billingAddress: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, plRes] = await Promise.all([
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/price-lists'),
      ]);
      setCustomers(custRes.data?.data || []);
      setPriceLists(plRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load customer accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/customers', {
        ...formData,
        priceListId: formData.priceListId || undefined,
      });
      toast.success('Customer account created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        tier: 'BRONZE',
        priceListId: '',
        billingAddress: '',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.billingAddress && c.billingAddress.toLowerCase().includes(search.toLowerCase()));
    const matchesTier = selectedTier === 'ALL' || c.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Customers" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Top Control Banner & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-[#714b67]" />
              Enterprise Customer Accounts & Tiers
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage accounts, discount governance tier caps, assigned price lists, and quote generation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {['SALES_REP', 'SALES_MANAGER', 'ADMIN'].includes(user?.role) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-98"
              >
                <Plus className="h-4 w-4" />
                <span>New Customer</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Search & Filter Pill Toolbar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, email, or billing address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-xs font-medium border border-slate-300 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 outline-hidden focus:border-[#714b67] focus:bg-white focus:ring-1 focus:ring-[#714b67] transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['ALL', 'GOLD', 'SILVER', 'BRONZE'].map((tier) => {
              const active = selectedTier === tier;
              const count =
                tier === 'ALL'
                  ? customers.length
                  : customers.filter((c) => c.tier === tier).length;

              return (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    active
                      ? 'bg-[#714b67] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tier === 'ALL' ? 'All Tiers' : `${tier} Tier`} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Customer Accounts Grid ── */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-16 text-center shadow-xs">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#714b67] mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading enterprise customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-16 text-center shadow-xs space-y-3">
            <Building2 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No customer accounts found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No accounts match the current filter or search criteria. Try clearing the filter or add a new customer account.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedTier('ALL');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#714b67]/50 hover:shadow-md transition-all duration-150 space-y-3.5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#714b67]/10 text-[#714b67] shrink-0 group-hover:bg-[#714b67] group-hover:text-white transition-colors">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#714b67] transition-colors line-clamp-1">
                          {cust.name}
                        </h3>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" /> {cust.email}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider shrink-0 ${
                        cust.tier === 'GOLD'
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : cust.tier === 'SILVER'
                          ? 'bg-slate-100 text-slate-800 border border-slate-300'
                          : 'bg-orange-50 text-orange-800 border border-orange-300'
                      }`}
                    >
                      <Award className="h-3.5 w-3.5" />
                      {cust.tier} ({cust.tier === 'GOLD' ? '30%' : cust.tier === 'SILVER' ? '20%' : '10%'})
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-3 space-y-1.5 text-xs text-slate-500">
                    {cust.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{cust.phone}</span>
                      </div>
                    )}
                    {cust.billingAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-700 line-clamp-1">{cust.billingAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                    <Tag className="h-3 w-3 text-[#008784]" />
                    <span className="truncate max-w-[180px]">
                      {cust.priceListName || 'Standard Commercial (INR)'}
                    </span>
                  </div>

                  {['SALES_REP', 'SALES_MANAGER', 'ADMIN'].includes(user?.role) ? (
                    <button
                      onClick={() => navigate('/v1/quotations/new')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#714b67] hover:text-[#5a3a52] hover:underline cursor-pointer"
                    >
                      <span>Create Deal</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">Account Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Modal: Create New Customer ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#714b67]/10 text-[#714b67]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">New Enterprise Customer</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Add company profile & assign governance policy</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Logistics Pvt Ltd"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Contact Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="procurement@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98000 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Customer Tier <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all cursor-pointer"
                  >
                    <option value="BRONZE">Bronze (10% Max Delegation)</option>
                    <option value="SILVER">Silver (20% Max Delegation)</option>
                    <option value="GOLD">Gold (30% Max Delegation)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Assigned Price List
                  </label>
                  <select
                    value={formData.priceListId}
                    onChange={(e) => setFormData({ ...formData, priceListId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all cursor-pointer"
                  >
                    <option value="">Default Standard List</option>
                    {priceLists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Billing & Corporate Address
                </label>
                <textarea
                  rows="2"
                  placeholder="Street, City, State, PIN..."
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating Account...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
