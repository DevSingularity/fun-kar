import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, CheckCircle2, XCircle, Undo2, Tag, User, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import Spinner from '../Spinner.jsx';

const DECISIONS = [
  { value: 'ACCEPT', label: 'Accept', icon: CheckCircle2, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { value: 'REJECT', label: 'Reject', icon: XCircle, className: 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50' },
  { value: 'RETURN', label: 'Return for Revision', icon: Undo2, className: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50' },
];

export default function NegotiationPanel({ quotationId, onResolution }) {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [timelineRes, requestsRes] = await Promise.all([
        api.get(`/quotations/${quotationId}/negotiation`),
        api.get(`/quotations/${quotationId}/negotiation-requests`, { params: { status: 'OPEN' } }),
      ]);
      setTimeline(timelineRes.data?.data?.timeline || []);
      setOpenRequests(requestsRes.data?.data || []);
    } catch (err) {
      console.warn('Negotiation panel fetch note:', err);
    } finally {
      setLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    if (quotationId) load();
  }, [quotationId, load]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/quotations/${quotationId}/negotiation-comments`, { message: reply.trim() });
      setReply('');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not send reply.');
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async (requestId, decision) => {
    const resolutionNote = (resolutionNotes[requestId] || '').trim();
    if (!resolutionNote) {
      toast.error('Add a short resolution note before resolving this request.');
      return;
    }
    setResolvingId(requestId);
    try {
      const res = await api.post(`/negotiation-requests/${requestId}/resolve`, { decision, resolutionNote });
      const { reenteredApproval } = res.data?.data || {};
      if (reenteredApproval) {
        toast.success('Accepted. Discount now exceeds limits — quotation re-routed for approval.');
      } else {
        toast.success(`Request ${decision.toLowerCase()}d.`);
      }
      setResolutionNotes((s) => ({ ...s, [requestId]: '' }));
      await load();
      if (onResolution) onResolution();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not resolve this request.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-[#714b67]" /> Customer Negotiation & Requests
        </h2>
        {openRequests.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            {openRequests.length} Open Request{openRequests.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Spinner size="sm" variant="primary" /> Loading negotiation thread...
        </div>
      ) : (
        <>
          {/* Open requests needing a decision */}
          {openRequests.length > 0 && (
            <div className="divide-y divide-slate-100 border-b border-slate-100">
              {openRequests.map((req) => (
                <div key={req.id} className="p-4 space-y-2 bg-amber-50/40">
                  <div className="flex items-center gap-2 text-xs">
                    <Tag className="h-3.5 w-3.5 text-amber-700" />
                    <span className="font-bold text-slate-800">{req.requestType.replace('_', ' ')}</span>
                    {req.requestedDiscountPct !== null && req.requestedDiscountPct !== undefined && (
                      <span className="font-mono font-bold text-amber-800">{req.requestedDiscountPct}% requested</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700">{req.message}</p>
                  <input
                    type="text"
                    placeholder="Resolution note (required)"
                    value={resolutionNotes[req.id] || ''}
                    onChange={(e) => setResolutionNotes((s) => ({ ...s, [req.id]: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#714b67]/20"
                  />
                  <div className="flex flex-wrap gap-2">
                    {DECISIONS.map(({ value, label, icon: Icon, className }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={resolvingId === req.id}
                        onClick={() => handleResolve(req.id, value)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition-colors disabled:opacity-50 ${className}`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full thread */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {timeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No negotiation activity yet.</div>
            ) : (
              timeline.map((entry) => {
                const isCustomer = entry.kind === 'COMMENT' ? entry.authorType === 'CUSTOMER' : true;
                return (
                  <div key={`${entry.kind}-${entry.id}`} className={`p-3.5 flex gap-2.5 ${isCustomer ? 'bg-white' : 'bg-slate-50/60'}`}>
                    <div className={`mt-0.5 shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${isCustomer ? 'bg-[#714b67]/10 text-[#714b67]' : 'bg-slate-200 text-slate-600'}`}>
                      {isCustomer ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        <span>{isCustomer ? 'Customer' : 'Internal'}</span>
                        {entry.kind === 'REQUEST' && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 normal-case font-semibold">
                            {entry.requestType}{entry.requestedDiscountPct !== null && entry.requestedDiscountPct !== undefined ? ` — ${entry.requestedDiscountPct}%` : ''} ({entry.status})
                          </span>
                        )}
                        <span className="font-normal normal-case text-slate-400">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 mt-0.5">{entry.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply box */}
          <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50/40">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply to the customer..."
              className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#714b67]/20"
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="px-4 py-2 rounded-lg bg-[#714b67] hover:bg-[#5a3a52] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
