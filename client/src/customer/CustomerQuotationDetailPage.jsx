import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import customerApi from './services/customerApi.js';
import CustomerNavbar from './CustomerNavbar.jsx';
import CustomerPortalGuard from './CustomerPortalGuard.jsx';

const statusStyles = {
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
  UNDER_NEGOTIATION: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_APPROVAL: 'bg-orange-50 text-orange-700 border-orange-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function CustomerQuotationDetailPage() {
  const { quotationId } = useParams();
  const [portalUser, setPortalUser] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customerComment, setCustomerComment] = useState('');
  const [counterDiscountPct, setCounterDiscountPct] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  const loadQuotation = async () => {
    setLoading(true);
    setError('');
    try {
      try {
        const meRes = await customerApi.get('/auth/me');
        setPortalUser(meRes.data?.data);
      } catch {
        setPortalUser(null);
      }
      const detailRes = await customerApi.get(`/quotes/${quotationId}`);
      const quote = detailRes.data?.data?.quotation || detailRes.data?.data;
      setQuotation(quote);
      if (quote?.items?.length && !selectedItemId) setSelectedItemId(quote.items[0].id);
      const timelineRes = await customerApi.get(`/quotes/${quotationId}/negotiation`);
      setTimeline(timelineRes.data?.data?.timeline || []);
    } catch (err) {
      setQuotation(null);
      setError(err.response?.data?.message || 'Unable to load this quotation.');
    } finally {
      setLoading(false);
    }
  };

  const sendComment = async (event) => {
    event.preventDefault();
    if (!replyMessage.trim()) return;
    setSendingReply(true);
    try {
      await customerApi.post(`/quotes/${quotationId}/comments`, { message: replyMessage.trim() });
      setReplyMessage('');
      await loadQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send message.');
    } finally {
      setSendingReply(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!counterDiscountPct && !customerComment) return toast.error('Enter a counter discount or customer comment.');
    setSubmitting(true);
    try {
      await customerApi.post(`/quotes/${quotationId}/negotiation-requests`, {
        requestType: counterDiscountPct ? 'COUNTER_DISCOUNT' : 'COMMENT',
        message: customerComment || `Counter discount request: ${counterDiscountPct}%`,
        quotationItemId: selectedItemId || undefined,
        requestedDiscountPct: counterDiscountPct ? Number(counterDiscountPct) : undefined,
      });
      toast.success('Negotiation request submitted.');
      setCustomerComment('');
      setCounterDiscountPct('');
      await loadQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit negotiation request.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmQuotation = async () => {
    if (!window.confirm('Are you sure you want to confirm this quotation?')) return;
    setConfirming(true);
    try {
      await customerApi.post(`/quotes/${quotationId}/confirm`);
      toast.success('Quotation confirmed.');
      await loadQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm quotation.');
    } finally {
      setConfirming(false);
    }
  };

  const status = quotation?.status;
  const canNegotiate = ['SENT', 'UNDER_NEGOTIATION'].includes(status);
  const canConfirm = status === 'SENT';

  // Helper map for line-level comments
  const latestCommentsByLine = {};
  timeline.forEach((entry) => {
    if (entry.message && entry.quotationItemId) latestCommentsByLine[entry.quotationItemId] = entry.message;
  });

  return (
    <CustomerPortalGuard portalUser={portalUser} setPortalUser={setPortalUser} onAuthSuccess={loadQuotation}>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        <CustomerNavbar customerUser={portalUser} />
        <main className="flex-1 max-w-350 w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          <Link to="/v1/customer" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#714b67]"><ArrowLeft className="h-4 w-4" />Back to quotations</Link>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
          {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading quotation...</div>}
          {quotation && (
            <>
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div><p className="text-xs font-bold uppercase tracking-wider text-[#714b67]">Quotation</p><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{quotation.quoteNumber}</h1><p className="text-sm text-slate-500">{quotation.customerName}</p></div>
                <span className={`rounded-full border px-3.5 py-1 text-xs font-black uppercase ${statusStyles[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>{status?.replaceAll('_', ' ')}</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
                <div className="overflow-x-auto"><table className="w-full min-w-212.5 text-left text-xs"><thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-700"><tr><th className="px-5 py-3.5">Line</th><th className="px-5 py-3.5">Latest comment</th><th className="px-5 py-3.5">Price</th><th className="px-5 py-3.5">Discount %</th><th className="px-5 py-3.5">Request status</th></tr></thead><tbody className="divide-y divide-slate-200">
                  {quotation.items?.map((item) => <tr key={item.id} onClick={() => setSelectedItemId(item.id)} className={`cursor-pointer hover:bg-slate-50 ${selectedItemId === item.id ? 'bg-[#714b67]/5 border-l-4 border-[#714b67]' : ''}`}><td className="px-5 py-4 font-bold text-slate-900">{item.productName}</td><td className="px-5 py-4 italic text-slate-600">{latestCommentsByLine[item.id] || 'No customer comment'}</td><td className="px-5 py-4 font-mono font-bold text-slate-900">{Number(item.unitPrice || 0).toLocaleString()}</td><td className="px-5 py-4 font-mono font-bold text-emerald-700">{item.discountPct}%</td><td className="px-5 py-4 text-slate-500">{canNegotiate ? 'Ready for request' : 'Unavailable'}</td></tr>)}
                </tbody></table></div>
              </div>

              {/* Threaded Negotiation History & Message Box */}
              <div className="rounded-xl border border-slate-300 bg-white shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Negotiation Conversation</p>
                  <span className="text-[11px] text-slate-400">{timeline.length} message{timeline.length === 1 ? '' : 's'}</span>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {timeline.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No messages in negotiation thread yet.</p>
                  ) : (
                    timeline.map((entry) => {
                      const fromMe = entry.kind === 'COMMENT' ? entry.authorType === 'CUSTOMER' : true;
                      return (
                        <div key={`${entry.kind}-${entry.id}`} className={`text-xs p-3 rounded-xl ${fromMe ? 'bg-[#714b67]/10 ml-8 border border-[#714b67]/20' : 'bg-slate-100 mr-8 border border-slate-200'}`}>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span className={fromMe ? 'text-[#714b67]' : 'text-slate-700'}>
                              {fromMe ? 'You (Customer)' : 'Sales & Pricing Team'}
                              {entry.kind === 'REQUEST' && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                                  {entry.requestType}{entry.requestedDiscountPct !== null && entry.requestedDiscountPct !== undefined ? ` (${entry.requestedDiscountPct}%)` : ''} - {entry.status}
                                </span>
                              )}
                            </span>
                            <span className="font-normal text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-800">{entry.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>
                {canNegotiate && (
                  <form onSubmit={sendComment} className="flex gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Send a message to the sales team..."
                      className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-[#714b67] focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyMessage.trim()}
                      className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sendingReply ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                )}
              </div>

              {/* Negotiation Request Form (Counter Discount) */}
              <form onSubmit={submitRequest} className="space-y-6 rounded-xl border border-slate-300 bg-white p-6 shadow-xs">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Counter Discount %</label>
                    <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 15" value={counterDiscountPct} onChange={(event) => setCounterDiscountPct(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono focus:border-[#714b67] focus:outline-hidden" />
                  </div>
                  <div className="flex items-end text-xs text-slate-500">
                    Counter discount proposals are submitted directly to the sales manager for review and pricing approval.
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Formal Request Note / Comment for Selected Line</label>
                  <textarea rows="2" placeholder="Add your proposal rationale or target pricing..." value={customerComment} onChange={(event) => setCustomerComment(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[#714b67] focus:outline-hidden" />
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <button type="submit" disabled={submitting || !canNegotiate} className="inline-flex items-center gap-2 rounded-xl bg-[#714b67] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#5a3a52] disabled:opacity-50">
                    <Send className="h-4 w-4" />{submitting ? 'Submitting...' : 'Submit Counter Offer'}
                  </button>
                  <button type="button" onClick={confirmQuotation} disabled={confirming || !canConfirm} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />{confirming ? 'Confirming...' : 'Confirm Quotation'}
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </CustomerPortalGuard>
  );
}
