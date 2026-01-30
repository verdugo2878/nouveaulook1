// =======================
// 1) Produits (images locales)
// =======================
const products = [
  { id:"p1", name:"Ensemble Beige Artist", price:30, sizes:["S","M","L","XL"], img:"images/produit-1.jpg" },
  { id:"p2", name:"Chemise Jungle Chic", price:28, sizes:["S","M","L","XL"], img:"images/produit-2.jpg" },
  { id:"p3", name:"Set Graphique Orange", price:32, sizes:["M","L","XL"], img:"images/produit-3.jpg" },
  { id:"p4", name:"Chemise Rayée Bordeaux", price:27, sizes:["S","M","L"], img:"images/produit-4.jpg" },
  { id:"p5", name:"Collection Chemises Unies", price:22, sizes:["S","M","L","XL"], img:"images/produit-5.jpg" },
  { id:"p6", name:"Ensemble Minimal Beige", price:24, sizes:["M","L","XL"], img:"images/produit-6.jpg" },
  { id:"p7", name:"Ensemble Beige Motif", price:26, sizes:["S","M","L","XL"], img:"images/produit-7.jpg" },
  { id:"p8", name:"Boubou Premium Vert", price:35, sizes:["M","L","XL","XXL"], img:"images/produit-8.jpg" },
];

const formatPrice = (n) => `$${n}`;

// =======================
// 2) Logs (sessionStorage)
// =======================
const LOG_KEY = "nl_logs";
function nowISO() {
  return new Date().toISOString();
}
function readLogs() {
  try { return JSON.parse(sessionStorage.getItem(LOG_KEY) || "[]"); }
  catch { return []; }
}
function writeLogs(logs) {
  sessionStorage.setItem(LOG_KEY, JSON.stringify(logs));
}
function logEvent(type, data = {}) {
  const logs = readLogs();
  logs.unshift({
    time: nowISO(),
    type,
    data
  });
  writeLogs(logs);
  renderDebugPanels(); // update live if visible
}
function renderLogsBox() {
  const box = document.querySelector("#logsBox");
  if (!box) return;

  const logs = readLogs();
  if (logs.length === 0) {
    box.innerHTML = `<div style="color:var(--muted); font-size:13px;">Aucun événement pour l’instant.</div>`;
    return;
  }

  box.innerHTML = logs.map(l => {
    const short = l.time.replace("T"," ").replace("Z","");
    const payload = escapeHtml(JSON.stringify(l.data));
    return `
      <div style="border-bottom:1px solid var(--line); padding:8px 0;">
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <strong style="font-size:13px;">${escapeHtml(l.type)}</strong>
          <span style="font-size:12px; color:var(--muted);">${escapeHtml(short)}</span>
        </div>
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size:12px; color:#333; margin-top:6px; white-space:pre-wrap;">
          ${payload}
        </div>
      </div>
    `;
  }).join("");
}

