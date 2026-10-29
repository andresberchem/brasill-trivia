import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getFirestore,collection,addDoc,doc,updateDoc,deleteDoc,query,orderBy,limit,onSnapshot,serverTimestamp}
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged}
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {QUESTIONS as BASE} from "./questions.js";
import {EXTRA} from "./questions2.js";
const QUESTIONS = [...BASE, ...EXTRA];
const ALL = () => [...QUESTIONS, ...CUSTOM];

const firebaseConfig = {
  apiKey: "AIzaSyDf-qruG-i1pVNM2DKMag29ZB5ZQ_-nJfo",
  authDomain: "brasil-trivia-andres.firebaseapp.com",
  projectId: "brasil-trivia-andres",
  storageBucket: "brasil-trivia-andres.firebasestorage.app",
  messagingSenderId: "237284083241",
  appId: "1:237284083241:web:992323a88c4e1135f1fe38"
};

// Correo del ÚNICO administrador (debe ser el mismo de las reglas de Firestore)
const ADMIN_EMAIL = "berchemsantosa@gmail.com";

let db = null, auth = null, isAdmin = false, rerender = () => {};
try {
  if (!firebaseConfig.apiKey.startsWith("TU_")) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (e) { console.error("Firebase error:", e); }

const $ = id => document.getElementById(id);
const show = id => ["start","quiz","end","admin","rank","qr"].forEach(s => $(s).classList.toggle("hidden", s !== id));
const mine = JSON.parse(localStorage.getItem("mine") || "[]");
let Q = [], i = 0, score = 0, hits = 0, locked = false, tid = null, left = 0, streak = 0, fifty = 1, plus = 1, skip = 1, extra = 0, maxStreak = 0, cs = {}, CUSTOM = [], lastSnap = null;

const UI = {
  en: {
    tagline: "Test what you know about Brazil", name: "Name", program: "🎓 Training Program", ui: "🌐 Interface language", voice: "🔊 Voice language",
    count: "Questions", cat: "Topic", timer: "⏱️ Timer", optAll: "All", optGeo: "Geography & nature", 
    optCulture: "Culture & food", optSports: "Sports", optHistory: "History", optTimeOff: "Off",
    play: "Play", next: "Next", again: "Play again", listen: "🔊 Listen", rank: "🏆 Live ranking",
    feedbackYes: "Correct!", feedbackNo: "Not quite.", feedbackTime: "Time's up!",
    saving: "Saving your score…", saved: "✅ Score saved", noFb: "Ranking off: add your firebaseConfig in app.js",
    noScores: "No scores yet. Be the first!", addCfg: "Add your firebaseConfig in app.js to enable the live ranking.",
    renamePrompt: "New name:"
  },
  es: {
    tagline: "Pon a prueba tus conocimientos sobre Brasil", name: "Nombre", program: "🎓 Programa de formación", ui: "🌐 Lenguaje de interfaz", voice: "🔊 Idioma de voz",
    count: "Preguntas", cat: "Tema", timer: "⏱️ Temporizador", optAll: "Todos", optGeo: "Geografía y naturaleza", 
    optCulture: "Cultura y comida", optSports: "Deportes", optHistory: "Historia", optTimeOff: "Apagado",
    play: "Reproducir", next: "Siguiente", again: "Jugar de nuevo", listen: "🔊 Escuchar", rank: "🏆 Ranking en vivo",
    feedbackYes: "¡Correcto!", feedbackNo: "Incorrecto.", feedbackTime: "¡Se acabó el tiempo!",
    saving: "Guardando tu puntaje…", saved: "✅ Puntaje guardado", noFb: "Ranking desactivado: agrega tu firebaseConfig en app.js",
    noScores: "Aún no hay puntajes. ¡Sé el primero!", addCfg: "Agrega tu firebaseConfig en app.js para activar el ranking en vivo.",
    renamePrompt: "Nuevo nombre:"
  },
  pt: {
    tagline: "Teste o que você sabe sobre o Brasil", name: "Nome", program: "🎓 Programa de formação", ui: "🌐 Idioma da interface", voice: "🔊 Idioma da voz",
    count: "Perguntas", cat: "Tema", timer: "⏱️ Cronômetro", optAll: "Todas", optGeo: "Geografia e natureza", 
    optCulture: "Cultura e comida", optSports: "Esportes", optHistory: "História", optTimeOff: "Desligado",
    play: "Jogar", next: "Próxima", again: "Jogar de novo", listen: "🔊 Ouvir", rank: "🏆 Ranking ao vivo",
    feedbackYes: "Correto!", feedbackNo: "Incorreto!", feedbackTime: "O tempo acabou!",
    saving: "Salvando sua pontuação…", saved: "✅ Pontuação salva", noFb: "Ranking desativado: adicione seu firebaseConfig em app.js",
    noScores: "Ainda sem pontuações. Seja o primeiro!", addCfg: "Adicione seu firebaseConfig em app.js para ativar o ranking ao vivo.",
    renamePrompt: "Novo nome:"
  }
};

const uiLang = () => $("ui").value;           
const voiceLang = () => $("voice").value;     
// CORRECCIÓN AQUÍ: Evitamos que T() falle si por alguna razón el idioma no está listo
const T = k => UI[uiLang()] ? UI[uiLang()][k] : UI["en"][k];

function applyUI() {
  const t = uiLang();
  $("tagline").textContent = UI[t].tagline;
  $("lbl-name").textContent = UI[t].name;
  $("lbl-program").textContent = UI[t].program;
  $("lbl-ui").textContent = UI[t].ui;
  $("lbl-voice").textContent = UI[t].voice;
  $("lbl-count").textContent = UI[t].count;
  $("lbl-cat").textContent = UI[t].cat;
  $("lbl-timer").textContent = UI[t].timer;
  $("opt-all").textContent = UI[t].optAll;
  $("opt-geo").textContent = UI[t].optGeo;
  $("opt-culture").textContent = UI[t].optCulture;
  $("opt-sports").textContent = UI[t].optSports;
  $("opt-history").textContent = UI[t].optHistory;
  $("opt-time-off").textContent = UI[t].optTimeOff;
  $("go").textContent = UI[t].play;
  $("next").textContent = UI[t].next;
  $("again").textContent = UI[t].again;
  $("say").textContent = UI[t].listen;
  $("lbl-rank").textContent = UI[t].rank;
  $("rankmsg").textContent = db ? "" : UI[t].addCfg;
}

$("ui").onchange = () => { applyUI(); if (Q.length && !$("quiz").classList.contains("hidden")) rerenderText(); };

let speechUnlocked = false;
function speak(text) {
  const v = voiceLang();
  if (v === "off" || !window.speechSynthesis) return;

  if (!speechUnlocked) {
    speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    speechUnlocked = true;
  }

  speechSynthesis.cancel();
  
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = v === "en" ? "en-US" : v === "es" ? "es-ES" : "pt-BR";
    u.rate = .9;
    
    const voices = speechSynthesis.getVoices();
    const localVoice = voices.find(voice => 
      voice.lang.startsWith(u.lang.split('-')[0]) && voice.localService === true
    );
    if (localVoice) u.voice = localVoice;

    speechSynthesis.speak(u);
  }, 150);
}

