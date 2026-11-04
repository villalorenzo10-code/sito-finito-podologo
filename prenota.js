/* ==========================================================
   CONFIGURAZIONE — modifica solo questa parte
   ========================================================== */
const CONFIG = {
  passoMinuti: 30,        // ogni quanti minuti può iniziare un appuntamento
  giorniAnticipo: 60,     // fino a quanti giorni in avanti si può prenotare
  giorniChiusura: [],     // es. ["2026-12-25", "2026-12-26"]

  // Fasce di apertura per giorno della settimana (0 = domenica ... 6 = sabato).
  // Array vuoto = chiuso. MODIFICA con gli orari reali dello studio.
  orari: {
    0: [],
    1: [["09:00", "13:00"], ["15:00", "19:00"]],
    2: [["09:00", "13:00"], ["15:00", "19:00"]],
    3: [["09:00", "13:00"], ["15:00", "19:00"]],
    4: [["09:00", "13:00"], ["15:00", "19:00"]],
    5: [["09:00", "13:00"], ["15:00", "19:00"]],
    6: [["09:00", "13:00"]]
  },

  // MODIFICA con i podologi reali dello studio
  podologi: [
    { id: "cotrone",   nome: "Dott. Adriano Cotrone", ruolo: "Podologo" },
    { id: "villa", nome: "Dott.ssa Francesca Villa",       ruolo: "Podologo" },
    { id: "vullo", nome: "Dott. Valerio Vullo",       ruolo: "Podologo" },
    { id: "podologo2", nome: "Dott.ssa Flavia Cornolò",       ruolo: "Podologo" },
    

  ],

  // MODIFICA con trattamenti, durate (minuti) e prezzi reali.
  // prezzo: null mostra "Prezzo da definire" finché non lo inserisci.
  trattamenti: [
    { id: "visita",  nome: "Visita podologica",        durata: 30, prezzo: null },
    { id: "esameB",  nome: "Esame Baropodometrico", durata: 30, prezzo: null },
    { id: "ortesiPlant",  nome: "Ortesi plantari su misura - CAD CAM 3D", durata: 60, prezzo: null },
    { id: "Laser",  nome: "Laser Terapia", durata: 60, prezzo: null },
    { id: "Trattamento Verruche",  nome: "Trattamento Verruche", durata: 60, prezzo: null },
    { id: "RiedUgngua",  nome: "Rieducazione Unguale", durata: 60, prezzo: null },
    { id: "OrtesiSili",  nome: "Ortesi in silicone", durata: 60, prezzo: null }
  ]
};

/* ==========================================================
   ARCHIVIO PRENOTAZIONI
   Ora salva nel browser (localStorage): va bene per provare, ma le
   prenotazioni NON sono condivise tra utenti diversi. In produzione
   sostituisci queste due funzioni con chiamate al tuo server/database.
   ========================================================== */
const STORAGE_KEY = "cotrone_prenotazioni";

