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
  AlertTriangle,
  Filter,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';
import Spinner from '../../components/Spinner.jsx';

function WarehouseBadges({ rawNames }) {
  const [expanded, setExpanded] = useState(false);

  if (!rawNames) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>Main Warehouse Depot</span>
      </span>
    );
  }

  const list = rawNames
    .split(/\+|\,/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (list.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>Main Warehouse Depot</span>
      </span>
    );
  }

  const cleanName = (name) => {
    return name.replace(/\s+northstar-\d+/g, '').replace(/-\d{8,}/g, '');
  };

  const primary = cleanName(list[0]);
  const others = list.slice(1).map(cleanName);

  if (others.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 shadow-2xs max-w-[300px]">
        <Building2 className="h-3.5 w-3.5 text-[#008784] shrink-0" />
        <span className="truncate" title={primary}>{primary}</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 shadow-2xs max-w-[220px]">
        <Building2 className="h-3.5 w-3.5 text-[#008784] shrink-0" />
        <span className="truncate" title={primary}>{primary}</span>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#714b67] hover:bg-[#5a3a52] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
        title="Click to view all allocated warehouse locations"
      >
        <span>+{others.length} More</span>
        <ChevronDown className={`h-3.5 w-3.5 text-white transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expandable Dropdown Popover */}
      {expanded && (
        <div className="absolute top-full left-0 mt-1.5 z-40 w-64 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1 border-b border-slate-100 flex items-center justify-between">
            <span>Allocated Depots</span>
            <span className="font-bold text-[#714b67]">{list.length} Hubs</span>
          </div>
          {list.map((wh, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-800 font-semibold transition-colors"
            >
              <Building2 className="h-3.5 w-3.5 text-[#008784] shrink-0" />
              <span className="truncate" title={cleanName(wh)}>{cleanName(wh)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function V1FulfillmentPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stockList, setStockList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
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

  // Filter distinct warehouses for dropdown select
  const distinctWarehouses = ['ALL', ...new Set(effectiveStock.map((s) => s.warehouseName).filter(Boolean))];

  const filteredStock = effectiveStock.filter((s) => {
    const matchWarehouse =
      selectedWarehouseFilter === 'ALL' || s.warehouseName === selectedWarehouseFilter;
    const matchSearch =
      !searchQuery.trim() ||
      s.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.productSku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.warehouseName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchWarehouse && matchSearch;
  });

  const filteredOrders = effectiveOrders.filter((o) => {
    const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    if (!matchStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.quoteNumber && o.quoteNumber.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.warehouseNames && o.warehouseNames.toLowerCase().includes(q))
    );
  });

  // KPI calculations
  const pendingCount = effectiveOrders.filter((o) => !o.status || o.status === 'PENDING_FULFILLMENT').length;
  const splitPendingCount = effectiveOrders.filter((o) => o.status === 'PARTIALLY_FULFILLED').length;
  const backorderCount = effectiveOrders.filter((o) => o.status === 'BACKORDERED').length;
  const fulfilledCount = effectiveOrders.filter((o) => o.status === 'FULFILLED').length;

  // Consistent width status badge
  const renderOrderStatusBadge = (status) => {
    switch (status) {
      case 'FULFILLED':
        return (
          <span className="w-32 justify-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Fulfilled
          </span>
        );
      case 'PARTIALLY_FULFILLED':
        return (
          <span className="w-32 justify-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
            <Layers className="h-3.5 w-3.5 shrink-0" /> Split Pending
          </span>
        );
      case 'BACKORDERED':
        return (
          <span className="w-32 justify-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Backorder
          </span>
        );
      case 'PENDING_FULFILLMENT':
      default:
        return (
          <span className="w-32 justify-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
            <Clock className="h-3.5 w-3.5 shrink-0" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Fulfillment" />

      <main className="max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        
        {/* ── Page Header & Top Controls ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Boxes className="h-6 w-6 text-[#714b67]" />
              Multi-Warehouse Fulfillment & Inventory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Automated multi-depot inventory routing, split fulfillment shipments, and real-time depot inventory status.
            </p>
          </div>

          {/* Top Search & Refresh Bar */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-64 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, customers, SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] shadow-2xs transition-all"
              />
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh inventory and orders"
              className="p-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── KPI Summary Cards Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Fulfillment</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-slate-900">{pendingCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Orders ready to allocate</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Split Pending</span>
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-2xl font-black text-blue-700">{splitPendingCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Multi-depot shipments</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Backorders</span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <span className="text-2xl font-black text-rose-700">{backorderCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Pending stock restock</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Depots Monitored</span>
              <Building2 className="h-4 w-4 text-[#008784]" />
            </div>
            <span className="text-2xl font-black text-[#008784]">
              {distinctWarehouses.filter((w) => w !== 'ALL').length || 3}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{effectiveStock.length} total SKUs tracked</span>
          </div>
        </div>

        {/* ── SECTION 1 (TOP): Orders Awaiting Fulfillment ── */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Table Header & Status Filters */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#008784]/10 text-[#008784]">
                  <Truck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Orders Awaiting Fulfillment</h2>
                  <p className="text-[11px] text-slate-500">Orders converted from approved quotations pending warehouse allocation</p>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'PENDING_FULFILLMENT', 'PARTIALLY_FULFILLED', 'BACKORDERED', 'FULFILLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderStatusFilter === st
                        ? 'bg-[#714b67] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-5">Order #</th>
                    <th className="py-3.5 px-5">Customer Account</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5">Allocated Warehouses</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <Spinner size="md" variant="primary" />
                          <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading orders awaiting fulfillment...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">
                        No orders match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr
                        key={ord.id}
                        onClick={() => navigate(`/v1/fulfillment/${ord.id}`)}
                        className="hover:bg-slate-50/90 cursor-pointer transition-colors group"
                      >
                        <td className="py-4 px-5 font-bold text-[#714b67] group-hover:underline flex items-center gap-2">
                          <PackageSearch className="h-4 w-4 text-slate-400 group-hover:text-[#714b67] shrink-0" />
                          <span>{ord.orderNumber || ord.quoteNumber}</span>
                        </td>
                        <td className="py-4 px-5 font-semibold text-slate-900">
                          {ord.customerName}
                        </td>
                        <td className="py-4 px-5 text-center">
                          {renderOrderStatusBadge(ord.status)}
                        </td>
                        <td className="py-4 px-5">
                          <WarehouseBadges rawNames={ord.warehouseNames} />
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => navigate(`/v1/fulfillment/${ord.id}`)}
                            className="whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            <span>View Split</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explainability Callout Box */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 shadow-2xs flex items-center gap-2.5 text-xs text-amber-950">
            <Info className="h-4 w-4 text-amber-700 shrink-0" />
            <p className="font-semibold text-amber-900">
              Click any order row to inspect its multi-warehouse fulfillment split, shipment cost breakdown, and manual inventory allocation overrides.
            </p>
          </div>
        </div>

        {/* ── SECTION 2 (BOTTOM): Live Stock Per Warehouse with Clean Dropdown Selector ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#714b67]/10 text-[#714b67]">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Live Stock Per Warehouse</h2>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    {filteredStock.length} SKUs
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Real-time depot on-hand vs. allocated balance across all fulfillment hubs</p>
              </div>
            </div>

            {/* Clean Enterprise Dropdown Filter */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-500">Warehouse:</span>
                <select
                  value={selectedWarehouseFilter}
                  onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer text-xs"
                >
                  <option value="ALL">All Warehouses ({distinctWarehouses.filter((w) => w !== 'ALL').length} Hubs)</option>
                  {distinctWarehouses
                    .filter((wh) => wh !== 'ALL')
                    .map((wh) => (
                      <option key={wh} value={wh}>
                        {wh}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Warehouse Depot</th>
                  <th className="py-3.5 px-5">Product Name & SKU</th>
                  <th className="py-3.5 px-5 text-center">In Stock</th>
                  <th className="py-3.5 px-5 text-center">Allocated</th>
                  <th className="py-3.5 px-5 text-center">Available</th>
                  <th className="py-3.5 px-5 text-right">Inventory Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <Spinner size="md" variant="primary" />
                        <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading live warehouse inventory...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                      No stock records found for the selected warehouse filter.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((row) => (
                    <tr key={row.stockId || `${row.warehouseName}-${row.productSku}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#008784] shrink-0" />
                        <span>{row.warehouseName}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-slate-900 block">{row.productName}</span>
                        {row.productSku && (
                          <span className="text-[10px] text-slate-400 font-mono">{row.productSku}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center font-bold text-slate-800 text-sm">
                        {row.inStock}
                      </td>
                      <td className="py-3.5 px-5 text-center font-bold text-blue-700 text-sm">
                        {row.allocated}
                      </td>
                      <td className="py-3.5 px-5 text-center font-bold text-emerald-700 text-sm">
                        {row.available}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {row.available > 10 ? (
                          <span className="w-28 justify-center inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="h-3 w-3 shrink-0" /> Healthy
                          </span>
                        ) : row.available > 0 ? (
                          <span className="w-28 justify-center inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                            <AlertCircle className="h-3 w-3 shrink-0" /> Low Stock
                          </span>
                        ) : (
                          <span className="w-28 justify-center inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> Depleted
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

      </main>
    </div>
  );
}

