import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Building2, 
  Calendar, 
  Layers, 
  Sun, 
  Moon, 
  LogOut, 
  Sparkles, 
  Info,
  X,
  PlusCircle,
  HelpCircle,
  MousePointer2,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

export default function V1QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [brightness, setBrightness] = useState(85);

  // Line item add modal / inline builder
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [newLine, setNewLine] = useState({
    productId: '',
    quantity: 1,
    discountPct: 0,
  });
  const [addingLine, setAddingLine] = useState(false);

  // Submission result modal
  const [submitResult, setSubmitResult] = useState(null);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const [quoteRes, prodRes, custRes] = await Promise.all([
        api.get(`/quotations/${id}`),
        api.get('/products', { params: { limit: 100 } }),
        api.get('/customers', { params: { limit: 100 } }),
      ]);
      const quote = quoteRes.data?.data || null;
      setData(quote);
      const prods = prodRes.data?.data || [];
      setProducts(prods);
      setCustomers(custRes.data?.data || []);
      if (prods.length > 0 && !newLine.productId) {
        setNewLine((prev) => ({ ...prev, productId: prods[0].id }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    clearAuth();
    toast.success('Logged out.');
    navigate('/login');
  };

  const handleAddLine = async (e) => {
    e.preventDefault();
    if (!newLine.productId) {
      toast.error('Please select a product');
      return;
    }
    setAddingLine(true);
    try {
      await api.post(`/quotations/${id}/items`, {
        productId: newLine.productId,
        quantity: Number(newLine.quantity) || 1,
        discountPct: Number(newLine.discountPct) || 0,
      });
      toast.success('Product added to quotation');
      setShowAddLineModal(false);
      setNewLine({
        productId: products[0]?.id || '',
        quantity: 1,
        discountPct: 0,
      });
      fetchQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add product');
    } finally {
      setAddingLine(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to remove this line item?')) return;
    try {
      await api.delete(`/quotations/${id}/items/${itemId}`);
      toast.success('Item removed');
      fetchQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    }
  };

  const handleAddUpsell = async (skuName, defaultDiscount = 0) => {
    // Find matching or closest product in catalog
    const matched = products.find((p) => 
      p.name.toLowerCase().includes(skuName.toLowerCase()) ||
      p.sku.toLowerCase().includes(skuName.toLowerCase())
    ) || products[products.length - 1];

    if (!matched) {
      toast.error('Product not found in catalog');
      return;
    }

    try {
      await api.post(`/quotations/${id}/items`, {
        productId: matched.id,
        quantity: 1,
        discountPct: defaultDiscount,
      });
      toast.success(`Added ${matched.name} to quotation`);
      fetchQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add upsell');
    }
  };

  const handleSubmitQuotation = async () => {
    if (!data?.items || data.items.length === 0) {
      toast.error('Please add at least one line item before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/quotations/${id}/submit`);
      const resultData = res.data?.data;
      setSubmitResult(resultData);
      toast.success(res.data?.message || 'Quotation submitted successfully!');
      fetchQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve tier limit for the customer
  const customerTier = data?.customerTier || 'BRONZE';
  const tierLimitPct = customerTier === 'GOLD' ? 30 : customerTier === 'SILVER' ? 20 : 10;

  // Calculate live limits for items
  const items = data?.items || [];
  const renderedItems = items.length > 0 ? items : [
    // Wireframe 4 Sample Demo Items if empty
    {
      id: 'demo-1',
      productName: 'Laptop Pro 14',
      quantity: 2,
      unitPrice: 1200,
      discountPct: 12,
      lineLimitPct: 15,
      isDemo: true,
    },
    {
      id: 'demo-2',
      productName: 'Onsite Setup Service',
      quantity: 1,
      unitPrice: 450,
      discountPct: 18,
      lineLimitPct: 10,
      isDemo: true,
    },
    {
      id: 'demo-3',
      productName: 'Extended Warranty',
      quantity: 1,
      unitPrice: 180,
      discountPct: 10,
      lineLimitPct: 15,
      isDemo: true,
    }
  ];

  const hasAnyOverLimit = renderedItems.some((item) => {
    const limit = item.lineLimitPct || tierLimitPct;
    return Number(item.discountPct) > limit;
  });

  const navTabs = [
    { label: 'Dashboard', path: '/v1/dashboard', active: false },
    { label: 'Quotations', path: '/v1/quotations', active: true },
    { label: 'Approvals', path: '/dashboard/approvals', active: false },
    { label: 'Fulfillment', path: '/dashboard/fulfillment', active: false },
    { label: 'Subscriptions', path: '/dashboard/billing', active: false },
    { label: 'Invoices', path: '/dashboard/billing', active: false },
    { label: 'Deal Health', path: '/dashboard/deal-health', active: false },
    { label: 'Reports', path: '/dashboard/reports', active: false },
    { label: 'Product', path: '/dashboard/products', active: false },
  ];

  const bgStyle = darkMode 
    ? { backgroundColor: `rgba(18, 20, 24, ${brightness / 100})` }
    : { backgroundColor: '#f8fafc' };

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 flex flex-col font-sans ${
        darkMode ? 'text-slate-100' : 'text-slate-800'
      }`}
      style={bgStyle}
    >
      {/* ── Top Odoo Official Horizontal Navigation Bar ── */}
      <header className="bg-[#4a90e2] text-white shadow-md select-none sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          
          {/* Brand & Tabs */}
          <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1">
            <Link 
              to="/v1/dashboard" 
              className="font-bold text-lg tracking-tight shrink-0 flex items-center gap-2 hover:opacity-95 transition-opacity"
            >
              <div className="h-7 w-7 rounded-md bg-white/20 flex items-center justify-center font-black text-sm">
                DF
              </div>
              <span className="font-extrabold text-white text-base">DealFlow360</span>
            </Link>

            {/* Horizontal Pill Tabs */}
            <nav className="flex items-center gap-1.5 shrink-0">
              {navTabs.map((tab) => {
                if (tab.active) {
                  return (
                    <div
                      key={tab.label}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#111827] text-white shadow-inner transition-all cursor-default"
                    >
                      {tab.label}
                    </div>
                  );
                }
                return (
                  <Link
                    key={tab.label}
                    to={tab.path}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white/90 hover:bg-white/20 hover:text-white transition-all whitespace-nowrap"
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right User Controls */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="hidden sm:flex items-center gap-1.5 bg-black/20 rounded-full px-2.5 py-1 border border-white/15 text-[11px] font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{user?.role || 'SALES_REP'}</span>
            </div>

            <div className="flex items-center -space-x-1.5">
              <div 
                title={user?.name || 'Primary User'} 
                className="h-8 w-8 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs shadow-xs border-2 border-[#4a90e2]"
              >
                {user?.name?.[0]?.toUpperCase() || 'P'}
              </div>
              <div 
                title="Governor / Manager" 
                className="h-8 w-8 rounded-full bg-[#0284c7] text-white flex items-center justify-center font-bold text-xs shadow-xs border-2 border-[#4a90e2]"
              >
                G
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        
        {/* Page Title & Subtitle (Wireframe 4) */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Quotation Detail: {data?.quoteNumber || 'Q-1042'} ({data?.customerName || 'Acme Corp'})
            </h1>
            {data?.status && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                {data.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.
          </p>
        </div>

        {/* ── Customer & Price List Header Boxes (From Wireframe 4) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Customer Field */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Customer
            </label>
            <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
              darkMode ? 'border-slate-700/80 bg-slate-900/80 text-white' : 'border-slate-300 bg-white text-slate-900'
            }`}>
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 text-[#4a90e2]" />
                <span className="truncate">{data?.customerName || 'Acme Corp'}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#4a90e2]/20 text-[#4a90e2] border border-[#4a90e2]/30">
                  {data?.customerTier || 'GOLD'} Tier
                </span>
              </div>
            </div>
          </div>

          {/* Price List Field */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Price List
            </label>
            <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
              darkMode ? 'border-slate-700/80 bg-slate-900/80 text-white' : 'border-slate-300 bg-white text-slate-900'
            }`}>
              <div className="flex items-center gap-2 truncate">
                <Tag className="h-4 w-4 text-emerald-400" />
                <span className="truncate">{data?.customerTier === 'GOLD' ? 'Gold Partner Negotiated Matrix' : 'Standard Enterprise Price List'}</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Auto-Resolved)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Line Items Table (From Wireframe 4) ── */}
        <div className={`rounded-2xl border overflow-hidden transition-colors ${
          darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-xs'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b font-bold tracking-wider ${
                darkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}>
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Product</th>
                  <th className="py-3.5 px-4 font-semibold">Qty</th>
                  <th className="py-3.5 px-4 font-semibold">Price</th>
                  <th className="py-3.5 px-4 font-semibold">Discount</th>
                  <th className="py-3.5 px-4 font-semibold">Limit</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setShowAddLineModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#4a90e2] hover:bg-[#357abd] text-white transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add Item
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'}`}>
                {renderedItems.map((item) => {
                  const limit = item.lineLimitPct || (customerTier === 'GOLD' ? 30 : customerTier === 'SILVER' ? 20 : 10);
                  const discount = Number(item.discountPct || 0);
                  const isOver = discount > limit;
                  const overagePoints = Math.max(0, discount - limit);

                  return (
                    <tr key={item.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                      <td className="py-3.5 px-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{item.productName}</span>
                          {item.productSku && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {item.productSku}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">{item.quantity}</td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        ₹{Number(item.unitPrice || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                        {discount}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {limit}%
                      </td>
                      <td className="py-3.5 px-4">
                        {isOver ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            OVER (+{overagePoints}pt)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!item.isDemo && (
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            title="Remove Line Item"
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Live Policy Check Callout Banner (Wireframe 4 Yellow Outline Box) ── */}
        <div className="p-4 rounded-2xl border border-amber-500/60 bg-amber-950/20 text-amber-300 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-medium">
              Discount is checked against each line&apos;s own limit live, as soon as it is entered, not only at submit time.
            </span>
          </div>
          {hasAnyOverLimit && (
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Requires Manager Approval
            </span>
          )}
        </div>

        {/* ── Upsell and Cross-Sell Suggestions (Wireframe 4) ── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#38bdf8]" />
              Upsell and Cross-Sell Suggestions
            </h2>
            <span className="text-[11px] text-slate-500">1-Click Add to Quotation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Suggestion 1 */}
            <button
              onClick={() => handleAddUpsell('Analytics', 5)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 group active:scale-98 ${
                darkMode 
                  ? 'border-slate-800 bg-slate-900/60 hover:border-[#38bdf8] hover:bg-slate-900 shadow-md' 
                  : 'border-slate-200 bg-white hover:border-[#38bdf8] hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-xs font-bold group-hover:text-[#38bdf8] transition-colors ${
                    darkMode ? 'text-slate-100' : 'text-slate-800'
                  }`}>
                    + Wireless Mouse / Real-Time Analytics
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-bold mt-1">
                    Margin +$18
                  </p>
                </div>
                <PlusCircle className="h-4 w-4 text-slate-500 group-hover:text-[#38bdf8] transition-colors" />
              </div>
            </button>

            {/* Suggestion 2 */}
            <button
              onClick={() => handleAddUpsell('Cloud', 12)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 group active:scale-98 ${
                darkMode 
                  ? 'border-slate-800 bg-slate-900/60 hover:border-[#38bdf8] hover:bg-slate-900 shadow-md' 
                  : 'border-slate-200 bg-white hover:border-[#38bdf8] hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-xs font-bold group-hover:text-[#38bdf8] transition-colors ${
                    darkMode ? 'text-slate-100' : 'text-slate-800'
                  }`}>
                    + Docking Station / Dedicated Cloud Pod
                  </h3>
                  <p className="text-[11px] text-sky-400 font-bold mt-1">
                    Promo: 12% off
                  </p>
                </div>
                <PlusCircle className="h-4 w-4 text-slate-500 group-hover:text-[#38bdf8] transition-colors" />
              </div>
            </button>

            {/* Suggestion 3 */}
            <button
              onClick={() => handleAddUpsell('Support', 8)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 group active:scale-98 ${
                darkMode 
                  ? 'border-slate-800 bg-slate-900/60 hover:border-[#38bdf8] hover:bg-slate-900 shadow-md' 
                  : 'border-slate-200 bg-white hover:border-[#38bdf8] hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-xs font-bold group-hover:text-[#38bdf8] transition-colors ${
                    darkMode ? 'text-slate-100' : 'text-slate-800'
                  }`}>
                    + Care Plan 2yr / SLA Gold Support
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-bold mt-1">
                    Margin +$46
                  </p>
                </div>
                <PlusCircle className="h-4 w-4 text-slate-500 group-hover:text-[#38bdf8] transition-colors" />
              </div>
            </button>
          </div>
        </div>

        {/* ── Bottom Action Buttons (From Wireframe 4) ── */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          
          {/* Save Draft Button */}
          <button
            onClick={() => toast.success('Quotation draft saved.')}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              darkMode 
                ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-500 hover:bg-slate-800' 
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Save Draft
          </button>

          {/* Submit for Approval Button */}
          <div className="relative inline-flex items-center">
            <button
              onClick={handleSubmitQuotation}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#4a90e2] hover:bg-[#357abd] text-white shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>

          {/* Wireframe Interactive Callout Indicators */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0f382a] text-[#4ade80] border border-[#22c55e]/30 text-[10px] font-semibold">
              <MousePointer2 className="h-3 w-3 fill-current rotate-12 text-[#22c55e]" />
              <span>Positive Sardine</span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0e2a47] text-[#38bdf8] border border-[#0284c7]/30 text-[10px] font-semibold">
              <span>Original Hedgehog</span>
            </div>

            <Link
              to="/v1/quotations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors ml-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to List</span>
            </Link>
          </div>
        </div>
      </main>

      {/* ── Bottom Theme Brightness Control Slider ── */}
      <footer className="mt-auto py-4 border-t border-slate-800/80 bg-black/40 backdrop-blur-md">
        <div className="max-w-[400px] mx-auto px-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Toggle Light / Dark Base"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-amber-500" />}
          </button>
          
          <input
            type="range"
            min="30"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-48 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4a90e2]"
            title="Adjust Canvas Dimness"
          />

          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            {brightness}% Dim
          </span>
        </div>
      </footer>

      {/* ── Modal: Add Line Item ── */}
      {showAddLineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5 ${
            darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#4a90e2]" />
                <h3 className="font-bold text-base">Add Product Line</h3>
              </div>
              <button
                onClick={() => setShowAddLineModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddLine} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">
                  Select Product SKU <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newLine.productId}
                  onChange={(e) => setNewLine({ ...newLine, productId: e.target.value })}
                  required
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-medium outline-hidden transition-all ${
                    darkMode 
                      ? 'border-slate-700 bg-slate-800 text-white focus:border-[#4a90e2]' 
                      : 'border-slate-300 bg-white text-slate-900 focus:border-[#4a90e2]'
                  }`}
                >
                  <option value="" disabled>Choose product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Base: ₹{Number(p.basePrice).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newLine.quantity}
                    onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-medium outline-hidden transition-all ${
                      darkMode 
                        ? 'border-slate-700 bg-slate-800 text-white focus:border-[#4a90e2]' 
                        : 'border-slate-300 bg-white text-slate-900 focus:border-[#4a90e2]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newLine.discountPct}
                    onChange={(e) => setNewLine({ ...newLine, discountPct: e.target.value })}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-medium outline-hidden transition-all ${
                      darkMode 
                        ? 'border-slate-700 bg-slate-800 text-white focus:border-[#4a90e2]' 
                        : 'border-slate-300 bg-white text-slate-900 focus:border-[#4a90e2]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddLineModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLine}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4a90e2] hover:bg-[#357abd] text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {addingLine ? 'Adding...' : 'Add Item Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Submission Result Modal ── */}
      {submitResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
            darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              {submitResult.quotation?.status === 'APPROVED' ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="h-7 w-7 text-amber-400 shrink-0" />
              )}
              <div>
                <h3 className="font-bold text-base">
                  {submitResult.quotation?.status === 'APPROVED' 
                    ? 'Deal Self-Approved' 
                    : 'Escalated to Approval Chain'}
                </h3>
                <p className="text-xs text-slate-400">
                  Status: {submitResult.quotation?.status}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs space-y-1.5">
              <p><span className="text-slate-400">Required Level:</span> <strong className="text-sky-300">{submitResult.quotation?.requiredApprovalLevel || 'NONE'}</strong></p>
              <p><span className="text-slate-400">Total Net Value:</span> <strong className="text-emerald-400">₹{Number(submitResult.quotation?.grandTotal || submitResult.quotation?.totalAmount || 0).toLocaleString()}</strong></p>
            </div>

            <button
              onClick={() => setSubmitResult(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#4a90e2] text-white hover:bg-[#357abd] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
