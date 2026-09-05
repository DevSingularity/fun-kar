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
  ArrowUpRight,
  Edit2,
  Trash2,
  Power,
  ShieldCheck,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1ProductsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State (Admin only)
  const [editProduct, setEditProduct] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    categoryId: '',
    productType: 'SUBSCRIPTION',
    unit: 'license',
    basePrice: '',
    estimatedCost: '',
    taxRate: '18',
    description: '',
  });

  // Create Form State
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

  const handleOpenEdit = (p) => {
    setEditProduct(p);
    setEditFormData({
      name: p.name || '',
      categoryId: p.categoryId || '',
      productType: p.productType || 'SUBSCRIPTION',
      unit: p.unit || 'license',
      basePrice: p.basePrice || '',
      estimatedCost: p.estimatedCost || '',
      taxRate: p.taxRate || '18',
      description: p.description || '',
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editProduct) return;
    setEditing(true);
    try {
      await api.patch(`/products/${editProduct.id}`, {
        ...editFormData,
        basePrice: Number(editFormData.basePrice),
        estimatedCost: Number(editFormData.estimatedCost || 0),
        taxRate: Number(editFormData.taxRate || 0),
      });
      toast.success(`Product ${editProduct.sku} updated successfully`);
      setEditProduct(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update product');
    } finally {
      setEditing(false);
    }
  };

  const handleToggleActive = async (p) => {
    try {
      await api.patch(`/products/${p.id}`, {
        isActive: !p.isActive,
      });
      toast.success(`Product ${p.sku} ${p.isActive ? 'disabled' : 'activated'}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`Are you sure you want to deactivate SKU ${p.sku}?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success(`Product SKU ${p.sku} disabled`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
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
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Package className="h-6 w-6 text-[#714b67]" />
                Product Catalog & Master SKUs
              </h1>
              {!isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 border border-slate-200">
                  <Lock className="h-3 w-3 text-slate-400" />
                  Read-Only View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin
                ? 'Full Catalog Management — create, configure pricing matrices, edit baseline margins, and activate/deactivate master SKUs.'
                : 'Browse enterprise software licenses, appliances, services, margin baselines, and catalog pricing for deal generation.'}
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
            
            {/* Admin Only: Create Product Button */}
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-98"
              >
                <Plus className="h-4 w-4" />
                <span>New Product SKU</span>
              </button>
            )}
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
                  {isAdmin && <th className="px-4 py-3.5 text-right">Admin Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? "9" : "8"} className="px-4 py-16 text-center text-xs text-slate-400">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-[#714b67]" />
                      Loading product catalog...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? "9" : "8"} className="px-4 py-16 text-center text-xs text-slate-500 space-y-2">
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
                        
                        {/* Admin Action Buttons */}
                        {isAdmin && (
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Product SKU"
                                className="p-1.5 rounded-md text-slate-500 hover:text-[#714b67] hover:bg-slate-100 transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(p)}
                                title={p.isActive ? 'Deactivate SKU' : 'Activate SKU'}
                                className={`p-1.5 rounded-md transition-colors ${
                                  p.isActive
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                title="Disable / Delete SKU"
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── Modal: Create New Product SKU (Admin Only) ── */}
      {isAdmin && showCreateModal && (
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

      {/* ── Modal: Edit Product SKU (Admin Only) ── */}
      {isAdmin && editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#714b67]/10 text-[#714b67]">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit SKU: {editProduct.sku}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Update pricing, cost baseline, and metadata</p>
                </div>
              </div>
              <button
                onClick={() => setEditProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Product Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editFormData.categoryId}
                    onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value })}
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
                    value={editFormData.productType}
                    onChange={(e) => setEditFormData({ ...editFormData, productType: e.target.value })}
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
                    value={editFormData.basePrice}
                    onChange={(e) => setEditFormData({ ...editFormData, basePrice: e.target.value })}
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
                    value={editFormData.estimatedCost}
                    onChange={(e) => setEditFormData({ ...editFormData, estimatedCost: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={editFormData.unit}
                    onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
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
                    value={editFormData.taxRate}
                    onChange={(e) => setEditFormData({ ...editFormData, taxRate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
                >
                  {editing ? 'Updating SKU...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