function leggiPrenotazioni() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function salvaPrenotazione(p) {
  const lista = leggiPrenotazioni();
  lista.push(p);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

/* Punto di aggancio per il pagamento online con carta (es. Stripe, SumUp, PayPal).
   Qui NON si raccolgono numeri di carta: deve gestirli il provider.
   Restituisci true se il pagamento è andato a buon fine. */
async function avviaPagamentoCarta(prenotazione) {
  return true; // TODO: collegare un provider di pagamento
}

/* ==========================================================
   LOGICA
   ========================================================== */
const $ = (s) => document.querySelector(s);
const state = { trattamento: null, podologo: null, data: null, ora: null, mese: new Date() };

const toMin = (h) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
const toHHMM = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const euro = (n) => n == null ? "Prezzo da definire"
  : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
const dataLunga = (k) => new Date(k + "T00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/* Orari liberi per un giorno, dato il trattamento e il podologo scelti */
function slotLiberi(dataISO) {
  if (!state.trattamento || !state.podologo) return [];
  if (CONFIG.giorniChiusura.includes(dataISO)) return [];

  const giorno = new Date(dataISO + "T00:00").getDay();
  const fasce = CONFIG.orari[giorno] || [];
  const durata = state.trattamento.durata;

  const occupati = leggiPrenotazioni()
    .filter((p) => p.podologoId === state.podologo.id && p.data === dataISO)
    .map((p) => [toMin(p.ora), toMin(p.ora) + p.durata]);

  const ora = new Date();
  const eOggi = iso(ora) === dataISO;
  const minutiOra = ora.getHours() * 60 + ora.getMinutes();

  const liberi = [];
  for (const [da, a] of fasce) {
    for (let m = toMin(da); m + durata <= toMin(a); m += CONFIG.passoMinuti) {
      if (eOggi && m <= minutiOra) continue;                          // orari già passati
      if (occupati.some(([s, e]) => m < e && m + durata > s)) continue; // sovrapposti ad altre visite
      liberi.push(toHHMM(m));
    }
  }
  return liberi;
}

/* ---------- Render ---------- */
function renderTrattamenti() {
  $("#listaTrattamenti").innerHTML = CONFIG.trattamenti.map((t) => `
    <button type="button" class="option ${state.trattamento?.id === t.id ? "is-selected" : ""}" data-id="${t.id}">
      <span class="name">${t.nome}</span>
      <span class="meta">${t.durata} minuti</span>
      <span class="price">${euro(t.prezzo)}</span>
    </button>`).join("");
}

function renderPodologi() {
  $("#listaPodologi").innerHTML = CONFIG.podologi.map((p) => `
    <button type="button" class="option ${state.podologo?.id === p.id ? "is-selected" : ""}" data-id="${p.id}">
      <span class="name">${p.nome}</span>
      <span class="meta">${p.ruolo || ""}</span>
    </button>`).join("");
}

function renderCalendario() {
  const m = state.mese, anno = m.getFullYear(), mese = m.getMonth();
  $("#meseLabel").textContent = m.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const max = new Date(oggi); max.setDate(max.getDate() + CONFIG.giorniAnticipo);

  const offset = (new Date(anno, mese, 1).getDay() + 6) % 7; // settimana da lunedì
  const giorni = new Date(anno, mese + 1, 0).getDate();

  let html = ["L", "M", "M", "G", "V", "S", "D"].map((g) => `<span class="dow">${g}</span>`).join("");
  html += "<span></span>".repeat(offset);
  for (let g = 1; g <= giorni; g++) {
    const d = new Date(anno, mese, g), k = iso(d);
    const libero = d >= oggi && d <= max && slotLiberi(k).length > 0;
    html += `<button type="button" class="day ${state.data === k ? "is-selected" : ""}" data-date="${k}" ${libero ? "" : "disabled"}>${g}</button>`;
  }
  $("#calendario").innerHTML = html;

  $("#mesePrec").disabled = (anno === oggi.getFullYear() && mese <= oggi.getMonth()) || anno < oggi.getFullYear();
  $("#meseSucc").disabled = new Date(anno, mese + 1, 1) > max;
}

function renderOrari() {
  const box = $("#listaOrari");
  if (!state.data) { box.innerHTML = '<p class="empty">Scegli prima un giorno.</p>'; return; }
  const liberi = slotLiberi(state.data);
  box.innerHTML = liberi.length
    ? liberi.map((o) => `<button type="button" class="slot ${state.ora === o ? "is-selected" : ""}" data-ora="${o}">${o}</button>`).join("")
    : '<p class="empty">Nessun orario libero in questo giorno.</p>';
}

function renderRiepilogo() {
  const riga = (label, valore) =>
    `<div><dt>${label}</dt><dd class="${valore ? "" : "vuoto"}">${valore || "Da scegliere"}</dd></div>`;
  $("#riepilogo").innerHTML =
    riga("Trattamento", state.trattamento?.nome) +
    riga("Podologo", state.podologo?.nome) +
    riga("Data", state.data ? dataLunga(state.data) : "") +
    riga("Orario", state.ora);
  $("#totale").textContent = state.trattamento ? euro(state.trattamento.prezzo) : "—";
  $("#btnConferma").disabled = !(state.trattamento && state.podologo && state.data && state.ora);
}

function aggiornaBlocchi() {
  $("#step-podologo").classList.toggle("is-locked", !state.trattamento);
  $("#step-data").classList.toggle("is-locked", !(state.trattamento && state.podologo));
  $("#step-ora").classList.toggle("is-locked", !state.data);
  $("#step-conferma").classList.toggle("is-locked", !state.ora);
}

function render() {
  renderTrattamenti(); renderPodologi(); renderCalendario();
  renderOrari(); renderRiepilogo(); aggiornaBlocchi();
}

/* ---------- Eventi ---------- */
$("#listaTrattamenti").addEventListener("click", (e) => {
  const b = e.target.closest("[data-id]"); if (!b) return;
  state.trattamento = CONFIG.trattamenti.find((t) => t.id === b.dataset.id);
  state.data = null; state.ora = null;      // la durata cambia gli slot: si riparte dal giorno
  render();
});

$("#listaPodologi").addEventListener("click", (e) => {
  const b = e.target.closest("[data-id]"); if (!b) return;
  state.podologo = CONFIG.podologi.find((p) => p.id === b.dataset.id);
  state.data = null; state.ora = null;
  render();
});

$("#calendario").addEventListener("click", (e) => {
  const b = e.target.closest("[data-date]"); if (!b || b.disabled) return;
  state.data = b.dataset.date; state.ora = null;
  render();
});

$("#listaOrari").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ora]"); if (!b) return;
  state.ora = b.dataset.ora;
  render();
});

$("#mesePrec").addEventListener("click", () => { state.mese = new Date(state.mese.getFullYear(), state.mese.getMonth() - 1, 1); renderCalendario(); });
$("#meseSucc").addEventListener("click", () => { state.mese = new Date(state.mese.getFullYear(), state.mese.getMonth() + 1, 1); renderCalendario(); });

$("#bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  if (!(state.trattamento && state.podologo && state.data && state.ora)) return;

  // Ricontrolla che l'orario sia ancora libero prima di salvare
  if (!slotLiberi(state.data).includes(state.ora)) {
    alert("Questo orario non è più disponibile. Scegline un altro.");
    state.ora = null; render(); return;
  }

  const pagamento = form.querySelector('input[name="pagamento"]:checked').value;
  const prenotazione = {
    id: Date.now().toString(36),
    trattamentoId: state.trattamento.id,
    trattamento: state.trattamento.nome,
    prezzo: state.trattamento.prezzo,
    durata: state.trattamento.durata,
    podologoId: state.podologo.id,
    podologo: state.podologo.nome,
    data: state.data,
    ora: state.ora,
    pagamento,
    cliente: { nome: $("#nome").value.trim(), telefono: $("#telefono").value.trim(), email: $("#email").value.trim(), note: $("#note").value.trim() }
  };

  if (pagamento === "carta") {
    const ok = await avviaPagamentoCarta(prenotazione);
    if (!ok) return;
  }

  salvaPrenotazione(prenotazione);

  $("#conferma").hidden = false;
  document.querySelector(".booking-layout").hidden = true;
  $("#confermaTesto").textContent =
    `${prenotazione.trattamento} con ${prenotazione.podologo}, ${dataLunga(prenotazione.data)} alle ${prenotazione.ora}. ` +
    (pagamento === "studio" ? "Pagamento in contanti in studio." : "Pagamento con carta.");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

render();