function translatedExtra(q) {
  const v = voiceLang();
  if (v === "off" || v === "en") return "";
  const idx = v === "es" ? 1 : 2;
  return q.x[idx] ? "\n" + q.x[idx] : "";
}
function qTranslation(q) {
  const v = voiceLang();
  if (v === "off" || v === "en") return "";
  return q[v] || "";
}
function optTranslation(optStr) {
  const v = voiceLang();
  if (v === "off" || v === "en") return "";
  const parts = optStr.split("|");
  return v === "es" ? (parts[1] || "") : (parts[2] || "");
}

$("go").onclick = () => {
  try {
    const cat = $("cat").value;
    const pool = ALL().filter(q => (cat === "all" || q.c === cat) && ($("lvl").value === "all" || q.d === $("lvl").value));
    if (!pool.length) { alert("No questions for this category."); return; }
    
    const n = Math.min(+$("n").value, pool.length);
    Q = [...pool].sort(() => Math.random() - .5).slice(0, n);
    i = 0; score = 0; hits = 0; streak = 0; fifty = 1; plus = 1; skip = 1; maxStreak = 0; cs = {};

    const quizVoiceSelect = $("quiz-voice");
    if (quizVoiceSelect) {
      quizVoiceSelect.value = $("voice").value === "off" ? "en" : $("voice").value;
    }

    show("quiz");
    render();
  } catch (error) {
    console.error("Error al iniciar el juego:", error);
    alert("Hubo un error al iniciar. Revisa la consola (F12).");
  }
};
$("again").onclick = () => show("start");
$("next").onclick = () => { i++; i < Q.length ? render() : finish(); };

