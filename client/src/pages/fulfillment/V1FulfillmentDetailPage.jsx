import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Boxes,
  Truck,
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Edit3,
  X,
  Info,
  Package,
  Clock,
  Send,
  Calendar,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1FulfillmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state (replacing any default browser alerts)
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);

  // Manual override editor state
  const [overrideState, setOverrideState] = useState({});

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [detailRes, whRes] = await Promise.all([
        api.get(`/orders/${id}`).catch(() => ({ data: { data: null } })),
        api.get('/warehouses').catch(() => ({ data: { data: [] } })),
      ]);

      const detail = detailRes.data?.data;
      setData(detail);
      setWarehouses(whRes.data?.data || []);

      // Initialize override state for each item
      if (detail?.items) {
        const initial = {};
        for (const item of detail.items) {
          initial[item.id] = [
            {
              warehouseId: whRes.data?.data?.[0]?.id || '',
              quantity: item.quantity,
            },
          ];
        }
        setOverrideState(initial);
      }
    } catch (err) {
      console.warn('Fulfillment detail fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Demo fallback for wireframe visualization if record is new/demo
  const order = data?.order || { orderNumber: 'Q-1042', status: 'PARTIALLY_FULFILLED' };
  const customerName = data?.customerName || 'Acme Corp';
  const quoteNumber = data?.quoteNumber || order.orderNumber;
  const items = data?.items || [];

  const warehouseSplits = data?.warehouseSplits?.length > 0 ? data.warehouseSplits : [
    {
      warehouseId: 'wh-1',
      warehouseName: 'Main Warehouse',
      totalQty: 18,
      shipmentCost: 42,
      lines: [
        { productName: 'Laptop Pro 14 (Hardware)', quantityAllocated: 18, isManualOverride: false },
      ],
    },
    {
      warehouseId: 'wh-2',
      warehouseName: 'East Depot',
      totalQty: 6,
      shipmentCost: 29,
      lines: [
        { productName: 'Laptop Pro 14 (Hardware)', quantityAllocated: 6, isManualOverride: false },
      ],
    },
  ];

  const estimatedShipments = data?.estimatedShipments || warehouseSplits.length || 2;
  const estimatedShippingTotal = data?.estimatedShippingTotal || 71;
  const backorders = data?.backorders || [];

  const handleAcceptSuggestedSplit = async () => {
    setActionLoading(true);
    try {
      await api.post(`/orders/${id}/allocate`);
      toast.success('Suggested warehouse fulfillment split accepted and allocated.');
      setShowAcceptModal(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply allocation split');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualOverrideSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const overrides = Object.entries(overrideState).map(([orderItemId, splits]) => ({
        orderItemId,
        splits: splits.map((s) => ({
          warehouseId: s.warehouseId,
          quantity: Number(s.quantity),
        })),
      }));

      await api.put(`/orders/${id}/allocation`, { overrides });
      toast.success('Manual warehouse fulfillment allocation saved successfully.');
      setShowOverrideModal(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save manual override');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConsolidateBackorder = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/orders/${id}/backorder/consolidate`);
      const resolved = res.data?.data?.resolved || [];
      if (resolved.length > 0) {
        toast.success(`Consolidated ${resolved.length} backordered lines with newly available stock!`);
      } else {
        toast.info('No newly available warehouse stock to fulfill remaining backorders.');
      }
      setShowConsolidateModal(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to consolidate backorders');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Fulfillment" />

      <main className="max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* ── Page Header (From Wireframe 8) ── */}
        <div className="border-b border-slate-200/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Fulfillment Detail: {order.orderNumber || quoteNumber} ({customerName})
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  {order.status || 'SPLIT PENDING'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Opened by clicking an order row on the Fulfillment list
              </p>
            </div>

            <Link
              to="/v1/fulfillment"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Fulfillment List</span>
            </Link>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Est. Shipments</span>
              <span className="text-base font-black text-slate-900">{estimatedShipments} Shipment{estimatedShipments !== 1 ? 's' : ''}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Estimated Shipping</span>
              <span className="text-base font-black text-[#008784]">₹{Number(estimatedShippingTotal).toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer Account</span>
              <span className="text-base font-bold text-slate-900 truncate block">{customerName}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Promised Delivery</span>
              <span className="text-base font-bold text-slate-700">
                {order.promisedDeliveryDate || 'Nov 30, 2026'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Table 1: Warehouse Fulfillment Split & Cost (From Wireframe 8) ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#714b67]" />
              <h2 className="text-sm font-bold text-slate-900">Warehouse Fulfillment Split & Cost</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {warehouseSplits.length} Warehouse Location{warehouseSplits.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Qty Fulfilled</th>
                  <th className="py-3 px-4 text-center">Est. Shipments</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {warehouseSplits.map((split, idx) => (
                  <tr key={split.warehouseId || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#714b67]" />
                        <span>{split.warehouseName}</span>
                      </div>
                      {split.lines?.length > 0 && (
                        <div className="mt-1 pl-4 space-y-0.5">
                          {split.lines.map((l, lIdx) => (
                            <div key={lIdx} className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                              <span>&bull; {l.productName}</span>
                              <span className="font-bold text-slate-700">({l.quantityAllocated} units)</span>
                              {l.isManualOverride && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">Manual</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                      {split.totalQty} units
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      1
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#008784] text-sm">
                      ₹{Number(split.shipmentCost).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Explainability / Restock Callout Box (Exact match to Wireframe 8) ── */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-amber-700 shrink-0" />
            <p className="font-semibold text-amber-900">
              &ldquo;Consolidate Remaining Backorder&rdquo; prompt appears automatically once East Depot restocks.
            </p>
          </div>

          <button
            onClick={() => setShowConsolidateModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all shrink-0 active:scale-95"
          >
            Check &amp; Consolidate Backorders
          </button>
        </div>

        {/* ── Section 2: Open Backorders (If any exist) ── */}
        {backorders.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-bold text-rose-950">Active Backorder Items</h3>
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                {backorders.length} Backordered Line{backorders.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4 text-center">Requested</th>
                    <th className="py-2.5 px-4 text-center">Fulfilled</th>
                    <th className="py-2.5 px-4 text-center">Backordered</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {backorders.map((bo) => (
                    <tr key={bo.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-semibold text-slate-900">{bo.productName}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{bo.quantityRequested}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">{bo.quantityFulfilled}</td>
                      <td className="py-3 px-4 text-center font-bold text-rose-700">{bo.quantityBackordered}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {bo.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Section 3: Bottom Action Buttons (From Wireframe 8) ── */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200/80">
          {/* Accept Suggested Split Button (Blue / Teal) */}
          <button
            onClick={() => setShowAcceptModal(true)}
            disabled={actionLoading}
            className="px-6 py-2.5 rounded-lg text-xs font-bold bg-[#008784] hover:bg-[#006e6c] text-white shadow-xs hover:shadow-sm transition-all active:scale-98 disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Accept Suggested Split</span>
          </button>

          {/* Manual Override Button (Bordered / Secondary) */}
          <button
            onClick={() => setShowOverrideModal(true)}
            disabled={actionLoading}
            className="px-6 py-2.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs hover:shadow-xs transition-all active:scale-98 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Edit3 className="h-4 w-4 text-slate-600" />
            <span>Manual Override</span>
          </button>

          <Link
            to="/v1/fulfillment"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors ml-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Fulfillment List</span>
          </Link>
        </div>
      </main>

      {/* ── Custom Modal 1: Accept Suggested Split Confirmation ── */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-50 text-[#008784]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Accept Suggested Split</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Order {order.orderNumber || quoteNumber} &bull; {customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg bg-teal-50/60 border border-teal-200/80 p-3.5 text-xs text-teal-950 space-y-1.5">
              <p className="font-semibold text-teal-900">
                Are you sure you want to commit this multi-warehouse fulfillment split?
              </p>
              <p className="text-[11px] text-teal-800/90 leading-relaxed">
                This will automatically allocate live inventory from <strong>{warehouseSplits.map((w) => w.warehouseName).join(' and ')}</strong> with an estimated shipping total of <strong>₹{Number(estimatedShippingTotal).toLocaleString()}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAcceptSuggestedSplit}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-[#008784] hover:bg-[#006e6c] text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Modal 2: Interactive Manual Override Editor ── */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Manual Fulfillment Split Override</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Order {order.orderNumber || quoteNumber} &bull; Adjust warehouse allocations per line item
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleManualOverrideSubmit} className="space-y-4 text-xs">
              {items.map((item) => (
                <div key={item.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{item.productName}</span>
                      <span className="text-[11px] text-slate-500 font-medium">Ordered: {item.quantity} units</span>
                    </div>
                  </div>

                  {/* Split configuration */}
                  {(overrideState[item.id] || []).map((split, sIdx) => (
                    <div key={sIdx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-8">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Warehouse</label>
                        <select
                          value={split.warehouseId}
                          onChange={(e) => {
                            const updated = [...(overrideState[item.id] || [])];
                            updated[sIdx].warehouseId = e.target.value;
                            setOverrideState({ ...overrideState, [item.id]: updated });
                          }}
                          className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 outline-hidden focus:border-[#714b67]"
                        >
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.location || 'Local Hub'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={split.quantity}
                          onChange={(e) => {
                            const updated = [...(overrideState[item.id] || [])];
                            updated[sIdx].quantity = Number(e.target.value);
                            setOverrideState({ ...overrideState, [item.id]: updated });
                          }}
                          className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 outline-hidden focus:border-[#714b67]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Apply Manual Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Modal 3: Consolidate Backorder Confirmation ── */}
      {showConsolidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Consolidate Remaining Backorder</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Order {order.orderNumber || quoteNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConsolidateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will re-check real-time warehouse inventory across all hubs for open backorder items. If restocked inventory is found, shipments will be created and backorders fulfilled immediately.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConsolidateModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConsolidateBackorder}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading ? 'Consolidating...' : 'Consolidate Backorders'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
