// pages.js — renders each route into #main. Returns a DOM node.

import { el, $, $$, toast, copyText, store, formatDate, escapeHtml } from "./core.js";
import {
  generateIdeas, generatePoster, generatePalette, generateTypography,
  generateBrief, generateMoodboard, generatePrompt, STYLE_KEYS,
} from "./generators.js";

/* ---------- small shared bits ---------- */
function pageHead(eyebrow, title, desc) {
  return el("div", { class: "page-head" }, [
    el("span", { class: "eyebrow", text: eyebrow }),
    el("h1", { text: title }),
    desc ? el("p", { text: desc }) : null,
  ]);
}

function styleChips(selectedRef, onChange) {
  const wrap = el("div", { class: "chips" });
  STYLE_KEYS.forEach((k) => {
    const chip = el("button", {
      type: "button", class: "chip" + (selectedRef.value === k ? " active" : ""), text: k,
      onClick: () => {
        selectedRef.value = selectedRef.value === k ? "" : k;
        $$(".chip", wrap).forEach((c) => c.classList.toggle("active", c.textContent === selectedRef.value));
        onChange && onChange();
      },
    });
    wrap.appendChild(chip);
  });
  return wrap;
}

function loadingNode() {
  return el("div", { class: "result__empty" }, [
    el("div", { class: "loading-dots", html: "<span></span><span></span><span></span>" }),
    el("p", { class: "muted", text: "AI (demo) sedang menyusun hasil…" }),
  ]);
}