// Busca sola la imagen principal del artículo de Wikipedia (sin descargar nada)
const imgCache = {};
async function wikiImage(term) {
  if (!term) return null;
  if (term in imgCache) return imgCache[term];
  let url = null;
  try {
    const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(term.replace(/ /g, "_")));
    if (r.ok) {
      const j = await r.json(), t = j.thumbnail, o = j.originalimage;
      if (t) url = (o && o.width >= 960) ? t.source.replace(/\/\d+px-/, "/960px-") : t.source;
    }
  } catch (e) {}
  if (!url) { // plan B: búsqueda en Wikipedia
    try {
      const r = await fetch("https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json&origin=*&gsrsearch=" + encodeURIComponent(term));
      const j = await r.json(), p = Object.values((j.query || {}).pages || {})[0];
      if (p && p.thumbnail) url = p.thumbnail.source;
    } catch (e) {}
  }
  return imgCache[term] = url;
}

function render() {
  locked = false;
  if (window.speechSynthesis) speechSynthesis.cancel();
  const qz = $("quiz"); qz.classList.remove("enter"); void qz.offsetWidth; qz.classList.add("enter");
  $("tnum").classList.remove("urgent"); $("tbar").style.background = "";
  $("fifty").disabled = !fifty; $("plus").disabled = !plus || !+$("time").value; $("skip").disabled = !skip;
  $("streak").textContent = streak > 1 ? `🔥 x${streak}` : "";

  const q = Q[i];
  $("prog").textContent = `${i + 1} / ${Q.length}`;
  $("score").textContent = `⭐ ${score}`;
  $("q").textContent = q.q;
  $("qtr").textContent = qTranslation(q);
  $("emo").textContent = q.e;

  const im = $("img");
  im.hidden = false;
  im.onerror = () => { im.hidden = true; im.removeAttribute("src"); };
  im.onload = () => { im.hidden = false; };
  im.hidden = true; im.removeAttribute("src");
  im.parentElement.classList.add("hidden"); // la foto se muestra solo después de responder
  im.parentElement.style.removeProperty("--bg"); $("emo").style.visibility = "";
  wikiImage(q.w).then(u => {
    if (Q[i] === q && u) {
      im.parentElement.style.setProperty("--bg", `url("${u}")`);
      $("emo").style.visibility = "hidden";
      im.src = u;
    }
  });
  if (Q[i + 1]) wikiImage(Q[i + 1].w); // precarga la siguiente

  $("fb").className = "hidden";
  $("fb").textContent = "";
  $("next").classList.add("hidden");
  $("lang-switch").classList.add("hidden");
  $("opts").innerHTML = "";

  q.o.map((t, n) => ({t, n}))
    .sort(() => Math.random() - .5)
    .forEach(({t, n}, idx) => {
      const b = document.createElement("button");
      const en = t.split("|")[0];
      const tr = optTranslation(t);
      b.textContent = tr ? `${en}  ·  ${tr}` : en;
      b.dataset.n = n;
      b.dataset.l = "ABCD"[idx];
      b.onclick = () => answer(n, b);
      $("opts").append(b);
    });

  const v = voiceLang();
  if (v !== "off") {
    const readQ = v === "en" ? q.q : (q[v] || q.q);
    const readOpts = q.o.map(o => v === "en" ? o.split("|")[0] : optTranslation(o) || o.split("|")[0]);
    speak(`${readQ}. ${readOpts.join(", ")}`);
  }

  startTimer();
}

function rerenderText() {
  const q = Q[i];
  if (!q) return;
  $("qtr").textContent = qTranslation(q);
  [...$("opts").children].forEach((b) => {
    const raw = q.o[+b.dataset.n];
    if (!raw) return;
    const en = raw.split("|")[0];
    const tr = optTranslation(raw);
    b.textContent = tr ? `${en}  ·  ${tr}` : en;
  });
  if (!$("fb").classList.contains("hidden")) {
    const good = $("fb").classList.contains("good");
    const msg = good ? T("feedbackYes") : T("feedbackNo");
    $("fb").textContent = `${msg} ${q.x[0]}${translatedExtra(q)}`;
  }
}

