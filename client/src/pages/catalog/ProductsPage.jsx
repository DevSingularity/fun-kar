import { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  Tag, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    categoryId: '',
    productType: 'SUBSCRIPTION',
    unit: 'license',
    basePrice: '',
    estimatedCost: '',
    taxRate: '18',
    description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products', { params: { limit: 100 } }),
        api.get('/categories', { params: { limit: 100 } }),
      ]);
      setProducts(prodRes.data?.data || []);
      setCategories(catRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load catalog products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast.error('Please select a product category');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/products', {
        ...formData,
        basePrice: Number(formData.basePrice),
        estimatedCost: Number(formData.estimatedCost || 0),
        taxRate: Number(formData.taxRate || 0),
      });
      toast.success('Product created successfully');
      setShowCreateModal(false);
      setFormData({
        sku: '',
        name: '',
        categoryId: '',
        productType: 'SUBSCRIPTION',
        unit: 'license',
        basePrice: '',
        estimatedCost: '',
        taxRate: '18',
        description: '',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesType = selectedType === 'ALL' || p.productType === selectedType;
    return matchesSearch && matchesCat && matchesType;
  });

  const totalCatalogValue = products.reduce((sum, p) => sum + Number(p.basePrice || 0), 0);
  const avgMargin = products.length
    ? (
        products.reduce((sum, p) => {
          const bp = Number(p.basePrice || 0);
          const ec = Number(p.estimatedCost || 0);
          return sum + (bp > 0 ? ((bp - ec) / bp) * 100 : 0);
        }, 0) / products.length
      ).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Product Catalog & Master SKUs"
          subtitle="Manage enterprise software, hardware appliances, cloud services, and standard pricing."
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
            New Product SKU
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Catalog SKUs" value={products.length.toString()} change="+100% Synced" trend="up" />
        <StatCard label="Catalog Categories" value={categories.length.toString()} change="4 Main Groups" trend="neutral" />
        <StatCard label="Avg Baseline Margin" value={`${avgMargin}%`} change="Healthy" trend="up" />
        <StatCard label="Catalog Price Index" value={`₹${totalCatalogValue.toLocaleString('en-IN')}`} change="Active INR" trend="neutral" />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-(--app-color-border) bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--app-color-text-muted)" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-(--app-color-border) bg-(--app-color-surface-elevated)/40 pl-9.5 pr-4 py-2 text-xs font-medium text-(--app-color-text) placeholder:text-(--app-color-text-muted) focus:border-(--app-color-primary) focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-(--app-color-border) bg-white px-3 py-2 text-xs font-semibold text-(--app-color-text) focus:border-(--app-color-primary) focus:outline-none"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-(--app-color-border) bg-white px-3 py-2 text-xs font-semibold text-(--app-color-text) focus:border-(--app-color-primary) focus:outline-none"
          >
            <option value="ALL">All Product Types</option>
            <option value="SUBSCRIPTION">Recurring Subscription</option>
            <option value="SERVICE">Professional Service</option>
            <option value="ONE_TIME">One-Time Asset</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-(--app-color-border) bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-(--app-color-border) bg-(--app-color-surface-elevated)/70 text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">
              <tr>
                <th className="px-4 py-3">SKU & Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Base Price (INR)</th>
                <th className="px-4 py-3 text-right">Unit Cost</th>
                <th className="px-4 py-3 text-right">Base Margin</th>
                <th className="px-4 py-3 text-center">Tax (GST)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--app-color-border)">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-xs text-(--app-color-text-muted)">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-(--app-color-primary)" />
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-xs text-(--app-color-text-muted)">
                    No products found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const basePrice = Number(p.basePrice || 0);
                  const cost = Number(p.estimatedCost || 0);
                  const marginPct = basePrice > 0 ? (((basePrice - cost) / basePrice) * 100).toFixed(1) : '0';

                  return (
                    <tr key={p.id} className="hover:bg-(--app-color-surface-elevated)/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-(--app-color-text)">{p.name}</div>
                        <div className="font-mono text-[11px] text-(--app-color-primary) font-semibold mt-0.5">
                          {p.sku}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-(--app-color-text)">
                        <span className="inline-flex items-center gap-1 rounded-md bg-(--app-color-surface-elevated) px-2 py-0.5 text-[11px] font-semibold text-(--app-color-text-muted) border border-(--app-color-border)">
                          <Layers className="h-3 w-3" />
                          {p.categoryName || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            p.productType === 'SUBSCRIPTION'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : p.productType === 'SERVICE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {p.productType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-(--app-color-text)">
                        ₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-(--app-color-text-muted) block font-normal">/{p.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-(--app-color-text-muted)">
                        ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-teal-700">
                        {marginPct}%
                      </td>
                      <td className="px-4 py-3.5 text-center font-medium text-(--app-color-text-muted)">
                        {Number(p.taxRate || 0)}%
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {p.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Disabled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-(--app-color-border) bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-(--app-color-border)">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--app-color-primary-soft) text-(--app-color-primary)">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-(--app-color-text)">Create Master Product SKU</h3>
                  <p className="text-[11px] text-(--app-color-text-muted)">Add item to catalog with standard pricing</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-(--app-color-text-muted) hover:text-(--app-color-text) text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DF-SEC-01"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Product Type *
                  </label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  >
                    <option value="SUBSCRIPTION">Recurring Subscription</option>
                    <option value="SERVICE">Professional Service</option>
                    <option value="ONE_TIME">One-Time Asset</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Security Gateway Appliance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Unit of Measure *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. license, month, device"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="120000"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Est. Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="25000"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="18"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Provide scope, features, or SLA details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {submitting ? 'Creating SKU...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
