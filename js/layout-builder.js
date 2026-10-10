/* ============================================================
   GrafikAI — Portfolio & Poster Layout Builder
   Extends the core app via window.GrafikAI (classic script).
   Visual editor: left panel + live canvas. Save to localStorage,
   export to PDF (jsPDF + html2canvas) and PNG.
   ============================================================ */
(function () {
  "use strict";

  function init(G) {
    var el = G.el, toast = G.toast, store = G.store, escapeHtml = G.escapeHtml;

    /* =========================================================
       Storage (reuses the same store, with a 'kind' field in payload)
       ========================================================= */
    var LB_KEY = "grafikai.layouts.v1";
    var layoutStore = {
      all: function () {
        try {
          var raw = localStorage.getItem(LB_KEY);
          var arr = raw ? JSON.parse(raw) : [];
          return Array.isArray(arr) ? arr : [];
        } catch (e) { console.error(e); toast("Data layout rusak, memulai ulang.", "error"); return []; }
      },
      save: function (rec) {
        try {
          var list = layoutStore.all();
          rec.id = rec.id || "lb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          rec.updatedAt = Date.now();
          var i = -1;
          for (var k = 0; k < list.length; k++) { if (list[k].id === rec.id) { i = k; break; } }
          if (i >= 0) list[i] = rec; else list.unshift(rec);
          localStorage.setItem(LB_KEY, JSON.stringify(list));
          return rec;
        } catch (e) { console.error(e); toast("Gagal menyimpan (storage penuh / tidak tersedia).", "error"); return null; }
      },
      get: function (id) { return layoutStore.all().filter(function (r) { return r.id === id; })[0] || null; },
      remove: function (id) {
        try { localStorage.setItem(LB_KEY, JSON.stringify(layoutStore.all().filter(function (r) { return r.id !== id; }))); return true; }
        catch (e) { return false; }
      }
    };

    /* =========================================================
       Format definitions (px at ~96dpi-ish working size)
       We keep canvases at a manageable on-screen size; export scales up.
       ========================================================= */
    var PORTFOLIO_FORMATS = {
      "a4p": { label: "A4 Portrait", w: 595, h: 842, orient: "portrait", pdf: "a4" },
      "a4l": { label: "A4 Landscape", w: 842, h: 595, orient: "landscape", pdf: "a4" },
      "16x9": { label: "Presentasi 16:9", w: 854, h: 480, orient: "landscape", pdf: [854, 480] }
    };
    var POSTER_FORMATS = {
      "a4": { label: "A4", w: 595, h: 842, pdf: "a4" },
      "a3": { label: "A3", w: 842, h: 1191, pdf: "a3" },
      "digital": { label: "Digital 1080×1350", w: 540, h: 675, exportW: 1080, exportH: 1350, pdf: [1080, 1350] }
    };

    var PORTFOLIO_STYLES = {
      Minimalist: { font: "'Inter', sans-serif", head: "'Inter', sans-serif", bg: "#ffffff", text: "#1a1a1a", accent: "#8b5cf6", headWeight: 700 },
      Editorial: { font: "'Lato', Georgia, serif", head: "'Playfair Display', Georgia, serif", bg: "#faf7f2", text: "#211c17", accent: "#9a7b4f", headWeight: 700 },
      Modern: { font: "'Inter', sans-serif", head: "'Space Grotesk', sans-serif", bg: "#0f0f14", text: "#f4f2f8", accent: "#a78bfa", headWeight: 600 },
      Creative: { font: "'Poppins', sans-serif", head: "'Poppins', sans-serif", bg: "#fff5f7", text: "#2a1a2e", accent: "#e5366f", headWeight: 700 },
      "Swiss Design": { font: "'Helvetica Neue', Arial, sans-serif", head: "'Archivo Black', Arial, sans-serif", bg: "#ffffff", text: "#111111", accent: "#e3002b", headWeight: 900 }
    };
    var POSTER_STYLES = {
      Minimalist: { font: "'Inter', sans-serif", head: "'Inter', sans-serif", bg: "#f4f4f6", text: "#141414", accent: "#8b5cf6", headWeight: 700 },
      "Bold Typography": { font: "'Inter', sans-serif", head: "'Archivo Black', sans-serif", bg: "#111111", text: "#ffffff", accent: "#ffd400", headWeight: 900 },
      "Swiss Style": { font: "'Helvetica Neue', Arial, sans-serif", head: "'Archivo Black', Arial, sans-serif", bg: "#ffffff", text: "#111111", accent: "#e3002b", headWeight: 900 },
      Retro: { font: "'Work Sans', sans-serif", head: "'Righteous', cursive", bg: "#f3e9d2", text: "#43290a", accent: "#d1562f", headWeight: 700 },
      Futuristic: { font: "'Inter', sans-serif", head: "'Space Grotesk', sans-serif", bg: "#0a0a1a", text: "#e7f6ff", accent: "#00e0ff", headWeight: 600 },
      Editorial: { font: "'Lato', Georgia, serif", head: "'Playfair Display', Georgia, serif", bg: "#fbfaf7", text: "#1c1c1c", accent: "#9a7b4f", headWeight: 700 }
    };

    var PALETTES = [
      ["#8b5cf6", "#111111", "#ffffff"], ["#e3002b", "#111111", "#ffffff"],
      ["#00e0ff", "#0a0a1a", "#e7f6ff"], ["#ffd400", "#111111", "#ffffff"],
      ["#d1562f", "#43290a", "#f3e9d2"], ["#2ec4b6", "#011627", "#fdfffc"]
    ];

    /* =========================================================
       Helpers: read uploaded image as dataURL
       ========================================================= */
    function readImage(file, cb) {
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast("File harus berupa gambar.", "error"); return; }
      if (file.size > 8 * 1024 * 1024) { toast("Gambar terlalu besar (maks 8MB).", "error"); return; }
      var reader = new FileReader();
      reader.onload = function () { cb(reader.result); };
      reader.onerror = function () { toast("Gagal membaca gambar.", "error"); };
      reader.readAsDataURL(file);
    }

    function imgSlot(getUrl, setUrl, extraStyle) {
      var slot = el("div", { class: "lb-img-slot", style: extraStyle || "" });
      var input = el("input", { type: "file", accept: "image/*", style: "display:none" });
      function paint() {
        slot.innerHTML = "";
        var url = getUrl();
        if (url) {
          slot.appendChild(el("img", { src: url, alt: "Karya desain" }));
          var rm = el("button", { class: "lb-img-remove", type: "button", title: "Hapus gambar", text: "×",
            onClick: function (e) { e.stopPropagation(); setUrl(""); paint(); } });
          slot.appendChild(rm);
        } else {
          slot.appendChild(el("span", { class: "lb-img-hint", html: "＋<br>Tambah gambar" }));
        }
      }
      slot.addEventListener("click", function () { input.click(); });
      input.addEventListener("change", function (e) {
        var f = e.target.files && e.target.files[0];
        readImage(f, function (dataUrl) { setUrl(dataUrl); paint(); });
        input.value = "";
      });
      slot.appendChild(input);
      paint();
      slot._repaint = paint;
      return slot;
    }

    /* =========================================================
       Export (PDF via jsPDF + html2canvas; PNG via html2canvas)
       ========================================================= */
    function overlay(msg) {
      var o = el("div", { class: "lb-overlay" }, [
        el("div", { class: "card" }, [
          el("div", { class: "loading-dots", html: "<span></span><span></span><span></span>" }),
          el("p", { class: "mt-12", text: msg || "Memproses…" })
        ])
      ]);
      document.body.appendChild(o);
      return o;
    }

    function ensureLibs() {
      return typeof window.html2canvas === "function" &&
             (window.jspdf || window.jsPDF);
    }

    function captureCanvas(node, scale) {
      return window.html2canvas(node, {
        scale: scale || 2,
        useCORS: true, allowTaint: false,
        backgroundColor: null, logging: false
      });
    }

    function exportPNG(node, filename) {
      if (typeof window.html2canvas !== "function") {
        toast("Library export belum termuat. Butuh koneksi internet.", "error"); return;
      }
      var o = overlay("Membuat PNG…");
      captureCanvas(node, 2).then(function (cv) {
        var a = document.createElement("a");
        a.href = cv.toDataURL("image/png");
        a.download = (filename || "grafikai") + ".png";
        document.body.appendChild(a); a.click(); a.remove();
        document.body.removeChild(o);
        toast("PNG berhasil diunduh");
      }).catch(function (err) {
        console.error(err); document.body.removeChild(o);
        toast("Gagal membuat PNG. Coba lagi.", "error");
      });
    }

    // nodes: array of canvas DOM nodes (multi-page). pdfSize: 'a4'/'a3' or [w,h] in px.
    function exportPDF(nodes, pdfSize, orientation, filename) {
      if (!ensureLibs()) { toast("Library export belum termuat. Butuh koneksi internet.", "error"); return; }
      var jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPDFCtor) { toast("jsPDF tidak tersedia.", "error"); return; }

      var o = overlay("Membuat PDF…");
      var isCustom = Array.isArray(pdfSize);
      var pdf;
      if (isCustom) {
        pdf = new jsPDFCtor({ orientation: pdfSize[0] >= pdfSize[1] ? "landscape" : "portrait", unit: "px", format: [pdfSize[0], pdfSize[1]] });
      } else {
        pdf = new jsPDFCtor({ orientation: orientation || "portrait", unit: "mm", format: pdfSize || "a4" });
      }

      var i = 0;
      function next() {
        if (i >= nodes.length) {
          pdf.save((filename || "grafikai") + ".pdf");
          document.body.removeChild(o);
          toast("PDF berhasil diunduh");
          return;
        }
        captureCanvas(nodes[i], 2).then(function (cv) {
          var imgData = cv.toDataURL("image/jpeg", 0.95);
          if (i > 0) pdf.addPage();
          var pw = pdf.internal.pageSize.getWidth();
          var ph = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, "JPEG", 0, 0, pw, ph);
          i++; next();
        }).catch(function (err) {
          console.error(err); document.body.removeChild(o);
          toast("Gagal membuat PDF pada halaman " + (i + 1) + ".", "error");
        });
      }
      next();
    }

    /* =========================================================
       UI primitives
       ========================================================= */
    function group(label, children) {
      return el("div", { class: "lb-group" }, [el("div", { class: "section-label", text: label })].concat(children));
    }
    function textField(labelText, value, onInput, textarea) {
      var inp = textarea
        ? el("textarea", { onInput: function (e) { onInput(e.target.value); } })
        : el("input", { type: "text", onInput: function (e) { onInput(e.target.value); } });
      inp.value = value || "";
      return el("div", { class: "lb-field" }, [el("label", { text: labelText }), inp]);
    }
    function colorField(labelText, value, onInput) {
      var inp = el("input", { type: "color", value: value, onInput: function (e) { onInput(e.target.value); hex.textContent = e.target.value; } });
      var hex = el("span", { text: value });
      return el("div", { class: "lb-field" }, [el("label", { text: labelText }), el("div", { class: "lb-color" }, [inp, hex])]);
    }
    function rangeField(labelText, value, min, max, step, onInput) {
      var val = el("span", { class: "lb-range-val", text: value });
      var inp = el("input", { type: "range", class: "lb-range", min: min, max: max, step: step || 1, value: value,
        onInput: function (e) { val.textContent = e.target.value; onInput(parseFloat(e.target.value)); } });
      return el("div", { class: "lb-field" }, [el("label", {}, [document.createTextNode(labelText), val]), inp]);
    }
    function segmented(options, current, onPick) {
      var wrap = el("div", { class: "seg" });
      options.forEach(function (opt) {
        var value = typeof opt === "string" ? opt : opt.value;
        var label = typeof opt === "string" ? opt : opt.label;
        var b = el("button", { type: "button", class: current === value ? "active" : "", text: label,
          onClick: function () {
            G.$$("button", wrap).forEach(function (x) { x.classList.remove("active"); });
            b.classList.add("active"); onPick(value);
          } });
        wrap.appendChild(b);
      });
      return wrap;
    }

    /* fit canvas into available width by scaling */
    function fitCanvas(canvas, format) {
      var scroll = canvas.parentNode;
      if (!scroll) return;
      var avail = scroll.clientWidth - 8;
      var scale = Math.min(1, avail / format.w);
      canvas.style.transform = "scale(" + scale + ")";
      // reserve height for scaled canvas so layout doesn't collapse
      scroll.style.height = (format.h * scale + 4) + "px";
    }

    /* =========================================================
       PORTFOLIO BUILDER
       ========================================================= */
    var PORTFOLIO_TEMPLATES = [
      { id: "pf-min-grid", name: "Clean Grid", cat: "Minimalist", style: "Minimalist", layout: "grid", pages: 5 },
      { id: "pf-edi-split", name: "Editorial Split", cat: "Editorial", style: "Editorial", layout: "split", pages: 5 },
      { id: "pf-mod-img", name: "Dark Showcase", cat: "Modern", style: "Modern", layout: "image", pages: 5 },
      { id: "pf-cre-type", name: "Creative Type", cat: "Creative", style: "Creative", layout: "typography", pages: 3 },
      { id: "pf-swiss-grid", name: "Swiss Grid", cat: "Swiss Design", style: "Swiss Design", layout: "grid", pages: 8 },
      { id: "pf-min-type", name: "Quiet Type", cat: "Minimalist", style: "Minimalist", layout: "typography", pages: 3 }
    ];

    var PAGE_TYPES = ["cover", "about", "showcase", "process", "contact"];
    function pageTypeLabel(t) {
      return { cover: "Cover", about: "About Me", showcase: "Project Showcase", process: "Design Process", contact: "Contact" }[t] || t;
    }
    function buildPageSequence(count) {
      // cover, about, then showcase/process repeated, contact last
      var seq = ["cover", "about"];
      var middle = count - 3; // minus cover, about, contact
      for (var i = 0; i < middle; i++) { seq.push(i % 2 === 0 ? "showcase" : "process"); }
      seq.push("contact");
      return seq.slice(0, count);
    }

    function defaultPortfolioState(tpl) {
      return {
        kind: "portfolio",
        format: "a4p",
        style: tpl ? tpl.style : "Minimalist",
        layout: tpl ? tpl.layout : "grid",
        pageCount: tpl ? tpl.pages : 5,
        titleSize: 44,
        spacing: 28,
        bg: null, text: null, accent: null, // null = use style default
        designer: "Nama Desainer",
        major: "Desain Komunikasi Visual",
        about: "Deskripsi singkat tentang diri dan minat desain kamu.",
        projectTitle: "Judul Proyek",
        contactEmail: "email@contoh.com",
        contactPhone: "0812-xxxx-xxxx",
        images: {} // key "pageIndex:slotIndex" -> dataURL
      };
    }

    function portfolioColors(st) {
      var s = PORTFOLIO_STYLES[st.style] || PORTFOLIO_STYLES.Minimalist;
      return { bg: st.bg || s.bg, text: st.text || s.text, accent: st.accent || s.accent, font: s.font, head: s.head, hw: s.headWeight };
    }

    function renderPortfolioPage(st, pageType, pageIndex) {
      var c = portfolioColors(st);
      var fmt = PORTFOLIO_FORMATS[st.format];
      var pad = Math.round(fmt.w * 0.09);
      var canvas = el("div", { class: "lb-canvas", style:
        "width:" + fmt.w + "px;height:" + fmt.h + "px;background:" + c.bg + ";color:" + c.text +
        ";font-family:" + c.font + ";padding:" + pad + "px;box-sizing:border-box;display:flex;flex-direction:column;gap:" + st.spacing + "px;" });

      function editable(tag, text, styleStr, onCommit) {
        var n = el(tag, { class: "lb-el", contenteditable: "true", style: styleStr, text: text });
        n.addEventListener("blur", function () { onCommit && onCommit(n.textContent); });
        n.addEventListener("keydown", function (e) { if (tag !== "div" && e.key === "Enter") { e.preventDefault(); n.blur(); } });
        return n;
      }
      function heading(text, size, onCommit) {
        return editable("h1", text, "font-family:" + c.head + ";font-weight:" + c.hw + ";font-size:" + size + "px;line-height:1.05;margin:0;color:" + c.text + ";", onCommit);
      }
      function accentBar() { return el("div", { style: "width:60px;height:6px;background:" + c.accent + ";border-radius:3px;" }); }

      function imageAt(slotIndex, styleStr) {
        var key = pageIndex + ":" + slotIndex;
        return imgSlot(function () { return st.images[key] || ""; }, function (v) { if (v) st.images[key] = v; else delete st.images[key]; }, styleStr + "border-radius:6px;");
      }

      if (pageType === "cover") {
        canvas.style.justifyContent = "center";
        canvas.appendChild(accentBar());
        canvas.appendChild(heading(st.designer, st.titleSize, function (v) { st.designer = v; }));
        canvas.appendChild(editable("div", st.major, "font-size:18px;opacity:.75;", function (v) { st.major = v; }));
        canvas.appendChild(editable("div", "PORTFOLIO", "font-size:14px;letter-spacing:.3em;color:" + c.accent + ";font-weight:600;margin-top:12px;"));
      } else if (pageType === "about") {
        canvas.appendChild(heading("About Me", Math.round(st.titleSize * 0.72), null));
        canvas.appendChild(accentBar());
        var aboutRow = el("div", { style: "display:flex;gap:" + st.spacing + "px;flex:1;" + (st.layout === "split" ? "" : "flex-direction:column;") });
        aboutRow.appendChild(imageAt(0, "flex:1;min-height:160px;"));
        aboutRow.appendChild(editable("div", st.about, "flex:1;font-size:16px;line-height:1.7;", function (v) { st.about = v; }));
        canvas.appendChild(aboutRow);
      } else if (pageType === "showcase") {
        canvas.appendChild(heading(st.projectTitle, Math.round(st.titleSize * 0.72), function (v) { st.projectTitle = v; }));
        canvas.appendChild(accentBar());
        var body = el("div", { style: "flex:1;display:grid;gap:" + st.spacing + "px;" });
        if (st.layout === "grid") { body.style.gridTemplateColumns = "1fr 1fr"; body.appendChild(imageAt(0, "")); body.appendChild(imageAt(1, "")); body.appendChild(imageAt(2, "")); body.appendChild(imageAt(3, "")); }
        else if (st.layout === "split") { body.style.gridTemplateColumns = "1.4fr 1fr"; body.appendChild(imageAt(0, "")); body.appendChild(el("div", {}, [editable("div", "Deskripsi proyek, peran kamu, dan hasilnya.", "font-size:14px;line-height:1.7;")])); }
        else if (st.layout === "image") { body.appendChild(imageAt(0, "min-height:300px;")); }
        else { body.appendChild(el("div", { style: "display:flex;align-items:center;justify-content:center;flex:1;" }, [editable("div", "Konsep & narasi proyek sebagai elemen utama.", "font-size:26px;font-family:" + c.head + ";line-height:1.3;max-width:80%;text-align:center;")])); }
        canvas.appendChild(body);
      } else if (pageType === "process") {
        canvas.appendChild(heading("Design Process", Math.round(st.titleSize * 0.72), null));
        canvas.appendChild(accentBar());
        var steps = el("div", { style: "flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:" + st.spacing + "px;" });
        ["Riset", "Konsep", "Eksekusi"].forEach(function (s, idx) {
          steps.appendChild(el("div", { style: "display:flex;flex-direction:column;gap:10px;" }, [
            el("div", { style: "font-family:" + c.head + ";font-size:28px;color:" + c.accent + ";font-weight:" + c.hw + ";", text: "0" + (idx + 1) }),
            editable("div", s, "font-weight:700;font-size:16px;"),
            imageAt(idx, "flex:1;min-height:120px;")
          ]));
        });
        canvas.appendChild(steps);
      } else if (pageType === "contact") {
        canvas.style.justifyContent = "center";
        canvas.appendChild(heading("Let's Connect", Math.round(st.titleSize * 0.82), null));
        canvas.appendChild(accentBar());
        canvas.appendChild(editable("div", st.contactEmail, "font-size:18px;", function (v) { st.contactEmail = v; }));
        canvas.appendChild(editable("div", st.contactPhone, "font-size:18px;", function (v) { st.contactPhone = v; }));
        canvas.appendChild(editable("div", st.designer, "font-size:14px;opacity:.6;margin-top:10px;", function (v) { st.designer = v; }));
      }
      return canvas;
    }

    function PortfolioBuilder(params) {
      var tpl = params && params.tpl ? PORTFOLIO_TEMPLATES.filter(function (t) { return t.id === params.tpl; })[0] : null;
      var loaded = params && params.load ? layoutStore.get(params.load) : null;
      var st = loaded ? loaded.payload : defaultPortfolioState(tpl);
      if (!st.images) st.images = {};

      var page = el("div", { class: "lb" });
      page.appendChild(headerBlock("Portfolio Layout Builder", "Susun portofolio DKV secara visual. Klik teks untuk mengedit, klik kotak gambar untuk mengunggah karya."));

      var pagesWrap = el("div", { class: "lb-pages" });
      var canvasNodes = [];

      function rebuild() {
        pagesWrap.innerHTML = ""; canvasNodes = [];
        var seq = buildPageSequence(st.pageCount);
        var fmt = PORTFOLIO_FORMATS[st.format];
        seq.forEach(function (ptype, idx) {
          var scroll = el("div", { class: "lb-scroll" });
          var canvas = renderPortfolioPage(st, ptype, idx);
          scroll.appendChild(canvas);
          pagesWrap.appendChild(el("div", { style: "width:100%;" }, [
            el("div", { class: "lb-page-label", text: "Hal " + (idx + 1) + " · " + pageTypeLabel(ptype) }),
            scroll
          ]));
          canvasNodes.push(canvas);
          requestAnimationFrame(function () { fitCanvas(canvas, fmt); });
        });
      }

      // ---- settings panel ----
      var panel = el("div", { class: "lb-panel" });
      function buildPanel() {
        panel.innerHTML = "";
        panel.appendChild(group("Format", [segmented(
          Object.keys(PORTFOLIO_FORMATS).map(function (k) { return { value: k, label: PORTFOLIO_FORMATS[k].label }; }),
          st.format, function (v) { st.format = v; rebuild(); })]));
        panel.appendChild(group("Gaya", [segmented(Object.keys(PORTFOLIO_STYLES), st.style, function (v) { st.style = v; buildPanel(); rebuild(); })]));
        panel.appendChild(group("Jumlah Halaman", [segmented(
          [{ value: 3, label: "3" }, { value: 5, label: "5" }, { value: 8, label: "8" }, { value: 10, label: "10" }],
          st.pageCount, function (v) { st.pageCount = v; rebuild(); })]));
        panel.appendChild(group("Layout Showcase", [segmented(
          [{ value: "grid", label: "Grid" }, { value: "split", label: "Split" }, { value: "image", label: "Image" }, { value: "typography", label: "Type" }],
          st.layout, function (v) { st.layout = v; rebuild(); })]));

        panel.appendChild(group("Identitas", [
          textField("Nama Desainer", st.designer, function (v) { st.designer = v; rebuild(); }),
          textField("Jurusan", st.major, function (v) { st.major = v; rebuild(); }),
          textField("Deskripsi Diri", st.about, function (v) { st.about = v; rebuild(); }, true),
          textField("Judul Proyek", st.projectTitle, function (v) { st.projectTitle = v; rebuild(); })
        ]));
        panel.appendChild(group("Kontak", [
          textField("Email", st.contactEmail, function (v) { st.contactEmail = v; rebuild(); }),
          textField("Telepon", st.contactPhone, function (v) { st.contactPhone = v; rebuild(); })
        ]));

        var c = portfolioColors(st);
        panel.appendChild(group("Warna & Tipografi", [
          colorField("Background", c.bg, function (v) { st.bg = v; rebuild(); }),
          colorField("Teks", c.text, function (v) { st.text = v; rebuild(); }),
          colorField("Aksen", c.accent, function (v) { st.accent = v; rebuild(); }),
          rangeField("Ukuran Judul", st.titleSize, 28, 72, 1, function (v) { st.titleSize = v; rebuild(); }),
          rangeField("Jarak Elemen", st.spacing, 10, 60, 1, function (v) { st.spacing = v; rebuild(); })
        ]));
        panel.appendChild(el("button", { class: "btn btn--ghost btn--sm btn--block", type: "button", text: "Reset Warna ke Gaya",
          onClick: function () { st.bg = st.text = st.accent = null; buildPanel(); rebuild(); } }));
      }
      buildPanel();

      // ---- toolbar ----
      var toolbar = el("div", { class: "lb-toolbar" }, [
        el("div", { class: "lb-toolbar__group" }, [
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "⟳ Reset Layout",
            onClick: function () { if (confirm("Reset ke pengaturan awal? Teks dan gambar akan hilang.")) { st = defaultPortfolioState(tpl); buildPanel(); rebuild(); toast("Layout direset"); } } }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "⤓ Ganti Template", onClick: function () { G.navigate("#/templates?type=portfolio"); } })
        ]),
        el("div", { class: "lb-toolbar__group" }, [
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "💾 Simpan", onClick: doSave }),
          el("button", { class: "btn", type: "button", text: "⤑ Export PDF", onClick: doExport })
        ])
      ]);

      function doSave() {
        var rec = layoutStore.save({ id: loaded ? loaded.id : null, kind: "portfolio",
          title: st.designer + " — Portfolio", payload: st });
        if (rec) { loaded = rec; toast("Portfolio tersimpan"); }
      }
      function doExport() {
        var fmt = PORTFOLIO_FORMATS[st.format];
        exportPDF(canvasNodes, fmt.pdf, fmt.orient, (st.designer || "portfolio").replace(/\s+/g, "_"));
      }

      var stage = el("div", { class: "lb-stage-wrap" }, [toolbar, pagesWrap,
        el("p", { class: "lb-note", text: "Export PDF memakai html2canvas + jsPDF (butuh internet untuk memuat library). Satu halaman portofolio = satu halaman PDF." })]);

      page.appendChild(el("div", { class: "lb-shell" }, [panel, stage]));
      rebuild();

      window.addEventListener("resize", onResize);
      function onResize() { var fmt = PORTFOLIO_FORMATS[st.format]; canvasNodes.forEach(function (cv) { fitCanvas(cv, fmt); }); }
      page._cleanup = function () { window.removeEventListener("resize", onResize); };

      return page;
    }

    /* =========================================================
       POSTER BUILDER
       ========================================================= */
    var POSTER_TEMPLATES = [
      { id: "po-min-center", name: "Clean Center", cat: "Minimalist", style: "Minimalist", layout: "centered" },
      { id: "po-bold-type", name: "Loud Headline", cat: "Bold Typography", style: "Bold Typography", layout: "asymmetric" },
      { id: "po-swiss-grid", name: "Swiss Grid", cat: "Swiss Style", style: "Swiss Style", layout: "grid" },
      { id: "po-retro-split", name: "Retro Split", cat: "Retro", style: "Retro", layout: "split" },
      { id: "po-futur-img", name: "Neon Focus", cat: "Futuristic", style: "Futuristic", layout: "image" },
      { id: "po-edi-center", name: "Editorial Poster", cat: "Editorial", style: "Editorial", layout: "centered" }
    ];

    function defaultPosterState(tpl) {
      return {
        kind: "poster",
        format: "a4",
        style: tpl ? tpl.style : "Minimalist",
        layout: tpl ? tpl.layout : "centered",
        titleSize: 56, align: "left", spacing: 18,
        bg: null, text: null, accent: null,
        title: "JUDUL POSTER",
        subtitle: "Subjudul atau tagline singkat",
        description: "Deskripsi acara, informasi utama, atau pesan poster.",
        date: "", location: "", extra: "info tambahan / kontak",
        image: ""
      };
    }
    function posterColors(st) {
      var s = POSTER_STYLES[st.style] || POSTER_STYLES.Minimalist;
      return { bg: st.bg || s.bg, text: st.text || s.text, accent: st.accent || s.accent, font: s.font, head: s.head, hw: s.headWeight };
    }

    function renderPosterCanvas(st) {
      var c = posterColors(st);
      var fmt = POSTER_FORMATS[st.format];
      var pad = Math.round(fmt.w * 0.08);
      var canvas = el("div", { class: "lb-canvas", style:
        "width:" + fmt.w + "px;height:" + fmt.h + "px;background:" + c.bg + ";color:" + c.text + ";font-family:" + c.font +
        ";padding:" + pad + "px;box-sizing:border-box;position:relative;overflow:hidden;" });

      function editable(tag, text, styleStr, onCommit) {
        var n = el(tag, { class: "lb-el", contenteditable: "true", style: styleStr, text: text });
        n.addEventListener("blur", function () { onCommit && onCommit(n.textContent); });
        return n;
      }
      function title() { return editable("h1", st.title, "font-family:" + c.head + ";font-weight:" + c.hw + ";font-size:" + st.titleSize + "px;line-height:1.0;margin:0;text-align:" + st.align + ";", function (v) { st.title = v; }); }
      function subtitle() { return editable("div", st.subtitle, "font-size:" + Math.round(st.titleSize * 0.4) + "px;color:" + c.accent + ";font-weight:600;text-align:" + st.align + ";margin-top:8px;", function (v) { st.subtitle = v; }); }
      function desc() { return editable("div", st.description, "font-size:16px;line-height:1.6;text-align:" + st.align + ";", function (v) { st.description = v; }); }
      function metaRow() {
        var parts = [];
        if (st.date || st.location) {
          parts.push(editable("div", (st.date || "Tanggal") + "  ·  " + (st.location || "Lokasi"), "font-size:15px;font-weight:600;text-align:" + st.align + ";"));
        }
        parts.push(editable("div", st.extra, "font-size:13px;opacity:.75;text-align:" + st.align + ";", function (v) { st.extra = v; }));
        return el("div", { style: "display:flex;flex-direction:column;gap:6px;" }, parts);
      }
      function image(styleStr) {
        return imgSlot(function () { return st.image || ""; }, function (v) { st.image = v; }, (styleStr || "") + "border-radius:6px;");
      }

      var stack = "display:flex;flex-direction:column;gap:" + st.spacing + "px;height:100%;box-sizing:border-box;";

      if (st.layout === "centered") {
        canvas.appendChild(el("div", { style: stack + "justify-content:center;text-align:center;" }, [title(), subtitle(), image("width:100%;height:38%;"), desc(), metaRow()]));
      } else if (st.layout === "asymmetric") {
        canvas.appendChild(el("div", { style: stack }, [
          el("div", { style: "margin-top:auto;" }, [title(), subtitle()]),
          image("width:70%;height:30%;align-self:flex-end;"),
          desc(), metaRow()
        ]));
      } else if (st.layout === "split") {
        canvas.style.padding = "0";
        canvas.appendChild(el("div", { style: "display:flex;height:100%;" }, [
          el("div", { style: "flex:1;" }, [image("width:100%;height:100%;border-radius:0;")]),
          el("div", { style: "flex:1;padding:" + pad + "px;display:flex;flex-direction:column;gap:" + st.spacing + "px;justify-content:center;" }, [title(), subtitle(), desc(), metaRow()])
        ]));
      } else if (st.layout === "grid") {
        canvas.appendChild(el("div", { style: "display:grid;grid-template-rows:auto 1fr auto;gap:" + st.spacing + "px;height:100%;" }, [
          el("div", {}, [title(), subtitle()]),
          image("width:100%;height:100%;"),
          el("div", { style: "border-top:3px solid " + c.accent + ";padding-top:12px;" }, [desc(), metaRow()])
        ]));
      } else { // image-focused
        canvas.style.padding = "0";
        canvas.appendChild(image("position:absolute;inset:0;width:100%;height:100%;border-radius:0;"));
        canvas.appendChild(el("div", { style: "position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.05));" }));
        canvas.appendChild(el("div", { style: "position:absolute;left:0;right:0;bottom:0;padding:" + pad + "px;color:#fff;display:flex;flex-direction:column;gap:10px;" }, [
          editable("h1", st.title, "font-family:" + c.head + ";font-weight:" + c.hw + ";font-size:" + st.titleSize + "px;line-height:1;margin:0;color:#fff;", function (v) { st.title = v; }),
          editable("div", st.subtitle, "font-size:" + Math.round(st.titleSize * 0.4) + "px;color:" + c.accent + ";font-weight:600;", function (v) { st.subtitle = v; }),
          editable("div", (st.date || "Tanggal") + " · " + (st.location || "Lokasi"), "font-size:15px;color:#fff;")
        ]));
      }
      return canvas;
    }

    function PosterBuilder(params) {
      var tpl = params && params.tpl ? POSTER_TEMPLATES.filter(function (t) { return t.id === params.tpl; })[0] : null;
      var loaded = params && params.load ? layoutStore.get(params.load) : null;
      var st = loaded ? loaded.payload : defaultPosterState(tpl);

      var page = el("div", { class: "lb" });
      page.appendChild(headerBlock("Poster Layout Builder", "Rancang poster secara visual. Klik teks untuk mengedit, klik area gambar untuk upload. Export ke PDF atau PNG."));

      var scroll = el("div", { class: "lb-scroll" });
      var canvasNode = null;

      function rebuild() {
        scroll.innerHTML = "";
        canvasNode = renderPosterCanvas(st);
        scroll.appendChild(canvasNode);
        requestAnimationFrame(function () { fitCanvas(canvasNode, POSTER_FORMATS[st.format]); });
      }

      var panel = el("div", { class: "lb-panel" });
      function buildPanel() {
        panel.innerHTML = "";
        panel.appendChild(group("Ukuran", [segmented(
          Object.keys(POSTER_FORMATS).map(function (k) { return { value: k, label: POSTER_FORMATS[k].label }; }),
          st.format, function (v) { st.format = v; rebuild(); })]));
        panel.appendChild(group("Gaya", [segmented(Object.keys(POSTER_STYLES), st.style, function (v) { st.style = v; buildPanel(); rebuild(); })]));
        panel.appendChild(group("Layout", [segmented(
          [{ value: "centered", label: "Center" }, { value: "asymmetric", label: "Asym" }, { value: "split", label: "Split" }, { value: "grid", label: "Grid" }, { value: "image", label: "Image" }],
          st.layout, function (v) { st.layout = v; rebuild(); })]));
        panel.appendChild(group("Alignment Teks", [segmented(
          [{ value: "left", label: "Kiri" }, { value: "center", label: "Tengah" }, { value: "right", label: "Kanan" }],
          st.align, function (v) { st.align = v; rebuild(); })]));

        panel.appendChild(group("Konten", [
          textField("Judul", st.title, function (v) { st.title = v; rebuild(); }),
          textField("Subjudul", st.subtitle, function (v) { st.subtitle = v; rebuild(); }),
          textField("Deskripsi", st.description, function (v) { st.description = v; rebuild(); }, true),
          textField("Tanggal", st.date, function (v) { st.date = v; rebuild(); }),
          textField("Lokasi", st.location, function (v) { st.location = v; rebuild(); }),
          textField("Info Tambahan", st.extra, function (v) { st.extra = v; rebuild(); })
        ]));

        var c = posterColors(st);
        panel.appendChild(group("Warna & Tipografi", [
          colorField("Background", c.bg, function (v) { st.bg = v; rebuild(); }),
          colorField("Teks", c.text, function (v) { st.text = v; rebuild(); }),
          colorField("Aksen", c.accent, function (v) { st.accent = v; rebuild(); }),
          rangeField("Ukuran Judul", st.titleSize, 28, 96, 1, function (v) { st.titleSize = v; rebuild(); }),
          rangeField("Jarak Elemen", st.spacing, 6, 48, 1, function (v) { st.spacing = v; rebuild(); })
        ]));

        // Recommendations (reuse core generators)
        var recRow = el("div", { class: "lb-row", style: "flex-direction:column;gap:8px;" });
        recRow.appendChild(el("button", { class: "btn btn--ghost btn--sm btn--block", type: "button", text: "🎨 Rekomendasi Palet",
          onClick: function () {
            try {
              var pal = (G.generatePalette ? G.generatePalette({ theme: st.title, style: "" }).colors : null);
              if (pal && pal.length >= 3) { st.accent = pal[2].hex; st.bg = pal[4].hex; st.text = pal[0].hex; buildPanel(); rebuild(); toast("Palet diterapkan"); }
            } catch (e) { toast("Gagal membuat palet.", "error"); }
          } }));
        recRow.appendChild(el("button", { class: "btn btn--ghost btn--sm btn--block", type: "button", text: "↺ Reset Warna ke Gaya",
          onClick: function () { st.bg = st.text = st.accent = null; buildPanel(); rebuild(); } }));
        panel.appendChild(group("Bantuan Desain", [recRow]));
      }
      buildPanel();

      var toolbar = el("div", { class: "lb-toolbar" }, [
        el("div", { class: "lb-toolbar__group" }, [
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "⟳ Reset",
            onClick: function () { if (confirm("Reset poster ke awal? Teks dan gambar hilang.")) { st = defaultPosterState(tpl); buildPanel(); rebuild(); toast("Poster direset"); } } }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "⤓ Ganti Template", onClick: function () { G.navigate("#/templates?type=poster"); } }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "✕ Hapus Gambar", onClick: function () { st.image = ""; rebuild(); } })
        ]),
        el("div", { class: "lb-toolbar__group" }, [
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "💾 Simpan", onClick: doSave }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "🖼 PNG", onClick: doPNG }),
          el("button", { class: "btn", type: "button", text: "⤑ PDF", onClick: doPDF })
        ])
      ]);

      function doSave() { var rec = layoutStore.save({ id: loaded ? loaded.id : null, kind: "poster", title: (st.title || "Poster") + " — Poster", payload: st }); if (rec) { loaded = rec; toast("Poster tersimpan"); } }
      function doPNG() { exportPNG(canvasNode, (st.title || "poster").replace(/\s+/g, "_")); }
      function doPDF() { var fmt = POSTER_FORMATS[st.format]; exportPDF([canvasNode], fmt.pdf, fmt.w >= fmt.h ? "landscape" : "portrait", (st.title || "poster").replace(/\s+/g, "_")); }

      var stage = el("div", { class: "lb-stage-wrap" }, [toolbar, scroll,
        el("p", { class: "lb-note", text: "Export PDF/PNG memakai html2canvas + jsPDF (butuh internet untuk library). Hasil mengikuti tampilan canvas." })]);

      page.appendChild(el("div", { class: "lb-shell" }, [panel, stage]));
      rebuild();

      window.addEventListener("resize", onResize);
      function onResize() { if (canvasNode) fitCanvas(canvasNode, POSTER_FORMATS[st.format]); }
      page._cleanup = function () { window.removeEventListener("resize", onResize); };
      return page;
    }

    /* =========================================================
       TEMPLATE GALLERY
       ========================================================= */
    function miniPortfolioThumb(tpl) {
      var c = portfolioColors({ style: tpl.style });
      var wrap = el("div", { class: "tpl-thumb", style: "background:" + c.bg + ";" });
      var inner = el("div", { style: "position:absolute;inset:10%;display:flex;flex-direction:column;gap:6px;color:" + c.text + ";font-family:" + c.head + ";" });
      inner.appendChild(el("div", { style: "width:40%;height:5px;background:" + c.accent + ";border-radius:3px;" }));
      inner.appendChild(el("div", { style: "font-size:13px;font-weight:800;line-height:1;", text: "Aa" }));
      if (tpl.layout === "grid") { inner.appendChild(el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:4px;flex:1;" }, [thumbBox(c), thumbBox(c), thumbBox(c), thumbBox(c)])); }
      else if (tpl.layout === "split") { inner.appendChild(el("div", { style: "display:flex;gap:4px;flex:1;" }, [thumbBox(c, "flex:1.3"), thumbLines(c)])); }
      else if (tpl.layout === "image") { inner.appendChild(thumbBox(c, "flex:1")); }
      else { inner.appendChild(el("div", { style: "flex:1;display:flex;align-items:center;", html: '<div style="font-family:' + c.head + ';font-size:22px;font-weight:800;color:' + c.accent + '">Type</div>' })); }
      wrap.appendChild(inner);
      return wrap;
    }
    function miniPosterThumb(tpl) {
      var c = posterColors({ style: tpl.style });
      var wrap = el("div", { class: "tpl-thumb", style: "background:" + c.bg + ";" });
      var inner = el("div", { style: "position:absolute;inset:9%;display:flex;flex-direction:column;gap:6px;color:" + c.text + ";" });
      if (tpl.layout === "image") {
        inner.appendChild(thumbBox(c, "flex:1"));
        inner.appendChild(el("div", { style: "font-family:" + c.head + ";font-size:18px;font-weight:800;color:" + c.accent + ";", text: "TITLE" }));
      } else if (tpl.layout === "split") {
        wrap.appendChild(el("div", { style: "position:absolute;inset:0;display:flex;" }, [thumbBox(c, "flex:1;border-radius:0"), el("div", { style: "flex:1;padding:10%;display:flex;flex-direction:column;justify-content:center;gap:5px;" }, [el("div", { style: "font-family:" + c.head + ";font-weight:800;font-size:15px;color:" + c.text, text: "Title" }), thumbLines(c)]) ]));
        return wrap;
      } else {
        var align = tpl.layout === "centered" ? "center" : "flex-start";
        inner.style.alignItems = align;
        inner.style.justifyContent = "center";
        inner.appendChild(el("div", { style: "font-family:" + c.head + ";font-size:22px;font-weight:800;line-height:1;color:" + c.text, text: "POSTER" }));
        inner.appendChild(el("div", { style: "font-size:11px;color:" + c.accent + ";font-weight:700;", text: "subtitle" }));
        inner.appendChild(thumbBox(c, "width:70%;height:34%"));
      }
      wrap.appendChild(inner);
      return wrap;
    }
    function thumbBox(c, extra) { return el("div", { style: "background:" + hexFade(c.accent, c.text) + ";border-radius:4px;min-height:16px;" + (extra || "") }); }
    function thumbLines(c) { return el("div", { style: "flex:1;display:flex;flex-direction:column;gap:3px;justify-content:center;" }, [lineBar(c, "90%"), lineBar(c, "70%"), lineBar(c, "80%")]); }
    function lineBar(c, w) { return el("div", { style: "height:3px;width:" + w + ";background:" + c.text + ";opacity:.35;border-radius:2px;" }); }
    function hexFade(a) { return a; }

    function templateCard(tpl, type) {
      var thumb = type === "portfolio" ? miniPortfolioThumb(tpl) : miniPosterThumb(tpl);
      if (type === "poster") thumb.classList.remove("tpl-thumb--wide");
      return el("div", { class: "tpl-card" }, [
        thumb,
        el("div", { class: "tpl-meta" }, [el("span", { class: "tpl-cat", text: tpl.cat }), el("h4", { text: tpl.name })]),
        el("div", { class: "tpl-actions" }, [
          el("button", { class: "btn btn--sm", type: "button", text: "Use Template",
            onClick: function () { G.navigate("#/" + (type === "portfolio" ? "portfolio" : "poster-builder") + "?tpl=" + tpl.id); } }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Customize",
            onClick: function () { G.navigate("#/" + (type === "portfolio" ? "portfolio" : "poster-builder") + "?tpl=" + tpl.id); } })
        ])
      ]);
    }

    function TemplateGallery(params) {
      var type = params && params.type === "poster" ? "poster" : (params && params.type === "portfolio" ? "portfolio" : "portfolio");
      var page = el("div", { class: "lb" });
      page.appendChild(headerBlock("Template Gallery", "Pilih template, lalu klik Use Template atau Customize untuk langsung menerapkannya ke editor."));

      var tabs = el("div", { class: "lb-tabs" }, [
        el("button", { class: "btn btn--sm" + (type === "portfolio" ? "" : " btn--ghost"), type: "button", text: "Portfolio", onClick: function () { G.navigate("#/templates?type=portfolio"); } }),
        el("button", { class: "btn btn--sm" + (type === "poster" ? "" : " btn--ghost"), type: "button", text: "Poster", onClick: function () { G.navigate("#/templates?type=poster"); } })
      ]);
      page.appendChild(tabs);

      var grid = el("div", { class: "tpl-grid" });
      var list = type === "portfolio" ? PORTFOLIO_TEMPLATES : POSTER_TEMPLATES;
      list.forEach(function (tpl) { grid.appendChild(templateCard(tpl, type)); });
      page.appendChild(grid);

      page.appendChild(el("div", { class: "mt-20", style: "display:flex;gap:10px;flex-wrap:wrap;" }, [
        el("a", { class: "btn btn--ghost btn--sm", href: "#/portfolio", text: "Mulai Portfolio Kosong" }),
        el("a", { class: "btn btn--ghost btn--sm", href: "#/poster-builder", text: "Mulai Poster Kosong" }),
        el("a", { class: "btn btn--ghost btn--sm", href: "#/my-layouts", text: "Desain Tersimpan" })
      ]));
      return page;
    }

    /* =========================================================
       MY LAYOUTS (saved designs)
       ========================================================= */
    function MyLayouts() {
      var page = el("div", { class: "lb" });
      page.appendChild(headerBlock("Desain Tersimpan", "Portfolio & poster yang kamu simpan di perangkat ini. Buka kembali untuk melanjutkan edit."));
      var list = layoutStore.all();
      if (!list.length) {
        page.appendChild(el("div", { class: "empty-state" }, [
          el("h3", { text: "Belum ada desain tersimpan" }),
          el("p", { class: "muted mt-12", text: "Buat portfolio atau poster, lalu klik Simpan." }),
          el("div", { class: "mt-20", style: "display:flex;gap:10px;justify-content:center;flex-wrap:wrap;" }, [
            el("a", { class: "btn", href: "#/portfolio", text: "Buat Portfolio" }),
            el("a", { class: "btn btn--ghost", href: "#/poster-builder", text: "Buat Poster" })
          ])
        ]));
        return page;
      }
      var grid = el("div", { class: "projects-grid" });
      list.forEach(function (rec) {
        grid.appendChild(el("div", { class: "card card--hover project-card" }, [
          el("div", { class: "row-between" }, [
            el("span", { class: "project-card__type", text: rec.kind === "portfolio" ? "Portfolio" : "Poster" }),
            el("span", { class: "project-card__date", text: G.formatDate(rec.updatedAt) })
          ]),
          el("h3", { text: rec.title, style: "font-size:1.05rem" }),
          el("div", { class: "project-card__actions" }, [
            el("button", { class: "btn btn--sm", type: "button", text: "Buka",
              onClick: function () { G.navigate("#/" + (rec.kind === "portfolio" ? "portfolio" : "poster-builder") + "?load=" + rec.id); } }),
            el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Hapus",
              onClick: function () { if (confirm('Hapus "' + rec.title + '"?')) { layoutStore.remove(rec.id); toast("Desain dihapus"); G.rerender(); } } })
          ])
        ]));
      });
      page.appendChild(grid);
      return page;
    }

    /* =========================================================
       Shared header block
       ========================================================= */
    function headerBlock(title, desc) {
      return el("div", { class: "page-head" }, [
        el("span", { class: "eyebrow", text: "Layout Builder" }),
        el("h1", { text: title }),
        el("p", { text: desc })
      ]);
    }

    /* =========================================================
       Register routes
       ========================================================= */
    G.registerRoute("/portfolio", PortfolioBuilder);
    G.registerRoute("/poster-builder", PosterBuilder);
    G.registerRoute("/templates", TemplateGallery);
    G.registerRoute("/my-layouts", MyLayouts);

    // If we registered after the first render (e.g. user already on #/portfolio), re-render.
    var h = location.hash.replace(/^#/, "").split("?")[0];
    if (h === "/portfolio" || h === "/poster-builder" || h === "/templates" || h === "/my-layouts") {
      G.rerender();
    }
  }

  // Wait for the core (window.GrafikAI) to be available.
  if (window.GrafikAI && window.GrafikAI.registerRoute) {
    init(window.GrafikAI);
  } else {
    window.addEventListener("grafikai:ready", function () { if (window.GrafikAI) init(window.GrafikAI); });
    // Fallback poll in case the event fired before this script attached.
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (window.GrafikAI && window.GrafikAI.registerRoute) { clearInterval(t); init(window.GrafikAI); }
      else if (tries > 50) { clearInterval(t); }
    }, 50);
  }
})();