function emptyResult(msg) {
  return el("div", { class: "result__empty" }, [
    el("div", { html: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2.1 2.1M8.6 15.4l-2.1 2.1m0-11.9 2.1 2.1m8.9 8.9-2.1-2.1"/></svg>` }),
    el("p", { text: msg }),
  ]);
}

function saveBtn(getProject) {
  return el("button", {
    class: "btn btn--ghost btn--sm", type: "button",
    html: iconSave() + "<span>Simpan Proyek</span>",
    onClick: () => {
      const proj = getProject();
      if (!proj) return;
      const rec = store.save(proj);
      if (rec) toast("Proyek disimpan ke My Projects");
    },
  });
}

/* ---------- icons ---------- */
const iconArrow = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const iconSave = () => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>`;
const iconCopy = () => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

const FEATURE_ICONS = {
  idea: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>`,
  poster: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h5" stroke-linecap="round"/></svg>`,
  color: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.4-.2-.8-.5-1-.3-.3-.5-.6-.5-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/></svg>`,
  type: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2M9 19h6M12 5v14"/></svg>`,
  brief: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>`,
  mood: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  prompt: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6-6-6M12 19h8"/></svg>`,
  projects: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
};

/* =========================================================
   LANDING
   ========================================================= */
export function Landing() {
  const page = el("div", { class: "page" });

  const hero = el("section", { class: "hero" }, [
    el("div", { class: "hero__grid" }, [
      el("div", {}, [
        el("span", { class: "eyebrow", text: "Creative Partner for DKV" }),
        el("h1", { class: "mt-12", html: `Your Creative Mind,<br><span class="grad">Amplified by AI</span>` }),
        el("p", { class: "lead", text: "GrafikAI adalah partner kreatif untuk siswa dan desainer DKV. Temukan ide, susun konsep, dan kembangkan kreativitasmu — AI membantu, kamu tetap yang berkarya." }),
        el("div", { class: "hero__cta" }, [
          el("a", { class: "btn", href: "#/workspace", html: `<span>Start Creating</span>` + iconArrow() }),
          el("a", { class: "btn btn--ghost", href: "#/dashboard", text: "Lihat Fitur" }),
        ]),
        el("div", { class: "hero__stats" }, [
          stat("7", "Alat kreatif"),
          stat("∞", "Ide tak terbatas"),
          stat("100%", "Berbasis input kamu"),
        ]),
      ]),
      el("div", { class: "hero__art" }, [
        el("div", { class: "ring" }),
        el("div", { class: "orb a" }),
        el("div", { class: "orb b" }),
      ]),
    ]),
  ]);

  const featurePreview = el("section", { class: "mt-20" }, [
    el("div", { class: "row-between", style: "margin-bottom:18px" }, [
      el("h2", { text: "Semua yang kamu butuhkan" }),
      el("a", { class: "feature-card__cta", href: "#/dashboard", html: `<span>Buka Dashboard</span>` + iconArrow() }),
    ]),
    buildFeatureGrid(FEATURES.slice(0, 6)),
  ]);

  page.append(hero, featurePreview);
  return page;

  function stat(b, s) { return el("div", { class: "hero__stat" }, [el("b", { text: b }), el("span", { text: s })]); }
}

/* =========================================================
   DASHBOARD
   ========================================================= */
const FEATURES = [
  { icon: "idea", title: "AI Idea Generator", desc: "Hasilkan ide desain dari tema atau kata kunci.", href: "#/workspace?tab=idea" },
  { icon: "poster", title: "Poster Concept Maker", desc: "Konsep poster: judul, slogan, audiens, warna, layout.", href: "#/workspace?tab=poster" },
  { icon: "color", title: "Color Palette Generator", desc: "Kombinasi warna harmonis sesuai tema.", href: "#/color" },
  { icon: "type", title: "Typography Assistant", desc: "Rekomendasi pasangan font sesuai karakter.", href: "#/typography" },
  { icon: "brief", title: "Design Brief Generator", desc: "Susun brief: tujuan, audiens, pesan, gaya visual.", href: "#/workspace?tab=brief" },
  { icon: "mood", title: "Creative Moodboard", desc: "Inspirasi visual berdasarkan konsep.", href: "#/workspace?tab=mood" },
  { icon: "prompt", title: "Prompt Generator", desc: "Buat prompt AI untuk gambar/referensi.", href: "#/workspace?tab=prompt" },
  { icon: "projects", title: "My Projects", desc: "Simpan dan kelola ide desainmu.", href: "#/projects" },
];

function buildFeatureGrid(list) {
  const grid = el("div", { class: "feature-grid" });
  list.forEach((f) => {
    const card = el("a", { class: "card card--hover feature-card", href: f.href }, [
      el("div", { class: "feature-card__icon", html: FEATURE_ICONS[f.icon] }),
      el("h3", { text: f.title }),
      el("p", { text: f.desc }),
      el("span", { class: "feature-card__cta", html: `<span>Buka</span>` + iconArrow() }),
    ]);
    grid.appendChild(card);
  });
  return grid;
}

export function Dashboard() {
  const page = el("div", { class: "page" });
  page.append(
    pageHead("Dashboard", "Studio Kreatifmu", "Pilih alat untuk mulai berkarya. Semua hasil berbasis input kamu dan berjalan dalam mode demo lokal."),
    buildFeatureGrid(FEATURES),
  );
  return page;
}

/* =========================================================
   AI WORKSPACE (tabbed: idea / poster / brief / mood / prompt)
   ========================================================= */
const WORKSPACE_TABS = [
  { id: "idea", label: "Idea Generator" },
  { id: "poster", label: "Poster Concept" },
  { id: "brief", label: "Design Brief" },
  { id: "mood", label: "Moodboard" },
  { id: "prompt", label: "Prompt Generator" },
];

export function Workspace(params) {
  const page = el("div", { class: "page" });
  page.append(pageHead("AI Workspace", "Ubah Ide Jadi Konsep", "Masukkan tema, pilih gaya desain, lalu biarkan GrafikAI menyusun hasil yang relevan."));

  let activeTab = WORKSPACE_TABS.some((t) => t.id === params.tab) ? params.tab : "idea";

  const tabBar = el("div", { class: "chips mt-12", style: "margin-bottom:24px" });
  WORKSPACE_TABS.forEach((t) => {
    tabBar.appendChild(el("button", {
      type: "button", class: "chip" + (t.id === activeTab ? " active" : ""), text: t.label,
      onClick: () => { activeTab = t.id; refresh(); },
    }));
  });
  page.appendChild(tabBar);

  const body = el("div", {});
  page.appendChild(body);
  refresh();
  return page;

  function refresh() {
    $$(".chip", tabBar).forEach((c) => c.classList.toggle("active", c.textContent === WORKSPACE_TABS.find((t) => t.id === activeTab).label));
    body.innerHTML = "";
    body.appendChild(buildTool(activeTab));
  }
}

function buildTool(kind) {
  const theme = { value: "" };
  const style = { value: "" };
  const extra = { value: "" }; // audience/subject/deliverable depending on tool
  const resultBox = el("div", { class: "result" }, [emptyResult("Hasil akan muncul di sini setelah kamu generate.")]);
  let lastResult = null;

  const config = {
    idea:   { placeholder: "mis. kampanye hemat energi, festival musik lokal, produk kopi", extraLabel: null },
    poster: { placeholder: "mis. hari lingkungan, konser amal, promo kampus", extraLabel: null },
    brief:  { placeholder: "mis. rebranding kedai teh, event seni mahasiswa", extraLabel: "Target audiens (opsional)" },
    mood:   { placeholder: "mis. senja urban, teknologi masa depan, nuansa tropis", extraLabel: null },
    prompt: { placeholder: "mis. maskot kucing astronot, logo kedai kopi", extraLabel: "Subjek utama (opsional)" },
  }[kind];

  const form = el("div", { class: "card" }, [
    el("div", { class: "field" }, [
      el("label", { for: "ws-theme", text: "Tema / kata kunci" }),
      el("input", { id: "ws-theme", type: "text", placeholder: config.placeholder, onInput: (e) => (theme.value = e.target.value) }),
      el("span", { class: "hint", text: "Wajib diisi. Semakin spesifik, hasil makin relevan." }),
    ]),
    el("div", { class: "field" }, [
      el("label", { text: "Gaya desain" }),
      styleChips(style),
      el("span", { class: "hint", text: "Opsional. Kosongkan untuk gaya otomatis." }),
    ]),
    config.extraLabel ? el("div", { class: "field" }, [
      el("label", { for: "ws-extra", text: config.extraLabel }),
      el("input", { id: "ws-extra", type: "text", placeholder: "Opsional", onInput: (e) => (extra.value = e.target.value) }),
    ]) : null,
    el("button", {
      class: "btn btn--block", type: "button", html: `<span>Generate</span>` + iconArrow(),
      onClick: run,
    }),
    el("p", { class: "hint mt-12", text: "Mode demo: hasil adalah simulasi lokal, bukan dari AI API eksternal." }),
  ]);

  const panel = el("div", { class: "card" }, [resultBox]);

  const wrap = el("div", { class: "split" }, [form, panel]);
  return wrap;

  function run() {
    if (!theme.value.trim()) {
      toast("Isi tema atau kata kunci dulu ya.", "error");
      $("#ws-theme")?.focus();
      return;
    }
    resultBox.innerHTML = "";
    resultBox.appendChild(loadingNode());
    setTimeout(() => {
      try {
        const input = { theme: theme.value, style: style.value };
        if (kind === "brief") input.audience = extra.value;
        if (kind === "prompt") input.subject = extra.value;
        lastResult = render(kind, input, resultBox);
      } catch (err) {
        console.error(err);
        resultBox.innerHTML = "";
        resultBox.appendChild(emptyResult("Terjadi kesalahan saat membuat hasil. Coba lagi."));
      }
    }, 450);
  }
}

function render(kind, input, box) {
  box.innerHTML = "";
  if (kind === "idea") return renderIdeas(input, box);
  if (kind === "poster") return renderPoster(input, box);
  if (kind === "brief") return renderBrief(input, box);
  if (kind === "mood") return renderMoodboard(input, box);
  if (kind === "prompt") return renderPrompt(input, box);
}

/* ---- renderers for workspace tools ---- */
function renderIdeas(input, box) {
  const data = generateIdeas(input);
  box.append(
    el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: `Gaya: ${data.style}` }), el("h3", { text: `6 Ide untuk "${data.theme}"` })]),
      saveBtn(() => ({ type: "Idea", title: `Ide: ${data.theme}`, payload: data })),
    ]),
  );
  const list = el("div", { class: "stack mt-12" });
  data.ideas.forEach((idea, i) => {
    list.appendChild(el("div", { class: "idea-item" }, [
      el("div", { class: "idea-item__num", text: String(i + 1).padStart(2, "0") }),
      el("div", {}, [el("h4", { text: idea.title }), el("p", { text: idea.desc })]),
    ]));
  });
  box.appendChild(list);
  return data;
}

