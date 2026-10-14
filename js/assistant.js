/* ============================================================
   GrafikAI — AI Creative Assistant
   Rich, input-driven brief + concepts + recommendations for DKV.
   - If a backend is available (POST /api/assistant), it is used.
   - Otherwise falls back to a transparent, clearly-labelled DEMO engine.
   NO secret API keys live in this frontend file.
   ============================================================ */
(function () {
  "use strict";

  function init(G) {
    var el = G.el, toast = G.toast, copyText = G.copyText, escapeHtml = G.escapeHtml, store = G.store;

    /* =========================================================
       Knowledge base — each dimension maps to reasoned traits.
       ========================================================= */
    var PROJECT_TYPES = {
      poster:       { label: "Poster", focus: "pesan tunggal yang terbaca dari jarak jauh", hierarchy: ["Headline", "Visual utama", "Info pendukung", "CTA"], ratio: "vertikal (A3/A2) dengan 1 fokus dominan" },
      branding:     { label: "Branding", focus: "konsistensi identitas lintas media", hierarchy: ["Logo", "Warna", "Tipografi", "Elemen grafis", "Aplikasi"], ratio: "sistem modular, bukan satu komposisi" },
      logo:         { label: "Logo", focus: "bentuk sederhana yang mudah diingat & skalabel", hierarchy: ["Simbol/marka", "Wordmark", "Ruang aman"], ratio: "bekerja dari 16px favicon sampai billboard" },
      editorial:    { label: "Editorial", focus: "keterbacaan panjang & ritme halaman", hierarchy: ["Judul", "Deck/standfirst", "Body text", "Caption", "Folio"], ratio: "grid kolom (mis. 12 kolom) & baseline grid" },
      sosmed:       { label: "Media Sosial", focus: "stop-scroll di detik pertama di layar kecil", hierarchy: ["Hook visual", "Teks singkat", "Branding", "CTA"], ratio: "1:1 / 4:5 / 9:16 sesuai platform" },
      portofolio:   { label: "Portofolio", focus: "menampilkan proses & hasil karya secara profesional", hierarchy: ["Judul proyek", "Hero karya", "Proses", "Hasil", "Kontak"], ratio: "A4/16:9 dengan ruang napas konsisten" }
    };

    var AUDIENCE_TRAITS = [
      { k: ["anak", "anak-anak", "sd", "balita"], sat: "tinggi", shape: "membulat & playful", font: "rounded sans / display friendly", note: "warna cerah jenuh dan bentuk membulat terasa aman & menyenangkan untuk anak" },
      { k: ["remaja", "gen z", "pelajar", "mahasiswa", "muda"], sat: "tinggi-kontras", shape: "berani, dinamis", font: "grotesque modern / display ekspresif", note: "Gen Z merespons kontras tinggi, gerak, dan tipografi berani" },
      { k: ["profesional", "korporat", "bisnis", "b2b", "eksekutif"], sat: "rendah-netral", shape: "geometris rapi", font: "sans netral + serif untuk otoritas", note: "audiens profesional mempercayai palet terkendali & tipografi netral" },
      { k: ["keluarga", "umum", "masyarakat"], sat: "sedang", shape: "ramah & jelas", font: "sans humanis", note: "palet hangat sedang terasa inklusif untuk audiens lintas usia" },
      { k: ["mewah", "premium", "luxury", "high-end"], sat: "rendah-gelap", shape: "minim & presisi", font: "serif tipis + sans ramping", note: "ruang kosong luas + kontras emas/gelap menandakan kemewahan" }
    ];

    var STYLE_TRAITS = {
      minimalis: { comp: "banyak ruang kosong, 1 titik fokus, grid tenang", font: "sans netral satu-dua bobot", mood: "tenang, fungsional" },
      bold: { comp: "tipografi raksasa memenuhi bidang, kontras ekstrem", font: "display berat (black/condensed)", mood: "berani, lantang" },
      retro: { comp: "bentuk geometris, tekstur grain, bingkai dekoratif", font: "display 70-an + script", mood: "hangat, nostalgik" },
      futuristik: { comp: "gradient, garis tajam, efek glow, ruang gelap", font: "geometris/techno", mood: "modern, teknologis" },
      elegan: { comp: "simetri, ruang napas, detail halus", font: "serif tipis + sans ramping", mood: "mewah, berkelas" },
      editorial: { comp: "grid kolom kuat, hierarki serif, ritme teks", font: "serif judul + sans body", mood: "cerdas, terstruktur" },
      swiss: { comp: "grid matematis, rata kiri, tipografi sebagai struktur", font: "grotesque (Helvetica-like)", mood: "objektif, rapi" }
    };

    function detectStyleKey(s) {
      s = (s || "").toLowerCase();
      if (/bold|tegas|berani|lantang/.test(s)) return "bold";
      if (/retro|vintage|klasik|jadul/.test(s)) return "retro";
      if (/futur|modern|teknolog|sci-?fi|cyber/.test(s)) return "futuristik";
      if (/elegan|mewah|luxury|premium/.test(s)) return "elegan";
      if (/editorial|majalah|jurnal/.test(s)) return "editorial";
      if (/swiss|grid|international/.test(s)) return "swiss";
      return "minimalis";
    }
    function detectAudience(a) {
      a = (a || "").toLowerCase();
      for (var i = 0; i < AUDIENCE_TRAITS.length; i++) {
        var t = AUDIENCE_TRAITS[i];
        for (var j = 0; j < t.k.length; j++) { if (a.indexOf(t.k[j]) >= 0) return t; }
      }
      return { sat: "sedang", shape: "seimbang", font: "sans humanis", note: "tanpa audiens spesifik, dipakai palet seimbang yang aman" };
    }

    /* ----- color helpers (HSL harmony seeded by preferred color or theme) ----- */
    function hexToHsl(hex) {
      hex = hex.replace("#", "");
      if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
      var r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b), h, s, l = (max + min) / 2;
      if (max === min) { h = s = 0; }
      else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
      }
      return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
    }
    function hslToHex(h, s, l) {
      s /= 100; l /= 100;
      var k = function (n) { return (n + h / 30) % 12; };
      var a = s * Math.min(l, 1 - l);
      var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
      var toHex = function (x) { return Math.round(255 * x).toString(16).padStart(2, "0"); };
      return ("#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4))).toUpperCase();
    }
    function hashHue(str) { var h = 0, t = (str || "x").toLowerCase(); for (var i = 0; i < t.length; i++) h = (h + t.charCodeAt(i) * 7) % 360; return h; }

    function buildPalette(input, styleKey, aud) {
      // Seed hue from preferred color if valid hex, else from message/theme.
      var baseHue, note;
      var pref = (input.colors || "").trim();
      var hexMatch = pref.match(/#?[0-9a-fA-F]{6}|#?[0-9a-fA-F]{3}/);
      if (hexMatch) { baseHue = hexToHsl(hexMatch[0].charAt(0) === "#" ? hexMatch[0] : "#" + hexMatch[0])[0]; note = "berangkat dari warna pilihanmu (" + hexMatch[0].toUpperCase() + ")"; }
      else if (/merah|red/.test(pref)) { baseHue = 0; note = "merah menandakan energi & urgensi"; }
      else if (/biru|blue/.test(pref)) { baseHue = 210; note = "biru membangun kepercayaan & ketenangan"; }
      else if (/hijau|green/.test(pref)) { baseHue = 140; note = "hijau mengaitkan ke alam & pertumbuhan"; }
      else if (/kuning|yellow/.test(pref)) { baseHue = 48; note = "kuning memancarkan optimisme & perhatian"; }
      else if (/ungu|purple/.test(pref)) { baseHue = 270; note = "ungu memberi kesan kreatif & premium"; }
      else { baseHue = hashHue(input.message || input.goal || "grafikai"); note = "diturunkan dari pesan utama agar warna terasa milik proyek ini"; }

      // Saturation/lightness tuned by audience.
      var satBase = aud.sat.indexOf("tinggi") >= 0 ? 82 : (aud.sat.indexOf("rendah") >= 0 ? 42 : 64);
      var dark = aud.sat.indexOf("gelap") >= 0;

      var roles = [
        { role: "Primary", h: baseHue, s: satBase, l: dark ? 55 : 46, why: "warna utama & paling sering dipakai; " + note },
        { role: "Secondary", h: (baseHue + 28) % 360, s: satBase - 12, l: dark ? 40 : 62, why: "pendamping untuk area sekunder agar tak monoton tapi tetap selaras" },
        { role: "Accent", h: (baseHue + 180) % 360, s: Math.min(92, satBase + 10), l: 54, why: "komplementer untuk CTA/sorotan — menarik mata ke aksi penting" },
        { role: "Neutral", h: baseHue, s: 12, l: dark ? 22 : 30, why: "netral untuk teks panjang agar nyaman dibaca & kontras cukup" },
        { role: "Base", h: baseHue, s: dark ? 16 : 20, l: dark ? 12 : 94, why: dark ? "latar gelap untuk mood premium/teknologis" : "latar terang untuk keterbacaan maksimal" }
      ];
      return { note: note, colors: roles.map(function (r) { return { role: r.role, hex: hslToHex(r.h, r.s, r.l), why: r.why }; }) };
    }

    /* ----- fonts tuned by style + project ----- */
    function buildFonts(styleKey, projKey) {
      var map = {
        minimalis: [["Inter", "Judul & body (satu keluarga, beda bobot)"], ["Space Grotesk", "Opsi judul bila ingin karakter lebih"]],
        bold: [["Archivo Black", "Headline raksasa yang mendominasi"], ["Inter", "Body & info agar tetap terbaca"]],
        retro: [["Righteous", "Judul display bernuansa 70-an"], ["Work Sans", "Body netral penyeimbang"]],
        futuristik: [["Space Grotesk", "Judul geometris teknologis"], ["Inter", "Body bersih & modern"]],
        elegan: [["Playfair Display", "Judul serif mewah berkontras"], ["Lato", "Body sans ramping & tenang"]],
        editorial: [["Playfair Display", "Judul serif berwibawa"], ["Source Sans / Inter", "Body panjang yang nyaman"]],
        swiss: [["Archivo / Helvetica", "Judul grotesque sebagai struktur"], ["Inter", "Body rata kiri konsisten"]]
      };
      var pair = map[styleKey] || map.minimalis;
      var scaleNote = projKey === "editorial" ? "Gunakan skala tipografi modular (mis. 1.25) + baseline grid untuk ritme halaman."
        : projKey === "sosmed" ? "Perbesar ukuran minimum (≥ 28px judul) karena dibaca di layar kecil sambil scroll."
        : projKey === "logo" ? "Wordmark butuh tracking disesuaikan tangan; hindari font trendi yang cepat usang."
        : "Jaga minimal 2 tingkat kontras ukuran antara judul dan body.";
      return { pair: pair, scaleNote: scaleNote };
    }

    /* ----- three distinct concepts ----- */
    function buildConcepts(input, styleKey, proj, aud) {
      var msg = input.message || "pesan utama";
      var directions = [
        { tag: "Type-Driven", title: "Tipografi sebagai Pahlawan",
          body: "Jadikan \"" + msg + "\" sebagai elemen visual terbesar. Minim gambar, mengandalkan skala & kontras huruf. Cocok karena " + proj.focus + " paling cepat tersampaikan lewat kata yang dominan." },
        { tag: "Image-Led", title: "Visual Dominan + Teks Ringkas",
          body: "Satu foto/ilustrasi penuh bidang jadi daya tarik utama, teks singkat sebagai penegas. Mengandalkan emosi visual untuk " + (aud.note.split(" ").slice(0, 6).join(" ")) + "…" },
        { tag: "System/Grid", title: "Komposisi Terstruktur",
          body: "Grid tegas membagi informasi jadi blok rapi — memberi kesan " + (STYLE_TRAITS[styleKey] ? STYLE_TRAITS[styleKey].mood : "teratur") + " dan memudahkan audiens memindai dari penting ke pendukung." }
      ];
      // Reorder so the most fitting concept comes first based on project type.
      if (proj.label === "Editorial" || proj.label === "Portofolio") directions.unshift(directions.splice(2, 1)[0]);
      else if (proj.label === "Media Sosial" || proj.label === "Poster") directions.unshift(directions.splice(1, 1)[0]);
      return directions;
    }

    function buildHierarchy(proj, input) {
      var base = proj.hierarchy.slice();
      return base.map(function (name, i) {
        var desc = {
          "Headline": "paling besar/tebal — menyuarakan \"" + (input.message || "pesan") + "\"",
          "Hook visual": "elemen penghenti scroll di area atas",
          "Logo": "ukuran terkecil yang tetap terbaca, posisi konsisten",
          "Judul": "pintu masuk; kontras tinggi dengan body",
          "Judul proyek": "nama karya + peranmu, jelas di awal",
          "Simbol/marka": "bentuk inti yang dikenali tanpa teks",
          "Visual utama": "mendukung headline, bukan menyainginya",
          "Hero karya": "karya terbaik tampil besar lebih dulu",
          "Info pendukung": "tanggal/lokasi/detail — ukuran sedang",
          "CTA": "ajakan bertindak; warna aksen agar menonjol"
        }[name] || "tingkat ke-" + (i + 1) + " dalam urutan baca";
        return { rank: i + 1, name: name, desc: desc };
      });
    }

    function buildLayout(proj, styleKey, input) {
      var s = STYLE_TRAITS[styleKey] || STYLE_TRAITS.minimalis;
      var media = input.media ? (" Untuk media " + input.media + ", pastikan margin aman & area teks tidak terlalu dekat tepi.") : "";
      var perType = {
        Poster: "Terapkan aturan sepertiga: fokus utama di sepertiga atas, CTA di bawah. Satu alur baca Z/F.",
        Branding: "Rancang sistem, bukan satu halaman: grid logo, jarak minimum, dan contoh aplikasi (kartu nama, feed, kemasan).",
        Logo: "Uji di ukuran 16px dan hitam-putih. Beri clear space = tinggi huruf utama di sekeliling marka.",
        Editorial: "Pakai grid kolom (mis. 12) + baseline grid. Konsisten pada margin dalam/luar untuk penjilidan.",
        "Media Sosial": "Desain safe-zone (hindari overlay UI platform). Siapkan varian 1:1, 4:5, 9:16.",
        Portofolio: "Satu grid konsisten antar halaman, satu karya dominan per halaman, ruang napas seragam."
      };
      return { comp: s.comp, rule: (perType[proj.label] || perType.Poster) + media };
    }

    function buildPrompt(input, styleKey, proj, palette) {
      var subject = input.message || input.goal || proj.label.toLowerCase() + " concept";
      var s = STYLE_TRAITS[styleKey] || STYLE_TRAITS.minimalis;
      var cols = palette.colors.slice(0, 3).map(function (c) { return c.hex; }).join(", ");
      var pos = subject + ", " + styleKey + " graphic design for " + proj.label.toLowerCase() +
        ", " + s.comp + ", color palette " + cols + ", strong visual hierarchy, " +
        (input.media ? input.media + " format, " : "") + "clean composition, professional, high detail, 4k";
      var neg = "blurry, low quality, watermark, distorted text, cluttered layout, cheap clipart";
      return { positive: pos, negative: neg };
    }

    function buildChecklist(proj, input, aud) {
      var items = [
        "Pesan utama (\"" + (input.message || "…") + "\") terbaca dalam 3–5 detik pertama",
        "Hierarki jelas: mata tahu harus melihat apa dulu",
        "Kontras teks terhadap latar cukup (uji keterbacaan)",
        "Palet konsisten & sesuai audiens (" + (input.audience || "umum") + ")",
        "Tipografi tidak lebih dari 2–3 jenis font",
        "Ruang kosong cukup — tidak sesak",
        "Alignment & grid konsisten di seluruh elemen",
        "Sesuai tujuan: " + (input.goal || "tujuan desain tercapai"),
        "Cocok untuk media/ukuran: " + (input.media || "media sasaran"),
        "Elemen branding (jika ada) ditempatkan konsisten"
      ];
      if ((input.constraints || "").trim()) items.push("Batasan khusus terpenuhi: " + input.constraints.trim());
      return items;
    }

    function buildBrief(input, proj, aud, styleKey) {
      var s = STYLE_TRAITS[styleKey] || STYLE_TRAITS.minimalis;
      return "Proyek " + proj.label + " yang bertujuan " + (input.goal || "menyampaikan pesan") +
        " kepada " + (input.audience || "audiens umum") + ". Pesan inti: \"" + (input.message || "—") + "\". " +
        "Arah visual " + styleKey + " (" + s.mood + ") dipilih karena selaras dengan " + proj.focus + ". " +
        (input.media ? "Media sasaran: " + input.media + ". " : "") +
        (input.colors ? "Preferensi warna: " + input.colors + ". " : "") +
        (input.constraints ? "Catatan khusus: " + input.constraints + "." : "");
    }

    // The whole demo "AI" result assembled from reasoned parts.
    function generateDemo(input) {
      var proj = PROJECT_TYPES[input.projectType] || PROJECT_TYPES.poster;
      var styleKey = detectStyleKey(input.style);
      var aud = detectAudience(input.audience);
      var palette = buildPalette(input, styleKey, aud);
      return {
        source: "demo",
        brief: buildBrief(input, proj, aud, styleKey),
        concepts: buildConcepts(input, styleKey, proj, aud),
        hierarchy: buildHierarchy(proj, input),
        palette: palette,
        audienceNote: aud.note,
        fonts: buildFonts(styleKey, input.projectType),
        layout: buildLayout(proj, styleKey, input),
        prompt: buildPrompt(input, styleKey, proj, palette),
        checklist: buildChecklist(proj, input, aud),
        meta: { style: styleKey, project: proj.label }
      };
    }

    /* =========================================================
       Backend integration (safe): try POST /api/assistant.
       The key lives on the server, never here. Falls back to demo.
       ========================================================= */
    function requestResult(input) {
      return new Promise(function (resolve) {
        if (location.protocol === "file:") { resolve(generateDemo(input)); return; }
        var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
        fetch("/api/assistant", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input), signal: ctrl ? ctrl.signal : undefined
        }).then(function (r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error("bad status " + r.status);
          return r.json();
        }).then(function (data) {
          if (data && data.brief && data.concepts) { data.source = "api"; resolve(data); }
          else resolve(generateDemo(input));
        }).catch(function () { clearTimeout(timer); resolve(generateDemo(input)); });
      });
    }

    /* =========================================================
       UI
       ========================================================= */
    var PROJECT_OPTIONS = [
      { v: "poster", l: "Poster" }, { v: "branding", l: "Branding" }, { v: "logo", l: "Logo" },
      { v: "editorial", l: "Editorial" }, { v: "sosmed", l: "Media Sosial" }, { v: "portofolio", l: "Portofolio" }
    ];

    function Assistant() {
      var input = {
        projectType: "poster", goal: "", audience: "", message: "", style: "", media: "", colors: "", constraints: ""
      };

      var page = el("div", { class: "page" });
      page.appendChild(el("div", { class: "page-head" }, [
        el("span", { class: "eyebrow", text: "AI Creative Assistant" }),
        el("h1", { text: "Dari Brief ke Arah Desain" }),
        el("p", { text: "Isi kebutuhan proyekmu, dapatkan brief, 3 konsep berbeda, hierarki, palet beralasan, font, layout, prompt AI, dan checklist. Setiap rekomendasi diturunkan dari input kamu." })
      ]));

      var resultWrap = el("div", { class: "ca-result" }, [emptyState()]);

      // ---- form ----
      var form = el("div", { class: "ca-form" });
      function textF(labelText, key, placeholder, ta) {
        var n = ta ? el("textarea", { placeholder: placeholder || "", onInput: function (e) { input[key] = e.target.value; } })
                   : el("input", { type: "text", placeholder: placeholder || "", onInput: function (e) { input[key] = e.target.value; } });
        return el("div", { class: "field" }, [el("label", { text: labelText }), n]);
      }
      var typeSeg = el("div", { class: "chips" });
      PROJECT_OPTIONS.forEach(function (o) {
        typeSeg.appendChild(el("button", { type: "button", class: "chip" + (o.v === input.projectType ? " active" : ""), text: o.l,
          onClick: function () { input.projectType = o.v; G.$$(".chip", typeSeg).forEach(function (c) { c.classList.remove("active"); }); this.classList.add("active"); } }));
      });

      form.appendChild(el("div", { class: "field" }, [el("label", { text: "Jenis Proyek" }), typeSeg]));
      form.appendChild(textF("Tujuan Desain", "goal", "mis. menarik pendaftaran lomba desain"));
      form.appendChild(textF("Target Audiens", "audience", "mis. mahasiswa & komunitas kreatif"));
      form.appendChild(textF("Pesan Utama", "message", "mis. Kreativitas Tanpa Batas"));
      form.appendChild(textF("Gaya Visual", "style", "mis. bold, minimalis, retro, futuristik"));
      form.appendChild(textF("Ukuran Media", "media", "mis. A3 cetak / 1080×1350 IG"));
      form.appendChild(textF("Warna Pilihan", "colors", "mis. ungu, atau #8B5CF6 (opsional)"));
      form.appendChild(textF("Batasan & Kebutuhan Khusus", "constraints", "mis. wajib ada logo kampus, hindari merah", true));
      form.appendChild(el("button", { class: "btn btn--block", type: "button", html: "<span>Hasilkan Rekomendasi</span>", onClick: run }));
      form.appendChild(el("p", { class: "hint mt-12", text: "Mode demo berjalan lokal (hasil simulasi, diturunkan dari input). Jika backend /api/assistant tersedia, hasil memakai AI API via server — key tidak pernah di frontend." }));

      page.appendChild(el("div", { class: "ca-shell" }, [form, resultWrap]));
      return page;

      function run() {
        if (!input.message.trim() && !input.goal.trim()) { toast("Isi minimal Tujuan atau Pesan Utama.", "error"); return; }
        resultWrap.innerHTML = "";
        resultWrap.appendChild(el("div", { class: "ca-block" }, [
          el("div", { class: "loading-dots", html: "<span></span><span></span><span></span>" }),
          el("p", { class: "muted mt-12", text: "Menyusun rekomendasi dari input kamu…" })
        ]));
        requestResult(input).then(function (res) { renderResult(res); });
      }

      function renderResult(res) {
        resultWrap.innerHTML = "";
        var modeLabel = res.source === "api" ? "Sumber: AI API (backend)" : "Mode Demo (simulasi lokal)";

        // Source note + save
        resultWrap.appendChild(el("div", { class: "ca-source-note" }, [
          el("span", { class: "ca-mode", text: modeLabel }),
          el("span", { text: "Jenis: " + (res.meta ? res.meta.project : "-") + " · Gaya: " + (res.meta ? res.meta.style : "-") }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", style: "margin-left:auto", html: "💾 Simpan ke Projects",
            onClick: function () { var rec = store.save({ type: "Assistant", title: "Brief: " + (input.message || input.goal || "Proyek"), payload: { input: input, result: res } }); if (rec) toast("Disimpan ke My Projects"); } }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", html: "📋 Salin Semua", onClick: function () { copyText(resultToText(res, input), "Semua rekomendasi disalin"); } })
        ]));

        // 1 Brief
        resultWrap.appendChild(block(1, "Ringkasan Brief", [el("p", { text: res.brief })]));

        // 2 Concepts
        var conceptGrid = el("div", { class: "ca-concepts" });
        res.concepts.forEach(function (co) {
          conceptGrid.appendChild(el("div", { class: "ca-concept" }, [
            el("span", { class: "ca-tag", text: co.tag }), el("h4", { text: co.title }), el("p", { text: co.body })
          ]));
        });
        resultWrap.appendChild(block(2, "Tiga Alternatif Konsep", [conceptGrid]));

        // 3 Hierarchy
        var hierList = el("ol", { class: "ca-hier" });
        res.hierarchy.forEach(function (h) {
          hierList.appendChild(el("li", {}, [
            el("span", { class: "ca-rank", text: "#" + h.rank }),
            el("span", { class: "ca-he-name", text: h.name }),
            el("span", { class: "ca-he-desc", text: h.desc })
          ]));
        });
        resultWrap.appendChild(block(3, "Hierarki Visual", [hierList]));

        // 4 Palette
        var sw = el("div", { class: "ca-swatches" });
        res.palette.colors.forEach(function (c) {
          sw.appendChild(el("div", { class: "ca-sw", title: "Klik untuk salin " + c.hex, onClick: function () { copyText(c.hex, c.hex + " disalin"); } }, [
            el("div", { class: "ca-sw__c", style: "background:" + c.hex }),
            el("div", { class: "ca-sw__h", text: c.hex }),
            el("div", { class: "ca-sw__r", text: c.role })
          ]));
        });
        var reasons = el("ul", { class: "ca-colreason" }, res.palette.colors.map(function (c) {
          return el("li", { html: "<b>" + escapeHtml(c.hex) + " " + escapeHtml(c.role) + "</b> — " + escapeHtml(c.why) }); }));
        resultWrap.appendChild(block(4, "Palet Warna & Alasan", [
          sw, el("p", { class: "ca-why", html: "<b>Dasar palet:</b> " + escapeHtml(res.palette.note) + ". Audiens: " + escapeHtml(res.audienceNote) + "." }), reasons
        ]));

        // 5 Fonts
        var fontRows = el("div", { class: "ca-fontuse" });
        res.fonts.pair.forEach(function (p) {
          fontRows.appendChild(el("div", { class: "ca-fontuse__row" }, [
            el("div", { class: "ca-fontuse__name", text: p[0] }), el("div", { class: "ca-fontuse__use", text: p[1] })
          ]));
        });
        resultWrap.appendChild(block(5, "Rekomendasi Font", [fontRows, el("p", { class: "ca-why", html: "<b>Skala & penggunaan:</b> " + escapeHtml(res.fonts.scaleNote) })]));

        // 6 Layout
        resultWrap.appendChild(block(6, "Komposisi & Layout", [
          el("p", { text: res.layout.comp }),
          el("p", { class: "ca-why", html: "<b>Aturan praktis:</b> " + escapeHtml(res.layout.rule) })
        ]));

        // 7 Prompt
        resultWrap.appendChild(block(7, "Prompt Gambar AI", [
          el("div", { class: "section-label", text: "Positive" }),
          el("div", { class: "ca-promptbox", text: res.prompt.positive }),
          el("button", { class: "btn btn--ghost btn--sm mt-12", type: "button", html: "📋 Salin Prompt", onClick: function () { copyText(res.prompt.positive, "Prompt disalin"); } }),
          el("div", { class: "section-label", style: "margin-top:12px", text: "Negative" }),
          el("div", { class: "ca-promptbox", text: res.prompt.negative })
        ]));

        // 8 Checklist (interactive)
        var cl = el("ul", { class: "ca-checklist" });
        res.checklist.forEach(function (item) {
          var li = el("li", {}, [
            el("input", { type: "checkbox", onChange: function (e) { li.classList.toggle("done", e.target.checked); } }),
            el("span", { text: item })
          ]);
          li.addEventListener("click", function (e) { if (e.target.tagName !== "INPUT") { var cb = li.querySelector("input"); cb.checked = !cb.checked; li.classList.toggle("done", cb.checked); } });
          cl.appendChild(li);
        });
        resultWrap.appendChild(block(8, "Checklist Evaluasi Desain", [cl]));
      }

      function block(n, title, children) {
        return el("div", { class: "ca-block" }, [
          el("h3", {}, [el("span", { class: "ca-num", text: String(n) }), document.createTextNode(title)])
        ].concat(children));
      }
    }

    function emptyState() {
      return el("div", { class: "ca-block" }, [
        el("div", { style: "text-align:center;padding:30px 10px;color:var(--text-muted)" }, [
          el("div", { html: '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5"><path d="M12 3a7 7 0 0 0-4 12.7V18h8v-2.3A7 7 0 0 0 12 3zM9 21h6M10 18v3M14 18v3"/></svg>' }),
          el("h3", { class: "mt-12", text: "Hasil akan muncul di sini" }),
          el("p", { class: "mt-12", text: "Isi form di kiri, lalu klik Hasilkan Rekomendasi." })
        ])
      ]);
    }

    function resultToText(res, input) {
      var lines = [];
      lines.push("GRAFIKAI — AI CREATIVE ASSISTANT (" + (res.source === "api" ? "AI API" : "mode demo") + ")");
      lines.push("Jenis: " + (res.meta ? res.meta.project : "-") + " | Gaya: " + (res.meta ? res.meta.style : "-"));
      lines.push("\n1. BRIEF\n" + res.brief);
      lines.push("\n2. KONSEP");
      res.concepts.forEach(function (c, i) { lines.push("  " + (i + 1) + ") [" + c.tag + "] " + c.title + " — " + c.body); });
      lines.push("\n3. HIERARKI VISUAL");
      res.hierarchy.forEach(function (h) { lines.push("  #" + h.rank + " " + h.name + ": " + h.desc); });
      lines.push("\n4. PALET WARNA");
      res.palette.colors.forEach(function (c) { lines.push("  " + c.hex + " (" + c.role + ") — " + c.why); });
      lines.push("  Dasar: " + res.palette.note);
      lines.push("\n5. FONT");
      res.fonts.pair.forEach(function (p) { lines.push("  " + p[0] + " — " + p[1]); });
      lines.push("  " + res.fonts.scaleNote);
      lines.push("\n6. LAYOUT\n  " + res.layout.comp + "\n  " + res.layout.rule);
      lines.push("\n7. PROMPT AI\n  POSITIVE: " + res.prompt.positive + "\n  NEGATIVE: " + res.prompt.negative);
      lines.push("\n8. CHECKLIST");
      res.checklist.forEach(function (c) { lines.push("  [ ] " + c); });
      return lines.join("\n");
    }

    /* ----- register ----- */
    G.registerRoute("/assistant", Assistant);
    var h = location.hash.replace(/^#/, "").split("?")[0];
    if (h === "/assistant") G.rerender();
  }

  if (window.GrafikAI && window.GrafikAI.registerRoute) { init(window.GrafikAI); }
  else {
    window.addEventListener("grafikai:ready", function () { if (window.GrafikAI) init(window.GrafikAI); });
    var tries = 0, t = setInterval(function () {
      tries++;
      if (window.GrafikAI && window.GrafikAI.registerRoute) { clearInterval(t); init(window.GrafikAI); }
      else if (tries > 50) clearInterval(t);
    }, 50);
  }
})();
