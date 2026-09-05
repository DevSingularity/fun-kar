import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Truck,
  Building2,
  PackageCheck,
  PackageSearch,
  Search,
  RefreshCw,
  Info,
  ChevronRight,
  AlertCircle,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1FulfillmentPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stockList, setStockList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, ordersRes] = await Promise.all([
        api.get('/warehouses/overview/stock-summary').catch(() => ({ data: { data: [] } })),
        api.get('/orders').catch(() => ({ data: { data: [] } })),
      ]);

      setStockList(stockRes.data?.data || []);
      setOrdersList(ordersRes.data?.data || []);
    } catch (err) {
      console.warn('Fulfillment list fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const effectiveStock = stockList;
  const effectiveOrders = ordersList;

  // Filter distinct warehouses for filter pills
  const distinctWarehouses = ['ALL', ...new Set(effectiveStock.map((s) => s.warehouseName).filter(Boolean))];

  const filteredStock = effectiveStock.filter((s) => {
    const matchWarehouse =
      selectedWarehouseFilter === 'ALL' || s.warehouseName === selectedWarehouseFilter;
    const matchSearch =
      !searchQuery.trim() ||
      s.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.warehouseName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchWarehouse && matchSearch;
  });

  const filteredOrders = effectiveOrders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.quoteNumber && o.quoteNumber.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q))
    );
  });

  const renderOrderStatusBadge = (status) => {
    switch (status) {
      case 'FULFILLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Fulfilled
          </span>
        );
      case 'PARTIALLY_FULFILLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Layers className="h-3 w-3" /> Split Pending
          </span>
        );
      case 'BACKORDERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="h-3 w-3" /> Backorder
          </span>
        );
      case 'PENDING_FULFILLMENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Fulfillment" />

      <main className="max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* ── Page Header (From Wireframe 7) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="h-6 w-6 text-[#714b67]" />
              <span>Fulfillment and Stock (List)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Live stock per warehouse, plus every order that still needs fulfilling
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-56 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products or orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] shadow-2xs transition-all"
              />
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh inventory and orders"
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Section 1: Live Stock Per Warehouse (Table 1 from Wireframe 7) ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#714b67]" />
              <h2 className="text-sm font-bold text-slate-900">Live Stock Per Warehouse</h2>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                {filteredStock.length} SKUs
              </span>
            </div>

            {/* Warehouse Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {distinctWarehouses.map((wh) => (
                <button
                  key={wh}
                  onClick={() => setSelectedWarehouseFilter(wh)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedWarehouseFilter === wh
                      ? 'bg-[#714b67] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {wh === 'ALL' ? 'All Warehouses' : wh}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">In Stock</th>
                  <th className="py-3 px-4 text-center">Allocated</th>
                  <th className="py-3 px-4 text-center">Available</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                      Loading live warehouse inventory from database...
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                      No warehouse stock records found.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((row) => (
                    <tr key={row.stockId || `${row.warehouseName}-${row.productSku}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#008784]" />
                        <span>{row.warehouseName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{row.productName}</span>
                        {row.productSku && (
                          <span className="text-[10px] text-slate-400 font-mono">{row.productSku}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 text-sm">
                        {row.inStock}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700 text-sm">
                        {row.allocated}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700 text-sm">
                        {row.available}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {row.available > 10 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Healthy
                          </span>
                        ) : row.available > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                            <AlertCircle className="h-3 w-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                            <AlertTriangle className="h-3 w-3" /> Depleted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 2: Orders Awaiting Fulfillment (Table 2 from Wireframe 7) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-4.5 w-4.5 text-[#008784]" />
              <span>Orders Awaiting Fulfillment</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredOrders.length} orders
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Warehouses</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">
                        Loading orders awaiting fulfillment...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">
                        No active fulfillment orders. Approved quotations will convert here automatically.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr
                        key={ord.id}
                        onClick={() => navigate(`/v1/fulfillment/${ord.id}`)}
                        className="hover:bg-slate-50/90 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-bold text-[#714b67] group-hover:underline flex items-center gap-1.5">
                          <PackageSearch className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#714b67]" />
                          <span>{ord.orderNumber || ord.quoteNumber}</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {ord.customerName}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderOrderStatusBadge(ord.status)}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {ord.warehouseNames || 'Main Warehouse'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 group-hover:text-[#714b67]">
                            <span>View Split</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Explainability Callout Box (Exact match to Wireframe 7) ── */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 shadow-2xs flex items-center gap-2.5 text-xs text-amber-950">
            <Info className="h-4 w-4 text-amber-700 shrink-0" />
            <p className="font-semibold text-amber-900">
              Click an order row to open its warehouse split detail, allocation breakdown, and backorder decisions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
