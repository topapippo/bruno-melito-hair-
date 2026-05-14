import { useParams, Link } from 'react-router-dom';
import { Scissors, Star, MapPin, Phone, ArrowLeft } from 'lucide-react';

const SERVICES = {
  balayage: {
    name: 'Balayage',
    subtitle: 'Colorazione naturale con effetto sole',
    description: 'Il balayage è la tecnica di colorazione più richiesta del momento. Bruno Melito Hair a Santa Maria Capua Vetere ti offre un balayage personalizzato che valorizza il colore naturale dei tuoi capelli con sfumature luminose e naturali. Ogni trattamento è studiato sulla forma del viso e sulla struttura del capello.',
    benefits: ['Effetto naturale e luminoso', 'Durata superiore alla tinta tradizionale', 'Nessuna radice evidente', 'Adatto a tutti i tipi di capello'],
    price: 'Da €80',
    duration: '2-3 ore',
    keywords: 'balayage Santa Maria Capua Vetere, colorazione capelli Caserta, salone di parrucchieri SMCV',
  },
  taglio: {
    name: 'Taglio Donna',
    subtitle: 'Taglio personalizzato per ogni forma di viso',
    description: 'Un buon taglio di capelli cambia tutto. Da Bruno Melito Hair a Santa Maria Capua Vetere, ogni taglio viene studiato in base alla forma del viso, alla struttura del capello e allo stile di vita della cliente. Precisione, cura dei dettagli e ascolto sono la nostra firma.',
    benefits: ['Consulenza personalizzata inclusa', 'Tecniche moderne e classiche', 'Styling e piega inclusi', 'Prodotti professionali'],
    price: 'Da €30',
    duration: '45-60 min',
    keywords: 'taglio capelli donna Santa Maria Capua Vetere, parrucchiere Caserta, haircut SMCV',
  },
  colorazione: {
    name: 'Colorazione',
    subtitle: 'Colore pieno, tinta e copertura capelli bianchi',
    description: 'La colorazione professionale da Bruno Melito Hair utilizza prodotti di alta qualità per garantire un colore brillante, uniforme e duraturo. Sia che tu voglia coprire i capelli bianchi o cambiare completamente colore, il nostro team saprà consigliarti la soluzione migliore.',
    benefits: ['Prodotti ammoniaca-free disponibili', 'Copertura completa capelli bianchi', 'Trattamento nutriente incluso', 'Consulenza colore gratuita'],
    price: 'Da €45',
    duration: '1-2 ore',
    keywords: 'colorazione capelli Santa Maria Capua Vetere, tinta capelli Caserta, copertura bianchi SMCV',
  },
  trattamenti: {
    name: 'Trattamenti',
    subtitle: 'Nutrizione, cheratina e ristrutturazione capillare',
    description: 'I capelli sani sono la base di ogni look. Da Bruno Melito Hair a Santa Maria Capua Vetere proponiamo trattamenti professionali per ogni esigenza: dalla cheratina per capelli lisci e morbidi, ai trattamenti nutrienti per capelli secchi o danneggiati.',
    benefits: ['Cheratina professionale', 'Trattamento nutriente intensivo', 'Ristrutturazione capelli danneggiati', 'Prodotti professionali inclusi'],
    price: 'Da €40',
    duration: '1-2 ore',
    keywords: 'trattamenti capelli Santa Maria Capua Vetere, cheratina Caserta, nutrizione capelli SMCV',
  },
  piega: {
    name: 'Piega & Styling',
    subtitle: 'Acconciatura per ogni occasione',
    description: 'Per un\'uscita speciale, un matrimonio o semplicemente per sentirti al meglio ogni giorno. Da Bruno Melito Hair a Santa Maria Capua Vetere realizziamo pieghe, acconciature e styling su misura per ogni occasione.',
    benefits: ['Piega liscio o ricci', 'Acconciature cerimonia', 'Styling up-do e raccolti', 'Prodotti fissativi professionali'],
    price: 'Da €20',
    duration: '30-45 min',
    keywords: 'piega capelli Santa Maria Capua Vetere, acconciatura cerimonia Caserta, styling capelli SMCV',
  },
};

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const service = SERVICES[slug];

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Servizio non trovato</h1>
        <Link to="/sito" className="text-purple-600 hover:underline">← Torna al sito</Link>
      </div>
    );
  }

  return (
    <>
      <title>{service.name} a Santa Maria Capua Vetere | Bruno Melito Hair</title>

      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link to="/sito" className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Torna al sito
            </Link>
            <img src="/logo.png" alt="Bruno Melito Hair" className="h-10 w-10 rounded-xl" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 rounded-full mb-4">
              <Scissors className="w-3.5 h-3.5" /> Servizio Professionale
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-3">{service.name}</h1>
            <p className="text-xl text-gray-500 mb-2">{service.subtitle}</p>
            <p className="text-sm text-gray-400">Bruno Melito Hair · Santa Maria Capua Vetere (CE)</p>
          </div>

          {/* Info card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Prezzo', value: service.price },
              { label: 'Durata', value: service.duration },
              { label: 'Sede', value: 'SMCV (CE)' },
              { label: 'Valutazione', value: '★★★★★' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-xs text-gray-400 font-medium mb-1">{item.label}</p>
                <p className="font-bold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Descrizione del servizio</h2>
            <p className="text-gray-600 leading-relaxed text-base">{service.description}</p>
          </div>

          {/* Benefits */}
          <div className="bg-purple-50 rounded-3xl p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Cosa include</h2>
            <ul className="space-y-3">
              {service.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-700">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-3xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Prenota il tuo appuntamento</h2>
            <p className="text-white/80 mb-6 text-sm">A Santa Maria Capua Vetere, in via Roma 123</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/sito"
                className="bg-white text-purple-700 font-bold px-8 py-4 rounded-2xl hover:bg-purple-50 transition-all shadow-lg"
              >
                📅 Prenota Online
              </Link>
              <a
                href="https://wa.me/393331234567"
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>

          {/* SEO text */}
          <div className="mt-10 text-xs text-gray-400 text-center leading-relaxed">
            <MapPin className="w-3.5 h-3.5 inline mr-1" />
            Bruno Melito Hair · {service.name} a Santa Maria Capua Vetere, Caserta · {service.keywords}
          </div>
        </div>
      </div>
    </>
  );
}
