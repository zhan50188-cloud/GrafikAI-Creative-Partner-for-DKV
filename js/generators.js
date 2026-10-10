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

// map a theme/style to a base hue + harmony scheme
function baseHueFor(theme, sKey) {
  const map = {
    futuristik: 265, elegan: 280, retro: 28, "pop-art": 350,
    natural: 120, minimalis: 210, brutalis: 0,
  };
  if (map[sKey] != null) return map[sKey];
  // derive hue from theme string
  let h = 0; const t = (theme || "x").toLowerCase();
  for (let i = 0; i < t.length; i++) h = (h + t.charCodeAt(i) * 7) % 360;
  return h;
}

export function generatePalette(input) {
  const theme = (input.theme || "desain").trim();
  const sKey = styleOf(input);
  const scheme = input.scheme || seededPick(["analogous", "complementary", "triadic", "monochrome"], theme);
  const base = baseHueFor(theme, sKey);

  let hues;
  switch (scheme) {
    case "complementary": hues = [base, base, (base + 180) % 360, (base + 180) % 360, base]; break;
    case "triadic":       hues = [base, (base + 120) % 360, (base + 240) % 360, base, (base + 120) % 360]; break;
    case "monochrome":    hues = [base, base, base, base, base]; break;
    default:              hues = [base, (base + 25) % 360, (base + 50) % 360, (base - 25 + 360) % 360, (base + 12) % 360]; // analogous
  }
  const sats = [70, 55, 80, 45, 30];
  const lts  = [22, 42, 55, 70, 88];

  const colors = hues.map((h, i) => {
    const hex = hslToHex(h, sats[i], lts[i]);
    return { hex, role: ["Primary", "Secondary", "Accent", "Muted", "Base"][i] };
  });

  return { theme, style: sKey, scheme, colors };
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
