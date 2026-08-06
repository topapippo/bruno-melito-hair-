#!/usr/bin/env python3
"""
Import social media posts from the content plan.
Run: python import_social_posts.py
"""
import asyncio
from datetime import datetime, timezone
import uuid
from database import db

POSTS_DATA = [
    {
        "schedule_day": "lunedi",
        "caption": """🎨 BALAYAGE = ARTE, NON MAGIA

Sai perché il balayage da Bruno dura 3+ mesi mentre altri si sciacquano dopo 1 mese?

Non è il prodotto. Non è la fortuna.

È la TECNICA.

Ogni colpo di pennello è calcolato. Ogni sfumatura segue la struttura naturale del capello. Ogni cliente esce d'qui con capelli che brillano proprio perché sono VERI.

Da 40+ anni, non facciamo scorciatoie. Facciamo capolavori.

🧡 Segui i nostri tutorial per imparare come mantenere il tuo balayage tra una visita e l'altra.

📍 Via Vito Nicola Melorio 101, Santa Maria Capua Vetere
☎️ 0823 18 78 320
💻 Prenota online: brunomelitohair.it

#BrunoMelitoHair #Balayage #TecnicaProfessionale #ColoreSenzaAmmoniaca #CapelliCheStanBene""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "mercoledi",
        "caption": """✨ IL BALAYAGE CHE NESSUNO TI OFFRE

Questo non è un colore "fatto così".

Guarda come ogni sfumatura è diversa.
Guarda come cade la luce.
Guarda come il colore segue il movimento naturale dei capelli.

Questo è balayage PROFESSIONALE.

Da Bruno usiamo:
✅ Colore senza ammoniaca (più sano)
✅ Tecnica manuale (più preciso)
✅ Prodotti trattamento (più lucido)
✅ Consulenza personalizzata (per TE, non per tutti)

Non è il prezzo più basso.
È il risultato migliore.

🎯 Le clienti che scelgono Bruno una volta, rimangono per anni.

Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#BrunoMelitoHair #Balayage #ColoreProfessionale #CapelliDonna #QualitàNonPrezzo""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "venerdi",
        "caption": """🤫 UN SEGRETO CHE I PARRUCCHIERI NON TI DICONO

Vuoi sapere come riconoscere un vero colore fatto bene?

🔍 Guarda i RIFLESSI, non il colore principale

Se il colore ha riflessi naturali, significa che è stato fatto da qualcuno che conosce il mestiere.

Se è piatto e monocromatico, significa che è stato fatto di fretta.

Da Bruno:
- Analizziamo il tono naturale dei tuoi capelli
- Aggiungiamo riflessi che valorizzano il tuo viso
- Usiamo tecnica manuale per sfumature naturali
- Trattiamo i capelli prima e dopo per mantenerli sani

Non è più caro. È SMART.

Vieni a scoprire la differenza. 🎨

📲 Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#BrunoMelitoHair #ColoreProfessionale #BeautyTips #CapelliConsiglidaBruno""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "lunedi",
        "caption": """👩‍🦰 "DA BRUNO DA 5 ANNI E NON CAMBIO"

Chiediamo sempre alle nostre clienti fedeli:
"Perché rimani con Bruno?"

La risposta è sempre la stessa:
✅ Mi conosce (non mi fa un colore 'standard')
✅ Mi ascolta (non decide LUI cosa devo fare)
✅ Mi valorizza (il colore mi sta bene, non a tutti)
✅ Mi cura (i miei capelli sono sempre lucidi)
✅ Mi accoglie (qui mi sento a casa, non in fabbrica)

La bellezza vera non è uno SCONTO.
È una RELAZIONE.

Sei stanca di saloni dove:
- Non ti ricordano chi sei
- Ti vendono prodotti che non ti servono
- Il risultato non dura

Vieni da noi. Scopri la differenza.

🎨 Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#BrunoMelitoHair #Testimonianze #ClientiFedeli #BeautyReal #PaesePaese""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "mercoledi",
        "caption": """🌟 TRASFORMAZIONE VERA

Non è Photoshop.
Non è filtro.
Non è editing.

È quello che accade quando qualcuno che sa il mestiere tocca i tuoi capelli.

📸 SINISTRA: Capelli spenti, colore statico
📸 DESTRA: Capelli luminosi, colore vivo

**Cosa è cambiato?**
✓ Balayage strategico (colore che valorizza il viso)
✓ Trattamento cheratina (lucentezza naturale)
✓ Cura post-colore (manteniamo il risultato)

**Quanto dura?** 8-10 settimane per il colore, poi basta ritocco.

Questa cliente torna da Bruno ogni 2 mesi.
Non perché deve.
Perché VUOLE.

Il risultato parla. 🎨

Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#PrimaEDopo #TransformazioneCapelli #BrunoMelitoHair #ColoreProfessionale""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "venerdi",
        "caption": """🎨 TRE CLIENTI, TRE STORIE, UNO STESSO RISULTATO: BELLEZZA

Scorri →

Cliente 1️⃣: Voleva un rosso caldo che valorizzasse i suoi occhi
✅ Fatto. Dura da 10 settimane.

Cliente 2️⃣: Arrivava con capelli spenti, voleva brillare
✅ Balayage personalizzato. Torna ogni 2 mesi.

Cliente 3️⃣: Aveva paura del colore, voleva solo movimento
✅ Riflessi naturali. Adesso ama guardarsi allo specchio.

**Cosa hanno in comune?**
Nessuno sconto.
Nessuna fretta.
Nessun compromesso.

Solo QUALITÀ.

Se stai cercando un colore che:
- Ti valorizza (non ti "normalizza")
- Dura (non sbiadisce in 3 settimane)
- Ti piace (non ti piace il colore di qualcun altro)

Vieni da noi. 🎯

Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#BrunoMelitoHair #BeautyStories #ClientiReal #ColoreProfessionale #SantaMariaCVetere""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "lunedi",
        "caption": """✂️ IL TAGLIO CHE TI CAMBIA IL VISO

Pensi che i capelli corti ti starebbero male?

SBAGLIATO. 🚫

Un taglio corto PROFESSIONALE può:
✅ Affinare il viso
✅ Valorizzare gli occhi
✅ Darti più carattere
✅ Ridurre l'effetto crespo
✅ Farti risparmiare tempo in piega

**La differenza:**
- Un taglio fatto male → disastro (capelli dritti, senza forma)
- Un taglio fatto da Bruno → capolavoro (movimento, personalità, eleganza)

Non è il LUNGHEZZA che conta.
È la TECNICA.

Hai paura di tagliare corto?
Bruno ascolta le tue insicurezze e crea il taglio PERFETTO per il TUO viso.

🎯 Dopo il primo taglio, le clienti dicono sempre:
"Perché non l'ho fatto prima?!"

Vieni a scoprire il tuo nuovo look. 💇

Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#TaglioDonna #ShortHair #TechnicaProfessionale #BrunoMelitoHair #CambiadiLook""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "mercoledi",
        "caption": """💇‍♀️ COME MANTENERE IL TUO TAGLIO CORTO TRA LE VISITE

Il tuo parrucchiere non ti dirà questo, ma noi SÌ.

Un bel taglio corto dura 4-6 settimane se lo MANTIENI.

Ecco i 3 segreti:

1️⃣ ASCIUGATURA GIUSTA
Non sgualcire i capelli con l'asciugamano.
Premi delicatamente, poi soffia da sotto verso l'alto (crea movimento).

2️⃣ PRODOTTO GIUSTO
Un texture spray o dry shampoo mantiene il movimento anche il 4° giorno.
Non serve il parrucchiere, serve la SCIENZA.

3️⃣ REVISIONE TEMPESTIVA
Quando vedi i primi peletti fuori posto → è il momento.
Non aspettare che torni caotico.

**Risultato?**
Il tuo taglio rimane sempre perfetto.
Ricevi complimenti costanti.
Risparmi anche il costo dei ritocchi frequenti.

Una clienta di Bruno dice:
"Adesso mi guardo allo specchio e mi piace quello che vedo."

Quella sensazione vale più di qualsiasi sconto. ✨

Prenota il tuo taglio: brunomelitohair.it
☎️ 0823 18 78 320

#TipsDiBeauty #CapelliCortiPerfetti #BeautyTips #BrunoMelitoHair #ConsigliDaProfessionale""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "venerdi",
        "caption": """✂️ TAGLIO CORTO = LIBERTÀ

Non è una moda passeggera.

Le clienti che scelgono il taglio corto da Bruno dicono sempre:
"Non tornerò mai ai capelli lunghi."

Perché?

📊 PRIMA (capelli lunghi)
❌ 30 minuti di piega ogni mattina
❌ Capelli che si aggrovigliano
❌ Sempre lo stesso stile monotono
❌ Mi sento invisibile nella folla

📊 DOPO (taglio corto da Bruno)
✅ 5 minuti di asciugatura max
✅ Capelli leggeri e mossi
✅ Ogni giorno è un look diverso
✅ Mi guardo allo specchio e mi riconosco

**Il vero lusso non è il tempo in salone.**
**È il tempo che risparmi a casa.**

Una cliente ha calcolato:
"In un anno, mi risparmi 120 ore di piega."

120 ORE.

Immagina cosa puoi fare con 120 ore della TUA vita.

Vieni a scoprire la libertà. 💫

Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#TaglioDonna #Libertà #Efficienza #BeautyChoices #BrunoMelitoHair""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "lunedi",
        "caption": """🤍 GRIGIO ≠ VECCHIO

Quante donne ti dicono:
"Vorrei i capelli grigi ma penso di sembrare vecchia."

FALSO. 🚫

Il grigio fatto BENE è il colore più elegante e sofisticato che esista.

**Il problema:** La maggior parte dei parrucchieri non sa come farlo.

Fanno grigio PIATTO.
Grigio SPORCO.
Grigio OPACO.

❌ Risultato = sembri stanca

**Da Bruno facciamo grigio LUMINOSO:**
✅ Argentato (non bluastro)
✅ Con riflessi (non monocromatico)
✅ Con trattamento (non secco)
✅ Personalizzato (non standard)

Risultato = sembri ELEGANTE E MODERNA

Una cliente di 50 anni ha fatto il grigio da Bruno:
"Mio marito ha detto 'Sei bellissima. Mi piaci di più così.'"

Non è il grigio che invecchia.
È il GRIGIO FATTO MALE che invecchia.

Scopri il grigio che ti meritavi. 💎

Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#GrigioArgentato #BeautyOver50 #EleganzaModerna #BrunoMelitoHair #ColoreDaProfessionale""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "mercoledi",
        "caption": """💎 COME MANTENERE IL GRIGIO ARGENTATO PERFETTO

Il grigio da Bruno dura tantissimo, ma deve essere MANTENUTO.

Ecco i segreti delle nostre clienti con grigio perfetto:

1️⃣ SHAMPOO VIOLA (1-2 volte alla settimana)
Neutralizza le tonalità gialle.
Mantiene l'argentato fresco.
Non è costoso, fa la differenza.

2️⃣ BALSAMO SPECIFICO
Il grigio tende a seccare.
Un balsamo quotidiano mantiene la morbidezza.
E la lucentezza che vedi qui? 👆 È grazia del balsamo.

3️⃣ OLIO DI ARGAN SETTIMANALE
Una volta alla settimana, applica olio sulle lunghezze.
Capelli luminosi = grigio che brilla.

4️⃣ TINTA TONALIZZANTE (ogni 6-8 settimane)
Non è una colorazione piena.
È solo un "ritocco colore" che mantiene l'argentato.

**Costo totale manutenzione:** 30€ al mese
**Risultato:** Grigio perfetto SEMPRE

Le donne che ignorano questi passaggi dicono:
"Il mio grigio è sbiadito."

Le donne che lo mantengono dicono:
"La gente pensa che me lo faccia fare ogni settimana!"

Scegli di mantenere. ✨

Prenota da Bruno: brunomelitohair.it
☎️ 0823 18 78 320

#CuraDelGrigio #TipsBeauty #CapelliPerfetti #BrunoMelitoHair #ProDuction""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "venerdi",
        "caption": """🤍 "NON VOLEVO COLORARMI. BRUNO MI HA CONVINTO CHE IL GRIGIO È BELLISSIMO"

Alcune clienti arrivano spaventate:
"Bruno, il grigio mi farà sembrare vecchia, no?"

Bruno risponde:
"Dipende da CHI lo fa."

E dopo? Guarda il risultato. 👆

Questa non è una donna che NASCONDE i capelli grigi.
È una donna che li CELEBRA.

La differenza tra "sembrare vecchia" e "sembrare elegante" non è l'età.
È la TECNICA.

👉 Se vuoi trasformare i tuoi capelli grigi da:
"Che horror, mi stanno vedendo così"
A
"Vedi come mi stanno bene i grigio?"

C'è una sola strada: Bruno.

Non è narcisismo.
È consapevolezza di sé.

E onestamente?
Questa cliente ci sembra MOLTO più bella così.

Vieni a scoprire il grigio che ti meritavi. 💎

Prenota: brunomelitohair.it
☎️ 0823 18 78 320

#GrigioBeauty #EleganzaSenza50 #TransformazioneReale #BrunoMelitoHair #BelezzaReale""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "lunedi",
        "caption": """💭 "La bellezza vera non è quello che vedi allo specchio.
È come ti senti quando ti guardi."

Da Bruno non vendiamo SCONTI.
Vendiamo FIDUCIA.

Una cliente dice:
"Da Bruno, il parrucchiere ricorda le cose che TU dimentichi.
Mi chiede del mio lavoro.
Mi ascolta.
Mi tratta come una persona, non come una prenotazione."

Questo è il motivo per cui rimane fedele.
Questo è il motivo per cui ti dovrebbe scegliere.

Prenota: brunomelitohair.it ☎️ 0823 18 78 320

#BrunoMelitoHair #BeautyIsYou""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    },
    {
        "schedule_day": "mercoledi",
        "caption": """📸 BACKSTAGE DA BRUNO

Vi mostriamo come NON la vedete:
- Preparazione dei colori
- Sterilizzazione attrezzi
- Consulenza clienti
- Il momento in cui il colore prende forma

Non è magia. È PROFESSIONALITÀ.

#BrunoMelitoHair #BeautyCraft""",
        "platforms": ["instagram", "tiktok", "facebook"],
        "image_urls": []
    }
]

async def import_posts():
    """Import all social posts to MongoDB"""
    user_id = "admin@brunomelito.it"  # Usa lo user_id di Bruno

    for post_data in POSTS_DATA:
        post = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "caption": post_data["caption"],
            "image_urls": post_data.get("image_urls", []),
            "platforms": post_data["platforms"],
            "schedule_day": post_data["schedule_day"],
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            await db.social_posts.insert_one(post)
            print(f"✅ Post creato: {post_data['schedule_day']} - {post['id'][:8]}...")
        except Exception as e:
            print(f"❌ Errore: {e}")

if __name__ == "__main__":
    print("📱 Importazione post social in corso...")
    asyncio.run(import_posts())
    print("\n✨ Importazione completata!")