function startTimer() {
  clearInterval(tid); extra = 0;
  const t = +$("time").value;
  left = 0;
  $("tnum").textContent = t ? `⏱️ ${t}s` : "";
  $("tbar").style.width = t ? "100%" : "0";
  if (!t) return;
  const t0 = Date.now();
  tid = setInterval(() => {
    const r = t + extra - (Date.now() - t0) / 1000;
    left = Math.max(0, Math.ceil(r));
    $("tbar").style.width = Math.max(0, r / (t + extra) * 100) + "%";
    $("tbar").style.background = r / (t + extra) < .25 ? "#D9432B" : r / (t + extra) < .5 ? "#FFB400" : "#1E8E4E";
    $("tnum").classList.toggle("urgent", left <= 5);
    $("tnum").textContent = `⏱️ ${left}s`;
    if (r <= 0) { clearInterval(tid); answer(-1, null); }
  }, 100);
}

$("say").onclick = () => {
  const q = Q[i], v = voiceLang();
  if (v === "off") return;
  const readQ = v === "en" ? q.q : (q[v] || q.q);
  const readOpts = q.o.map(o => v === "en" ? o.split("|")[0] : optTranslation(o) || o.split("|")[0]);
  speak(`${readQ}. ${readOpts.join(", ")}`);
};

let muted = localStorage.getItem("mute") === "1", ac = null;
const AC = window.AudioContext || window.webkitAudioContext;
function tone(seq, type) {
  if (muted || !AC) return;
  ac = ac || new AC(); let t = ac.currentTime;
  seq.forEach(([f, d]) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); t += d * .8;
  });
}
const sfx = { ok: () => tone([[523, .12], [659, .12], [784, .22]]), bad: () => tone([[220, .18], [160, .32]], "sawtooth") };
$("mute").textContent = muted ? "🔇" : "🔊";
$("mute").onclick = () => { muted = !muted; localStorage.setItem("mute", muted ? "1" : "0"); $("mute").textContent = muted ? "🔇" : "🔊"; };

$("nav-admin").onclick = () => { clearInterval(tid); show("admin"); };
$("nav-play").onclick = () => { clearInterval(tid); show("start"); };
$("nav-rank").onclick = () => { clearInterval(tid); show("rank"); };
$("see-rank").onclick = () => show("rank");
$("nav-qr").onclick = () => {
  clearInterval(tid); show("qr");
  const url = location.href.split("#")[0].split("?")[0], box = $("qrbox");
  box.innerHTML = ""; $("qrurl").textContent = url;
  if (window.QRCode) new QRCode(box, {text: url, width: 240, height: 240, colorDark: "#06182b", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H});
};
$("qr-dl").onclick = () => {
  const c = $("qrbox").querySelector("canvas"); if (!c) return;
  const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "brasil-trivia-qr.png"; a.click();
};
$("qr-copy").onclick = () => navigator.clipboard.writeText($("qrurl").textContent).then(() => {
  $("qr-copy").textContent = "✅ Copied"; setTimeout(() => $("qr-copy").textContent = "🔗 Copy link", 1500);
});

$("plus").onclick = () => { if (!plus || locked || !+$("time").value) return; plus--; extra += 10; $("plus").disabled = true; };
$("skip").onclick = () => { if (!skip || locked) return; skip--; clearInterval(tid); i++; i < Q.length ? render() : finish(); };
$("fifty").onclick = () => {
  if (!fifty || locked) return;
  fifty--; $("fifty").disabled = true;
  const q = Q[i];
  [...$("opts").children].filter(b => +b.dataset.n !== q.a).sort(() => Math.random() - .5).slice(0, 2)
    .forEach(b => { b.disabled = true; b.classList.add("dim"); });
};

function burst() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("div"); c.className = "confetti";
  const cols = ["#009C3B", "#FFDF00", "#002776", "#ffffff"];
  for (let k = 0; k < 30; k++) {
    const s = document.createElement("i");
    s.style.cssText = `left:50%;top:45%;background:${cols[k % 4]};--x:${(Math.random() - .5) * 700}px;--y:${-120 - Math.random() * 300}px;--r:${Math.random() * 720}deg`;
    c.append(s);
  }
  document.body.append(c); setTimeout(() => c.remove(), 1500);
}
function popScore() { const s = $("score"); s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); }