function renderDebugPanels() {
  // logs
  renderLogsBox();

  // cookies
  const cBox = document.querySelector("#cookiesBox");
  if (cBox) cBox.textContent = document.cookie || "(aucun cookie)";

  // sessionStorage dump (hors logs)
  const sBox = document.querySelector("#storageBox");
  if (sBox) {
    const dump = {};
    for (let i=0; i<sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k === LOG_KEY) continue;
      dump[k] = sessionStorage.getItem(k);
    }
    sBox.textContent = JSON.stringify(dump, null, 2) || "{}";
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// =======================
// 3) Cookies / Consent (réapparaît à chaque refresh)
// =======================
// On ne mémorise PAS le choix => la bannière revient au refresh.
// Mais on garde le choix dans sessionStorage tant que l'onglet reste ouvert,
// pour que la page puisse appliquer des comportements après le clic.
const CONSENT_KEY = "nl_consent"; // sessionStorage
const CONSENT = {
  REFUSED: "refused",
  NECESSARY: "necessary",
  ALL: "all",
};

function setCookie(name, value, days = 7) {
  const d = new Date();
  d.setTime(d.getTime() + days*24*60*60*1000);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/`;
}

function deleteAllCookies() {
  // efface tous les cookies accessibles via JS sur le path
  const cookies = document.cookie.split(";").map(c => c.trim()).filter(Boolean);
  for (const c of cookies) {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substring(0, eqPos) : c;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

function applyConsent(choice) {
  sessionStorage.setItem(CONSENT_KEY, choice);

  // comportement "démo" :
  // - necessary : session_id
  // - all : session_id + ad_id + last_seen
  // - refused : ne crée pas de cookies de tracking (et peut aussi ne rien créer)
  if (choice === CONSENT.NECESSARY) {
    setCookie("session_id", cryptoId());
    logEvent("consent_necessary", { created: ["session_id"] });
  } else if (choice === CONSENT.ALL) {
    setCookie("session_id", cryptoId());
    setCookie("ad_id", cryptoId());
    setCookie("last_seen", new Date().toISOString());
    logEvent("consent_all", { created: ["session_id", "ad_id", "last_seen"] });
  } else {
    logEvent("consent_refused", { created: [] });
  }

  renderDebugPanels();
}

function initCookieBannerAlways() {
  const banner = document.querySelector("#cookieBanner");
  if (!banner) return;

  // Toujours afficher au chargement (exigence)
  banner.style.display = "block";
  logEvent("cookie_banner_shown", { page: location.pathname });

  const btnRefuse = banner.querySelector("#cookieRefuse");
  const btnNecessary = banner.querySelector("#cookieNecessary");
  const btnAccept = banner.querySelector("#cookieAccept");

  const close = () => { banner.style.display = "none"; };

  btnRefuse?.addEventListener("click", () => { applyConsent(CONSENT.REFUSED); close(); });
  btnNecessary?.addEventListener("click", () => { applyConsent(CONSENT.NECESSARY); close(); });
  btnAccept?.addEventListener("click", () => { applyConsent(CONSENT.ALL); close(); });
}

function getConsent() {
  return sessionStorage.getItem(CONSENT_KEY) || "unknown";
}

function cryptoId(){
  // ID pseudo-aléatoire (démo)
  return (crypto?.randomUUID?.() || Math.random().toString(16).slice(2) + Date.now().toString(16));
}

// =======================
// 4) Pixel simulé (local)
// =======================
function fireTrackingPixel(reason = "auto") {
  // Pixel 1x1 transparent (data URI) => pas besoin de serveur
  const pixelSrc = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  const img = new Image(1,1);
  img.src = pixelSrc;

  const payload = {
    reason,
    page: location.pathname,
    consent: getConsent(),
    cookies: document.cookie || "",
    ts: nowISO()
  };

  // Log visible
  logEvent("pixel_fired", payload);
}

// =======================
// 5) Boutique : rendu produits + tailles + achat
// =======================
function renderProducts(list){
  const grid = document.querySelector("#grid");
  if (!grid) return;

  grid.innerHTML = list.map(p => `
    <article class="card" data-id="${p.id}">
      <div class="thumb">
        <img src="${p.img}" alt="${p.name}">
      </div>
      <div class="card-body">
        <div class="product-name">${p.name}</div>
        <div class="meta">
          <span>Tailles</span>
          <span class="price">${formatPrice(p.price)}</span>
        </div>

        <div class="sizes">
          ${p.sizes.map((s,idx)=>`
            <button type="button" class="size-btn ${idx===0?'active':''}" data-size="${s}">${s}</button>
          `).join("")}
        </div>

        <div class="actions">
          <button class="btn" type="button" data-details>Voir</button>
          <button class="btn primary" type="button" data-buy>Acheter</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".card").forEach(card => {
    const id = card.getAttribute("data-id");
    const product = products.find(x => x.id === id);

    card.querySelectorAll(".size-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    const getSelectedSize = () => card.querySelector(".size-btn.active")?.getAttribute("data-size") || product.sizes[0];

    card.querySelector("[data-details]").addEventListener("click", () => {
      logEvent("product_view", { id: product.id, name: product.name, price: product.price, size: getSelectedSize() });
      alert(`${product.name}\nPrix: ${formatPrice(product.price)}\nTaille: ${getSelectedSize()}`);
    });

    card.querySelector("[data-buy]").addEventListener("click", () => {
  const size = getSelectedSize();

  // ⛔ NE PLUS rediriger directement
  // ✅ Forcer la connexion avant paiement
  requireLoginThenGoToPayment(product.id, size);
});

  });
}

function initSearch(){
  const input = document.querySelector("#searchInput");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(q));
    renderProducts(filtered);
    logEvent("search", { q, results: filtered.length });
  });
}

