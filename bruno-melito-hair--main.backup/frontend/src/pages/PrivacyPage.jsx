export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Informativa sulla Privacy</h1>
      <p className="text-gray-500 mb-8 text-sm">Ultimo aggiornamento: maggio 2025</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Titolare del Trattamento</h2>
        <p className="text-gray-700">Bruno Melito Hair — Via del Salone, Napoli (NA) — Italia<br />
        Email: melitobruno@gmail.com<br />
        Tel: +39 339 783 3526</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Dati Raccolti</h2>
        <p className="text-gray-700">Raccogliamo i seguenti dati forniti volontariamente dagli utenti:</p>
        <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-1">
          <li>Nome e cognome</li>
          <li>Numero di telefono (per l'invio di promemoria appuntamenti via WhatsApp)</li>
          <li>Data di nascita (per auguri di compleanno)</li>
          <li>Storico appuntamenti e servizi</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Finalità del Trattamento</h2>
        <ul className="list-disc ml-6 text-gray-700 space-y-1">
          <li>Gestione prenotazioni e appuntamenti</li>
          <li>Invio di promemoria appuntamenti via WhatsApp/SMS</li>
          <li>Comunicazioni di cortesia (auguri, offerte promozionali)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Messaggi WhatsApp Automatici</h2>
        <p className="text-gray-700">Il nostro sistema invia messaggi WhatsApp automatici tramite le API ufficiali di Meta (WhatsApp Business API) per promemoria appuntamenti e comunicazioni di cortesia. I dati vengono trasmessi a Meta Platforms Ireland Limited in conformità con le loro politiche sulla privacy.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Conservazione dei Dati</h2>
        <p className="text-gray-700">I dati sono conservati per il tempo strettamente necessario alla fornitura del servizio e comunque non oltre 5 anni dall'ultimo appuntamento.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Diritti dell'Utente</h2>
        <p className="text-gray-700">Ai sensi del GDPR (Reg. UE 2016/679) hai diritto di accesso, rettifica, cancellazione e opposizione al trattamento dei tuoi dati. Per esercitare i tuoi diritti scrivi a: <strong>melitobruno@gmail.com</strong></p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Base Giuridica</h2>
        <p className="text-gray-700">Il trattamento è basato sul consenso dell'interessato (art. 6 lett. a GDPR) e sull'esecuzione di un contratto di servizio (art. 6 lett. b GDPR).</p>
      </section>

      <p className="text-gray-400 text-xs mt-12">Bruno Melito Hair — P.IVA / C.F. da inserire — Napoli, Italia</p>
    </div>
  );
}
