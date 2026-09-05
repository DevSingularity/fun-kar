import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  AlertTriangle, 
  Info, 
  Building2, 
  User, 
  Calendar, 
  X,
  Send,
  Clock,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1ApprovalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal for Reject or Return Reason Prompt
  const [decisionModal, setDecisionModal] = useState({
    open: false,
    type: null, // 'REJECT' | 'RETURN'
    title: '',
    reason: '',
  });

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/approval-requests/${id}`);
      setData(res.data?.data || null);
    } catch (err) {
      console.warn('Approval request fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this discount exception?')) return;
    setActionLoading(true);
    try {
      await api.post(`/approval-requests/${id}/approve`, {});
      toast.success('Discount exception approved successfully.');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!decisionModal.reason.trim()) {
      toast.error('A detailed reason is required.');
      return;
    }

    setActionLoading(true);
    try {
      const endpoint = decisionModal.type === 'REJECT' ? 'reject' : 'return';
      await api.post(`/approval-requests/${id}/${endpoint}`, {
        reason: decisionModal.reason.trim(),
      });
      toast.success(
        decisionModal.type === 'REJECT'
          ? 'Quotation has been rejected.'
          : 'Quotation returned for rep revision.'
      );
      setDecisionModal({ open: false, type: null, title: '', reason: '' });
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process decision');
    } finally {
      setActionLoading(false);
    }
  };

  // Fallback demo data for wireframe visualization
  const quotation = data?.quotation || { quoteNumber: 'Q-1042' };
  const customerName = data?.customerName || 'Acme Corp';
  const customerTier = data?.customerTier || 'Gold';
  const riskScore = Number(data?.approvalRequest?.blendedRiskScore || 18.5);
  const riskLabel = riskScore >= 25 ? 'HIGH' : riskScore >= 10 ? 'HIGH' : 'LOW';

  // Line violations table
  const lineEvaluations = data?.riskEvaluation?.lineEvaluations || [
    {
      lineNumber: 1,
      productName: 'Laptop (Hardware)',
      requestedDiscountPct: 12,
      effectiveAllowedDiscountPct: 15,
      overagePct: 0,
      status: 'WITHIN_POLICY',
    },
    {
      lineNumber: 2,
      productName: 'Setup Service (Services)',
      requestedDiscountPct: 18,
      effectiveAllowedDiscountPct: 10,
      overagePct: 8,
      status: 'EXCEEDS_POLICY',
    },
  ];

  // Action History
  const actions = data?.actions?.length > 0 ? data.actions : [
    {
      id: 'act-1',
      actorName: 'J. Rao',
      action: 'Submitted',
      createdAt: '2026-08-20',
      reason: 'Initial 12% discount',
    },
    {
      id: 'act-2',
      actorName: 'M. Shah',
      action: 'Returned',
      createdAt: '2026-08-21',
      reason: 'Requested justification',
    },
    {
      id: 'act-3',
      actorName: 'J. Rao',
      action: 'Resubmitted',
      createdAt: '2026-08-22',
      reason: 'Added margin note',
    },
  ];

  const currentStatus = data?.approvalRequest?.status || 'PENDING';
  const currentStep = data?.approvalRequest?.currentStep || 'MANAGER';

  // Multi-step visual tracker state
  const isManagerDone = actions.some((a) => a.level === 'MANAGER' && a.action === 'APPROVED');
  const isFinanceDone = actions.some((a) => a.level === 'FINANCE' && a.action === 'APPROVED');
  const isConfirmed = currentStatus === 'APPROVED';

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Approvals" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        
        {/* Page Title & Subtitle (From Wireframe 6) */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Approval Detail: {quotation.quoteNumber} ({customerName})
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
              currentStatus === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : currentStatus === 'REJECTED'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : currentStatus === 'RETURNED'
                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {currentStatus}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Opened by clicking a row on the Approvals list
          </p>
        </div>

        {/* ── Top Pill Badges (From Wireframe 6) ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
            <span>Blended Risk: {riskLabel}</span>
          </div>

          <div className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-xs">
            <span>Customer Tier: {customerTier}</span>
          </div>
        </div>

        {/* ── Section 1: Why This Quote Was Flagged (Table) ── */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Why This Quote Was Flagged
          </h2>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Line</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Limit Allowed</th>
                  <th className="py-3 px-4">Over By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {lineEvaluations.map((line, idx) => {
                  const isOver = line.overagePct > 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {line.productName || `Line ${line.lineNumber}`}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {line.requestedDiscountPct}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold">
                        {line.effectiveAllowedDiscountPct}%
                      </td>
                      <td className="py-3.5 px-4">
                        {isOver ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            {line.overagePct} pt OVER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            0 pt - OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Yellow Callout Explainability Box (From Wireframe 6) ── */}
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              Worst single line (8pt over) plus overall pattern across the order sets the blended score. One bad line is enough to require approval.
            </span>
          </div>
        </div>

        {/* ── Section 2: Multi-Step Visual Approval Tracker (From Wireframe 6) ── */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Approval Workflow Progress
          </h3>

          <div className="flex items-center justify-between max-w-2xl mx-auto pt-2 pb-2">
            
            {/* Step 1: Submitted */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Submitted</span>
            </div>

            <div className={`flex-1 h-0.5 mx-3 ${isManagerDone || isConfirmed ? 'bg-emerald-500' : 'bg-[#4a90e2]'}`} />

            {/* Step 2: Sales Manager */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                isManagerDone || isConfirmed
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#4a90e2] text-white ring-4 ring-sky-100'
              }`}>
                {isManagerDone || isConfirmed ? <CheckCircle2 className="h-5 w-5" /> : 'SM'}
              </div>
              <span className="text-xs font-bold text-slate-800">Sales Manager</span>
            </div>

            <div className={`flex-1 h-0.5 mx-3 ${isFinanceDone || isConfirmed ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 3: Finance */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                isFinanceDone || isConfirmed
                  ? 'bg-emerald-500 text-white'
                  : currentStep === 'FINANCE'
                  ? 'bg-[#4a90e2] text-white ring-4 ring-sky-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-300'
              }`}>
                {isFinanceDone || isConfirmed ? <CheckCircle2 className="h-5 w-5" /> : 'FN'}
              </div>
              <span className="text-xs font-bold text-slate-800">Finance</span>
            </div>

            <div className={`flex-1 h-0.5 mx-3 ${isConfirmed ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 4: Confirmed */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                isConfirmed
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-300'
              }`}>
                {isConfirmed ? <CheckCircle2 className="h-5 w-5" /> : 'OK'}
              </div>
              <span className="text-xs font-bold text-slate-800">Confirmed</span>
            </div>
          </div>
        </div>

        {/* ── Section 3: Audit Trail / Decision History (From Wireframe 6) ── */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Decision Audit Trail
          </h2>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {actions.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {act.actorName || 'Officer'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {act.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {act.createdAt ? new Date(act.createdAt).toLocaleDateString() : 'Aug 20'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {act.reason || 'Standard review action'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 4: Bottom Action Buttons (From Wireframe 6) ── */}
        {currentStatus === 'PENDING' && (
          <div className="flex flex-wrap items-center gap-3 pt-4">
            
            {/* Approve Button */}
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
              Approve
            </button>

            {/* Return for Revision Button */}
            <button
              onClick={() =>
                setDecisionModal({
                  open: true,
                  type: 'RETURN',
                  title: 'Return Quotation for Revision',
                  reason: '',
                })
              }
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs hover:shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
              Return for Revision
            </button>

            {/* Reject Button */}
            <button
              onClick={() =>
                setDecisionModal({
                  open: true,
                  type: 'REJECT',
                  title: 'Reject Quotation Deal',
                  reason: '',
                })
              }
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-xs hover:shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
              Reject
            </button>

            <Link
              to="/v1/approvals"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors ml-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Approvals List</span>
            </Link>
          </div>
        )}
      </main>

      {/* ── Modal: Decision Reason Prompt (Reject or Return) ── */}
      {decisionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">{decisionModal.title}</h3>
              <button
                onClick={() => setDecisionModal({ open: false, type: null, title: '', reason: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700">
                  Decision Note / Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain reason for returning or rejecting this discount exception..."
                  value={decisionModal.reason}
                  onChange={(e) => setDecisionModal({ ...decisionModal, reason: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 font-medium text-slate-800 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDecisionModal({ open: false, type: null, title: '', reason: '' })}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                    decisionModal.type === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {actionLoading ? 'Saving...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
