// generators.js — demo-mode creative engine.
// All output is simulated locally and shaped to be relevant to user input.

import { pick, shuffle, seededPick } from "./core.js";

/* =========================================================
   Shared vocab
   ========================================================= */
const STYLES = {
  minimalis:   { adj: ["bersih", "lega", "fungsional", "tenang"], visual: "ruang kosong luas, grid rapi, tipografi tegas" },
  retro:       { adj: ["nostalgik", "hangat", "nyentrik", "playful"], visual: "warna pudar, tekstur grain, bentuk geometris 70-an" },
  futuristik:  { adj: ["modern", "berani", "teknologis", "dinamis"], visual: "gradient neon, garis tajam, efek glow dan motion" },
  elegan:      { adj: ["mewah", "halus", "premium", "berkelas"], visual: "kontras emas-gelap, serif tipis, komposisi simetris" },
  "pop-art":   { adj: ["ceria", "ekspresif", "mencolok", "berani"], visual: "warna primer, outline tebal, halftone, komik" },
  natural:     { adj: ["organik", "earthy", "ramah", "lembut"], visual: "palet tanah, tekstur kertas, ilustrasi tangan" },
  brutalis:    { adj: ["mentah", "jujur", "eksperimental", "tegas"], visual: "tipografi raksasa, grid patah, kontras ekstrem" },
};
const STYLE_KEYS = Object.keys(STYLES);

const AUDIENCES = [
  "remaja usia 15–22 tahun yang aktif di media sosial",
  "mahasiswa dan komunitas kreatif urban",
  "profesional muda yang menghargai desain fungsional",
  "keluarga dan masyarakat umum lintas usia",
  "penggemar seni dan budaya lokal",
  "pelaku UMKM dan wirausaha kecil",
];

const TONES = ["inspiratif", "berani", "ramah", "edukatif", "persuasif", "nostalgik", "optimistis"];

function styleOf(input) {
  const key = (input.style || "").toLowerCase();
  return STYLES[key] ? key : seededPick(STYLE_KEYS, input.theme || "x");
}

/* =========================================================
   1. Idea Generator
   ========================================================= */
const IDEA_FORMATS = [
  "Serial poster", "Kampanye Instagram carousel", "Motion graphic pendek", "Zine cetak",
  "Branding kit", "Infografik interaktif", "Ilustrasi editorial", "Packaging konsep",
  "Mural / wall graphic", "Sticker pack", "Micro-site visual", "Visual identity event",
];
const IDEA_ANGLES = [
  "mengangkat sisi emosional dari {t}",
  "menggunakan metafora visual dari {t}",
  "memadukan {t} dengan budaya lokal Indonesia",
  "menyoroti kontras lama vs baru pada {t}",
  "pendekatan storytelling tiga babak tentang {t}",
  "eksperimen tipografi sebagai elemen utama {t}",
  "memanfaatkan data/statistik {t} jadi visual",
  "bermain dengan skala & perspektif pada {t}",
];

export function generateIdeas(input) {
  const theme = (input.theme || "ide kreatif").trim();
  const sKey = styleOf(input);
  const style = STYLES[sKey];
  const formats = shuffle(IDEA_FORMATS).slice(0, 6);
  const angles = shuffle(IDEA_ANGLES).slice(0, 6);
  const ideas = formats.map((fmt, i) => {
    const angle = angles[i % angles.length].replace("{t}", theme);
    const adj = pick(style.adj);
    return {
      title: `${fmt} bertema "${theme}"`,
      desc: `Konsep ${adj} bergaya ${sKey} yang ${angle}. Visual kunci: ${style.visual}.`,
    };
  });
  return { theme, style: sKey, ideas };
}

/* =========================================================
   2. Poster Concept Maker
   ========================================================= */