function renderPoster(input, box) {
  const d = generatePoster(input);
  box.append(
    el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: `Gaya: ${d.style} · Tone: ${d.tone}` }), el("h3", { text: d.title })]),
      saveBtn(() => ({ type: "Poster", title: `Poster: ${d.title}`, payload: d })),
    ]),
  );
  const grid = el("div", { class: "stack mt-12" }, [
    kv("Judul", d.title),
    kv("Slogan", `“${d.slogan}”`),
    kv("Target Audiens", d.audience),
    kv("Call to Action", d.cta),
    kv("Arahan Visual", d.visualDirection),
    kv("Layout", d.layout),
  ]);
  const sw = el("div", {});
  sw.appendChild(el("div", { class: "section-label", text: "Palet warna" }));
  const row = el("div", { class: "pill-row" });
  d.palette.forEach((hex) => {
    row.appendChild(el("button", {
      class: "pill", type: "button",
      html: `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${hex};margin-right:6px;vertical-align:middle"></span>${hex}`,
      onClick: () => copyText(hex, `${hex} disalin`),
    }));
  });
  sw.appendChild(row);
  grid.appendChild(sw);
  box.appendChild(grid);
  return d;
}

function renderBrief(input, box) {
  const d = generateBrief(input);
  box.append(
    el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: `Design Brief · ${d.style}` }), el("h3", { text: d.theme })]),
      el("div", { style: "display:flex;gap:8px" }, [
        el("button", { class: "btn btn--ghost btn--sm", type: "button", html: iconCopy() + "<span>Salin</span>", onClick: () => copyText(briefToText(d), "Brief disalin") }),
        saveBtn(() => ({ type: "Brief", title: `Brief: ${d.theme}`, payload: d })),
      ]),
    ]),
  );
  box.append(el("div", { class: "stack mt-12" }, [
    kv("Tujuan", d.objective),
    kv("Target Audiens", d.audience),
    kv("Pesan Utama", d.keyMessage),
    kv("Gaya Visual", d.visualStyle),
    kv("Tone", d.tone),
    kv("Deliverable", d.deliverable),
    kv("Ukuran Keberhasilan", d.successMetric),
    kvList("Do", d.doDont.do),
    kvList("Don't", d.doDont.dont),
  ]));
  return d;
}

