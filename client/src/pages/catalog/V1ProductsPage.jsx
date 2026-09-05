import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  SlidersHorizontal,
  X,
  DollarSign,
  Percent,
  Boxes,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1ProductsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

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
      toast.success('Product SKU created successfully');
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
      toast.error(err.response?.data?.message || 'Failed to create product SKU');
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

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Product" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Top Control Banner & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-[#714b67]" />
              Product Catalog & Master SKUs
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage enterprise software licenses, appliances, services, margin baselines, and catalog pricing.
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>New Product SKU</span>
            </button>
          </div>
        </div>

        {/* ── Filter and Search Bar ── */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU, product name, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-xs font-medium border border-slate-300 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 outline-hidden focus:border-[#714b67] focus:bg-white focus:ring-1 focus:ring-[#714b67] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all cursor-pointer shadow-xs"
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">All Product Types</option>
              <option value="SUBSCRIPTION">Recurring Subscription</option>
              <option value="SERVICE">Professional Service</option>
              <option value="ONE_TIME">One-Time Asset</option>
            </select>
          </div>
        </div>

        {/* ── Products Table ── */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">SKU & Product Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5 text-right">Base Price (INR)</th>
                  <th className="px-4 py-3.5 text-right">Unit Cost</th>
                  <th className="px-4 py-3.5 text-right">Base Margin</th>
                  <th className="px-4 py-3.5 text-center">Tax (GST)</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-16 text-center text-xs text-slate-400">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-[#714b67]" />
                      Loading product catalog...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-16 text-center text-xs text-slate-500 space-y-2">
                      <Package className="mx-auto h-8 w-8 text-slate-300 mb-1" />
                      <p className="font-bold text-slate-700 text-sm">No products match the search criteria</p>
                      <p className="text-slate-400">Try adjusting your filters or search keywords.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const basePrice = Number(p.basePrice || 0);
                    const cost = Number(p.estimatedCost || 0);
                    const marginPct = basePrice > 0 ? (((basePrice - cost) / basePrice) * 100).toFixed(1) : '0';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="font-mono text-[11px] text-[#714b67] font-bold mt-0.5">
                            {p.sku}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                            <Layers className="h-3 w-3 text-slate-500" />
                            {p.categoryName || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
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
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          ₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          <span className="text-[10px] text-slate-400 block font-normal">/{p.unit}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-500">
                          ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-teal-700">
                          {marginPct}%
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-600">
                          {Number(p.taxRate || 0)}%
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {p.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
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
      </main>

      {/* ── Modal: Create New Product SKU ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#714b67]/10 text-[#714b67]">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">New Product Catalog SKU</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Add master SKU, pricing, and cost baseline</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    SKU Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APP-005"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs font-bold text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Product Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Security Gateway"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Product Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all cursor-pointer"
                  >
                    <option value="SUBSCRIPTION">Subscription</option>
                    <option value="SERVICE">Service</option>
                    <option value="ONE_TIME">One-Time Asset</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Base Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="50000"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Est. Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="30000"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    placeholder="license / unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tax Rate / GST (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="18"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short product overview..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
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
                  {submitting ? 'Saving SKU...' : 'Save Product SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