const SLOGAN_TEMPLATES = [
  "{T}, Dimulai dari Kamu",
  "Rasakan {T} dengan Cara Baru",
  "Satu Langkah untuk {T}",
  "{T} Itu Kita",
  "Bersama Wujudkan {T}",
  "Lebih dari Sekadar {T}",
];

export function generatePoster(input) {
  const theme = (input.theme || "Tema Desain").trim();
  const sKey = styleOf(input);
  const style = STYLES[sKey];
  const Title = theme.replace(/\b\w/g, (c) => c.toUpperCase());
  const slogan = pick(SLOGAN_TEMPLATES).replace("{T}", Title);
  const audience = pick(AUDIENCES);
  const tone = pick(TONES);
  const palette = generatePalette({ theme, style: sKey }).colors.map((c) => c.hex);

  const layout = [
    "Headline besar di sepertiga atas, logo di pojok kiri bawah.",
    "Komposisi terpusat (center) dengan subjek utama di tengah dan slogan di bawah.",
    "Grid diagonal dinamis, teks mengikuti arah pandang subjek.",
    "Split layout 60/40: visual di satu sisi, teks di sisi lain.",
    "Full-bleed image dengan overlay gelap dan teks kontras di bagian bawah.",
  ];

  return {
    theme, style: sKey, title: Title, slogan, audience, tone,
    palette,
    layout: pick(layout),
    visualDirection: style.visual,
    cta: pick(["Pelajari Selengkapnya", "Gabung Sekarang", "Kunjungi Kami", "Mulai Hari Ini", "Scan QR di Bawah"]),
    headlineTone: style.adj.join(", "),
  };
}

/* =========================================================
   3. Color Palette Generator (real HSL harmony)
   ========================================================= */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

/* Theme is PRIMARY. Keyword → hue(s) + tone. Style only nudges nuance. */
const COLOR_KEYWORDS = [
  { k: ["senja", "sunset", "matahari terbenam", "sore"], hues: [24, 14, 42], tone: "warm" },
  { k: ["fajar", "sunrise", "pagi", "dawn"], hues: [38, 20, 200], tone: "bright" },
  { k: ["langit", "sky", "awan", "cerah"], hues: [205, 195, 50], tone: "bright" },
  { k: ["pantai", "beach", "laut", "sea", "ocean", "samudra", "air", "water", "biru laut"], hues: [195, 210, 48], tone: "" },
  { k: ["tropis", "tropical", "pulau", "island"], hues: [170, 40, 330], tone: "bright" },
  { k: ["hutan", "forest", "daun", "leaf", "alam", "nature", "taman", "tumbuhan"], hues: [130, 95, 40], tone: "" },
  { k: ["gunung", "mountain", "batu", "stone", "tanah", "earth", "pasir", "sand", "gurun", "desert"], hues: [32, 45, 200], tone: "muted" },
  { k: ["bunga", "flower", "floral", "mawar", "rose"], hues: [340, 300, 95], tone: "bright" },
  { k: ["api", "fire", "lava", "panas", "flame", "membara"], hues: [10, 28, 45], tone: "warm" },
  { k: ["musim gugur", "autumn", "gugur", "maple"], hues: [24, 36, 10], tone: "warm" },
  { k: ["teknologi", "technology", "tech", "digital", "cyber", "ai", "robot", "data", "elektronik"], hues: [215, 265, 185], tone: "" },
  { k: ["neon", "gaming", "game", "esports", "futuristik"], hues: [285, 190, 330], tone: "bright" },
  { k: ["luar angkasa", "space", "galaksi", "galaxy", "kosmik", "cosmic", "malam", "night"], hues: [250, 220, 285], tone: "dark" },
  { k: ["kopi", "coffee", "cokelat", "chocolate", "kayu", "wood"], hues: [25, 18, 35], tone: "muted" },
  { k: ["teh", "tea", "matcha"], hues: [95, 70, 45], tone: "muted" },
  { k: ["buah", "fruit", "jeruk", "orange", "citrus", "mangga"], hues: [35, 48, 95], tone: "bright" },
  { k: ["anggur", "wine", "grape", "berry"], hues: [330, 290, 350], tone: "dark" },
  { k: ["mewah", "luxury", "premium", "emas", "gold", "elegan"], hues: [43, 280, 30], tone: "dark" },
  { k: ["cinta", "love", "romantis", "romantic", "valentine"], hues: [345, 330, 15], tone: "" },
  { k: ["anak", "kids", "ceria", "playful", "fun", "mainan"], hues: [48, 200, 340], tone: "bright" },
  { k: ["sehat", "health", "medis", "medical", "segar", "fresh"], hues: [160, 195, 95], tone: "bright" },
  { k: ["musik", "music", "konser", "concert", "festival"], hues: [290, 330, 45], tone: "bright" },
  { k: ["olahraga", "sport", "energi", "energy", "dinamis"], hues: [350, 210, 48], tone: "bright" },
  { k: ["minimalis", "clean", "bersih", "tenang", "calm"], hues: [210, 200, 190], tone: "muted" },
  { k: ["vintage", "retro", "klasik", "jadul", "nostalgia"], hues: [30, 180, 350], tone: "muted" },
];