function renderMoodboard(input, box) {
  const d = generateMoodboard(input);
  box.append(
    el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: `Moodboard · ${d.style}` }), el("h3", { text: d.theme })]),
      saveBtn(() => ({ type: "Moodboard", title: `Moodboard: ${d.theme}`, payload: d })),
    ]),
  );
  const mb = el("div", { class: "moodboard mt-12" });
  d.tiles.forEach((t) => {
    mb.appendChild(el("div", {
      class: "mood-tile" + (t.tall ? " mood-tile--tall" : ""),
      style: `background:${t.gradient}`,
    }, [t.label ? el("span", { class: "mood-tile__label", text: t.label }) : null]));
  });
  box.appendChild(mb);
  box.appendChild(el("div", { class: "mt-12" }, [
    el("div", { class: "section-label", text: "Kata kunci visual" }),
    el("div", { class: "pill-row" }, d.keywords.map((k) => el("span", { class: "pill", text: k }))),
  ]));
  return d;
}

function renderPrompt(input, box) {
  const d = generatePrompt(input);
  box.append(
    el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: `Prompt · ${d.style}` }), el("h3", { text: d.subject })]),
      saveBtn(() => ({ type: "Prompt", title: `Prompt: ${d.subject}`, payload: d })),
    ]),
  );
  box.append(el("div", { class: "stack mt-12" }, [
    el("div", {}, [
      el("div", { class: "section-label", text: "Prompt (positif)" }),
      el("div", { class: "prompt-box", text: d.prompt }),
      el("button", { class: "btn btn--ghost btn--sm mt-12", type: "button", html: iconCopy() + "<span>Salin Prompt</span>", onClick: () => copyText(d.prompt, "Prompt disalin") }),
    ]),
    el("div", {}, [
      el("div", { class: "section-label", text: "Negative prompt" }),
      el("div", { class: "prompt-box", text: d.negative }),
      el("button", { class: "btn btn--ghost btn--sm mt-12", type: "button", html: iconCopy() + "<span>Salin Negative</span>", onClick: () => copyText(d.negative, "Negative prompt disalin") }),
    ]),
  ]));
  return d;
}