function answer(n, btn) {
  if (locked) return;
  locked = true;
  clearInterval(tid);

  const q = Q[i], good = n === q.a, fb = $("fb");
  [...$("opts").children].forEach(b => {
    b.disabled = true;
    if (+b.dataset.n === q.a) b.classList.add("right");
  });

  const cc = cs[q.c || "x"] = cs[q.c || "x"] || {ok: 0, n: 0}; cc.n++;
  if (good) { streak++; maxStreak = Math.max(maxStreak, streak); cc.ok++; score += 100 + left * 5 + Math.min(streak - 1, 4) * 20; hits++; burst(); sfx.ok(); }
  else { streak = 0; sfx.bad(); if (btn) btn.classList.add("wrong"); }
  $("score").textContent = `⭐ ${score}`;
  $("streak").textContent = streak > 1 ? `🔥 x${streak}` : ""; popScore();
  $("img").parentElement.classList.remove("hidden");
  setTimeout(() => $("next").scrollIntoView({behavior: "smooth", block: "nearest"}), 150);

  fb.className = good ? "good" : "bad";
  const msg = good ? T("feedbackYes") : (n === -1 ? T("feedbackTime") : T("feedbackNo"));
  const extra = translatedExtra(q);
  fb.textContent = `${msg} ${q.x[0]}${extra}`;
  fb.style.whiteSpace = "pre-line";
  fb.classList.remove("hidden");

  $("lang-switch").classList.remove("hidden");
  $("next").classList.remove("hidden");

  const v = voiceLang();
  if (v !== "off") {
    const spoken = v === "en" ? `${msg} ${q.x[0]}` : `${msg} ${q.x[v === "es" ? 1 : 2] || q.x[0]}`;
    speak(spoken);
  }
}

$("quiz-voice").onchange = (e) => {
  const newLang = e.target.value;
  $("voice").value = newLang;
  const q = Q[i];
  if (!q) return;

  $("qtr").textContent = qTranslation(q);
  [...$("opts").children].forEach((b) => {
    const raw = q.o[+b.dataset.n];
    const en = raw.split("|")[0];
    const tr = optTranslation(raw);
    b.textContent = tr ? `${en}  ·  ${tr}` : en;
  });

  const good = $("fb").classList.contains("good");
  const isTimeUp = $("fb").textContent.includes("Time's up") || $("fb").textContent.includes("Se acabó") || $("fb").textContent.includes("acabou");
  const msg = good ? T("feedbackYes") : (isTimeUp ? T("feedbackTime") : T("feedbackNo"));
  $("fb").textContent = `${msg} ${q.x[0]}${translatedExtra(q)}`;

  if (newLang !== "off") {
    const idx = newLang === "es" ? 1 : 2;
    const spoken = newLang === "en" ? `${msg} ${q.x[0]}` : `${msg} ${q.x[idx] || q.x[0]}`;
    speak(spoken);
  }
};