function themeHues(theme) {
  const t = (theme || "").toLowerCase();
  let collected = [], tones = [], matched = false;
  for (const entry of COLOR_KEYWORDS) {
    if (entry.k.some((kw) => t.includes(kw))) {
      matched = true;
      collected = collected.concat(entry.hues);
      if (entry.tone) tones.push(entry.tone);
    }
  }
  if (!matched) {
    let h = 0;
    for (let c = 0; c < t.length; c++) h = (h + t.charCodeAt(c) * 13 + c * 7) % 360;
    if (!t.length) h = Math.floor(Math.random() * 360);
    collected = [h, (h + 30) % 360, (h + 330) % 360];
  }
  return { hues: collected, tones, matched };
}

const STYLE_COLOR_BIAS = {
  minimalis:  { satMul: 0.6, light: +8 },
  retro:      { satMul: 0.8, light: +4, hueShift: -6 },
  futuristik: { satMul: 1.15, light: -6 },
  elegan:     { satMul: 0.85, light: -10 },
  "pop-art":  { satMul: 1.3, light: +2 },
  natural:    { satMul: 0.7, light: +2, hueShift: +4 },
  brutalis:   { satMul: 1.1, light: -4, contrast: true },
};

const clampHue = (h) => ((h % 360) + 360) % 360;
const clamp255 = (v) => Math.max(0, Math.min(100, v));
function rand(seed, salt) { const x = Math.sin((seed + 1) * 97.13 + salt * 31.7) * 43758.5453; return x - Math.floor(x); }

function schemeHues(base, scheme) {
  base = clampHue(base);
  switch (scheme) {
    case "complementary": return [base, base, clampHue(base + 180), clampHue(base + 180), base];
    case "triadic":       return [base, clampHue(base + 120), clampHue(base + 240), clampHue(base + 120), clampHue(base + 240)];
    case "monochrome":    return [base, base, base, base, base];
    default:              return [base, clampHue(base + 22), clampHue(base + 44), clampHue(base - 20), clampHue(base + 11)];
  }
}

