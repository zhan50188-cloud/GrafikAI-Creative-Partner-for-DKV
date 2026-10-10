// core.js — shared utilities: DOM helpers, toast, localStorage store, copy

/* ---------- DOM helpers ---------- */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export const $ = (sel, scope = document) => scope.querySelector(sel);
export const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

/* ---------- Toast ---------- */
let toastTimer = null;
export function toast(message, type = "ok") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = message;
  t.style.borderColor = type === "error" ? "#f87171" : "var(--purple)";
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- Clipboard ---------- */
export async function copyText(text, successMsg = "Disalin ke clipboard") {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts (e.g. file://)
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) throw new Error("execCommand failed");
    }
    toast(successMsg);
    return true;
  } catch (err) {
    toast("Gagal menyalin. Salin manual: " + text, "error");
    return false;
  }
}

/* ---------- Store (localStorage, resilient) ---------- */
const PROJECTS_KEY = "grafikai.projects.v1";

export const store = {
  all() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Store read error:", err);
      toast("Data proyek rusak, memulai ulang penyimpanan.", "error");
      return [];
    }
  },
  save(project) {
    try {
      const list = store.all();
      const record = {
        id: project.id || "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: project.createdAt || Date.now(),
        type: project.type || "Project",
        title: project.title || "Untitled",
        payload: project.payload || {},
      };
      const idx = list.findIndex((p) => p.id === record.id);
      if (idx >= 0) list[idx] = record;
      else list.unshift(record);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
      return record;
    } catch (err) {
      console.error("Store save error:", err);
      toast("Gagal menyimpan proyek (storage penuh atau tidak tersedia).", "error");
      return null;
    }
  },
  remove(id) {
    try {
      const list = store.all().filter((p) => p.id !== id);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      console.error("Store remove error:", err);
      toast("Gagal menghapus proyek.", "error");
      return false;
    }
  },
  clear() {
    try { localStorage.removeItem(PROJECTS_KEY); return true; }
    catch { return false; }
  },
};

/* ---------- Misc ---------- */
export function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "-"; }
}

export function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Deterministic-ish pseudo-random from a seed string, so same input gives stable-feeling output
export function seededPick(arr, seed, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const idx = Math.abs(h) % arr.length;
  return arr[idx];
}

export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
