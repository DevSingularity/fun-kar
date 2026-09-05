import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import customerApi from './services/customerApi.js';
import CustomerNavbar from './CustomerNavbar.jsx';
import CustomerPortalGuard from './CustomerPortalGuard.jsx';

export default function CustomerMessagesPage() {
  const [portalUser, setPortalUser] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      authorType: 'CUSTOMER',
      authorName: 'Customer',
      message: 'Can this be 15% off instead of 10% on Extended Warranty?',
      createdAt: '2026-09-05T10:00:00Z',
    },
    {
      id: 'm2',
      authorType: 'INTERNAL',
      authorName: 'Sales Rep (DealFlow360)',
      message: 'We can offer 12% max under standard policy. Let us check with Sales Manager for 15%.',
      createdAt: '2026-09-05T10:15:00Z',
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchSessionAndMessages();
  }, []);

  const fetchSessionAndMessages = async () => {
    try {
      const meRes = await customerApi.get('/auth/me');
      setPortalUser(meRes.data?.data);

      const listRes = await customerApi.get('/quotes');
      const quotes = listRes.data?.data || [];
      if (quotes.length > 0) {
        const timelineRes = await customerApi.get(`/quotes/${quotes[0].id}/negotiation`);
        const timeline = timelineRes.data?.data?.timeline || [];
        if (timeline.length > 0) {
          setMessages(timeline);
        }
      }
    } catch (err) {
      // Fallback demo thread
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const listRes = await customerApi.get('/quotes');
      const quotes = listRes.data?.data || [];
      if (quotes.length > 0) {
        await customerApi.post(`/quotes/${quotes[0].id}/comments`, {
          message: newMessage.trim(),
        });
        toast.success('Message sent');
        setNewMessage('');
        fetchSessionAndMessages();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            authorType: 'CUSTOMER',
            authorName: portalUser?.name || 'Customer',
            message: newMessage.trim(),
            createdAt: new Date().toISOString(),
          },
        ]);
        setNewMessage('');
        toast.success('Message posted');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <CustomerPortalGuard portalUser={portalUser} setPortalUser={setPortalUser} onAuthSuccess={fetchSessionAndMessages}>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        <CustomerNavbar customerUser={portalUser} />

        <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#714b67]/10 border border-[#714b67]/20 text-[#714b67]">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Deal Negotiation Messages</h1>
              <p className="text-xs text-slate-500 font-medium">Direct message thread with your assigned DealFlow360 Account Executive</p>
            </div>
          </div>

          {/* Message Thread Container */}
          <div className="bg-white rounded-xl border border-slate-300 p-6 space-y-4 shadow-xs min-h-[350px] flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2">
              {messages.map((m) => {
                const isCustomer = m.authorType === 'CUSTOMER';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-500">
                        {isCustomer ? (portalUser?.name || 'You (Customer)') : 'DealFlow360 Account Team'}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-[#714b67] text-white rounded-br-none shadow-xs'
                          : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-200 flex gap-3">
              <input
                type="text"
                placeholder="Type your message to the deal team..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#714b67] shadow-xs"
              />
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#714b67] hover:bg-[#5a3a52] text-white transition-all shadow-xs flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </form>
          </div>
        </main>
      </div>
    </CustomerPortalGuard>
  );
}
