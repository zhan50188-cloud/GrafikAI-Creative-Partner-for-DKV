/* ============================================================
   GrafikAI — bundled build (classic script, runs from file://)
   This is a concatenation of the modular source in /js:
     core.js, generators.js, pages.js, app.js
   For development, edit the module files; this bundle mirrors them.
   ============================================================ */
(function () {
  "use strict";

  /* ===================== core.js ===================== */
  function el(tag, attrs, children) {
    attrs = attrs || {}; children = children == null ? [] : children;
    var node = document.createElement(tag);
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v == null) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k.indexOf("on") === 0 && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "dataset") Object.assign(node.dataset, v);
      else node.setAttribute(k, v);
    }
    var list = [].concat(children);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  var toastTimer = null;
  function toast(message, type) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = message;
    t.style.borderColor = type === "error" ? "#f87171" : "var(--purple)";
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function copyText(text, successMsg) {
    successMsg = successMsg || "Disalin ke clipboard";
    return new Promise(function (resolve) {
      function fallback() {
        try {
          var ta = document.createElement("textarea");
          ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          var ok = document.execCommand("copy");
          document.body.removeChild(ta);
          if (!ok) throw new Error("execCommand failed");
          toast(successMsg); resolve(true);
        } catch (e) { toast("Gagal menyalin. Salin manual: " + text, "error"); resolve(false); }
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { toast(successMsg); resolve(true); }, fallback);
      } else { fallback(); }
    });
  }

  var PROJECTS_KEY = "grafikai.projects.v1";
  var store = {
    all: function () {
      try {
        var raw = localStorage.getItem(PROJECTS_KEY);
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Store read error:", e);
        toast("Data proyek rusak, memulai ulang penyimpanan.", "error");
        return [];
      }
    },
    save: function (project) {
      try {
        var list = store.all();
        var record = {
          id: project.id || "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          createdAt: project.createdAt || Date.now(),
          type: project.type || "Project",
          title: project.title || "Untitled",
          payload: project.payload || {}
        };
        var idx = -1;
        for (var i = 0; i < list.length; i++) { if (list[i].id === record.id) { idx = i; break; } }
        if (idx >= 0) list[idx] = record; else list.unshift(record);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
        return record;
      } catch (e) {
        console.error("Store save error:", e);
        toast("Gagal menyimpan proyek (storage penuh atau tidak tersedia).", "error");
        return null;
      }
    },
    remove: function (id) {
      try {
        var list = store.all().filter(function (p) { return p.id !== id; });
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
        return true;
      } catch (e) { console.error(e); toast("Gagal menghapus proyek.", "error"); return false; }
    },
    clear: function () { try { localStorage.removeItem(PROJECTS_KEY); return true; } catch (e) { return false; } }
  };

  function formatDate(ts) {
    try {
      return new Date(ts).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return "-"; }
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function seededPick(arr, seed, salt) {
    salt = salt || 0;
    var h = 2166136261 ^ salt;
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return arr[Math.abs(h) % arr.length];
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ===================== generators.js ===================== */
  var STYLES = {
    minimalis:   { adj: ["bersih", "lega", "fungsional", "tenang"], visual: "ruang kosong luas, grid rapi, tipografi tegas" },
    retro:       { adj: ["nostalgik", "hangat", "nyentrik", "playful"], visual: "warna pudar, tekstur grain, bentuk geometris 70-an" },
    futuristik:  { adj: ["modern", "berani", "teknologis", "dinamis"], visual: "gradient neon, garis tajam, efek glow dan motion" },
    elegan:      { adj: ["mewah", "halus", "premium", "berkelas"], visual: "kontras emas-gelap, serif tipis, komposisi simetris" },
    "pop-art":   { adj: ["ceria", "ekspresif", "mencolok", "berani"], visual: "warna primer, outline tebal, halftone, komik" },
    natural:     { adj: ["organik", "earthy", "ramah", "lembut"], visual: "palet tanah, tekstur kertas, ilustrasi tangan" },
    brutalis:    { adj: ["mentah", "jujur", "eksperimental", "tegas"], visual: "tipografi raksasa, grid patah, kontras ekstrem" }
  };
  var STYLE_KEYS = Object.keys(STYLES);

  var AUDIENCES = [
    "remaja usia 15–22 tahun yang aktif di media sosial",
    "mahasiswa dan komunitas kreatif urban",
    "profesional muda yang menghargai desain fungsional",
    "keluarga dan masyarakat umum lintas usia",
    "penggemar seni dan budaya lokal",
    "pelaku UMKM dan wirausaha kecil"
  ];
  var TONES = ["inspiratif", "berani", "ramah", "edukatif", "persuasif", "nostalgik", "optimistis"];

  function styleOf(input) {
    var key = (input.style || "").toLowerCase();
    return STYLES[key] ? key : seededPick(STYLE_KEYS, input.theme || "x");
  }

  var IDEA_FORMATS = [
    "Serial poster", "Kampanye Instagram carousel", "Motion graphic pendek", "Zine cetak",
    "Branding kit", "Infografik interaktif", "Ilustrasi editorial", "Packaging konsep",
    "Mural / wall graphic", "Sticker pack", "Micro-site visual", "Visual identity event"
  ];
  var IDEA_ANGLES = [
    "mengangkat sisi emosional dari {t}",
    "menggunakan metafora visual dari {t}",
    "memadukan {t} dengan budaya lokal Indonesia",
    "menyoroti kontras lama vs baru pada {t}",
    "pendekatan storytelling tiga babak tentang {t}",
    "eksperimen tipografi sebagai elemen utama {t}",
    "memanfaatkan data/statistik {t} jadi visual",
    "bermain dengan skala & perspektif pada {t}"
  ];

  function generateIdeas(input) {
    var theme = (input.theme || "ide kreatif").trim();
    var sKey = styleOf(input);
    var style = STYLES[sKey];
    var formats = shuffle(IDEA_FORMATS).slice(0, 6);
    var angles = shuffle(IDEA_ANGLES).slice(0, 6);
    var ideas = formats.map(function (fmt, i) {
      var angle = angles[i % angles.length].replace("{t}", theme);
      var adj = pick(style.adj);
      return {
        title: fmt + ' bertema "' + theme + '"',
        desc: "Konsep " + adj + " bergaya " + sKey + " yang " + angle + ". Visual kunci: " + style.visual + "."
      };
    });
    return { theme: theme, style: sKey, ideas: ideas };
  }

  var SLOGAN_TEMPLATES = [
    "{T}, Dimulai dari Kamu", "Rasakan {T} dengan Cara Baru", "Satu Langkah untuk {T}",
    "{T} Itu Kita", "Bersama Wujudkan {T}", "Lebih dari Sekadar {T}"
  ];

  function generatePoster(input) {
    var theme = (input.theme || "Tema Desain").trim();
    var sKey = styleOf(input);
    var style = STYLES[sKey];
    var Title = theme.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var slogan = pick(SLOGAN_TEMPLATES).replace("{T}", Title);
    var audience = pick(AUDIENCES);
    var tone = pick(TONES);
    var palette = generatePalette({ theme: theme, style: sKey }).colors.map(function (c) { return c.hex; });
    var layout = [
      "Headline besar di sepertiga atas, logo di pojok kiri bawah.",
      "Komposisi terpusat (center) dengan subjek utama di tengah dan slogan di bawah.",
      "Grid diagonal dinamis, teks mengikuti arah pandang subjek.",
      "Split layout 60/40: visual di satu sisi, teks di sisi lain.",
      "Full-bleed image dengan overlay gelap dan teks kontras di bagian bawah."
    ];
    return {
      theme: theme, style: sKey, title: Title, slogan: slogan, audience: audience, tone: tone,
      palette: palette, layout: pick(layout), visualDirection: style.visual,
      cta: pick(["Pelajari Selengkapnya", "Gabung Sekarang", "Kunjungi Kami", "Mulai Hari Ini", "Scan QR di Bawah"]),
      headlineTone: style.adj.join(", ")
    };
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    var toHex = function (x) { return Math.round(255 * x).toString(16).padStart(2, "0"); };
    return ("#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4))).toUpperCase();
  }
  /* ---------- Color keyword knowledge base ----------
     Theme is the PRIMARY driver. Each keyword maps to one or more hues
     (so multi-word themes like "senja pantai" blend warm sunset + sea blue),
     plus optional saturation/lightness bias ("warm/bright/muted/dark"). */
  var COLOR_KEYWORDS = [
    // sunset / sky / warmth
    { k: ["senja", "sunset", "matahari terbenam", "sore"], hues: [24, 14, 42], tone: "warm" },
    { k: ["fajar", "sunrise", "pagi", "dawn"], hues: [38, 20, 200], tone: "bright" },
    { k: ["langit", "sky", "awan", "cerah"], hues: [205, 195, 50], tone: "bright" },
    // sea / water
    { k: ["pantai", "beach", "laut", "sea", "ocean", "samudra", "air", "water", "biru laut"], hues: [195, 210, 48], tone: "" },
    { k: ["tropis", "tropical", "pulau", "island"], hues: [170, 40, 330], tone: "bright" },
    // nature
    { k: ["hutan", "forest", "daun", "leaf", "alam", "nature", "taman", "tumbuhan"], hues: [130, 95, 40], tone: "" },
    { k: ["gunung", "mountain", "batu", "stone", "tanah", "earth", "pasir", "sand", "gurun", "desert"], hues: [32, 45, 200], tone: "muted" },
    { k: ["bunga", "flower", "floral", "mawar", "rose"], hues: [340, 300, 95], tone: "bright" },
    // fire / energy
    { k: ["api", "fire", "lava", "panas", "flame", "membara"], hues: [10, 28, 45], tone: "warm" },
    { k: ["musim gugur", "autumn", "gugur", "maple"], hues: [24, 36, 10], tone: "warm" },
    // tech / future
    { k: ["teknologi", "technology", "tech", "digital", "cyber", "ai", "robot", "data", "elektronik"], hues: [215, 265, 185], tone: "" },
    { k: ["neon", "gaming", "game", "esports", "futuristik"], hues: [285, 190, 330], tone: "bright" },
    { k: ["luar angkasa", "space", "galaksi", "galaxy", "kosmik", "cosmic", "malam", "night"], hues: [250, 220, 285], tone: "dark" },
    // food / drink
    { k: ["kopi", "coffee", "cokelat", "chocolate", "kayu", "wood"], hues: [25, 18, 35], tone: "muted" },
    { k: ["teh", "tea", "matcha"], hues: [95, 70, 45], tone: "muted" },
    { k: ["buah", "fruit", "jeruk", "orange", "citrus", "mangga"], hues: [35, 48, 95], tone: "bright" },
    { k: ["anggur", "wine", "grape", "berry"], hues: [330, 290, 350], tone: "dark" },
    // mood / brand
    { k: ["mewah", "luxury", "premium", "emas", "gold", "elegan"], hues: [43, 280, 30], tone: "dark" },
    { k: ["cinta", "love", "romantis", "romantic", "valentine"], hues: [345, 330, 15], tone: "" },
    { k: ["anak", "kids", "ceria", "playful", "fun", "mainan"], hues: [48, 200, 340], tone: "bright" },
    { k: ["sehat", "health", "medis", "medical", "segar", "fresh"], hues: [160, 195, 95], tone: "bright" },
    { k: ["musik", "music", "konser", "concert", "festival"], hues: [290, 330, 45], tone: "bright" },
    { k: ["olahraga", "sport", "energi", "energy", "dinamis"], hues: [350, 210, 48], tone: "bright" },
    { k: ["minimalis", "clean", "bersih", "tenang", "calm"], hues: [210, 200, 190], tone: "muted" },
    { k: ["vintage", "retro", "klasik", "jadul", "nostalgia"], hues: [30, 180, 350], tone: "muted" }
  ];

  // Find theme hues by scanning keywords; blend multiple matches (multi-word themes).
  function themeHues(theme) {
    var t = (theme || "").toLowerCase();
    var collected = [], tones = [], matched = false;
    for (var i = 0; i < COLOR_KEYWORDS.length; i++) {
      var entry = COLOR_KEYWORDS[i];
      for (var j = 0; j < entry.k.length; j++) {
        if (t.indexOf(entry.k[j]) >= 0) {
          matched = true;
          collected = collected.concat(entry.hues);
          if (entry.tone) tones.push(entry.tone);
          break;
        }
      }
    }
    if (!matched) {
      // Unknown theme: derive a stable-but-themed hue from the text,
      // then build a harmonious spread around it (not a flat default).
      var h = 0;
      for (var c = 0; c < t.length; c++) h = (h + t.charCodeAt(c) * 13 + c * 7) % 360;
      if (!t.length) h = Math.floor(Math.random() * 360);
      collected = [h, (h + 30) % 360, (h + 330) % 360];
    }
    return { hues: collected, tones: tones, matched: matched };
  }

  // Style only NUDGES the palette (saturation/lightness/warmth), never overrides theme.
  var STYLE_COLOR_BIAS = {
    minimalis:  { satMul: 0.6, light: +8, note: "saturasi diturunkan & lebih terang untuk kesan bersih" },
    retro:      { satMul: 0.8, light: +4, hueShift: -6, note: "sedikit pudar & hangat khas retro" },
    futuristik: { satMul: 1.15, light: -6, note: "lebih jenuh & gelap untuk nuansa teknologis" },
    elegan:     { satMul: 0.85, light: -10, note: "lebih dalam & tenang untuk kesan mewah" },
    "pop-art":  { satMul: 1.3, light: +2, note: "saturasi tinggi & mencolok ala pop-art" },
    natural:    { satMul: 0.7, light: +2, hueShift: +4, note: "lebih earthy & lembut" },
    brutalis:   { satMul: 1.1, light: -4, contrast: true, note: "kontras ekstrem & mentah" }
  };

  function clampHue(h) { return ((h % 360) + 360) % 360; }
  function clamp255(v) { return Math.max(0, Math.min(100, v)); }

  // Build the 5 hues for a scheme from a chosen base hue.
  function schemeHues(base, scheme) {
    base = clampHue(base);
    switch (scheme) {
      case "complementary": return [base, base, clampHue(base + 180), clampHue(base + 180), base];
      case "triadic":       return [base, clampHue(base + 120), clampHue(base + 240), clampHue(base + 120), clampHue(base + 240)];
      case "monochrome":    return [base, base, base, base, base];
      default:              return [base, clampHue(base + 22), clampHue(base + 44), clampHue(base - 20), clampHue(base + 11)]; // analogous
    }
  }

  function generatePalette(input) {
    var theme = (input.theme || "desain").trim();
    var sKey = styleOf(input);
    var scheme = input.scheme || seededPick(["analogous", "complementary", "triadic", "monochrome"], theme);

    var info = themeHues(theme);
    var bias = STYLE_COLOR_BIAS[sKey] || { satMul: 1, light: 0 };

    // ----- VARIATION: random each generate, but stays on-theme -----
    // Pick which of the theme's hues becomes the base (rotates through matches),
    // plus small random jitter so repeated presses differ without drifting off-theme.
    var variant = (input.variant != null) ? input.variant : Math.floor(Math.random() * 1000);
    var hueList = info.hues;
    var baseHue = clampHue(hueList[variant % hueList.length] + (bias.hueShift || 0) + (rand(variant, 1) * 10 - 5));

    var hues = schemeHues(baseHue, scheme);
    // For analogous/triadic, weave the theme's OTHER hues in so multi-word
    // themes (e.g. senja + pantai) actually show both families.
    if ((scheme === "analogous" || scheme === "triadic") && hueList.length > 1) {
      hues[2] = clampHue(hueList[(variant + 1) % hueList.length] + (bias.hueShift || 0)); // accent from a different theme hue
      if (hueList.length > 2) hues[1] = clampHue(hueList[(variant + 2) % hueList.length]);
    }

    // ----- tone bias from theme keywords -----
    var tone = info.tones.length ? info.tones[variant % info.tones.length] : "";
    var satShift = 0, lightShift = 0, dark = false;
    if (tone === "warm") { satShift = 8; }
    else if (tone === "bright") { satShift = 12; lightShift = 4; }
    else if (tone === "muted") { satShift = -18; }
    else if (tone === "dark") { lightShift = -12; dark = true; }

    // Base saturation/lightness curves per role, then adjusted by style + tone + jitter.
    var baseSat = [74, 58, 84, 46, 28];
    var baseLt  = dark ? [30, 46, 58, 70, 16] : [26, 44, 56, 72, 92];
    if (bias.contrast) { baseLt = [14, 40, 58, 78, 96]; } // brutalis: push contrast

    var roles = ["Primary", "Secondary", "Accent", "Muted", "Base"];
    var colors = hues.map(function (h, i) {
      var jitterS = (rand(variant, i + 2) * 10 - 5);
      var jitterL = (rand(variant, i + 7) * 8 - 4);
      var s = clamp255(baseSat[i] * (bias.satMul || 1) + satShift + jitterS);
      var l = clamp255(baseLt[i] + (bias.light || 0) + lightShift + jitterL);
      // Monochrome: keep hue fixed, spread saturation/lightness widely.
      if (scheme === "monochrome") {
        s = clamp255(30 + i * 14 + satShift * 0.5);
        l = clamp255((dark ? [18, 32, 48, 64, 82] : [20, 38, 54, 72, 90])[i] + (bias.light || 0));
      }
      return { hex: hslToHex(h, s, l), role: roles[i] };
    });

    return {
      theme: theme, style: sKey, scheme: scheme, variant: variant,
      matched: info.matched, colors: colors
    };
  }

  // small deterministic 0..1 from (seed, salt) for repeatable jitter within one palette
  function rand(seed, salt) {
    var x = Math.sin((seed + 1) * 97.13 + salt * 31.7) * 43758.5453;
    return x - Math.floor(x);
  }

  var FONT_PAIRS = {
    minimalis:  [{ head: "Inter", body: "Inter", note: "Satu keluarga, beda bobot — sangat bersih." }, { head: "Helvetica Neue", body: "Georgia", note: "Sans tegas + serif untuk keterbacaan." }],
    elegan:     [{ head: "Playfair Display", body: "Lato", note: "Serif mewah + sans netral." }, { head: "Cormorant Garamond", body: "Montserrat", note: "Serif tipis klasik + sans modern." }],
    futuristik: [{ head: "Space Grotesk", body: "Inter", note: "Geometris + netral, kesan teknologis." }, { head: "Orbitron", body: "Rajdhani", note: "Techno display + sans ramping." }],
    retro:      [{ head: "Righteous", body: "Nunito", note: "Display bulat 70-an + body ramah." }, { head: "Pacifico", body: "Work Sans", note: "Script santai + sans bersih." }],
    "pop-art":  [{ head: "Bungee", body: "Poppins", note: "Display tebal mencolok + sans friendly." }, { head: "Luckiest Guy", body: "Open Sans", note: "Komik + body netral." }],
    natural:    [{ head: "Fraunces", body: "Karla", note: "Serif organik + grotesque hangat." }, { head: "Bitter", body: "Source Sans Pro", note: "Slab serif + sans lembut." }],
    brutalis:   [{ head: "Archivo Black", body: "IBM Plex Mono", note: "Grotesque berat + monospace mentah." }, { head: "Anton", body: "Roboto Mono", note: "Display sempit + mono." }]
  };
  function generateTypography(input) {
    var sKey = styleOf(input);
    var theme = (input.theme || "desain").trim();
    var pairs = FONT_PAIRS[sKey] || FONT_PAIRS.minimalis;
    return {
      theme: theme, style: sKey,
      pairs: pairs.map(function (p) {
        return { head: p.head, body: p.body, note: p.note, headSizes: "Headline 48–72px · Subhead 24–32px", bodySizes: "Body 16–18px · Caption 12–14px" };
      })
    };
  }

  function generateBrief(input) {
    var theme = (input.theme || "proyek desain").trim();
    var sKey = styleOf(input);
    var style = STYLES[sKey];
    var audience = (input.audience && input.audience.trim()) || pick(AUDIENCES);
    var tone = pick(TONES);
    var deliverable = (input.deliverable && input.deliverable.trim()) || pick(IDEA_FORMATS);
    return {
      theme: theme, style: sKey,
      objective: 'Menciptakan ' + deliverable.toLowerCase() + ' yang mengomunikasikan "' + theme + '" secara ' + tone + ' dan mudah diingat.',
      audience: audience,
      keyMessage: '"' + theme + '" relevan, bernilai, dan layak diperhatikan oleh audiens.',
      visualStyle: "Gaya " + sKey + " — " + style.adj.join(", ") + ". " + style.visual + ".",
      tone: tone, deliverable: deliverable,
      successMetric: pick([
        "Peningkatan awareness & engagement di media sosial",
        "Pesan utama dapat diingat dalam 5 detik pertama",
        "Konsistensi visual di seluruh touchpoint",
        "Respon positif dari target audiens saat uji coba"
      ]),
      doDont: {
        do: ["Jaga hierarki visual yang jelas", "Konsisten dengan palet & tipografi", "Prioritaskan keterbacaan"],
        dont: ["Hindari elemen berlebihan", "Jangan campur terlalu banyak gaya", "Hindari teks terlalu kecil"]
      }
    };
  }

  function generateMoodboard(input) {
    var sKey = styleOf(input);
    var theme = (input.theme || "desain").trim();
    var palette = generatePalette({ theme: theme, style: sKey }).colors.map(function (c) { return c.hex; });
    var kwMap = {
      minimalis: ["negative space", "grid", "mono", "clean"],
      elegan: ["luxury", "serif", "gold accent", "symmetry"],
      futuristik: ["neon", "glow", "motion", "cyber"],
      retro: ["grain", "vintage", "warm", "geometric"],
      "pop-art": ["halftone", "bold outline", "primary", "comic"],
      natural: ["earth tone", "paper", "organic", "handmade"],
      brutalis: ["raw", "giant type", "contrast", "broken grid"]
    };
    var keywords = kwMap[sKey] || ["concept", "visual", "mood", "style"];
    var tiles = [];
    for (var i = 0; i < 8; i++) {
      var c1 = palette[i % palette.length];
      var c2 = palette[(i + 2) % palette.length];
      var ang = (i * 47) % 360;
      tiles.push({ gradient: "linear-gradient(" + ang + "deg, " + c1 + ", " + c2 + ")", label: i < keywords.length ? keywords[i] : "", tall: i === 1 || i === 4 });
    }
    return { theme: theme, style: sKey, tiles: tiles, keywords: keywords, palette: palette };
  }

  function generatePrompt(input) {
    var theme = (input.theme || "creative concept").trim();
    var sKey = styleOf(input);
    var style = STYLES[sKey];
    var subject = (input.subject && input.subject.trim()) || theme;
    var mood = pick(TONES);
    var palette = generatePalette({ theme: theme, style: sKey }).colors.slice(0, 3).map(function (c) { return c.hex; }).join(", ");
    var camera = pick(["isometric view", "flat lay top-down", "close-up macro", "wide establishing shot", "dynamic low angle"]);
    var render = pick(["highly detailed", "clean vector style", "editorial poster style", "soft studio lighting", "high contrast"]);
    var prompt = subject + ", " + sKey + " design style, " + style.visual + ", " + mood + " mood, " +
      "color palette " + palette + ", " + camera + ", " + render + ", balanced composition, graphic design, high quality, 4k";
    var negative = "blurry, low quality, watermark, distorted text, cluttered, extra limbs";
    return { theme: theme, style: sKey, subject: subject, prompt: prompt, negative: negative };
  }

  /* ===================== pages.js ===================== */
  function pageHead(eyebrow, title, desc) {
    return el("div", { class: "page-head" }, [
      el("span", { class: "eyebrow", text: eyebrow }),
      el("h1", { text: title }),
      desc ? el("p", { text: desc }) : null
    ]);
  }
  function styleChips(selectedRef, onChange) {
    var wrap = el("div", { class: "chips" });
    STYLE_KEYS.forEach(function (k) {
      var chip = el("button", {
        type: "button", class: "chip" + (selectedRef.value === k ? " active" : ""), text: k,
        onClick: function () {
          selectedRef.value = selectedRef.value === k ? "" : k;
          $$(".chip", wrap).forEach(function (c) { c.classList.toggle("active", c.textContent === selectedRef.value); });
          if (onChange) onChange();
        }
      });
      wrap.appendChild(chip);
    });
    return wrap;
  }
  function loadingNode() {
    return el("div", { class: "result__empty" }, [
      el("div", { class: "loading-dots", html: "<span></span><span></span><span></span>" }),
      el("p", { class: "muted", text: "AI (demo) sedang menyusun hasil…" })
    ]);
  }
  function emptyResult(msg) {
    return el("div", { class: "result__empty" }, [
      el("div", { html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2.1 2.1M8.6 15.4l-2.1 2.1m0-11.9 2.1 2.1m8.9 8.9-2.1-2.1"/></svg>' }),
      el("p", { text: msg })
    ]);
  }
  function saveBtn(getProject) {
    return el("button", {
      class: "btn btn--ghost btn--sm", type: "button",
      html: iconSave() + "<span>Simpan Proyek</span>",
      onClick: function () {
        var proj = getProject();
        if (!proj) return;
        var rec = store.save(proj);
        if (rec) toast("Proyek disimpan ke My Projects");
      }
    });
  }

  var iconArrow = function () { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'; };
  var iconSave = function () { return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>'; };
  var iconCopy = function () { return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'; };

  var FEATURE_ICONS = {
    idea: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>',
    poster: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h5" stroke-linecap="round"/></svg>',
    color: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.4-.2-.8-.5-1-.3-.3-.5-.6-.5-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/></svg>',
    type: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2M9 19h6M12 5v14"/></svg>',
    brief: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>',
    mood: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    prompt: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6-6-6M12 19h8"/></svg>',
    projects: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    portfolio: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v5M9 13h8M9 16h5"/></svg>',
    posterbuilder: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="8" r="2.5"/><path d="M8 15l2.5-2.5L13 15l2-1.5L17 16"/></svg>',
    assistant: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a7 7 0 0 0-4 12.7V18h8v-2.3A7 7 0 0 0 12 3z"/><path d="M9 21h6M10 18v3M14 18v3"/></svg>'
  };

  function Landing() {
    var page = el("div", { class: "page" });
    function stat(b, s) { return el("div", { class: "hero__stat" }, [el("b", { text: b }), el("span", { text: s })]); }
    var hero = el("section", { class: "hero" }, [
      el("div", { class: "hero__grid" }, [
        el("div", {}, [
          el("span", { class: "eyebrow", text: "Creative Partner for DKV" }),
          el("h1", { class: "mt-12", html: 'Your Creative Mind,<br><span class="grad">Amplified by AI</span>' }),
          el("p", { class: "lead", text: "GrafikAI adalah partner kreatif untuk siswa dan desainer DKV. Temukan ide, susun konsep, dan kembangkan kreativitasmu — AI membantu, kamu tetap yang berkarya." }),
          el("div", { class: "hero__cta" }, [
            el("a", { class: "btn", href: "#/workspace", html: "<span>Start Creating</span>" + iconArrow() }),
            el("a", { class: "btn btn--ghost", href: "#/dashboard", text: "Lihat Fitur" })
          ]),
          el("div", { class: "hero__stats" }, [stat("9", "Alat kreatif"), stat("∞", "Ide tak terbatas"), stat("PDF", "Export desain")])
        ]),
        el("div", { class: "hero__art" }, [el("div", { class: "ring" }), el("div", { class: "orb a" }), el("div", { class: "orb b" })])
      ])
    ]);
    var featurePreview = el("section", { class: "mt-20" }, [
      el("div", { class: "row-between", style: "margin-bottom:18px" }, [
        el("h2", { text: "Semua yang kamu butuhkan" }),
        el("a", { class: "feature-card__cta", href: "#/dashboard", html: "<span>Buka Dashboard</span>" + iconArrow() })
      ]),
      buildFeatureGrid(FEATURES.slice(0, 6))
    ]);
    page.appendChild(hero); page.appendChild(featurePreview);
    return page;
  }

  var FEATURES = [
    { icon: "idea", title: "AI Idea Generator", desc: "Hasilkan ide desain dari tema atau kata kunci.", href: "#/workspace?tab=idea" },
    { icon: "poster", title: "Poster Concept Maker", desc: "Konsep poster: judul, slogan, audiens, warna, layout.", href: "#/workspace?tab=poster" },
    { icon: "color", title: "Color Palette Generator", desc: "Kombinasi warna harmonis sesuai tema.", href: "#/color" },
    { icon: "type", title: "Typography Assistant", desc: "Rekomendasi pasangan font sesuai karakter.", href: "#/typography" },
    { icon: "brief", title: "Design Brief Generator", desc: "Susun brief: tujuan, audiens, pesan, gaya visual.", href: "#/workspace?tab=brief" },
    { icon: "mood", title: "Creative Moodboard", desc: "Inspirasi visual berdasarkan konsep.", href: "#/workspace?tab=mood" },
    { icon: "prompt", title: "Prompt Generator", desc: "Buat prompt AI untuk gambar/referensi.", href: "#/workspace?tab=prompt" },
    { icon: "assistant", title: "AI Creative Assistant", desc: "Brief lengkap, 3 konsep, palet, font, layout, prompt & checklist dari input kamu.", href: "#/assistant" },
    { icon: "portfolio", title: "Portfolio Layout Builder", desc: "Susun layout portofolio DKV, edit visual, export PDF.", href: "#/portfolio" },
    { icon: "posterbuilder", title: "Poster Design Editor", desc: "Editor interaktif: geser elemen, layer, undo/redo, zoom, export PDF/PNG.", href: "#/poster-builder" },
    { icon: "mood", title: "Template Gallery", desc: "6 template poster & 6 portofolio siap pakai.", href: "#/templates?type=portfolio" },
    { icon: "projects", title: "My Projects", desc: "Simpan ide, lalu lihat desain tersimpan di My Layouts.", href: "#/projects" }
  ];
  function buildFeatureGrid(list) {
    var grid = el("div", { class: "feature-grid" });
    list.forEach(function (f) {
      grid.appendChild(el("a", { class: "card card--hover feature-card", href: f.href }, [
        el("div", { class: "feature-card__icon", html: FEATURE_ICONS[f.icon] }),
        el("h3", { text: f.title }),
        el("p", { text: f.desc }),
        el("span", { class: "feature-card__cta", html: "<span>Buka</span>" + iconArrow() })
      ]));
    });
    return grid;
  }
  function Dashboard() {
    var page = el("div", { class: "page" });
    page.appendChild(pageHead("Dashboard", "Studio Kreatifmu", "Pilih alat untuk mulai berkarya. Semua hasil berbasis input kamu dan berjalan dalam mode demo lokal."));
    page.appendChild(buildFeatureGrid(FEATURES));
    return page;
  }

  var WORKSPACE_TABS = [
    { id: "idea", label: "Idea Generator" }, { id: "poster", label: "Poster Concept" },
    { id: "brief", label: "Design Brief" }, { id: "mood", label: "Moodboard" }, { id: "prompt", label: "Prompt Generator" }
  ];
  function Workspace(params) {
    var page = el("div", { class: "page" });
    page.appendChild(pageHead("AI Workspace", "Ubah Ide Jadi Konsep", "Masukkan tema, pilih gaya desain, lalu biarkan GrafikAI menyusun hasil yang relevan."));
    var activeTab = WORKSPACE_TABS.some(function (t) { return t.id === params.tab; }) ? params.tab : "idea";
    var tabBar = el("div", { class: "chips mt-12", style: "margin-bottom:24px" });
    WORKSPACE_TABS.forEach(function (t) {
      tabBar.appendChild(el("button", {
        type: "button", class: "chip" + (t.id === activeTab ? " active" : ""), text: t.label,
        onClick: function () { activeTab = t.id; refresh(); }
      }));
    });
    page.appendChild(tabBar);
    var body = el("div", {});
    page.appendChild(body);
    function refresh() {
      var active = WORKSPACE_TABS.filter(function (t) { return t.id === activeTab; })[0];
      $$(".chip", tabBar).forEach(function (c) { c.classList.toggle("active", c.textContent === active.label); });
      body.innerHTML = "";
      body.appendChild(buildTool(activeTab));
    }
    refresh();
    return page;
  }

  function buildTool(kind) {
    var theme = { value: "" }, style = { value: "" }, extra = { value: "" };
    var resultBox = el("div", { class: "result" }, [emptyResult("Hasil akan muncul di sini setelah kamu generate.")]);
    var configs = {
      idea: { placeholder: "mis. kampanye hemat energi, festival musik lokal, produk kopi", extraLabel: null },
      poster: { placeholder: "mis. hari lingkungan, konser amal, promo kampus", extraLabel: null },
      brief: { placeholder: "mis. rebranding kedai teh, event seni mahasiswa", extraLabel: "Target audiens (opsional)" },
      mood: { placeholder: "mis. senja urban, teknologi masa depan, nuansa tropis", extraLabel: null },
      prompt: { placeholder: "mis. maskot kucing astronot, logo kedai kopi", extraLabel: "Subjek utama (opsional)" }
    };
    var config = configs[kind];
    var form = el("div", { class: "card" }, [
      el("div", { class: "field" }, [
        el("label", { for: "ws-theme", text: "Tema / kata kunci" }),
        el("input", { id: "ws-theme", type: "text", placeholder: config.placeholder, onInput: function (e) { theme.value = e.target.value; } }),
        el("span", { class: "hint", text: "Wajib diisi. Semakin spesifik, hasil makin relevan." })
      ]),
      el("div", { class: "field" }, [
        el("label", { text: "Gaya desain" }),
        styleChips(style),
        el("span", { class: "hint", text: "Opsional. Kosongkan untuk gaya otomatis." })
      ]),
      config.extraLabel ? el("div", { class: "field" }, [
        el("label", { for: "ws-extra", text: config.extraLabel }),
        el("input", { id: "ws-extra", type: "text", placeholder: "Opsional", onInput: function (e) { extra.value = e.target.value; } })
      ]) : null,
      el("button", { class: "btn btn--block", type: "button", html: "<span>Generate</span>" + iconArrow(), onClick: run }),
      el("p", { class: "hint mt-12", text: "Mode demo: hasil adalah simulasi lokal, bukan dari AI API eksternal." })
    ]);
    var panel = el("div", { class: "card" }, [resultBox]);
    function run() {
      if (!theme.value.trim()) { toast("Isi tema atau kata kunci dulu ya.", "error"); var i = $("#ws-theme"); if (i) i.focus(); return; }
      resultBox.innerHTML = ""; resultBox.appendChild(loadingNode());
      setTimeout(function () {
        try {
          var input = { theme: theme.value, style: style.value };
          if (kind === "brief") input.audience = extra.value;
          if (kind === "prompt") input.subject = extra.value;
          render(kind, input, resultBox);
        } catch (err) { console.error(err); resultBox.innerHTML = ""; resultBox.appendChild(emptyResult("Terjadi kesalahan saat membuat hasil. Coba lagi.")); }
      }, 450);
    }
    return el("div", { class: "split" }, [form, panel]);
  }

  function render(kind, input, box) {
    box.innerHTML = "";
    if (kind === "idea") return renderIdeas(input, box);
    if (kind === "poster") return renderPoster(input, box);
    if (kind === "brief") return renderBrief(input, box);
    if (kind === "mood") return renderMoodboard(input, box);
    if (kind === "prompt") return renderPrompt(input, box);
  }

  function renderIdeas(input, box) {
    var data = generateIdeas(input);
    box.appendChild(el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: "Gaya: " + data.style }), el("h3", { text: '6 Ide untuk "' + data.theme + '"' })]),
      saveBtn(function () { return { type: "Idea", title: "Ide: " + data.theme, payload: data }; })
    ]));
    var list = el("div", { class: "stack mt-12" });
    data.ideas.forEach(function (idea, i) {
      list.appendChild(el("div", { class: "idea-item" }, [
        el("div", { class: "idea-item__num", text: String(i + 1).padStart(2, "0") }),
        el("div", {}, [el("h4", { text: idea.title }), el("p", { text: idea.desc })])
      ]));
    });
    box.appendChild(list);
    return data;
  }

  function kv(label, value) { return el("div", {}, [el("div", { class: "section-label", text: label }), el("p", { text: value })]); }
  function kvList(label, items) {
    return el("div", {}, [
      el("div", { class: "section-label", text: label }),
      el("ul", { style: "margin:0;padding-left:18px;color:var(--text-soft)" }, items.map(function (i) { return el("li", { text: i }); }))
    ]);
  }
  function briefToText(d) {
    return [
      "DESIGN BRIEF — " + d.theme, "Tujuan: " + d.objective, "Target Audiens: " + d.audience,
      "Pesan Utama: " + d.keyMessage, "Gaya Visual: " + d.visualStyle, "Tone: " + d.tone,
      "Deliverable: " + d.deliverable, "Ukuran Keberhasilan: " + d.successMetric,
      "Do: " + d.doDont.do.join("; "), "Don't: " + d.doDont.dont.join("; ")
    ].join("\n");
  }

  function renderPoster(input, box) {
    var d = generatePoster(input);
    box.appendChild(el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: "Gaya: " + d.style + " · Tone: " + d.tone }), el("h3", { text: d.title })]),
      saveBtn(function () { return { type: "Poster", title: "Poster: " + d.title, payload: d }; })
    ]));
    var grid = el("div", { class: "stack mt-12" }, [
      kv("Judul", d.title), kv("Slogan", "“" + d.slogan + "”"), kv("Target Audiens", d.audience),
      kv("Call to Action", d.cta), kv("Arahan Visual", d.visualDirection), kv("Layout", d.layout)
    ]);
    var sw = el("div", {});
    sw.appendChild(el("div", { class: "section-label", text: "Palet warna" }));
    var row = el("div", { class: "pill-row" });
    d.palette.forEach(function (hex) {
      row.appendChild(el("button", {
        class: "pill", type: "button",
        html: '<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:' + hex + ';margin-right:6px;vertical-align:middle"></span>' + hex,
        onClick: function () { copyText(hex, hex + " disalin"); }
      }));
    });
    sw.appendChild(row); grid.appendChild(sw); box.appendChild(grid);
    return d;
  }

  function renderBrief(input, box) {
    var d = generateBrief(input);
    box.appendChild(el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: "Design Brief · " + d.style }), el("h3", { text: d.theme })]),
      el("div", { style: "display:flex;gap:8px" }, [
        el("button", { class: "btn btn--ghost btn--sm", type: "button", html: iconCopy() + "<span>Salin</span>", onClick: function () { copyText(briefToText(d), "Brief disalin"); } }),
        saveBtn(function () { return { type: "Brief", title: "Brief: " + d.theme, payload: d }; })
      ])
    ]));
    box.appendChild(el("div", { class: "stack mt-12" }, [
      kv("Tujuan", d.objective), kv("Target Audiens", d.audience), kv("Pesan Utama", d.keyMessage),
      kv("Gaya Visual", d.visualStyle), kv("Tone", d.tone), kv("Deliverable", d.deliverable),
      kv("Ukuran Keberhasilan", d.successMetric), kvList("Do", d.doDont.do), kvList("Don't", d.doDont.dont)
    ]));
    return d;
  }

  function renderMoodboard(input, box) {
    var d = generateMoodboard(input);
    box.appendChild(el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: "Moodboard · " + d.style }), el("h3", { text: d.theme })]),
      saveBtn(function () { return { type: "Moodboard", title: "Moodboard: " + d.theme, payload: d }; })
    ]));
    var mb = el("div", { class: "moodboard mt-12" });
    d.tiles.forEach(function (t) {
      mb.appendChild(el("div", { class: "mood-tile" + (t.tall ? " mood-tile--tall" : ""), style: "background:" + t.gradient }, [t.label ? el("span", { class: "mood-tile__label", text: t.label }) : null]));
    });
    box.appendChild(mb);
    box.appendChild(el("div", { class: "mt-12" }, [
      el("div", { class: "section-label", text: "Kata kunci visual" }),
      el("div", { class: "pill-row" }, d.keywords.map(function (k) { return el("span", { class: "pill", text: k }); }))
    ]));
    return d;
  }

  function renderPrompt(input, box) {
    var d = generatePrompt(input);
    box.appendChild(el("div", { class: "row-between" }, [
      el("div", {}, [el("div", { class: "section-label", text: "Prompt · " + d.style }), el("h3", { text: d.subject })]),
      saveBtn(function () { return { type: "Prompt", title: "Prompt: " + d.subject, payload: d }; })
    ]));
    box.appendChild(el("div", { class: "stack mt-12" }, [
      el("div", {}, [
        el("div", { class: "section-label", text: "Prompt (positif)" }),
        el("div", { class: "prompt-box", text: d.prompt }),
        el("button", { class: "btn btn--ghost btn--sm mt-12", type: "button", html: iconCopy() + "<span>Salin Prompt</span>", onClick: function () { copyText(d.prompt, "Prompt disalin"); } })
      ]),
      el("div", {}, [
        el("div", { class: "section-label", text: "Negative prompt" }),
        el("div", { class: "prompt-box", text: d.negative }),
        el("button", { class: "btn btn--ghost btn--sm mt-12", type: "button", html: iconCopy() + "<span>Salin Negative</span>", onClick: function () { copyText(d.negative, "Negative prompt disalin"); } })
      ])
    ]));
    return d;
  }

  function ColorStudio() {
    var page = el("div", { class: "page" });
    page.appendChild(pageHead("Color Studio", "Palet Warna Harmonis", "Masukkan tema, pilih skema, dan dapatkan 5 warna yang serasi. Klik warna untuk menyalin."));
    var theme = { value: "" }, style = { value: "" }, scheme = { value: "analogous" };
    var resultBox = el("div", { class: "result" }, [emptyResult("Palet akan muncul di sini.")]);
    var schemeChips = el("div", { class: "chips" });
    [["analogous", "Analog"], ["complementary", "Komplementer"], ["triadic", "Triadik"], ["monochrome", "Monokrom"]].forEach(function (pairArr) {
      var val = pairArr[0], lbl = pairArr[1];
      schemeChips.appendChild(el("button", {
        type: "button", class: "chip" + (val === scheme.value ? " active" : ""), text: lbl,
        onClick: function (e) { scheme.value = val; $$(".chip", schemeChips).forEach(function (c) { c.classList.remove("active"); }); e.target.classList.add("active"); }
      }));
    });
    var form = el("div", { class: "card" }, [
      el("div", { class: "field" }, [
        el("label", { for: "cs-theme", text: "Tema desain" }),
        el("input", { id: "cs-theme", type: "text", placeholder: "mis. senja pantai, teknologi, festival anak", onInput: function (e) { theme.value = e.target.value; } })
      ]),
      el("div", { class: "field" }, [el("label", { text: "Gaya (opsional)" }), styleChips(style)]),
      el("div", { class: "field" }, [el("label", { text: "Skema warna" }), schemeChips]),
      el("button", { class: "btn btn--block", type: "button", html: "<span>Generate Palet</span>" + iconArrow(), onClick: run })
    ]);
    function run() {
      if (!theme.value.trim()) { toast("Isi tema dulu ya.", "error"); var i = $("#cs-theme"); if (i) i.focus(); return; }
      resultBox.innerHTML = ""; resultBox.appendChild(loadingNode());
      setTimeout(function () {
        var last = generatePalette({ theme: theme.value, style: style.value, scheme: scheme.value });
        resultBox.innerHTML = "";
        resultBox.appendChild(el("div", { class: "row-between" }, [
          el("div", {}, [el("div", { class: "section-label", text: last.scheme + " · " + last.style }), el("h3", { text: 'Palet "' + last.theme + '"' })]),
          el("div", { style: "display:flex;gap:8px" }, [
            el("button", { class: "btn btn--ghost btn--sm", type: "button", html: iconCopy() + "<span>Salin Semua</span>", onClick: function () { copyText(last.colors.map(function (c) { return c.hex; }).join(", "), "Semua warna disalin"); } }),
            saveBtn(function () { return { type: "Palette", title: "Palet: " + last.theme, payload: last }; })
          ])
        ]));
        var row = el("div", { class: "swatch-row mt-12" });
        last.colors.forEach(function (c) {
          row.appendChild(el("div", { class: "swatch", title: "Klik untuk menyalin", onClick: function () { copyText(c.hex, c.hex + " disalin"); } }, [
            el("div", { class: "swatch__color", style: "background:" + c.hex }),
            el("div", { class: "swatch__meta" }, [
              el("div", {}, [el("div", { class: "swatch__hex", text: c.hex }), el("div", { class: "swatch__copy", text: c.role })]),
              el("span", { class: "swatch__copy", html: iconCopy() })
            ])
          ]));
        });
        resultBox.appendChild(row);
      }, 400);
    }
    page.appendChild(el("div", { class: "split" }, [form, el("div", { class: "card" }, [resultBox])]));
    return page;
  }

  function TypographyStudio() {
    var page = el("div", { class: "page" });
    page.appendChild(pageHead("Typography Studio", "Pasangan Font yang Pas", "Pilih gaya desain untuk mendapatkan rekomendasi pasangan font beserta panduan ukuran."));
    var theme = { value: "" }, style = { value: "minimalis" };
    var resultBox = el("div", { class: "result" }, [emptyResult("Rekomendasi font akan muncul di sini.")]);
    function run() {
      var last = generateTypography({ theme: theme.value, style: style.value });
      resultBox.innerHTML = "";
      resultBox.appendChild(el("div", { class: "row-between" }, [
        el("div", {}, [el("div", { class: "section-label", text: "Gaya: " + last.style }), el("h3", { text: "2 Rekomendasi Pasangan" })]),
        saveBtn(function () { return { type: "Typography", title: "Font: " + last.style, payload: last }; })
      ]));
      var stack = el("div", { class: "stack mt-12" });
      last.pairs.forEach(function (p) {
        stack.appendChild(el("div", { class: "font-pair" }, [
          el("div", { class: "font-pair__preview" }, [
            el("div", { class: "font-pair__head", style: "font-family:'" + p.head + "',var(--font-display)", text: p.head }),
            el("div", { class: "font-pair__body", style: "font-family:'" + p.body + "',var(--font-body)", text: "Body: " + p.body + " — " + p.note })
          ]),
          el("div", { class: "pill-row" }, [
            el("span", { class: "pill", text: "Heading: " + p.head }),
            el("span", { class: "pill", text: "Body: " + p.body }),
            el("span", { class: "pill", text: p.headSizes }),
            el("span", { class: "pill", text: p.bodySizes }),
            el("button", { class: "chip", type: "button", html: iconCopy() + " Salin", onClick: function () { copyText("Heading: " + p.head + " / Body: " + p.body, "Pasangan font disalin"); } })
          ])
        ]));
      });
      resultBox.appendChild(stack);
    }
    var form = el("div", { class: "card" }, [
      el("div", { class: "field" }, [
        el("label", { for: "ty-theme", text: "Tema (opsional)" }),
        el("input", { id: "ty-theme", type: "text", placeholder: "mis. brand kopi, poster event", onInput: function (e) { theme.value = e.target.value; } })
      ]),
      el("div", { class: "field" }, [el("label", { text: "Gaya desain" }), styleChips(style, run)]),
      el("button", { class: "btn btn--block", type: "button", html: "<span>Rekomendasikan Font</span>" + iconArrow(), onClick: run }),
      el("p", { class: "hint mt-12", text: "Nama font merujuk pada koleksi umum (mis. Google Fonts) agar mudah diterapkan." })
    ]);
    page.appendChild(el("div", { class: "split" }, [form, el("div", { class: "card" }, [resultBox])]));
    setTimeout(run, 0);
    return page;
  }

  function summarize(p) {
    var d = p.payload || {};
    switch (p.type) {
      case "Idea": return '<p class="muted">' + (d.ideas || []).slice(0, 3).map(function (i) { return "• " + escapeHtml(i.title); }).join("<br>") + "</p>";
      case "Poster": return '<p class="muted">Slogan: “' + escapeHtml(d.slogan || "") + '”<br>Audiens: ' + escapeHtml(d.audience || "") + "</p>";
      case "Palette": {
        var sw = (d.colors || []).map(function (c) { return '<span style="display:inline-block;width:22px;height:22px;border-radius:5px;background:' + c.hex + ';margin-right:4px"></span>'; }).join("");
        return "<div>" + sw + "</div>";
      }
      case "Typography": return '<p class="muted">' + (d.pairs || []).map(function (x) { return escapeHtml(x.head + " / " + x.body); }).join("<br>") + "</p>";
      case "Brief": return '<p class="muted">' + escapeHtml((d.objective || "").slice(0, 120)) + "…</p>";
      case "Moodboard": return '<p class="muted">' + (d.keywords || []).map(escapeHtml).join(", ") + "</p>";
      case "Prompt": return '<p class="muted">' + escapeHtml((d.prompt || "").slice(0, 130)) + "…</p>";
      case "Assistant": return '<p class="muted">' + escapeHtml(((d.result && d.result.brief) || "").slice(0, 130)) + "…</p>";
      default: return '<p class="muted">Proyek tersimpan.</p>';
    }
  }
  function toPlainText(p) {
    var d = p.payload || {};
    switch (p.type) {
      case "Idea": return p.title + "\n" + (d.ideas || []).map(function (i, n) { return (n + 1) + ". " + i.title + "\n   " + i.desc; }).join("\n");
      case "Poster": return p.title + "\nSlogan: " + d.slogan + "\nAudiens: " + d.audience + "\nCTA: " + d.cta + "\nLayout: " + d.layout + "\nPalet: " + (d.palette || []).join(", ");
      case "Palette": return p.title + "\n" + (d.colors || []).map(function (c) { return c.role + ": " + c.hex; }).join("\n");
      case "Typography": return p.title + "\n" + (d.pairs || []).map(function (x) { return x.head + " / " + x.body + " — " + x.note; }).join("\n");
      case "Brief": return briefToText(d);
      case "Moodboard": return p.title + "\nKata kunci: " + (d.keywords || []).join(", ") + "\nPalet: " + (d.palette || []).join(", ");
      case "Prompt": return p.title + "\nPrompt: " + d.prompt + "\nNegative: " + d.negative;
      case "Assistant": return p.title + "\n" + ((d.result && d.result.brief) || "") + "\n\nPrompt: " + ((d.result && d.result.prompt && d.result.prompt.positive) || "");
      default: return p.title;
    }
  }
  function projectCard(p, onChange) {
    return el("div", { class: "card card--hover project-card" }, [
      el("div", { class: "row-between" }, [
        el("span", { class: "project-card__type", text: p.type }),
        el("span", { class: "project-card__date", text: formatDate(p.createdAt) })
      ]),
      el("h3", { text: p.title, style: "font-size:1.1rem" }),
      el("div", { class: "project-card__body", html: summarize(p) }),
      el("div", { class: "project-card__actions" }, [
        el("button", { class: "btn btn--ghost btn--sm", type: "button", html: iconCopy() + "<span>Salin</span>", onClick: function () { copyText(toPlainText(p), "Isi proyek disalin"); } }),
        el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Hapus", onClick: function () { if (confirm('Hapus "' + p.title + '"?')) { store.remove(p.id); toast("Proyek dihapus"); onChange(); } } })
      ])
    ]);
  }
  function Projects() {
    var page = el("div", { class: "page" });
    page.appendChild(pageHead("My Projects", "Proyek Tersimpan", "Semua ide, palet, dan konsep yang kamu simpan tersedia di sini (tersimpan di perangkat ini)."));
    var container = el("div", {});
    page.appendChild(container);
    function renderList() {
      container.innerHTML = "";
      var list = store.all();
      if (!list.length) {
        container.appendChild(el("div", { class: "empty-state" }, [
          el("div", { html: '<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' }),
          el("h3", { text: "Belum ada proyek" }),
          el("p", { class: "muted mt-12", text: "Buat sesuatu di AI Workspace lalu klik Simpan Proyek." }),
          el("a", { class: "btn mt-20", href: "#/workspace", html: "<span>Mulai Berkarya</span>" + iconArrow() })
        ]));
        return;
      }
      container.appendChild(el("div", { class: "row-between", style: "margin-bottom:18px" }, [
        el("span", { class: "muted", text: list.length + " proyek tersimpan" }),
        el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Hapus Semua", onClick: function () { if (confirm("Hapus semua proyek tersimpan? Tindakan ini tidak bisa dibatalkan.")) { store.clear(); toast("Semua proyek dihapus"); renderList(); } } })
      ]));
      var grid = el("div", { class: "projects-grid" });
      list.forEach(function (p) { grid.appendChild(projectCard(p, renderList)); });
      container.appendChild(grid);
    }
    renderList();
    return page;
  }

  function About() {
    var page = el("div", { class: "page" });
    page.appendChild(pageHead("About", "Partner Kreatif untuk DKV", "GrafikAI dibuat untuk mendampingi siswa dan desainer Desain Komunikasi Visual."));
    function valueCard(title, desc) {
      return el("div", { class: "card card--hover feature-card" }, [
        el("div", { class: "feature-card__icon", html: FEATURE_ICONS.idea }),
        el("h3", { text: title, style: "font-size:1.1rem" }),
        el("p", { text: desc })
      ]);
    }
    page.appendChild(el("div", { class: "stack" }, [
      el("div", { class: "card" }, [
        el("h3", { text: "Kenapa GrafikAI?" }),
        el("p", { class: "muted mt-12", text: "Mencari ide dari nol itu melelahkan. GrafikAI mempercepat tahap awal berkarya — brainstorming, konsep, palet, tipografi — supaya kamu punya lebih banyak waktu untuk menyempurnakan karya. AI di sini adalah partner, bukan pengganti kreativitasmu." })
      ]),
      el("div", { class: "feature-grid" }, [
        valueCard("Membantu, bukan menggantikan", "Hasil GrafikAI adalah titik awal. Keputusan desain tetap di tanganmu."),
        valueCard("Ramah pemula", "Istilah dijelaskan sederhana, cocok untuk siswa DKV yang baru belajar."),
        valueCard("Mengikuti input kamu", "Hasil dibentuk dari tema dan gaya yang kamu pilih."),
        valueCard("Mode demo transparan", "Tanpa AI API eksternal, hasil adalah simulasi lokal yang realistis dan jelas ditandai.")
      ]),
      el("div", { class: "card" }, [
        el("h3", { text: "Catatan teknis" }),
        el("p", { class: "muted mt-12", text: "Aplikasi ini berjalan sepenuhnya di browser. Proyek disimpan di localStorage perangkatmu. Bila nanti tersedia AI API, modul generator dapat dihubungkan tanpa mengubah antarmuka." }),
        el("a", { class: "btn mt-20", href: "#/workspace", html: "<span>Coba Sekarang</span>" + iconArrow() })
      ])
    ]));
    return page;
  }

  /* ===================== app.js (router) ===================== */
  var routes = {
    "/": Landing, "/dashboard": Dashboard, "/workspace": Workspace,
    "/color": ColorStudio, "/typography": TypographyStudio, "/projects": Projects, "/about": About
  };

  // Public API so extension modules (e.g. js/layout-builder.js) can add routes
  // and reuse the exact same helpers + store without duplicating code.
  window.GrafikAI = {
    el: el, $: $, $$: $$, toast: toast, copyText: copyText, store: store,
    formatDate: formatDate, escapeHtml: escapeHtml, pick: pick, shuffle: shuffle, seededPick: seededPick,
    generatePalette: generatePalette, generateTypography: generateTypography,
    registerRoute: function (path, viewFn) { if (path && typeof viewFn === "function") { routes[path] = viewFn; } },
    navigate: function (hash) { location.hash = hash; },
    rerender: function () { renderRoute(); }
  };
  // Let extensions know the core is ready (in case they load after boot)
  try { window.dispatchEvent(new Event("grafikai:ready")); } catch (e) {}
  function parseHash() {
    var raw = location.hash.replace(/^#/, "") || "/";
    var parts = raw.split("?");
    var path = parts[0] || "/", query = parts[1];
    var params = {};
    if (query) {
      query.split("&").forEach(function (part) {
        var kvp = part.split("=");
        if (kvp[0]) params[decodeURIComponent(kvp[0])] = decodeURIComponent(kvp[1] || "");
      });
    }
    return { path: path || "/", params: params };
  }
  function setActiveNav(path) {
    $$(".nav a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-route") === path); });
  }
  function NotFound() {
    var node = document.createElement("div");
    node.className = "page empty-state";
    node.innerHTML = '<h1>404</h1><p class="muted mt-12">Halaman tidak ditemukan.</p><a class="btn mt-20" href="#/">Kembali ke Beranda</a>';
    return node;
  }
  function renderRoute() {
    var parsed = parseHash();
    var view = routes[parsed.path] || NotFound;
    var main = document.getElementById("main");
    main.innerHTML = "";
    try { main.appendChild(view(parsed.params)); }
    catch (err) { console.error("Render error:", err); main.appendChild(NotFound()); }
    setActiveNav(routes[parsed.path] ? parsed.path : null);
    window.scrollTo(0, 0);
    try { main.focus({ preventScroll: true }); } catch (e) { main.focus(); }
    var nav = document.getElementById("primaryNav");
    var toggle = document.getElementById("navToggle");
    if (nav) nav.classList.remove("open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }
  function wireNav() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("primaryNav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
    });
  }
  function boot() {
    if (!location.hash) location.replace("#/");
    wireNav();
    renderRoute();
  }
  window.addEventListener("hashchange", renderRoute);
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