async function finish() {
  show("end");
  const name = ($("name").value.trim() || "Anónimo").slice(0, 20);
  const program = ($("program").value.trim() || "General").toUpperCase().slice(0, 30);
  
  // FORZAMOS A QUE SEAN NÚMEROS REALES
  const finalScore = Number(score) + 0;
  const finalHits = Number(hits) + 0;
  const finalTotal = Number(Q.length) + 0;

  const pct = finalHits / finalTotal, tier = pct >= .8 ? 0 : pct >= .5 ? 1 : 2;
  const titles = {en: ["Samba Master", "Carioca in training", "Curious explorer"], es: ["Maestro del samba", "Carioca en entrenamiento", "Explorador curioso"], pt: ["Mestre do samba", "Carioca em treinamento", "Explorador curioso"]};
  $("res").textContent = `${["🏆", "🥈", "🌱"][tier]} ${titles[uiLang()][tier]} — ${finalHits}/${finalTotal} · ${finalScore} pts`;
  if (tier === 0) burst();
  const done = JSON.parse(localStorage.getItem("ach") || "[]"), L = uiLang(), earned = [];
  const exp = {en: "Expert", es: "Experto", pt: "Especialista"}, cn = {geo: "optGeo", culture: "optCulture", sports: "optSports", history: "optHistory"};
  if (maxStreak >= 5) earned.push(["s5", "🔥", {en: "5 in a row", es: "5 seguidas", pt: "5 seguidas"}]);
  if (maxStreak >= 10) earned.push(["s10", "⚡", {en: "10 in a row", es: "10 seguidas", pt: "10 seguidas"}]);
  if (finalHits === finalTotal && finalTotal >= 10) earned.push(["perf", "💎", {en: "Perfect game", es: "Partida perfecta", pt: "Partida perfeita"}]);
  Object.entries(cs).forEach(([c, v]) => { if (cn[c] && v.n >= 3 && v.ok === v.n) earned.push(["x" + c, "🎖️", {en: exp.en + " · " + UI.en[cn[c]], es: exp.es + " · " + UI.es[cn[c]], pt: exp.pt + " · " + UI.pt[cn[c]]}]); });
  $("ach").innerHTML = "";
  earned.forEach(a => { const nw = !done.includes(a[0]); if (nw) done.push(a[0]); const s = document.createElement("span"); s.textContent = (nw ? "✨ " : "") + a[1] + " " + a[2][L]; $("ach").append(s); });
  localStorage.setItem("ach", JSON.stringify(done));
  $("sub").textContent = db ? T("saving") : T("noFb");

  if (!db) return;
  try {
    // Imprimimos en la consola (F12) para ver qué estamos guardando
    console.log("Guardando en Firebase:", { name, program, score: finalScore, hits: finalHits, total: finalTotal });

    const ref = await addDoc(collection(db, "scores"), { 
      name, 
      program, 
      score: finalScore, // Guardamos el número puro
      hits: finalHits, 
      total: finalTotal, 
      at: serverTimestamp() 
    });
    mine.push(ref.id);
    localStorage.setItem("mine", JSON.stringify(mine));
    $("sub").textContent = T("saved");
  } catch (e) {
    $("sub").textContent = "❌ " + e.message;
    console.error(e);
  }
}

/* RANKING EN VIVO (BLINDADO CONTRA NAN) */
if (db) {
  const renderRank = snap => {
      $("list").innerHTML = "";
      $("rankmsg").textContent = snap.empty ? T("noScores") : "";
      
      const progs = [...new Set(snap.docs.map(d => String(d.data().program || "General").trim()))];
      const sel = $("rankfilter"), cur = sel.value;
      sel.innerHTML = '<option value="">🎓 All</option>' + progs.map(p => "<option>" + p.replace(/</g, "&lt;") + "</option>").join("");
      sel.value = progs.includes(cur) ? cur : "";
      snap.docs.filter(d => !sel.value || String(d.data().program || "General").trim() === sel.value).forEach((d, index) => {
        const s = d.data();
        
        // Forzamos a que todo sea texto seguro y números reales
        const safeScore = Number(s.score) || 0;
        const safeName = String(s.name || "Anónimo");
        const safeProgram = String(s.program || "General");
        const position = index + 1;

        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.padding = "10px 0";
        li.style.borderBottom = "1px dashed var(--blue)";

        // Creamos el texto de forma plana (sin HTML interno)
        const textDiv = document.createElement("div");
        textDiv.style.flex = "1";
        textDiv.style.textAlign = "left";
        
        const title = document.createElement("div");
        title.textContent = (["🥇", "🥈", "🥉"][index] || position + ".") + " " + safeName + " (" + safeProgram + ")";
        title.style.fontWeight = "bold";
        
        const points = document.createElement("div");
        points.textContent = "⭐ " + safeScore;
        
        textDiv.appendChild(title);
        textDiv.appendChild(points);
        li.appendChild(textDiv);

        // Botones (solo si es tuyo)
        if (isAdmin) { // solo el administrador autenticado ve editar/borrar
          const btnDiv = document.createElement("div");
          btnDiv.style.display = "flex";
          btnDiv.style.gap = "5px";

          const btnEdit = document.createElement("button");
          btnEdit.textContent = "✏️";
          btnEdit.onclick = () => { 
            const n = prompt(T("renamePrompt"), safeName); 
            if (n) updateDoc(doc(db, "scores", d.id), { name: n.slice(0, 20) }); 
          };
          
          const btnDelete = document.createElement("button");
          btnDelete.textContent = "🗑️";
          btnDelete.onclick = () => deleteDoc(doc(db, "scores", d.id));
          
          btnDiv.appendChild(btnEdit);
          btnDiv.appendChild(btnDelete);
          li.appendChild(btnDiv);
        }
        
        $("list").append(li);
      });
    };
  onSnapshot(query(collection(db, "scores"), orderBy("score", "desc"), limit(50)), snap => { lastSnap = snap; renderRank(snap); },
    err => { $("rankmsg").textContent = "Firestore: " + err.message; });
  $("rankfilter").onchange = () => lastSnap && renderRank(lastSnap);
  rerender = () => lastSnap && renderRank(lastSnap);
}
applyUI();

