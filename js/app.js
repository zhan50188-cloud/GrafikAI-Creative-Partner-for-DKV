// app.js — entry point: hash router + nav wiring

import { $, $$ } from "./core.js";
import {
  Landing, Dashboard, Workspace, ColorStudio, TypographyStudio, Projects, About,
} from "./pages.js";

const routes = {
  "/": Landing,
  "/dashboard": Dashboard,
  "/workspace": Workspace,
  "/color": ColorStudio,
  "/typography": TypographyStudio,
  "/projects": Projects,
  "/about": About,
};

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query] = raw.split("?");
  const params = {};
  if (query) {
    for (const part of query.split("&")) {
      const [k, v] = part.split("=");
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
  }
  return { path: path || "/", params };
}

function setActiveNav(path) {
  $$(".nav a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("data-route") === path);
  });
}

function render() {
  const { path, params } = parseHash();
  const view = routes[path] || NotFound;
  const main = document.getElementById("main");
  main.innerHTML = "";

  try {
    main.appendChild(view(params));
  } catch (err) {
    console.error("Render error:", err);
    main.appendChild(NotFound());
  }

  setActiveNav(routes[path] ? path : null);
  // reset scroll + focus for a11y
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  main.focus({ preventScroll: true });

  // close mobile nav on navigation
  const nav = document.getElementById("primaryNav");
  const toggle = document.getElementById("navToggle");
  nav?.classList.remove("open");
  toggle?.setAttribute("aria-expanded", "false");
}

function NotFound() {
  const node = document.createElement("div");
  node.className = "page empty-state";
  node.innerHTML = `
    <h1>404</h1>
    <p class="muted mt-12">Halaman tidak ditemukan.</p>
    <a class="btn mt-20" href="#/">Kembali ke Beranda</a>`;
  return node;
}

/* ---------- mobile nav toggle ---------- */
function wireNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("primaryNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
  });
}

/* ---------- boot ---------- */
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) location.replace("#/");
  wireNav();
  render();
});

// If the module loads after DOMContentLoaded already fired
if (document.readyState !== "loading") {
  if (!location.hash) location.replace("#/");
  wireNav();
  render();
}
