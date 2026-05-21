import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ManualWAButton({ phone, name, date, time, services, className }) {
  const handleManualSend = () => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('39') ? cleanPhone : `39${cleanPhone}`;
    const servicesText = Array.isArray(services) ? services.map(s => s.name).join(', ') : '';
    const message = `Ciao ${name}! Ti ricordiamo il tuo appuntamento da Bruno Melito Hair per il giorno ${date} alle ore ${time}${servicesText ? ' per ' + servicesText : ''}. A presto! ✂️✨`;
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${waPhone}?text=${encodedMsg}`, '_blank');
  };

  return (
    <Button 
      type="button" 
      onClick={handleManualSend} 
      variant="outline" 
      size="sm"
      className={`border-green-600 text-green-600 hover:bg-green-50 font-bold gap-1.5 h-7 text-[10px] ${className}`}
    >
      <MessageCircle className="w-3.5 h-3.5" />
      WA WEB
    </Button>
  );
}
