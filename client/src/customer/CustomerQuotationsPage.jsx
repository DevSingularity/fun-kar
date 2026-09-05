import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, RefreshCw } from 'lucide-react';
import customerApi from './services/customerApi.js';
import CustomerNavbar from './CustomerNavbar.jsx';
import CustomerPortalGuard from './CustomerPortalGuard.jsx';

const statusStyles = {
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
  UNDER_NEGOTIATION: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_APPROVAL: 'bg-orange-50 text-orange-700 border-orange-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function formatStatus(status) {
  return status?.replaceAll('_', ' ') || 'UNKNOWN';
}

export default function CustomerQuotationsPage() {
  const [portalUser, setPortalUser] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuotations = async () => {
    setLoading(true);
    setError('');
    try {
      const meRes = await customerApi.get('/auth/me');
      setPortalUser(meRes.data?.data);
      const response = await customerApi.get('/quotes');
      const items = response.data?.data?.items || response.data?.data || [];
      setQuotations(Array.isArray(items) ? items : []);
    } catch (err) {
      setQuotations([]);
      setError(err.response?.data?.message || 'Unable to load quotations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  return (
    <CustomerPortalGuard portalUser={portalUser} setPortalUser={setPortalUser} onAuthSuccess={loadQuotations}>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        <CustomerNavbar customerUser={portalUser} />
        <main className="flex-1 max-w-350 w-full mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#714b67]">Customer portal</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Quotations</h1>
              <p className="mt-1 text-sm text-slate-500">Review the quotations shared with your account.</p>
            </div>
            <button
              type="button"
              onClick={loadQuotations}
              disabled={loading}
              title="Refresh quotations"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-5 py-4">Quotation</th>
                    <th className="px-5 py-4">Created</th>
                    <th className="px-5 py-4">Delivery date</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="group hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <Link to={`/v1/customer/${quotation.id}`} className="inline-flex items-center gap-2 font-bold text-slate-900 hover:text-[#714b67]">
                          <FileText className="h-4 w-4 text-[#714b67]" />
                          {quotation.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-5 py-4 text-slate-600">{quotation.promisedDeliveryDate ? new Date(quotation.promisedDeliveryDate).toLocaleDateString() : '-'}</td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">{Number(quotation.grandTotal || 0).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${statusStyles[quotation.status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {formatStatus(quotation.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right"><Link to={`/v1/customer/${quotation.id}`} className="inline-flex rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" title="Open quotation"><ArrowRight className="h-4 w-4" /></Link></td>
                    </tr>
                  ))}
                  {!loading && quotations.length === 0 && (
                    <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">No quotations have been shared with your account.</td></tr>
                  )}
                  {loading && <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">Loading quotations...</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </CustomerPortalGuard>
  );
}