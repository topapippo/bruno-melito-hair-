import { useState, useEffect, useRef } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, MessageCircle, ChevronLeft, Phone } from 'lucide-react';
import { toast } from 'sonner';

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MessagesPage() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchInbox();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages?.length]);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/messages/inbox`);
      setChats(res.data || []);
    } catch (err) {
      console.error('Errore caricamento messaggi:', err);
      toast.error('Errore nel caricamento dei messaggi');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !activeChat || sending) return;
    setSending(true);
    try {
      await api.post(`${API}/messages/send`, { phone: activeChat.phone, text });
      setActiveChat((prev) => ({
        ...prev,
        messages: [...prev.messages, { message: text, direction: 'outbound', timestamp: new Date().toISOString() }],
      }));
      setNewMessage('');
      toast.success('Messaggio inviato!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore invio messaggio');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="space-y-4" data-testid="messages-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#2D1B14] flex items-center gap-3">
            <MessageCircle className="w-7 h-7 text-[#C8617A]" aria-hidden="true" />
            Messaggi
          </h1>
          <p className="text-[#7C5C4A] mt-1">Le conversazioni WhatsApp ricevute dai clienti</p>
        </div>

        <Card className="bg-white border-[#F0E6DC]/30 overflow-hidden">
          <CardContent className="p-0 flex flex-col md:flex-row h-[calc(100vh-260px)] min-h-[420px]">
            {/* Lista chat */}
            <div className={`w-full md:w-72 border-r border-[#F0E6DC] flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
              {loading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : chats.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#7C5C4A]">
                  <MessageCircle className="w-10 h-10 mx-auto text-[#C8617A] mb-2" aria-hidden="true" />
                  Nessun messaggio ricevuto
                </div>
              ) : (
                <div className="overflow-y-auto divide-y divide-[#F0E6DC]/60 flex-1">
                  {chats.map((chat) => (
                    <button
                      key={chat.phone}
                      type="button"
                      onClick={() => setActiveChat(chat)}
                      aria-label={`Apri conversazione con ${chat.client_name || chat.phone}`}
                      className={`w-full text-left p-4 hover:bg-[#FDF8F5] transition-colors ${activeChat?.phone === chat.phone ? 'bg-[#FDF8F5]' : ''}`}
                    >
                      <p className="font-bold text-sm text-[#2D1B14] truncate">{chat.client_name || 'Sconosciuto'}</p>
                      <p className="text-xs text-[#7C5C4A] truncate mt-0.5">{chat.last_message}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-1">{formatTime(chat.timestamp)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat attiva */}
            <div className={`flex-1 flex-col ${activeChat ? 'flex' : 'hidden md:flex'}`}>
              {!activeChat ? (
                <div className="flex-1 flex items-center justify-center text-sm text-[#7C5C4A]">
                  Seleziona una conversazione
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 border-b border-[#F0E6DC]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      aria-label="Torna alla lista conversazioni"
                      onClick={() => setActiveChat(null)}
                    >
                      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#2D1B14] truncate">{activeChat.client_name || 'Sconosciuto'}</p>
                      <p className="text-xs text-[#7C5C4A] flex items-center gap-1">
                        <Phone className="w-3 h-3" aria-hidden="true" /> {activeChat.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#FDF8F5]/50">
                    {activeChat.messages.map((msg, i) => {
                      const isOutbound = msg.direction !== 'inbound';
                      return (
                        <div key={i} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                              isOutbound ? 'bg-[#C8617A] text-white' : 'bg-white border border-[#F0E6DC] text-[#2D1B14]'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${isOutbound ? 'text-white/70' : 'text-[#94A3B8]'}`}>
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t border-[#F0E6DC] flex items-center gap-2">
                    <label htmlFor="reply-input" className="sr-only">Scrivi un messaggio</label>
                    <input
                      id="reply-input"
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Scrivi un messaggio..."
                      className="flex-1 border border-[#F0E6DC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8617A]"
                    />
                    <Button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !newMessage.trim()}
                      aria-label="Invia messaggio"
                      className="bg-[#C8617A] hover:bg-[#B04E67] text-white rounded-xl px-4"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