$("voice").onchange = () => {
  if (Q.length && !$("quiz").classList.contains("hidden")) rerenderText();
};

if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => {
    console.log("Voces cargadas:", speechSynthesis.getVoices().length);
  };
}

/* ===== PANEL ADMIN: CRUD de preguntas en Firestore (colección "questions") ===== */
let editId = null;
const clearForm = () => {
  ["a-q", "a-es", "a-pt", "a-opts", "a-w", "a-x0", "a-x1", "a-x2"].forEach(id => $(id).value = "");
  $("a-ans").value = "0"; editId = null; $("a-cancel").classList.add("hidden"); $("a-save").textContent = "💾 Save";
};
$("a-cancel").onclick = clearForm;
$("a-save").onclick = async () => {
  if (!db) return alert("Firebase is not configured.");
  const o = $("a-opts").value.split("\n").map(s => s.trim()).filter(Boolean);
  const q = $("a-q").value.trim(), x0 = $("a-x0").value.trim();
  if (!q || o.length < 2 || !x0) return alert("Question, 2+ options (one per line) and English feedback are required.");
  const data = {
    q, es: $("a-es").value.trim() || q, pt: $("a-pt").value.trim() || q, o,
    a: Math.min(+$("a-ans").value, o.length - 1), c: $("a-c").value, d: $("a-d").value,
    w: $("a-w").value.trim(), e: "❓", x: [x0, $("a-x1").value.trim() || x0, $("a-x2").value.trim() || x0]
  };
  try {
    if (editId) await updateDoc(doc(db, "questions", editId), data); // UPDATE
    else await addDoc(collection(db, "questions"), data);            // CREATE
    clearForm();
  } catch (e) { alert(e.message); }
};
if (db) onSnapshot(collection(db, "questions"), snap => {           // READ en vivo
  CUSTOM = snap.docs.map(d => ({id: d.id, ...d.data()}));
  $("a-count").textContent = CUSTOM.length + " custom questions";
  $("a-list").innerHTML = "";
  CUSTOM.forEach(q => {
    const li = document.createElement("li"), t = document.createElement("span");
    t.textContent = q.q;
    const e = document.createElement("button"); e.textContent = "✏️";
    e.onclick = () => {
      $("a-q").value = q.q; $("a-es").value = q.es; $("a-pt").value = q.pt; $("a-opts").value = q.o.join("\n");
      $("a-ans").value = q.a; $("a-c").value = q.c; $("a-d").value = q.d; $("a-w").value = q.w || "";
      ["a-x0", "a-x1", "a-x2"].forEach((id, n) => $(id).value = q.x[n] || "");
      editId = q.id; $("a-cancel").classList.remove("hidden"); $("a-save").textContent = "💾 Update"; scrollTo({top: 0, behavior: "smooth"});
    };
    const x = document.createElement("button"); x.textContent = "🗑️";
    x.onclick = () => confirm("Delete this question?") && deleteDoc(doc(db, "questions", q.id)); // DELETE
    li.append(t, e, x); $("a-list").append(li);
  });
}, err => console.error(err));


/* ===== LOGIN DE ADMIN (Firebase Authentication, correo/contraseña) ===== */
if (auth) {
  onAuthStateChanged(auth, u => {
    isAdmin = !!u && (u.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
    $("a-login").classList.toggle("hidden", isAdmin);
    $("a-manager").classList.toggle("hidden", !isAdmin);
    rerender();
  });
  $("a-signin").onclick = async () => {
    $("a-msg").textContent = "";
    try { await signInWithEmailAndPassword(auth, $("a-email").value.trim(), $("a-pass").value); $("a-pass").value = ""; }
    catch (e) { $("a-msg").textContent = "❌ " + (e.code || e.message); }
  };
  $("a-logout").onclick = () => signOut(auth);
}