export function generatePalette(input) {
  const theme = (input.theme || "desain").trim();
  const sKey = styleOf(input);
  const scheme = input.scheme || seededPick(["analogous", "complementary", "triadic", "monochrome"], theme);

  const info = themeHues(theme);
  const bias = STYLE_COLOR_BIAS[sKey] || { satMul: 1, light: 0 };
  const variant = input.variant != null ? input.variant : Math.floor(Math.random() * 1000);

  const hueList = info.hues;
  const baseHue = clampHue(hueList[variant % hueList.length] + (bias.hueShift || 0) + (rand(variant, 1) * 10 - 5));

  const hues = schemeHues(baseHue, scheme);
  if ((scheme === "analogous" || scheme === "triadic") && hueList.length > 1) {
    hues[2] = clampHue(hueList[(variant + 1) % hueList.length] + (bias.hueShift || 0));
    if (hueList.length > 2) hues[1] = clampHue(hueList[(variant + 2) % hueList.length]);
  }

  const tone = info.tones.length ? info.tones[variant % info.tones.length] : "";
  let satShift = 0, lightShift = 0, dark = false;
  if (tone === "warm") satShift = 8;
  else if (tone === "bright") { satShift = 12; lightShift = 4; }
  else if (tone === "muted") satShift = -18;
  else if (tone === "dark") { lightShift = -12; dark = true; }

  const baseSat = [74, 58, 84, 46, 28];
  let baseLt = dark ? [30, 46, 58, 70, 16] : [26, 44, 56, 72, 92];
  if (bias.contrast) baseLt = [14, 40, 58, 78, 96];

  const roles = ["Primary", "Secondary", "Accent", "Muted", "Base"];
  const colors = hues.map((h, i) => {
    let s = clamp255(baseSat[i] * (bias.satMul || 1) + satShift + (rand(variant, i + 2) * 10 - 5));
    let l = clamp255(baseLt[i] + (bias.light || 0) + lightShift + (rand(variant, i + 7) * 8 - 4));
    if (scheme === "monochrome") {
      s = clamp255(30 + i * 14 + satShift * 0.5);
      l = clamp255((dark ? [18, 32, 48, 64, 82] : [20, 38, 54, 72, 90])[i] + (bias.light || 0));
    }
    return { hex: hslToHex(h, s, l), role: roles[i] };
  });

  return { theme, style: sKey, scheme, variant, matched: info.matched, colors };
}

/* =========================================================
   4. Typography Assistant
   ========================================================= */
const FONT_PAIRS = {
  minimalis:  [{ head: "Inter", body: "Inter", note: "Satu keluarga, beda bobot — sangat bersih." }, { head: "Helvetica Neue", body: "Georgia", note: "Sans tegas + serif untuk keterbacaan." }],
  elegan:     [{ head: "Playfair Display", body: "Lato", note: "Serif mewah + sans netral." }, { head: "Cormorant Garamond", body: "Montserrat", note: "Serif tipis klasik + sans modern." }],
  futuristik: [{ head: "Space Grotesk", body: "Inter", note: "Geometris + netral, kesan teknologis." }, { head: "Orbitron", body: "Rajdhani", note: "Techno display + sans ramping." }],
  retro:      [{ head: "Righteous", body: "Nunito", note: "Display bulat 70-an + body ramah." }, { head: "Pacifico", body: "Work Sans", note: "Script santai + sans bersih." }],
  "pop-art":  [{ head: "Bungee", body: "Poppins", note: "Display tebal mencolok + sans friendly." }, { head: "Luckiest Guy", body: "Open Sans", note: "Komik + body netral." }],
  natural:    [{ head: "Fraunces", body: "Karla", note: "Serif organik + grotesque hangat." }, { head: "Bitter", body: "Source Sans Pro", note: "Slab serif + sans lembut." }],
  brutalis:   [{ head: "Archivo Black", body: "IBM Plex Mono", note: "Grotesque berat + monospace mentah." }, { head: "Anton", body: "Roboto Mono", note: "Display sempit + mono." }],
};

export function generateTypography(input) {
  const sKey = styleOf(input);
  const theme = (input.theme || "desain").trim();
  const pairs = FONT_PAIRS[sKey] || FONT_PAIRS.minimalis;
  return {
    theme, style: sKey,
    pairs: pairs.map((p) => ({
      ...p,
      headSizes: "Headline 48–72px · Subhead 24–32px",
      bodySizes: "Body 16–18px · Caption 12–14px",
    })),
  };
}

/* =========================================================
   5. Design Brief Generator
   ========================================================= */
