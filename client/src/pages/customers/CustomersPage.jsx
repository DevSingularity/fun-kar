import { useState, useEffect } from 'react';
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
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';

export default function CustomersPage() {
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
      toast.error(err.response?.data?.message || 'Failed to load customers');
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

  const goldCount = customers.filter((c) => c.tier === 'GOLD').length;
  const silverCount = customers.filter((c) => c.tier === 'SILVER').length;
  const bronzeCount = customers.filter((c) => c.tier === 'BRONZE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Enterprise Customer Accounts & Tiers"
          subtitle="Manage customer relationships, tier discount entitlements, and custom contract matrices."
        />
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-lg border border-(--app-color-border) bg-white px-3.5 py-2 text-xs font-semibold text-(--app-color-text) hover:bg-(--app-color-surface-elevated) transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-(--app-color-primary) px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Enterprise Accounts" value={customers.length.toString()} change="All Active" trend="up" />
        <StatCard label="Gold Tier (30% Cap)" value={goldCount.toString()} change="Key Enterprise" trend="up" />
        <StatCard label="Silver Tier (20% Cap)" value={silverCount.toString()} change="Growth Accounts" trend="neutral" />
        <StatCard label="Bronze Tier (10% Cap)" value={bronzeCount.toString()} change="Standard Entry" trend="neutral" />
      </div>

      {/* Search & Tier Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-(--app-color-border) bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--app-color-text-muted)" />
          <input
            type="text"
            placeholder="Search customer name, email, or corporate headquarters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-(--app-color-border) bg-(--app-color-surface-elevated)/40 pl-9.5 pr-4 py-2 text-xs font-medium text-(--app-color-text) placeholder:text-(--app-color-text-muted) focus:border-(--app-color-primary) focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="rounded-lg border border-(--app-color-border) bg-white px-3 py-2 text-xs font-semibold text-(--app-color-text) focus:border-(--app-color-primary) focus:outline-none"
          >
            <option value="ALL">All Tiers ({customers.length})</option>
            <option value="GOLD">Gold Tier (30% Max)</option>
            <option value="SILVER">Silver Tier (20% Max)</option>
            <option value="BRONZE">Bronze Tier (10% Max)</option>
          </select>
        </div>
      </div>

      {/* Customer Accounts Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full rounded-xl border border-(--app-color-border) bg-white p-8 text-center text-xs text-(--app-color-text-muted)">
            <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-(--app-color-primary)" />
            Loading customer accounts...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full rounded-xl border border-(--app-color-border) bg-white p-8 text-center text-xs text-(--app-color-text-muted)">
            No customers found matching the search criteria.
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="rounded-xl border border-(--app-color-border) bg-white p-5 shadow-xs hover:border-(--app-color-primary)/40 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--app-color-primary-soft) text-(--app-color-primary)">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-(--app-color-text)">{cust.name}</h4>
                    <span className="text-[11px] text-(--app-color-text-muted) flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" /> {cust.email}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${
                    cust.tier === 'GOLD'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : cust.tier === 'SILVER'
                      ? 'bg-slate-100 text-slate-800 border border-slate-300'
                      : 'bg-orange-100 text-orange-800 border border-orange-300'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  {cust.tier} (
                  {cust.tier === 'GOLD' ? '30%' : cust.tier === 'SILVER' ? '20%' : '10%'})
                </span>
              </div>

              <div className="border-t border-(--app-color-border) pt-3 space-y-1.5 text-xs text-(--app-color-text-muted)">
                {cust.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-(--app-color-text-muted)" />
                    <span>{cust.phone}</span>
                  </div>
                )}
                {cust.billingAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-(--app-color-text-muted) shrink-0 mt-0.5" />
                    <span className="text-[11px] text-(--app-color-text)">{cust.billingAddress}</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-(--app-color-surface-elevated) p-2.5 flex items-center justify-between text-[11px] font-semibold text-(--app-color-text)">
                <span>Price List Applied:</span>
                <span className="text-(--app-color-primary)">
                  {cust.priceListName || 'Standard Commercial (INR)'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-(--app-color-border) bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-(--app-color-border)">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--app-color-primary-soft) text-(--app-color-primary)">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-(--app-color-text)">New Enterprise Customer</h3>
                  <p className="text-[11px] text-(--app-color-text-muted)">Add company profile and assign governance tier</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-(--app-color-text-muted) hover:text-(--app-color-text) text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 pt-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Logistics Pvt Ltd"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="procurement@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98000 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Customer Tier *
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  >
                    <option value="BRONZE">Bronze (10% Max Delegation)</option>
                    <option value="SILVER">Silver (20% Max Delegation)</option>
                    <option value="GOLD">Gold (30% Max Delegation)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Assigned Price List
                  </label>
                  <select
                    value={formData.priceListId}
                    onChange={(e) => setFormData({ ...formData, priceListId: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                  Billing & Corporate Address
                </label>
                <textarea
                  rows="2"
                  placeholder="Street, City, State, PIN..."
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-medium focus:border-(--app-color-primary) focus:outline-none"
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
                  {submitting ? 'Creating...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