// =======================
// 6) Paiement : résumé + simulation
// =======================
function initPayment(){
  const summary = document.querySelector("#productSummary");
  if (!summary) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "p1";
  const size = params.get("size") || "M";

  const product = products.find(p => p.id === id) || products[0];

  summary.innerHTML = `
    <div style="display:grid; gap:12px;">
      <div class="thumb" style="border-radius:14px; overflow:hidden; border:1px solid var(--line);">
        <img src="${product.img}" alt="${product.name}">
      </div>
      <div style="display:grid; gap:6px;">
        <div style="font-weight:700;">${product.name}</div>
        <div style="color: var(--muted); font-size:13px;">Taille: <strong>${size}</strong></div>
        <div style="color: var(--gold); font-weight:800;">${formatPrice(product.price)}</div>
      </div>
    </div>
  `;

  const total = document.querySelector("#total");
  if (total) total.textContent = formatPrice(product.price);

  logEvent("payment_page_loaded", { id: product.id, size, price: product.price });

  const form = document.querySelector("#payForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    logEvent("payment_submit_demo", { id: product.id, size, price: product.price });
    alert("✅ Paiement simulé (démo) — merci !");
    window.location.href = "index.html";
  });
}

// =======================
// 7) Boutons du panneau debug (refresh, pixel, reset)
// =======================
function initDebugButtons(){
  const btnRefresh = document.querySelector("#btnRefreshLogs");
  btnRefresh?.addEventListener("click", () => {
    logEvent("debug_refresh_clicked", {});
    renderDebugPanels();
  });

  const btnPixel = document.querySelector("#btnFirePixel");
  btnPixel?.addEventListener("click", () => {
    fireTrackingPixel("manual");
  });

  const btnReset = document.querySelector("#btnReset");
  btnReset?.addEventListener("click", () => {
    // reset cookies + sessionStorage
    deleteAllCookies();
    sessionStorage.clear();
    logEvent("reset_done", { note: "sessionStorage était vidé, cookies supprimés" }); // (sera recréé juste après)
    // Après clear, il faut réécrire un log pour que ça existe
    writeLogs([{ time: nowISO(), type: "reset_done", data: { ok: true } }]);
    renderDebugPanels();
    alert("✅ Données locales reset (cookies + sessionStorage).");
  });
}

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // log visite
  logEvent("page_view", { page: location.pathname });

  // cookie banner (toujours)
  initCookieBannerAlways();

  // pixel auto au chargement (démo)
  fireTrackingPixel("auto");

  // home
  if (document.querySelector("#grid")) {
    renderProducts(products);
    initSearch();
  }

  // paiement
  initPayment();

  // panneau debug
  initDebugButtons();
  renderDebugPanels();
  // =======================
// AUTH – Brancher les boutons du modal
// =======================

// Bouton "Annuler" → fermer le modal
document.getElementById("authCancelBtn")?.addEventListener("click", () => {
  hideAuthModal();
});

// Bouton "Se connecter / Créer mon compte"
document.getElementById("authSubmitBtn")?.addEventListener("click", () => {
  submitAuth();
});

// Bouton "Créer un compte / J'ai déjà un compte"
document.getElementById("authToggleBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("loginModal");

  // si on est en signup → revenir à login, sinon passer à signup
  const nextMode = modal?.dataset.mode === "signup" ? "login" : "signup";
  showAuthModal(nextMode);
});

});
// ====== UTILITAIRES ======
// =======================
// AUTH (localStorage + sessionStorage)
// =======================
const USERS_KEY = "nl_users";          // comptes persistants
const SESSION_KEY = "nl_session";      // session (onglet)
const PENDING_KEY = "nl_pending_checkout"; // achat en attente

function getUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  catch { return []; }
}
function setUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession(){
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function setSession(sess){
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
}

function showAuthModal(mode = "login"){
  const modal = document.getElementById("loginModal");
  if (!modal) return;
  modal.dataset.mode = mode;

  document.getElementById("authTitle").textContent = mode === "signup" ? "Créer un compte" : "Connexion";
  document.getElementById("authSubtitle").textContent = mode === "signup"
    ? "Créez vos accès pour continuer vers l’achat."
    : "Connectez-vous pour continuer vers l’achat.";
  document.getElementById("authSubmitBtn").textContent = mode === "signup" ? "Créer mon compte" : "Se connecter";
  document.getElementById("authToggleBtn").textContent = mode === "signup" ? "J'ai déjà un compte" : "Créer un compte";

  modal.classList.remove("hidden");
  logEvent("login_modal_shown", { mode });
}

function hideAuthModal(){
  document.getElementById("loginModal")?.classList.add("hidden");
  logEvent("login_modal_hidden", {});
}

// Hash SHA-256 (évite de stocker le mot de passe en clair)
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function normalizeIdentifier(v){
  return (v || "").trim().toLowerCase();
}

// Créer un userId simple (démo)
function makeUserId(){
  return (crypto?.randomUUID?.() || (Date.now() + "-" + Math.random().toString(16).slice(2)));
}

async function submitAuth(){
  const modal = document.getElementById("loginModal");
  const mode = modal?.dataset.mode || "login";

  const identifier = normalizeIdentifier(document.getElementById("authIdentifier")?.value);
  const password = document.getElementById("authPassword")?.value || "";

  if (!identifier || !password){
    alert("Veuillez remplir identifiant et mot de passe.");
    logEvent("auth_failed", { reason: "missing_fields", mode });
    return;
  }

  const users = getUsers();
  const passHash = await sha256(password);

  // Trouver par email OU username
  const findUser = () => users.find(u => u.email === identifier || u.username === identifier);

  if (mode === "signup"){
    // si l’identifiant ressemble à un email => email, sinon username
    const isEmail = identifier.includes("@");
    const email = isEmail ? identifier : "";
    const username = isEmail ? "" : identifier;

    if (email && users.some(u => u.email === email)){
      alert("Cet email est déjà utilisé.");
      return;
    }
    if (username && users.some(u => u.username === username)){
      alert("Ce nom d’utilisateur est déjà utilisé.");
      return;
    }

    const newUser = {
      id: makeUserId(),
      email,
      username,
      passHash,
      createdAt: new Date().toISOString()
    };

    users.unshift(newUser);
    setUsers(users);

    setSession({ userId: newUser.id, identifier, loginAt: new Date().toISOString() });
    logEvent("signup_success", { userId: newUser.id, identifier });

    hideAuthModal();
    continuePendingCheckout();
    return;
  }

  // login
  const user = findUser();
  if (!user){
    alert("Compte introuvable. Cliquez sur “Créer un compte”.");
    logEvent("login_failed", { reason: "user_not_found", identifier });
    return;
  }
  if (user.passHash !== passHash){
    alert("Mot de passe incorrect.");
    logEvent("login_failed", { reason: "bad_password", identifier });
    return;
  }

  setSession({ userId: user.id, identifier, loginAt: new Date().toISOString() });
  logEvent("login_success", { userId: user.id, identifier });

  hideAuthModal();
  continuePendingCheckout();
}

function requireLoginThenGoToPayment(productId, size){
  const sess = getSession();
  if (!sess){
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ productId, size, time: new Date().toISOString() }));
    logEvent("checkout_blocked_not_logged_in", { productId, size });
    showAuthModal("login");
    return;
  }
  goToPayment(productId, size);
}

function continuePendingCheckout(){
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    sessionStorage.removeItem(PENDING_KEY);
    goToPayment(p.productId, p.size);
  } catch {}
}

function goToPayment(productId, size){
  logEvent("checkout_start", { id: productId, size });
  window.location.href = `paiement.html?id=${encodeURIComponent(productId)}&size=${encodeURIComponent(size)}`;
}
