from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from auth import get_current_user
from database import db
import requests
import os
import uuid
import re
import random
import hashlib
import base64
import io
from datetime import datetime, timezone, date

router = APIRouter()

# Pool di 48 post pronti — la rotazione giornaliera ne mostra 5 al giorno,
# cambiando automaticamente ogni mezzanotte senza ripetizioni per ~9 giorni.
_POST_POOL = [
    # ── ESTATE ────────────────────────────────────────────────────────────────
    {
        "type": "estate",
        "title": "S.O.S. Sole & Salsedine",
        "text": "Il sole bacia i belli... ma mette a dura prova i capelli! ☀️🌊\nNon farti trovare impreparata: scopri i nostri trattamenti protettivi per un biondo che non vira e punte sempre idratate. Passa in salone per il tuo 'kit sopravvivenza' estivo!\n\n👇 Prenota qui:\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/572ec519daddcad1f4a85c012592ce7cb5567c2466fd73ce966377d55a547053.png"
    },
    {
        "type": "estate",
        "title": "Mare Sì, Capelli Sfibrati No",
        "text": "L'estate è la stagione più bella dell'anno... per tutti tranne i nostri capelli. 🌞🌊\nSale, sabbia e sole sono un mix micidiale per le punte. Ma con il giusto trattamento reidratante, esci dal mare come una dea!\n\n✨ Prenota il tuo appuntamento:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/572ec519daddcad1f4a85c012592ce7cb5567c2466fd73ce966377d55a547053.png"
    },
    {
        "type": "estate",
        "title": "Beach Waves Perfette",
        "text": "Le onde da spiaggia? Le facciamo noi meglio del mare! 🌊✂️\nEffetto beach waves naturale e duraturo, senza il danno del sale. Vieni in salone e porta l'estate anche in città.\n\n📅 Prenota ora:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/572ec519daddcad1f4a85c012592ce7cb5567c2466fd73ce966377d55a547053.png"
    },
    # ── AUTUNNO ───────────────────────────────────────────────────────────────
    {
        "type": "autunno",
        "title": "L'Autunno sta Arrivando",
        "text": "Foglie che cadono, colori che cambiano... e i capelli? Anche loro vogliono un restyling autunnale! 🍂\nI toni caldi del castano rame e del rosso borgogna sono la tendenza di questa stagione. Lasciati ispirare!\n\n✨ Prenota la tua consulenza colore:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    {
        "type": "autunno",
        "title": "Coccola d'Autunno",
        "text": "Con il primo freddo i capelli si seccano di più. 🍁\nÈ il momento giusto per un trattamento nutriente intensivo che li riporti in forma dopo l'estate. Un'ora di coccole per te e per la tua chioma!\n\n👇 Fissa il tuo appuntamento:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png"
    },
    # ── INVERNO ───────────────────────────────────────────────────────────────
    {
        "type": "inverno",
        "title": "Capelli Belli Anche d'Inverno",
        "text": "Il freddo, l'aria secca e il cappello: i tre nemici dei capelli in inverno. ❄️\nMa noi abbiamo la soluzione! Un trattamento idratante e anti-statico mantiene la tua chioma brillante anche nelle giornate più grigie.\n\n💫 Prenota ora:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png"
    },
    {
        "type": "inverno",
        "title": "Natale si Avvicina",
        "text": "Il regalo più bello? Un nuovo look per le feste! 🎄✨\nPreparati a brillare alle cene natalizie con un colore luminoso o un taglio di tendenza. I posti si riempiono in fretta: prenota subito!\n\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png"
    },
    # ── PRIMAVERA ─────────────────────────────────────────────────────────────
    {
        "type": "primavera",
        "title": "Rinascita di Primavera",
        "text": "La primavera è il momento perfetto per un nuovo inizio... a partire dai capelli! 🌸\nTaglio fresco, schiariture soleggiate o una bella rimessa in forma: vieni a fiorire anche tu al Bruno Melito Hair.\n\n🌷 Prenota la tua metamorfosi:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    {
        "type": "primavera",
        "title": "Colori di Aprile",
        "text": "Con il sole di primavera tornano i colori vivaci e le sfumature luminose! ☀️🌿\nDal biondo dorato al castano con riflessi ramati: qual è il tuo colore perfetto per questa stagione? Vieni a scoprirlo!\n\n✨ Consulenza colore gratuita:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png"
    },
    # ── COLORE ────────────────────────────────────────────────────────────────
    {
        "type": "balayage",
        "title": "Il Balayage che Stavi Cercando",
        "text": "Non esiste un balayage uguale all'altro. Il tuo viene dipinto a mano, centimetro per centimetro, per valorizzare la tua carnagione e il tuo taglio. 🎨\nNaturale, luminoso, TUO.\n\n💇‍♀️ Prenota la tua consulenza colore:\nhttps://brunomelitohair.it",
        "image_url": "https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg"
    },
    {
        "type": "biondo",
        "title": "Biondo Burro",
        "text": "La nuance più calda e desiderata di questa stagione. 🧈✨\nUn biondo cremoso, luminoso e mai banale. Vieni a scoprire come lo realizziamo con le nostre tecniche di schiaritura dolce.\n\nTi aspettiamo! 👇\nhttps://brunomelitohair.it",
        "image_url": "https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg"
    },
    {
        "type": "rame",
        "title": "Rame & Fuoco",
        "text": "Il rosso rame è il colore del momento. 🔥✨\nIntensità, calore e carattere: è il colore che trasforma non solo i capelli, ma tutta la personalità. Osi il cambiamento?\n\n🍂 Prenota qui:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    {
        "type": "gloss",
        "title": "Effetto Gloss 2026",
        "text": "Capelli spenti? Dagli una scarica di luce! 💎✨\nIl nostro trattamento Gloss è il segreto delle star per capelli che riflettono la luce come uno specchio. Perfetto per ridare vita al colore tra una tinta e l'altra.\n\nScoprilo qui 👇\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png"
    },
    {
        "type": "colore",
        "title": "Tinta Senza Compromessi",
        "text": "Coprire i capelli bianchi non significa rinunciare alla luce. 💫\nCon le nostre tecniche di colorazione, ogni tinta è anche un'illuminazione: copertura perfetta + riflessi naturali che sembrano veri.\n\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png"
    },
    {
        "type": "castano",
        "title": "Castano Cioccolato",
        "text": "Caldo, profondo, irresistibile come il cioccolato fondente. 🍫✨\nIl castano cioccolato è il colore senza tempo che non passa mai di moda. Luminosità garantita in ogni stagione!\n\n💇‍♀️ Prenota il tuo appuntamento colore:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    # ── TAGLIO ────────────────────────────────────────────────────────────────
    {
        "type": "taglio",
        "title": "Il Taglio Giusto Cambia Tutto",
        "text": "Un buon taglio non è solo una questione di centimetri. ✂️\nÈ trovare la forma che valorizza il tuo viso, si adatta al tuo stile di vita e ti fa sentire te stessa ogni giorno. Vieni a raccontarci chi sei!\n\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png"
    },
    {
        "type": "tendenza",
        "title": "Bixie o Butterfly?",
        "text": "Corto e grintoso o lungo e voluminoso? ✂️🦋\nLe tendenze 2026 sono qui. Se sei indecisa, ti aiutiamo noi a trovare la forma perfetta per il tuo viso. Il cambiamento inizia dalla testa!\n\n👉 Guarda i nostri lavori:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    {
        "type": "frange",
        "title": "La Frangia Fa Sempre Tendenza",
        "text": "Curtain bangs, micro-frange o a tendina laterale? 💇‍♀️\nLa frangia è tornata protagonista assoluta. Addolcisce i tratti, ringiovanisce e trasforma completamente il look. Pronta a osare?\n\n✂️ Prenota qui:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png"
    },
    {
        "type": "taglio_lungo",
        "title": "Lunghezze da Sogno",
        "text": "Capelli lunghi e sani sono un lusso. 💇‍♀️✨\nNon basta farli crescere: occorre nutrirli, proteggerli e tagliarli con criterio. Vieni a prenderti cura delle tue lunghezze con noi.\n\n👇 Prenota:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png"
    },
    {
        "type": "volume",
        "title": "Volume & Light",
        "text": "Sogni capelli voluminosi che catturano ogni raggio di sole? ✨\nLa nostra tecnica di taglio 'Air-Light' dona leggerezza e movimento senza svuotare le punte. Il segreto per capelli a tutto volume!\n\n👇 Prenota qui:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png"
    },
    {
        "type": "corto",
        "title": "Corto e Audace",
        "text": "Il taglio corto non è per tutte? Sbagliato! ✂️💪\nÈ per chi sa quello che vuole. Pixie, bob, shaggy: scegliamo insieme il taglio corto perfetto per la tua personalità.\n\n🔥 Osa il cambiamento:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    # ── TRATTAMENTI ───────────────────────────────────────────────────────────
    {
        "type": "idratazione",
        "title": "Idratazione Profonda",
        "text": "Senti i capelli come paglia? È il momento di dargli da bere! 💧✨\nIl nostro trattamento idratante intensivo penetra fino al midollo del capello per una morbidezza e una brillantezza che durano settimane.\n\n🌿 Regalati questo momento:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png"
    },
    {
        "type": "keratina",
        "title": "Keratina: Addio Crespo",
        "text": "Se hai i capelli crespi, sai già quanto siano difficili da gestire ogni mattina. ⏱️😤\nIl trattamento alla keratina professionale li leviga, li nutre e li rende docili per mesi. Un'ora in salone, mesi di libertà!\n\n💇‍♀️ Prenota:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/99d308789e991a555a550483448efdcd7610cd3547dbb1e5041e2caf94ec39b8.png"
    },
    {
        "type": "detox",
        "title": "Rituale Detox",
        "text": "Senti i capelli pesanti? È ora di un reset! 💆‍♀️🌿\nIl nostro trattamento Detox purifica la cute e idrata le lunghezze, eliminando residui di smog e prodotti. Un momento di puro relax per te e la tua chioma.\n\n✨ Regalati una pausa:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png"
    },
    {
        "type": "clean_beauty",
        "title": "Clean Beauty",
        "text": "La tua bellezza non ha bisogno di chimica aggressiva. 🌿✨\nUsiamo solo prodotti senza parabeni e solfati, per capelli sani che splendono di salute naturale. Perché amiamo te e amiamo la natura.\n\nScegli il meglio: https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/99d308789e991a555a550483448efdcd7610cd3547dbb1e5041e2caf94ec39b8.png"
    },
    {
        "type": "forfora",
        "title": "Forfora? Problema Risolto",
        "text": "La forfora è un problema comune ma si può risolvere con i trattamenti giusti! 🚿\nConsulenza tricologica + trattamento purificante per una cute sana e capelli liberi di brillare.\n\n📞 Prenota la tua consulenza:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/99d308789e991a555a550483448efdcd7610cd3547dbb1e5041e2caf94ec39b8.png"
    },
    # ── MATRIMONI & EVENTI ────────────────────────────────────────────────────
    {
        "type": "matrimoni",
        "title": "Invitata Perfetta",
        "text": "Hai già l'abito ma non sai cosa fare con i capelli? 👗✨\nChe sia un raccolto morbido o un'onda glamour, siamo qui per renderti l'invitata più ammirata. Prenota il tuo posto in tempo!\n\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png"
    },
    {
        "type": "sposa",
        "title": "Il Giorno Più Bello",
        "text": "Il matrimonio è il giorno in cui vuoi essere perfetta da testa a piedi. 👰✨\nNoi ci occupiamo della testa: prova acconciatura, consulenza e giorno X inclusi. Inizia a pianificare il tuo look da sposa con noi!\n\n💒 Prenota la tua prova:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png"
    },
    {
        "type": "cerimonia",
        "title": "Pronta per la Cerimonia",
        "text": "Battesimo, comunione, laurea... ogni cerimonia merita un'acconciatura speciale! 🎉\nChe tu voglia qualcosa di classico o originale, ti aiutiamo a trovare il look che ricorderai nelle foto.\n\n📸 Prenota ora:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png"
    },
    {
        "type": "sera",
        "title": "Serata Speciale",
        "text": "Cena romantica, serata di gala o semplicemente voglia di sentirti bellissima? 🌙✨\nUna piega perfetta o un'acconciatura ricercata possono trasformare una serata normale in un ricordo indimenticabile.\n\n💫 Prenota il tuo appuntamento:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png"
    },
    # ── WEEKEND ───────────────────────────────────────────────────────────────
    {
        "type": "weekend",
        "title": "Posti Last Minute",
        "text": "Sei stata fortunata! ✨\nSi è appena liberato un posto per questa settimana. Se vuoi un cambio look dell'ultimo minuto, questa è la tua occasione. Corri a prenotare! 👇\n\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png"
    },
    {
        "type": "sabato",
        "title": "Sabato in Salone",
        "text": "Il sabato è il giorno perfetto per coccolarti un po'. 💆‍♀️\nMentre il resto del mondo corre, tu prenditi un momento per te in salone. Esci trasformata e pronta a conquistare il weekend!\n\n⏰ Prenota il tuo sabato:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png"
    },
    {
        "type": "divertente",
        "title": "Domenica da Diva",
        "text": "Il lunedì è lontano, ma la bellezza è a un click di distanza. ✨\nNon aspettare che i tuoi capelli gridino 'aiuto'. Regalati un sabato di relax e stile da Bruno Melito. Uscirai pronta a conquistare il mondo (o almeno l'aperitivo! 😉).\n\n👉 Prenota ora: https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png"
    },
    {
        "type": "lunedi",
        "title": "Lunedì col Sorriso",
        "text": "Inizia la settimana con il piede (e i capelli) giusti! 💫\nUna bella piega o un taglio fresco il lunedì mattina ti mette di buon umore per tutta la settimana. Provare per credere!\n\n📅 Prenota subito:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png"
    },
    # ── TIPS & CURIOSITÀ ──────────────────────────────────────────────────────
    {
        "type": "tip",
        "title": "Lo Sapevi?",
        "text": "Lo sapevi che lavare i capelli troppo spesso li indebolisce? 🚿\nI capelli producono sebo naturale che li protegge e li nutre. Lavali 2-3 volte a settimana e usa un buon balsamo. Lo dice sempre il tuo hair stylist preferito!\n\n💇‍♀️ Per consigli personalizzati:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/99d308789e991a555a550483448efdcd7610cd3547dbb1e5041e2caf94ec39b8.png"
    },
    {
        "type": "tip",
        "title": "Asciugatura Perfetta",
        "text": "Il phon non è il nemico dei capelli: l'errore sta nell'usarlo male! 💨✨\nTenilo sempre ad almeno 20 cm, usa sempre il termoprotettore e finisci con aria fredda per sigillare la cuticola. Risultato: capelli lucidi e sani!\n\n🌟 Per altri consigli pro:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/99d308789e991a555a550483448efdcd7610cd3547dbb1e5041e2caf94ec39b8.png"
    },
    {
        "type": "tip",
        "title": "Taglia le Punte Ogni 8 Settimane",
        "text": "Se vuoi far crescere i capelli, devi tagliarli. Lo so, sembra un paradosso! ✂️😄\nMa eliminare le doppie punte ogni 6-8 settimane evita che la rottura risalga lungo il fusto. Capelli che crescono sani e lunghi!\n\n📅 Prenota il tuo appuntamento:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png"
    },
    {
        "type": "tip",
        "title": "Protezione Termica",
        "text": "Piastra, arricciacapelli, phon: li usi ogni giorno ma usi il termoprotettore? 🔥\nSenza protezione termica le cuticole si aprono e i capelli perdono lucentezza e resistenza. Un gesto semplice che cambia tutto!\n\n✨ Vieni a scoprire i migliori prodotti:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/99d308789e991a555a550483448efdcd7610cd3547dbb1e5041e2caf94ec39b8.png"
    },
    {
        "type": "curiosita",
        "title": "Fatto del Giorno",
        "text": "I capelli crescono in media 1-1,5 cm al mese, ma in estate crescono più velocemente! ☀️💇‍♀️\nEcco perché l'estate è il momento perfetto per lasciarli crescere... o per osare un taglio corto sapendo che ricresceranno presto!\n\n✂️ Vieni a tagliarli con noi:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png"
    },
    # ── MOTIVAZIONALE ─────────────────────────────────────────────────────────
    {
        "type": "motivazione",
        "title": "Cambia Look, Cambia Umore",
        "text": "È scientificamente provato: un nuovo taglio o colore migliora l'umore! 😄✨\nSe senti il bisogno di un po' di freschezza nella tua vita, inizia dalla testa. È il cambiamento più rapido e più gratificante che conosca.\n\n💇‍♀️ Prenota il tuo cambio look:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    {
        "type": "motivazione",
        "title": "Prenditi Cura di Te",
        "text": "In un mondo che corre sempre, fermarsi un'ora per se stesse non è un lusso. È una necessità. 💆‍♀️\nVieni da noi: un caffè, una chiacchierata e capelli bellissimi. Ci vediamo presto!\n\n❤️ Prenota il tuo momento:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png"
    },
    {
        "type": "stile",
        "title": "Il Tuo Stile, La Tua Identità",
        "text": "I capelli non sono solo capelli. Sono il tuo biglietto da visita, la tua firma, la tua storia. ✨\nIn Bruno Melito Hair non facciamo solo tagli: ascoltiamo chi sei e creiamo il look che ti rappresenta.\n\n🌟 Vieni a raccontarci la tua storia:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    {
        "type": "lifestyle",
        "title": "Vita da Salone",
        "text": "Ogni giorno trasformiamo capelli e regaliamo sorrisi. 💇‍♀️❤️\nNon è solo un lavoro: è la nostra passione. E voi, clienti meravigliosi, siete la nostra fonte di ispirazione ogni giorno.\n\nGrazie per sceglierci! 🙏\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png"
    },
    # ── CTA & PROMO ───────────────────────────────────────────────────────────
    {
        "type": "prenotazione",
        "title": "Prenota Online H24",
        "text": "Sapevi che puoi prenotare il tuo appuntamento direttamente online, H24? 📱\nNiente telefonate, niente attese: scegli il giorno, l'orario e il servizio che preferisci in pochi secondi.\n\n👉 Prenota subito:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png"
    },
    {
        "type": "regalo",
        "title": "Il Regalo Perfetto",
        "text": "Compleanni, anniversari, feste... il regalo più bello? Un voucher per il salone! 🎁\nRegalare un'esperienza di benessere e bellezza è sempre la scelta giusta. Chiedi info in salone!\n\n🎀 Scopri i nostri voucher:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png"
    },
    {
        "type": "fedelta",
        "title": "Sei del Nostro Team?",
        "text": "Le nostre clienti fisse lo sanno già: da noi si torna sempre volentieri! 💕\nUn salone dove ti senti a casa, dove il tuo stile è conosciuto e valorizzato, dove ogni appuntamento è un momento speciale.\n\n✨ Unisciti a noi:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png"
    },
    {
        "type": "novita",
        "title": "Novità in Salone",
        "text": "Nuovi prodotti, nuove tecniche, stesso amore per i tuoi capelli. 🆕✨\nSiamo sempre aggiornati sulle ultime tendenze e innovazioni del mondo hair. Vieni a scoprire le novità!\n\n💇‍♀️ Prenota la tua visita:\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png"
    },
    {
        "type": "recensione",
        "title": "Le Nostre Clienti Parlano",
        "text": "\"Sono venuta per un taglio e sono uscita con un nuovo look completamente diverso. Meraviglioso!\" ⭐⭐⭐⭐⭐\nLe parole delle nostre clienti sono il nostro orgoglio più grande. Vieni a scrivere la tua storia!\n\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png"
    },
]

# ── ROTAZIONE GIORNALIERA ──────────────────────────────────────────────────────
# Dato (user_id + data), genera un ordine deterministico del pool e restituisce
# 5 post per ogni "pagina" (offset). Stessa pagina → stessi post per tutto il giorno.
# Cambia data → cambiano automaticamente.

def _daily_order(user_id: str, today_str: str) -> list[int]:
    seed = int(hashlib.md5(f"{user_id}:{today_str}".encode()).hexdigest(), 16)
    rng = random.Random(seed)
    indices = list(range(len(_POST_POOL)))
    rng.shuffle(indices)
    return indices

DAILY_PAGE_SIZE = 5

@router.get("/social/daily-suggestions")
async def get_daily_suggestions(
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    today = date.today().isoformat()
    user_id = current_user["id"]
    pool_size = len(_POST_POOL)
    ordered = _daily_order(user_id, today)

    start = (offset * DAILY_PAGE_SIZE) % pool_size
    raw = ordered[start:start + DAILY_PAGE_SIZE]
    if len(raw) < DAILY_PAGE_SIZE:
        raw += ordered[:DAILY_PAGE_SIZE - len(raw)]

    result = []
    for rank, pool_idx in enumerate(raw):
        suggestion_id = hashlib.md5(f"{user_id}:{today}:{offset}:{rank}".encode()).hexdigest()[:16]
        saved = await db.wingman_suggestions.find_one({"id": suggestion_id, "user_id": user_id}, {"_id": 0})
        if saved and saved.get("deleted"):
            continue
        elif saved:
            result.append({**_POST_POOL[pool_idx], **{k: v for k, v in saved.items() if k != "_id"}})
        else:
            result.append({**_POST_POOL[pool_idx], "id": suggestion_id, "daily_date": today, "offset": offset})

    return result


@router.get("/social/wingman-suggestions")
async def get_wingman_suggestions(current_user: dict = Depends(get_current_user)):
    # Manteniamo per compatibilità — restituisce i post del giorno (offset 0)
    today = date.today().isoformat()
    user_id = current_user["id"]
    pool_size = len(_POST_POOL)
    ordered = _daily_order(user_id, today)
    raw = ordered[:DAILY_PAGE_SIZE]

    result = []
    for rank, pool_idx in enumerate(raw):
        suggestion_id = hashlib.md5(f"{user_id}:{today}:0:{rank}".encode()).hexdigest()[:16]
        saved = await db.wingman_suggestions.find_one({"id": suggestion_id, "user_id": user_id}, {"_id": 0})
        if saved and saved.get("deleted"):
            continue
        elif saved:
            result.append({**_POST_POOL[pool_idx], **{k: v for k, v in saved.items() if k != "_id"}})
        else:
            result.append({**_POST_POOL[pool_idx], "id": suggestion_id, "daily_date": today, "offset": 0})

    return result

@router.post("/social/refresh-suggestions")
async def refresh_suggestions(current_user: dict = Depends(get_current_user)):
    # Restituisce i prossimi 5 post del pool odierno (offset casuale)
    today = date.today().isoformat()
    user_id = current_user["id"]
    pool_size = len(_POST_POOL)
    ordered = _daily_order(user_id, today)

    now = datetime.now()
    seed2 = int(hashlib.md5(f"{user_id}:{today}:refresh:{now.hour}:{now.minute // 3}".encode()).hexdigest(), 16)
    offset = (seed2 % (pool_size // DAILY_PAGE_SIZE)) + 1

    start = (offset * DAILY_PAGE_SIZE) % pool_size
    raw = ordered[start:start + DAILY_PAGE_SIZE]
    if len(raw) < DAILY_PAGE_SIZE:
        raw += ordered[:DAILY_PAGE_SIZE - len(raw)]

    result = []
    for rank, pool_idx in enumerate(raw):
        suggestion_id = hashlib.md5(f"{user_id}:{today}:{offset}:{rank}".encode()).hexdigest()[:16]
        saved = await db.wingman_suggestions.find_one({"id": suggestion_id, "user_id": user_id}, {"_id": 0})
        if saved and saved.get("deleted"):
            continue
        elif saved:
            result.append({**_POST_POOL[pool_idx], **{k: v for k, v in saved.items() if k != "_id"}})
        else:
            result.append({**_POST_POOL[pool_idx], "id": suggestion_id, "daily_date": today, "offset": offset})

    return result

@router.put("/social/wingman-suggestions/{suggestion_id}")
async def update_suggestion(suggestion_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update = {}
    if "text" in data: update["text"] = data["text"]
    if "image_url" in data: update["image_url"] = data["image_url"]
    if "title" in data: update["title"] = data["title"]
    await db.wingman_suggestions.update_one(
        {"id": suggestion_id, "user_id": current_user["id"]},
        {"$set": {**update, "id": suggestion_id, "user_id": current_user["id"]}},
        upsert=True
    )
    return {"ok": True}

@router.delete("/social/wingman-suggestions/{suggestion_id}")
async def delete_suggestion(suggestion_id: str, current_user: dict = Depends(get_current_user)):
    await db.wingman_suggestions.update_one(
        {"id": suggestion_id, "user_id": current_user["id"]},
        {"$set": {"id": suggestion_id, "user_id": current_user["id"], "deleted": True}},
        upsert=True
    )
    return {"ok": True}

@router.get("/social/config")
async def get_config(current_user: dict = Depends(get_current_user)):
    return {"make_webhook_url": current_user.get("make_webhook_url", ""), "configured": bool(current_user.get("make_webhook_url"))}

@router.put("/social/config")
async def save_config(data: dict, current_user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"make_webhook_url": data.get("make_webhook_url", "")}})
    return {"ok": True}

@router.post("/social/publish-via-make")
async def publish_via_make(data: dict, current_user: dict = Depends(get_current_user)):
    url = current_user.get("make_webhook_url")
    if not url: raise HTTPException(status_code=400, detail="Configura il Webhook")
    payload = {
        **data,
        "text": data.get("text") or data.get("message", ""),
        "message": data.get("text") or data.get("message", ""),
        "caption": data.get("text") or data.get("message", ""),
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore Make.com: {str(e)}")

    history_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "text": payload["text"],
        "image_url": data.get("image_url", ""),
        "published_at": datetime.now(timezone.utc).isoformat()
    }
    await db.social_history.insert_one(history_doc)
    return {"success": True}

@router.get("/social/history")
async def get_social_history(current_user: dict = Depends(get_current_user)):
    history = await db.social_history.find({"user_id": current_user["id"]}, {"_id": 0}).sort("published_at", -1).to_list(20)
    return history

@router.post("/social/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Carica una foto su Cloudinary
    """
    try:
        import cloudinary
        import cloudinary.uploader
        import os

        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
        api_key = os.environ.get("CLOUDINARY_API_KEY")
        api_secret = os.environ.get("CLOUDINARY_API_SECRET")

        if not all([cloud_name, api_key, api_secret]):
            print("❌ ERRORE: Cloudinary non configurato", flush=True)
            raise HTTPException(
                status_code=400,
                detail="Cloudinary non configurato. Contatta l'admin."
            )

        cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)

        # Leggi il file
        content = await file.read()

        print(f"📤 Upload a Cloudinary...", flush=True)

        result = cloudinary.uploader.upload(content, resource_type="auto")

        print(f"✅ Risposta Cloudinary: {result}", flush=True)

        image_url = result.get("secure_url")
        if not image_url:
            raise Exception("URL immagine non ricevuto da Cloudinary")

        print(f"✅ Foto caricata: {image_url}", flush=True)

        return {"success": True, "image_url": image_url}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERRORE upload_image: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=f"Errore caricamento foto: {str(e)}")


# ============== SCHEDULED SOCIAL POSTS ==============

@router.post("/social/posts")
async def create_social_post(data: dict, current_user: dict = Depends(get_current_user)):
    post = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "caption": data.get("caption", ""),
        "image_urls": data.get("image_urls", []),
        "platforms": data.get("platforms", []),
        "schedule_day": data.get("schedule_day"),
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.social_posts.insert_one(post)
    return {k: v for k, v in post.items() if k != "_id"}

@router.get("/social/posts")
async def get_social_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.social_posts.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    # Assicura che ogni post abbia i campi obbligatori con default
    return [
        {
            **p,
            "status": p.get("status", "draft"),
            "platforms": p.get("platforms", []),
            "image_urls": p.get("image_urls", []),
            "schedule_day": p.get("schedule_day", ""),
            "caption": p.get("caption", ""),
        }
        for p in posts
    ]

@router.put("/social/posts/{post_id}")
async def update_social_post(post_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.items() if k in ["caption", "image_urls", "platforms", "schedule_day"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.social_posts.update_one({"id": post_id, "user_id": current_user["id"]}, {"$set": update})
    post = await db.social_posts.find_one({"id": post_id, "user_id": current_user["id"]}, {"_id": 0})
    return post

@router.delete("/social/posts/{post_id}")
async def delete_social_post(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.social_posts.delete_one({"id": post_id, "user_id": current_user["id"]})
    return {"ok": True}

@router.post("/social/posts/{post_id}/publish")
async def publish_social_post_now(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.social_posts.find_one({"id": post_id, "user_id": current_user["id"]})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trovato")

    url = current_user.get("make_webhook_url")
    if not url:
        raise HTTPException(status_code=400, detail="Configura il Webhook")

    caption = post.get("caption", "").strip()
    if not caption:
        raise HTTPException(status_code=400, detail="La caption del post è obbligatoria. Scrivi un messaggio prima di pubblicare.")

    payload = {
        "caption": caption,
        "text": caption,
        "message": caption,
        "image_urls": post.get("image_urls", []),
        "platforms": post.get("platforms", []),
    }

    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore Make.com: {str(e)}")

    published_at = datetime.now(timezone.utc).isoformat()
    await db.social_posts.update_one(
        {"id": post_id, "user_id": current_user["id"]},
        {"$set": {"status": "published", "published_at": published_at}}
    )

    history_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "text": caption,
        "image_urls": post.get("image_urls", []),
        "platforms": post.get("platforms", []),
        "published_at": published_at
    }
    await db.social_history.insert_one(history_doc)

    return {"success": True}