/* ---- small KV helpers ---- */
function kv(label, value) {
  return el("div", {}, [el("div", { class: "section-label", text: label }), el("p", { text: value })]);
}
function kvList(label, items) {
  return el("div", {}, [
    el("div", { class: "section-label", text: label }),
    el("ul", { style: "margin:0;padding-left:18px;color:var(--text-soft)" }, items.map((i) => el("li", { text: i }))),
  ]);
}
function briefToText(d) {
  return [
    `DESIGN BRIEF — ${d.theme}`,
    `Tujuan: ${d.objective}`,
    `Target Audiens: ${d.audience}`,
    `Pesan Utama: ${d.keyMessage}`,
    `Gaya Visual: ${d.visualStyle}`,
    `Tone: ${d.tone}`,
    `Deliverable: ${d.deliverable}`,
    `Ukuran Keberhasilan: ${d.successMetric}`,
    `Do: ${d.doDont.do.join("; ")}`,
    `Don't: ${d.doDont.dont.join("; ")}`,
  ].join("\n");
}

/* =========================================================
   COLOR STUDIO
   ========================================================= */
export function ColorStudio() {
  const page = el("div", { class: "page" });
  page.append(pageHead("Color Studio", "Palet Warna Harmonis", "Masukkan tema, pilih skema, dan dapatkan 5 warna yang serasi. Klik warna untuk menyalin."));

  const theme = { value: "" };
  const style = { value: "" };
  const scheme = { value: "analogous" };

  const resultBox = el("div", { class: "result" }, [emptyResult("Palet akan muncul di sini.")]);
  let last = null;

  const schemeChips = el("div", { class: "chips" });
  [["analogous", "Analog"], ["complementary", "Komplementer"], ["triadic", "Triadik"], ["monochrome", "Monokrom"]].forEach(([val, lbl]) => {
    schemeChips.appendChild(el("button", {
      type: "button", class: "chip" + (val === scheme.value ? " active" : ""), text: lbl,
      onClick: (e) => { scheme.value = val; $$(".chip", schemeChips).forEach((c) => c.classList.remove("active")); e.target.classList.add("active"); },
    }));
  });

  const form = el("div", { class: "card" }, [
    el("div", { class: "field" }, [
      el("label", { for: "cs-theme", text: "Tema desain" }),
      el("input", { id: "cs-theme", type: "text", placeholder: "mis. senja pantai, teknologi, festival anak", onInput: (e) => (theme.value = e.target.value) }),
    ]),
    el("div", { class: "field" }, [el("label", { text: "Gaya (opsional)" }), styleChips(style)]),
    el("div", { class: "field" }, [el("label", { text: "Skema warna" }), schemeChips]),
    el("button", { class: "btn btn--block", type: "button", html: `<span>Generate Palet</span>` + iconArrow(), onClick: run }),
  ]);

  const panel = el("div", { class: "card" }, [resultBox]);
  page.appendChild(el("div", { class: "split" }, [form, panel]));
  return page;

  function run() {
    if (!theme.value.trim()) { toast("Isi tema dulu ya.", "error"); $("#cs-theme")?.focus(); return; }
    resultBox.innerHTML = ""; resultBox.appendChild(loadingNode());
    setTimeout(() => {
      last = generatePalette({ theme: theme.value, style: style.value, scheme: scheme.value });
      resultBox.innerHTML = "";
      resultBox.append(
        el("div", { class: "row-between" }, [
          el("div", {}, [el("div", { class: "section-label", text: `${last.scheme} · ${last.style}` }), el("h3", { text: `Palet "${last.theme}"` })]),
          el("div", { style: "display:flex;gap:8px" }, [
            el("button", { class: "btn btn--ghost btn--sm", type: "button", html: iconCopy() + "<span>Salin Semua</span>", onClick: () => copyText(last.colors.map((c) => c.hex).join(", "), "Semua warna disalin") }),
            saveBtn(() => ({ type: "Palette", title: `Palet: ${last.theme}`, payload: last })),
          ]),
        ]),
      );
      const row = el("div", { class: "swatch-row mt-12" });
      last.colors.forEach((c) => {
        row.appendChild(el("div", { class: "swatch", onClick: () => copyText(c.hex, `${c.hex} disalin`), title: "Klik untuk menyalin" }, [
          el("div", { class: "swatch__color", style: `background:${c.hex}` }),
          el("div", { class: "swatch__meta" }, [
            el("div", {}, [el("div", { class: "swatch__hex", text: c.hex }), el("div", { class: "swatch__copy", text: c.role })]),
            el("span", { class: "swatch__copy", html: iconCopy() }),
          ]),
        ]));
      });
      resultBox.appendChild(row);
    }, 400);
  }
}

