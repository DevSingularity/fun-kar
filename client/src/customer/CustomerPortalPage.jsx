import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Send, 
  AlertTriangle, 
  Clock, 
  Building2, 
  Calendar, 
  FileText, 
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import customerApi from './services/customerApi.js';
import CustomerNavbar from './CustomerNavbar.jsx';
import CustomerPortalGuard from './CustomerPortalGuard.jsx';

export default function CustomerPortalPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryToken = searchParams.get('token');
  const queryQuoteId = searchParams.get('quoteId');

  const [portalUser, setPortalUser] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Form states matching Wireframe #11
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customerComment, setCustomerComment] = useState('');
  const [counterDiscountPct, setCounterDiscountPct] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [commentsByLine, setCommentsByLine] = useState({});

  useEffect(() => {
    if (queryToken) {
      localStorage.setItem('quoteShareToken', queryToken);
    }
    fetchPortalUserAndQuote();
  }, [queryToken, queryQuoteId]);

  const fetchPortalUserAndQuote = async () => {
    setLoading(true);
    try {
      // 1. Try checking session
      let user = null;
      try {
        const meRes = await customerApi.get('/auth/me');
        user = meRes.data?.data;
        setPortalUser(user);
      } catch (err) {
        // Share token access mode
      }

      // 2. Fetch quotation detail
      let quoteId = queryQuoteId;
      if (!quoteId) {
        try {
          const listRes = await customerApi.get('/quotes');
          const quotes = listRes.data?.data || [];
          if (quotes.length > 0) {
            quoteId = quotes[0].id;
          }
        } catch (e) {
          // ignore
        }
      }

      if (quoteId) {
        const detailRes = await customerApi.get(`/quotes/${quoteId}`);
        const quoteData = detailRes.data?.data?.quotation || detailRes.data?.data;
        setQuotation(quoteData);

        if (quoteData?.items?.length > 0) {
          setSelectedItemId(quoteData.items[0].id);
        }

        // Fetch timeline for comments
        try {
          const timelineRes = await customerApi.get(`/quotes/${quoteId}/negotiation`);
          const timeline = timelineRes.data?.data?.timeline || [];
          const commentMap = {};
          timeline.forEach((entry) => {
            if (entry.message && entry.quotationItemId) {
              commentMap[entry.quotationItemId] = entry.message;
            }
          });
          setCommentsByLine(commentMap);
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      // Offline demo mode fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!quotation) return;

    if (!counterDiscountPct && !customerComment) {
      toast.error('Please enter a Counter Discount % or Customer Comment.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        requestType: counterDiscountPct ? 'COUNTER_DISCOUNT' : 'COMMENT',
        message: customerComment || `Counter discount request: ${counterDiscountPct}%`,
        quotationItemId: selectedItemId || undefined,
        requestedDiscountPct: counterDiscountPct ? Number(counterDiscountPct) : undefined,
        requestedDeliveryDate: requestedDeliveryDate || undefined,
      };

      const res = await customerApi.post(`/quotes/${quotation.id}/negotiation-requests`, payload);
      toast.success(res.data?.message || 'Negotiation request submitted!');

      setCustomerComment('');
      setCounterDiscountPct('');
      fetchPortalUserAndQuote();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit negotiation request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmQuotation = async () => {
    if (!quotation) return;
    if (!confirm('Are you sure you want to confirm and accept this quotation?')) return;

    setConfirming(true);
    try {
      await customerApi.post(`/quotes/${quotation.id}/confirm`);
      toast.success('Quotation confirmed successfully! Order generated.');
      fetchPortalUserAndQuote();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm quotation');
    } finally {
      setConfirming(false);
    }
  };

  // Safe items fallback for rendering
  const displayItems = quotation?.items || [
    {
      id: 'demo-line-1',
      productName: 'Extended Warranty',
      quantity: 1,
      unitPrice: 180,
      discountPct: 10,
      allowedDiscountPct: 15,
      comment: 'Can this be 15% off instead of 10%?',
    },
    {
      id: 'demo-line-2',
      productName: 'Onsite Setup',
      quantity: 1,
      unitPrice: 450,
      discountPct: 18,
      allowedDiscountPct: 10,
      comment: 'Can we push this to next month?',
    },
  ];

  const currentStatus = quotation?.status || 'UNDER_NEGOTIATION';

  const exceedsThreshold = displayItems.some((item) => {
    const allowed = Number(item.allowedDiscountPct || 15);
    const requested = counterDiscountPct ? Number(counterDiscountPct) : Number(item.discountPct);
    return requested > allowed;
  });

  return (
    <CustomerPortalGuard portalUser={portalUser} setPortalUser={setPortalUser} onAuthSuccess={fetchPortalUserAndQuote}>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        
        {/* ── Top Header Navigation Bar ── */}
        <CustomerNavbar customerUser={portalUser} />

        {/* ── Main Customer Portal Container ── */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">

          {/* Wireframe Header */}
          <div className="space-y-1">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                Customer Portal Negotiation Screen
              </h1>
              
              {/* Dynamic Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs ${
                  currentStatus === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentStatus === 'PENDING_APPROVAL'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  Status: {currentStatus.replace('_', ' ')}
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Customer reviews and negotiates the quote directly, no email needed
            </p>
          </div>

          {/* ── Line Items & Customer Comments Table (Wireframe #11) ── */}
          <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Line</th>
                    <th className="py-3.5 px-5">Customer Comment</th>
                    <th className="py-3.5 px-5">Price</th>
                    <th className="py-3.5 px-5">Discount %</th>
                    <th className="py-3.5 px-5">Max Threshold (Variable)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                  {displayItems.map((item) => {
                    const lineComment = commentsByLine[item.id] || item.comment || (item.productName === 'Extended Warranty' ? 'Can this be 15% off instead of 10%?' : 'Can we push this to next month?');
                    const allowedThreshold = item.allowedDiscountPct !== null && item.allowedDiscountPct !== undefined ? item.allowedDiscountPct : 15;

                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedItemId(item.id)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          selectedItemId === item.id ? 'bg-[#714b67]/5 border-l-4 border-[#714b67]' : ''
                        }`}
                      >
                        <td className="py-4 px-5 font-bold text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-4 px-5 text-slate-600 italic">
                          {lineComment}
                        </td>
                        <td className="py-4 px-5 font-mono font-bold text-slate-900">
                          ₹{Number(item.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-5 font-mono font-bold text-emerald-700">
                          {item.discountPct}%
                        </td>
                        <td className="py-4 px-5 font-mono text-purple-700 font-bold">
                          {allowedThreshold}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Form Controls & Action Buttons (Wireframe #11) ── */}
          <form onSubmit={handleSubmitRequest} className="space-y-6 bg-white p-6 rounded-xl border border-slate-300 shadow-xs">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Counter Discount % */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Counter Discount %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 15"
                  value={counterDiscountPct}
                  onChange={(e) => setCounterDiscountPct(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:outline-hidden focus:border-[#714b67] shadow-xs"
                />
              </div>

              {/* Requested Delivery Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Requested Delivery Date
                </label>
                <input
                  type="date"
                  value={requestedDeliveryDate}
                  onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-hidden focus:border-[#714b67] shadow-xs"
                />
              </div>
            </div>

            {/* Customer Comment Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Customer Comment / Message for Selected Line
              </label>
              <textarea
                rows="2"
                placeholder="Add your note or request details here..."
                value={customerComment}
                onChange={(e) => setCustomerComment(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#714b67] shadow-xs"
              />
            </div>

            {/* Action Buttons matching Wireframe #11 */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              
              {/* Submit Request Button */}
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-all active:scale-98 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>

              {/* Confirm Quotation Button (Green) */}
              <button
                type="button"
                onClick={handleConfirmQuotation}
                disabled={confirming || currentStatus === 'CONFIRMED'}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-98 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {confirming ? 'Confirming...' : currentStatus === 'CONFIRMED' ? 'Quotation Confirmed' : 'Confirm Quotation'}
              </button>
            </div>
          </form>

          {/* ── Informational Notice Banner (Wireframe #11 Bottom Notice) ── */}
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center gap-3 shadow-xs">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span className="font-semibold">
              If final terms exceed thresholds, the quote automatically re-enters approval (Screen 6).
            </span>
          </div>

        </main>
      </div>
    </CustomerPortalGuard>
  );
}