export function generateBrief(input) {
  const theme = (input.theme || "proyek desain").trim();
  const sKey = styleOf(input);
  const style = STYLES[sKey];
  const audience = input.audience?.trim() || pick(AUDIENCES);
  const tone = pick(TONES);
  const deliverable = input.deliverable?.trim() || pick(IDEA_FORMATS);

  return {
    theme, style: sKey,
    objective: `Menciptakan ${deliverable.toLowerCase()} yang mengomunikasikan "${theme}" secara ${tone} dan mudah diingat.`,
    audience,
    keyMessage: `"${theme}" relevan, bernilai, dan layak diperhatikan oleh audiens.`,
    visualStyle: `Gaya ${sKey} — ${style.adj.join(", ")}. ${style.visual}.`,
    tone,
    deliverable,
    successMetric: pick([
      "Peningkatan awareness & engagement di media sosial",
      "Pesan utama dapat diingat dalam 5 detik pertama",
      "Konsistensi visual di seluruh touchpoint",
      "Respon positif dari target audiens saat uji coba",
    ]),
    doDont: {
      do: ["Jaga hierarki visual yang jelas", "Konsisten dengan palet & tipografi", "Prioritaskan keterbacaan"],
      dont: ["Hindari elemen berlebihan", "Jangan campur terlalu banyak gaya", "Hindari teks terlalu kecil"],
    },
  };
}

/* =========================================================
   6. Creative Moodboard
   ========================================================= */
export function generateMoodboard(input) {
  const sKey = styleOf(input);
  const theme = (input.theme || "desain").trim();
  const palette = generatePalette({ theme, style: sKey }).colors.map((c) => c.hex);
  const keywords = {
    minimalis: ["negative space", "grid", "mono", "clean"],
    elegan: ["luxury", "serif", "gold accent", "symmetry"],
    futuristik: ["neon", "glow", "motion", "cyber"],
    retro: ["grain", "vintage", "warm", "geometric"],
    "pop-art": ["halftone", "bold outline", "primary", "comic"],
    natural: ["earth tone", "paper", "organic", "handmade"],
    brutalis: ["raw", "giant type", "contrast", "broken grid"],
  }[sKey] || ["concept", "visual", "mood", "style"];

  // Build gradient-based tiles (deterministic feel per theme)
  const tiles = [];
  for (let i = 0; i < 8; i++) {
    const c1 = palette[i % palette.length];
    const c2 = palette[(i + 2) % palette.length];
    const ang = (i * 47) % 360;
    tiles.push({
      gradient: `linear-gradient(${ang}deg, ${c1}, ${c2})`,
      label: i < keywords.length ? keywords[i] : "",
      tall: i === 1 || i === 4,
    });
  }
  return { theme, style: sKey, tiles, keywords, palette };
}

/* =========================================================
   7. Prompt Generator (for AI image tools)
   ========================================================= */
export function generatePrompt(input) {
  const theme = (input.theme || "creative concept").trim();
  const sKey = styleOf(input);
  const style = STYLES[sKey];
  const subject = input.subject?.trim() || theme;
  const mood = pick(TONES);
  const palette = generatePalette({ theme, style: sKey }).colors.slice(0, 3).map((c) => c.hex).join(", ");

  const camera = pick(["isometric view", "flat lay top-down", "close-up macro", "wide establishing shot", "dynamic low angle"]);
  const render = pick(["highly detailed", "clean vector style", "editorial poster style", "soft studio lighting", "high contrast"]);

  const prompt =
`${subject}, ${sKey} design style, ${style.visual}, ${mood} mood, ` +
`color palette ${palette}, ${camera}, ${render}, ` +
`balanced composition, graphic design, high quality, 4k`;

  const negative = "blurry, low quality, watermark, distorted text, cluttered, extra limbs";

  return { theme, style: sKey, subject, prompt, negative };
}

export { STYLE_KEYS };