/* =========================================================
   TYPOGRAPHY STUDIO
   ========================================================= */
export function TypographyStudio() {
  const page = el("div", { class: "page" });
  page.append(pageHead("Typography Studio", "Pasangan Font yang Pas", "Pilih gaya desain untuk mendapatkan rekomendasi pasangan font beserta panduan ukuran."));

  const theme = { value: "" };
  const style = { value: "minimalis" };
  const resultBox = el("div", { class: "result" }, [emptyResult("Rekomendasi font akan muncul di sini.")]);
  let last = null;

  const form = el("div", { class: "card" }, [
    el("div", { class: "field" }, [
      el("label", { for: "ty-theme", text: "Tema (opsional)" }),
      el("input", { id: "ty-theme", type: "text", placeholder: "mis. brand kopi, poster event", onInput: (e) => (theme.value = e.target.value) }),
    ]),
    el("div", { class: "field" }, [el("label", { text: "Gaya desain" }), styleChips(style)]),
    el("button", { class: "btn btn--block", type: "button", html: `<span>Rekomendasikan Font</span>` + iconArrow(), onClick: run }),
    el("p", { class: "hint mt-12", text: "Nama font merujuk pada koleksi umum (mis. Google Fonts) agar mudah diterapkan." }),
  ]);
  const panel = el("div", { class: "card" }, [resultBox]);
  page.appendChild(el("div", { class: "split" }, [form, panel]));
  // auto-run with default style for immediate feedback
  setTimeout(run, 0);
  return page;

  function run() {
    last = generateTypography({ theme: theme.value, style: style.value });
    resultBox.innerHTML = "";
    resultBox.append(
      el("div", { class: "row-between" }, [
        el("div", {}, [el("div", { class: "section-label", text: `Gaya: ${last.style}` }), el("h3", { text: "2 Rekomendasi Pasangan" })]),
        saveBtn(() => ({ type: "Typography", title: `Font: ${last.style}`, payload: last })),
      ]),
    );
    const stack = el("div", { class: "stack mt-12" });
    last.pairs.forEach((p) => {
      stack.appendChild(el("div", { class: "font-pair" }, [
        el("div", { class: "font-pair__preview" }, [
          el("div", { class: "font-pair__head", style: `font-family:'${p.head}',var(--font-display)`, text: p.head }),
          el("div", { class: "font-pair__body", style: `font-family:'${p.body}',var(--font-body)`, text: `Body: ${p.body} — ${p.note}` }),
        ]),
        el("div", { class: "pill-row" }, [
          el("span", { class: "pill", text: `Heading: ${p.head}` }),
          el("span", { class: "pill", text: `Body: ${p.body}` }),
          el("span", { class: "pill", text: p.headSizes }),
          el("span", { class: "pill", text: p.bodySizes }),
          el("button", { class: "chip", type: "button", html: iconCopy() + ` Salin`, onClick: () => copyText(`Heading: ${p.head} / Body: ${p.body}`, "Pasangan font disalin") }),
        ]),
      ]));
    });
    resultBox.appendChild(stack);
  }
}

/* =========================================================
   MY PROJECTS
   ========================================================= */
export function Projects() {
  const page = el("div", { class: "page" });
  page.append(pageHead("My Projects", "Proyek Tersimpan", "Semua ide, palet, dan konsep yang kamu simpan tersedia di sini (tersimpan di perangkat ini)."));

  const container = el("div", {});
  page.appendChild(container);
  renderList();
  return page;

  function renderList() {
    container.innerHTML = "";
    const list = store.all();
    if (!list.length) {
      container.appendChild(el("div", { class: "empty-state" }, [
        el("div", { html: `<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>` }),
        el("h3", { text: "Belum ada proyek" }),
        el("p", { class: "muted mt-12", text: "Buat sesuatu di AI Workspace lalu klik Simpan Proyek." }),
        el("a", { class: "btn mt-20", href: "#/workspace", html: `<span>Mulai Berkarya</span>` + iconArrow() }),
      ]));
      return;
    }

    container.appendChild(el("div", { class: "row-between", style: "margin-bottom:18px" }, [
      el("span", { class: "muted", text: `${list.length} proyek tersimpan` }),
      el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Hapus Semua", onClick: () => {
        if (confirm("Hapus semua proyek tersimpan? Tindakan ini tidak bisa dibatalkan.")) { store.clear(); toast("Semua proyek dihapus"); renderList(); }
      }}),
    ]));

    const grid = el("div", { class: "projects-grid" });
    list.forEach((p) => grid.appendChild(projectCard(p, renderList)));
    container.appendChild(grid);
  }
}

function projectCard(p, onChange) {
  const summary = summarize(p);
  return el("div", { class: "card card--hover project-card" }, [
    el("div", { class: "row-between" }, [
      el("span", { class: "project-card__type", text: p.type }),
      el("span", { class: "project-card__date", text: formatDate(p.createdAt) }),
    ]),
    el("h3", { text: p.title, style: "font-size:1.1rem" }),
    el("div", { class: "project-card__body", html: summary }),
    el("div", { class: "project-card__actions" }, [
      el("button", { class: "btn btn--ghost btn--sm", type: "button", html: iconCopy() + "<span>Salin</span>", onClick: () => copyText(toPlainText(p), "Isi proyek disalin") }),
      el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Hapus", onClick: () => {
        if (confirm(`Hapus "${p.title}"?`)) { store.remove(p.id); toast("Proyek dihapus"); onChange(); }
      }}),
    ]),
  ]);
}

function summarize(p) {
  const d = p.payload || {};
  switch (p.type) {
    case "Idea": return `<p class="muted">${(d.ideas || []).slice(0, 3).map((i) => "• " + escapeHtml(i.title)).join("<br>")}</p>`;
    case "Poster": return `<p class="muted">Slogan: “${escapeHtml(d.slogan || "")}”<br>Audiens: ${escapeHtml(d.audience || "")}</p>`;
    case "Palette": {
      const sw = (d.colors || []).map((c) => `<span style="display:inline-block;width:22px;height:22px;border-radius:5px;background:${c.hex};margin-right:4px"></span>`).join("");
      return `<div>${sw}</div>`;
    }
    case "Typography": return `<p class="muted">${(d.pairs || []).map((x) => escapeHtml(`${x.head} / ${x.body}`)).join("<br>")}</p>`;
    case "Brief": return `<p class="muted">${escapeHtml((d.objective || "").slice(0, 120))}…</p>`;
    case "Moodboard": return `<p class="muted">${(d.keywords || []).map(escapeHtml).join(", ")}</p>`;
    case "Prompt": return `<p class="muted">${escapeHtml((d.prompt || "").slice(0, 130))}…</p>`;
    default: return `<p class="muted">Proyek tersimpan.</p>`;
  }
}

function toPlainText(p) {
  const d = p.payload || {};
  switch (p.type) {
    case "Idea": return `${p.title}\n` + (d.ideas || []).map((i, n) => `${n + 1}. ${i.title}\n   ${i.desc}`).join("\n");
    case "Poster": return `${p.title}\nSlogan: ${d.slogan}\nAudiens: ${d.audience}\nCTA: ${d.cta}\nLayout: ${d.layout}\nPalet: ${(d.palette || []).join(", ")}`;
    case "Palette": return `${p.title}\n` + (d.colors || []).map((c) => `${c.role}: ${c.hex}`).join("\n");
    case "Typography": return `${p.title}\n` + (d.pairs || []).map((x) => `${x.head} / ${x.body} — ${x.note}`).join("\n");
    case "Brief": return briefToText(d);
    case "Moodboard": return `${p.title}\nKata kunci: ${(d.keywords || []).join(", ")}\nPalet: ${(d.palette || []).join(", ")}`;
    case "Prompt": return `${p.title}\nPrompt: ${d.prompt}\nNegative: ${d.negative}`;
    default: return p.title;
  }
}

/* =========================================================
   ABOUT
   ========================================================= */
export function About() {
  const page = el("div", { class: "page" });
  page.append(pageHead("About", "Partner Kreatif untuk DKV", "GrafikAI dibuat untuk mendampingi siswa dan desainer Desain Komunikasi Visual."));

  page.append(
    el("div", { class: "stack" }, [
      el("div", { class: "card" }, [
        el("h3", { text: "Kenapa GrafikAI?" }),
        el("p", { class: "muted mt-12", text: "Mencari ide dari nol itu melelahkan. GrafikAI mempercepat tahap awal berkarya — brainstorming, konsep, palet, tipografi — supaya kamu punya lebih banyak waktu untuk menyempurnakan karya. AI di sini adalah partner, bukan pengganti kreativitasmu." }),
      ]),
      el("div", { class: "feature-grid" }, [
        valueCard("Membantu, bukan menggantikan", "Hasil GrafikAI adalah titik awal. Keputusan desain tetap di tanganmu."),
        valueCard("Ramah pemula", "Istilah dijelaskan sederhana, cocok untuk siswa DKV yang baru belajar."),
        valueCard("Berbasis input kamu", "Setiap hasil dibentuk dari tema dan gaya yang kamu pilih, bukan acak."),
        valueCard("Mode demo transparan", "Tanpa AI API eksternal, hasil adalah simulasi lokal yang realistis dan jelas ditandai."),
      ]),
      el("div", { class: "card" }, [
        el("h3", { text: "Catatan teknis" }),
        el("p", { class: "muted mt-12", text: "Aplikasi ini berjalan sepenuhnya di browser. Proyek disimpan di localStorage perangkatmu. Bila nanti tersedia AI API, modul generator dapat dihubungkan tanpa mengubah antarmuka." }),
        el("a", { class: "btn mt-20", href: "#/workspace", html: `<span>Coba Sekarang</span>` + iconArrow() }),
      ]),
    ]),
  );
  return page;

  function valueCard(title, desc) {
    return el("div", { class: "card card--hover feature-card" }, [
      el("div", { class: "feature-card__icon", html: FEATURE_ICONS.idea }),
      el("h3", { text: title, style: "font-size:1.1rem" }),
      el("p", { text: desc }),
    ]);
  }
}
