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
      "Swiss Design": { font: "'Helvetica Neue', Arial, sans-serif", head: "'Archivo Black', Arial, sans-serif", bg: "#ffffff", text: "#111111", accent: "#e3002b", headWeight: 900 },
      Branding: { font: "'Inter', sans-serif", head: "'Space Grotesk', sans-serif", bg: "#f6f5f2", text: "#1a1a1a", accent: "#6d28d9", headWeight: 700 },
      Photography: { font: "'Inter', sans-serif", head: "'Inter', sans-serif", bg: "#0b0b0b", text: "#f2f2f2", accent: "#f2f2f2", headWeight: 600 }
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
    // 6 DKV-focused templates. Each defines a style + a page blueprint.
    var PORTFOLIO_TEMPLATES = [
      { id: "pf-minimalist", name: "Minimalist Portfolio", cat: "Minimalist", style: "Minimalist", thumb: "type", blueprint: ["cover", "about", "skills", "project", "gallery", "contact"] },
      { id: "pf-editorial", name: "Editorial Portfolio", cat: "Editorial", style: "Editorial", thumb: "split", blueprint: ["cover", "about", "project", "process", "gallery", "contact"] },
      { id: "pf-swiss", name: "Swiss Grid Portfolio", cat: "Swiss Design", style: "Swiss Design", thumb: "grid", blueprint: ["cover", "about", "skills", "project", "project", "contact"] },
      { id: "pf-creative", name: "Creative Experimental", cat: "Creative", style: "Creative", thumb: "image", blueprint: ["cover", "about", "gallery", "project", "contact"] },
      { id: "pf-branding", name: "Branding Case Study", cat: "Branding", style: "Branding", thumb: "split", blueprint: ["cover", "about", "project", "process", "gallery", "contact"] },
      { id: "pf-photo", name: "Photography Portfolio", cat: "Photography", style: "Photography", thumb: "grid", blueprint: ["cover", "gallery", "gallery", "about", "contact"] }
    ];

    // Page type registry: label, how many image slots, default layout, allowed layouts
    var PAGE_META = {
      cover:   { label: "Cover", slots: 1, layout: "centered", layouts: ["centered", "image", "split"] },
      about:   { label: "About Me", slots: 1, layout: "split", layouts: ["split", "stacked", "text"] },
      skills:  { label: "Skills", slots: 0, layout: "list", layouts: ["list", "grid"] },
      project: { label: "Project Case Study", slots: 3, layout: "casestudy", layouts: ["casestudy", "grid", "image", "split"] },
      gallery: { label: "Gallery", slots: 6, layout: "grid3", layouts: ["grid3", "grid2", "masonry"] },
      process: { label: "Design Process", slots: 3, layout: "steps", layouts: ["steps", "timeline"] },
      contact: { label: "Contact", slots: 0, layout: "centered", layouts: ["centered", "split"] }
    };
    var PAGE_ADD_TYPES = ["cover", "about", "skills", "project", "gallery", "process", "contact"];
    function pageTypeLabel(t) { return (PAGE_META[t] && PAGE_META[t].label) || t; }

    function makePage(type) {
      var meta = PAGE_META[type] || PAGE_META.project;
      var defaults = {
        cover: { title: "Nama Desainer", subtitle: "Desain Komunikasi Visual", kicker: "PORTFOLIO" },
        about: { title: "About Me", body: "Saya mahasiswa DKV yang tertarik pada branding dan desain editorial. Deskripsikan minat, pengalaman, dan tujuanmu di sini.", kicker: "" },
        skills: { title: "Skills", skills: "Branding\nTypography\nLayout Design\nIllustration\nUI Design\nPhotography" },
        project: { title: "Judul Proyek", role: "Peran: Desainer Grafis · 2024", challenge: "Tantangan: jelaskan masalah atau brief yang harus diselesaikan.", solution: "Solusi: pendekatan dan keputusan desain yang kamu ambil.", result: "Hasil: dampak atau capaian dari karya ini." },
        gallery: { title: "Gallery", caption: "Kumpulan karya terpilih." },
        process: { title: "Design Process", s1: "Riset", s2: "Konsep", s3: "Eksekusi", d1: "Kumpulkan referensi & insight.", d2: "Kembangkan arah visual.", d3: "Finalisasi & produksi." },
        contact: { title: "Let's Connect", email: "email@contoh.com", phone: "0812-xxxx-xxxx", social: "@username · behance.net/username" }
      }[type] || {};
      return {
        type: type, layout: meta.layout,
        margin: 9, imgSize: 100,
        images: new Array(meta.slots).fill(""),
        fields: defaults
      };
    }

    function blueprintToPages(bp) { return (bp || ["cover", "about", "project", "contact"]).map(function (t) { return makePage(t); }); }

    function defaultPortfolioState(tpl) {
      return {
        kind: "portfolio",
        format: "a4p",
        style: tpl ? tpl.style : "Minimalist",
        titleSize: 44,
        bg: null, text: null, accent: null,
        pages: blueprintToPages(tpl ? tpl.blueprint : ["cover", "about", "skills", "project", "gallery", "contact"])
      };
    }

    function portfolioColors(st) {
      var s = PORTFOLIO_STYLES[st.style] || PORTFOLIO_STYLES.Minimalist;
      return { bg: st.bg || s.bg, text: st.text || s.text, accent: st.accent || s.accent, font: s.font, head: s.head, hw: s.headWeight };
    }

    // Estimate total image memory to warn users
    function portfolioImageBytes(st) {
      var total = 0;
      (st.pages || []).forEach(function (p) { (p.images || []).forEach(function (u) { if (u) total += u.length; }); });
      return total; // base64 chars ≈ bytes
    }

    function renderPortfolioPage(st, pg, pageIndex) {
      var c = portfolioColors(st);
      var fmt = PORTFOLIO_FORMATS[st.format];
      var pad = Math.round(fmt.w * ((pg.margin || 9) / 100));
      var canvas = el("div", { class: "lb-canvas", style:
        "width:" + fmt.w + "px;height:" + fmt.h + "px;background:" + c.bg + ";color:" + c.text +
        ";font-family:" + c.font + ";padding:" + pad + "px;box-sizing:border-box;display:flex;flex-direction:column;gap:22px;" });

      function editable(tag, text, styleStr, onCommit) {
        var n = el(tag, { class: "lb-el", contenteditable: "true", style: styleStr, text: text });
        n.addEventListener("blur", function () { onCommit && onCommit(n.textContent); });
        n.addEventListener("keydown", function (e) { if (tag !== "div" && e.key === "Enter") { e.preventDefault(); n.blur(); } });
        return n;
      }
      function heading(text, size, onCommit) {
        return editable("h1", text, "font-family:" + c.head + ";font-weight:" + c.hw + ";font-size:" + size + "px;line-height:1.06;margin:0;color:" + c.text + ";", onCommit);
      }
      function label(text) { return el("div", { style: "font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:" + c.accent + ";font-weight:700;" }, [text]); }
      function accentBar() { return el("div", { style: "width:54px;height:5px;background:" + c.accent + ";border-radius:3px;" }); }
      function fset(key, val) { pg.fields[key] = val; }

      function img(slotIndex, styleStr) {
        var sizePct = (pg.imgSize || 100);
        var wrap = el("div", { style: "overflow:hidden;" + (styleStr || "") });
        var slot = imgSlot(
          function () { return pg.images[slotIndex] || ""; },
          function (v) { pg.images[slotIndex] = v || ""; },
          "width:100%;height:100%;border-radius:4px;" + (sizePct !== 100 ? "transform:scale(" + (sizePct / 100) + ");transform-origin:center;" : "")
        );
        wrap.appendChild(slot);
        return wrap;
      }

      var f = pg.fields || {};
      var L = pg.layout;

      if (pg.type === "cover") {
        if (L === "image") {
          canvas.style.padding = "0";
          canvas.appendChild(img(0, "position:absolute;inset:0;width:100%;height:100%;"));
          canvas.appendChild(el("div", { style: "position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,.08));" }));
          canvas.appendChild(el("div", { style: "position:absolute;left:0;right:0;bottom:0;padding:" + pad + "px;color:#fff;display:flex;flex-direction:column;gap:8px;" }, [
            editable("h1", f.title, "font-family:" + c.head + ";font-weight:" + c.hw + ";font-size:" + st.titleSize + "px;margin:0;color:#fff;", function (v) { fset("title", v); }),
            editable("div", f.subtitle, "font-size:18px;opacity:.9;", function (v) { fset("subtitle", v); })
          ]));
        } else if (L === "split") {
          canvas.style.padding = "0";
          canvas.appendChild(el("div", { style: "display:flex;height:100%;" }, [
            el("div", { style: "flex:1;padding:" + pad + "px;display:flex;flex-direction:column;gap:12px;justify-content:center;" }, [
              label(f.kicker || "PORTFOLIO"), accentBar(),
              editable("h1", f.title, "font-family:" + c.head + ";font-weight:" + c.hw + ";font-size:" + st.titleSize + "px;margin:0;", function (v) { fset("title", v); }),
              editable("div", f.subtitle, "font-size:18px;opacity:.75;", function (v) { fset("subtitle", v); })
            ]),
            el("div", { style: "flex:1;" }, [img(0, "width:100%;height:100%;")])
          ]));
        } else {
          canvas.style.justifyContent = "center";
          canvas.appendChild(accentBar());
          canvas.appendChild(heading(f.title, st.titleSize, function (v) { fset("title", v); }));
          canvas.appendChild(editable("div", f.subtitle, "font-size:18px;opacity:.75;", function (v) { fset("subtitle", v); }));
          canvas.appendChild(editable("div", f.kicker || "PORTFOLIO", "font-size:13px;letter-spacing:.3em;color:" + c.accent + ";font-weight:700;margin-top:10px;", function (v) { fset("kicker", v); }));
        }
      } else if (pg.type === "about") {
        canvas.appendChild(label("About")); canvas.appendChild(heading(f.title, Math.round(st.titleSize * 0.68), function (v) { fset("title", v); }));
        if (L === "text") {
          canvas.appendChild(editable("div", f.body, "font-size:17px;line-height:1.8;max-width:80%;", function (v) { fset("body", v); }));
        } else {
          var row = el("div", { style: "display:flex;gap:24px;flex:1;" + (L === "stacked" ? "flex-direction:column;" : "") });
          row.appendChild(img(0, "flex:1;min-height:160px;"));
          row.appendChild(editable("div", f.body, "flex:1;font-size:16px;line-height:1.75;", function (v) { fset("body", v); }));
          canvas.appendChild(row);
        }
      } else if (pg.type === "skills") {
        canvas.appendChild(label("Expertise")); canvas.appendChild(heading(f.title, Math.round(st.titleSize * 0.68), function (v) { fset("title", v); }));
        var items = (f.skills || "").split("\n").filter(function (x) { return x.trim(); });
        var box = el("div", { style: L === "grid" ? "display:grid;grid-template-columns:1fr 1fr;gap:14px;flex:1;align-content:start;" : "display:flex;flex-direction:column;gap:12px;flex:1;" });
        items.forEach(function (s) {
          box.appendChild(el("div", { style: "display:flex;align-items:center;gap:10px;font-size:17px;" }, [
            el("span", { style: "width:8px;height:8px;border-radius:50%;background:" + c.accent + ";flex:0 0 auto;" }), el("span", { text: s })
          ]));
        });
        canvas.appendChild(box);
        canvas.appendChild(el("div", { class: "lb-el", contenteditable: "true", style: "font-size:11px;opacity:.5;",
          text: "(Edit daftar skill di panel kiri, satu per baris)" }));
      } else if (pg.type === "project") {
        canvas.appendChild(label("Case Study")); canvas.appendChild(heading(f.title, Math.round(st.titleSize * 0.68), function (v) { fset("title", v); }));
        canvas.appendChild(editable("div", f.role, "font-size:13px;opacity:.65;", function (v) { fset("role", v); }));
        if (L === "image") {
          canvas.appendChild(img(0, "flex:1;min-height:200px;"));
          canvas.appendChild(editable("div", f.solution, "font-size:15px;line-height:1.7;", function (v) { fset("solution", v); }));
        } else if (L === "grid") {
          canvas.appendChild(el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:14px;flex:1;" }, [img(0, ""), img(1, ""), img(2, ""), el("div", {}, [editable("div", f.result, "font-size:14px;line-height:1.7;", function (v) { fset("result", v); })])]));
        } else if (L === "split") {
          canvas.appendChild(el("div", { style: "display:grid;grid-template-columns:1.3fr 1fr;gap:20px;flex:1;" }, [
            img(0, ""),
            el("div", { style: "display:flex;flex-direction:column;gap:12px;" }, [
              editable("div", f.challenge, "font-size:14px;line-height:1.6;", function (v) { fset("challenge", v); }),
              editable("div", f.solution, "font-size:14px;line-height:1.6;", function (v) { fset("solution", v); }),
              editable("div", f.result, "font-size:14px;line-height:1.6;", function (v) { fset("result", v); })
            ])
          ]));
        } else { // casestudy — hero image + 3 labelled blocks
          canvas.appendChild(img(0, "width:100%;height:38%;"));
          var cs = el("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:16px;flex:1;" });
          [["Tantangan", "challenge"], ["Solusi", "solution"], ["Hasil", "result"]].forEach(function (p) {
            cs.appendChild(el("div", { style: "display:flex;flex-direction:column;gap:8px;" }, [
              el("div", { style: "font-weight:700;font-size:13px;color:" + c.accent + ";letter-spacing:.05em;", text: p[0] }),
              editable("div", f[p[1]], "font-size:13px;line-height:1.6;", function (v) { fset(p[1], v); })
            ]));
          });
          canvas.appendChild(cs);
        }
      } else if (pg.type === "gallery") {
        canvas.appendChild(label("Works")); canvas.appendChild(heading(f.title, Math.round(st.titleSize * 0.6), function (v) { fset("title", v); }));
        var cols = L === "grid2" ? 2 : (L === "masonry" ? 3 : 3);
        var grid = el("div", { style: "display:grid;grid-template-columns:repeat(" + cols + ",1fr);gap:12px;flex:1;" + (L === "masonry" ? "grid-auto-rows:1fr;" : "") });
        var n = (PAGE_META.gallery.slots);
        for (var i = 0; i < n; i++) {
          var span = (L === "masonry" && (i === 0 || i === 3)) ? "grid-row:span 2;" : "";
          grid.appendChild(img(i, span + "min-height:90px;"));
        }
        canvas.appendChild(grid);
      } else if (pg.type === "process") {
        canvas.appendChild(label("How I Work")); canvas.appendChild(heading(f.title, Math.round(st.titleSize * 0.68), function (v) { fset("title", v); }));
        if (L === "timeline") {
          var tl = el("div", { style: "display:flex;flex-direction:column;gap:18px;flex:1;" });
          [["1", "s1", "d1"], ["2", "s2", "d2"], ["3", "s3", "d3"]].forEach(function (p, i) {
            tl.appendChild(el("div", { style: "display:flex;gap:14px;align-items:flex-start;" }, [
              el("div", { style: "font-family:" + c.head + ";font-size:26px;color:" + c.accent + ";font-weight:" + c.hw + ";", text: "0" + p[0] }),
              el("div", {}, [editable("div", f[p[1]], "font-weight:700;font-size:16px;", function (v) { fset(p[1], v); }), editable("div", f[p[2]], "font-size:13px;opacity:.75;margin-top:4px;", function (v) { fset(p[2], v); })]),
              img(i, "margin-left:auto;width:120px;height:70px;")
            ]));
          });
          canvas.appendChild(tl);
        } else {
          var steps = el("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:18px;flex:1;" });
          [["01", "s1", "d1"], ["02", "s2", "d2"], ["03", "s3", "d3"]].forEach(function (p, i) {
            steps.appendChild(el("div", { style: "display:flex;flex-direction:column;gap:8px;" }, [
              el("div", { style: "font-family:" + c.head + ";font-size:26px;color:" + c.accent + ";font-weight:" + c.hw + ";", text: p[0] }),
              editable("div", f[p[1]], "font-weight:700;font-size:15px;", function (v) { fset(p[1], v); }),
              editable("div", f[p[2]], "font-size:12px;opacity:.75;", function (v) { fset(p[2], v); }),
              img(i, "flex:1;min-height:90px;")
            ]));
          });
          canvas.appendChild(steps);
        }
      } else if (pg.type === "contact") {
        if (L === "split") {
          canvas.style.padding = "0";
          canvas.appendChild(el("div", { style: "display:flex;height:100%;" }, [
            el("div", { style: "flex:1;background:" + c.accent + ";" }),
            el("div", { style: "flex:2;padding:" + pad + "px;display:flex;flex-direction:column;gap:12px;justify-content:center;" }, [
              heading(f.title, Math.round(st.titleSize * 0.7), function (v) { fset("title", v); }),
              editable("div", f.email, "font-size:17px;", function (v) { fset("email", v); }),
              editable("div", f.phone, "font-size:17px;", function (v) { fset("phone", v); }),
              editable("div", f.social, "font-size:14px;opacity:.7;", function (v) { fset("social", v); })
            ])
          ]));
        } else {
          canvas.style.justifyContent = "center"; canvas.style.textAlign = "center";
          canvas.appendChild(heading(f.title, Math.round(st.titleSize * 0.82), function (v) { fset("title", v); }));
          var bar = accentBar(); bar.style.margin = "0 auto"; canvas.appendChild(bar);
          canvas.appendChild(editable("div", f.email, "font-size:18px;", function (v) { fset("email", v); }));
          canvas.appendChild(editable("div", f.phone, "font-size:18px;", function (v) { fset("phone", v); }));
          canvas.appendChild(editable("div", f.social, "font-size:14px;opacity:.65;", function (v) { fset("social", v); }));
        }
      }
      return canvas;
    }

    function PortfolioBuilder(params) {
      var tpl = params && params.tpl ? PORTFOLIO_TEMPLATES.filter(function (t) { return t.id === params.tpl; })[0] : null;
      var loaded = params && params.load ? layoutStore.get(params.load) : null;
      var st = loaded ? loaded.payload : defaultPortfolioState(tpl);
      if (!st.pages || !st.pages.length) st.pages = defaultPortfolioState(tpl).pages;
      var selected = 0;

      var page = el("div", { class: "lb" });
      page.appendChild(headerBlock("Portfolio Layout Builder", "Portofolio profesional untuk siswa DKV. Klik teks untuk mengedit, klik kotak gambar untuk unggah karya. Atur halaman & layout dari panel kiri."));

      var pagesWrap = el("div", { class: "lb-pages" });
      var canvasNodes = [];

      function rebuild() {
        pagesWrap.innerHTML = ""; canvasNodes = [];
        var fmt = PORTFOLIO_FORMATS[st.format];
        st.pages.forEach(function (pg, idx) {
          var scroll = el("div", { class: "lb-scroll" });
          var canvas = renderPortfolioPage(st, pg, idx);
          scroll.appendChild(canvas);
          var labelRow = el("div", { class: "row-between", style: "width:100%;" }, [
            el("div", { class: "lb-page-label", text: "Hal " + (idx + 1) + " · " + pageTypeLabel(pg.type) + (idx === selected ? "  ← dipilih" : "") }),
            el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Pilih", onClick: function () { selected = idx; buildPanel(); rebuild(); } })
          ]);
          pagesWrap.appendChild(el("div", { style: "width:100%;" + (idx === selected ? "outline:2px solid var(--purple);outline-offset:6px;border-radius:8px;" : ""), onClick: function () { if (selected !== idx) { selected = idx; buildPanel(); rebuild(); } } }, [labelRow, scroll]));
          canvasNodes.push(canvas);
          requestAnimationFrame(function () { fitCanvas(canvas, fmt); });
        });
      }

      // ---------- settings panel ----------
      var panel = el("div", { class: "lb-panel" });
      function buildPanel() {
        panel.innerHTML = "";

        // Global settings
        panel.appendChild(group("Format", [segmented(
          Object.keys(PORTFOLIO_FORMATS).map(function (k) { return { value: k, label: PORTFOLIO_FORMATS[k].label }; }),
          st.format, function (v) { st.format = v; rebuild(); })]));
        panel.appendChild(group("Gaya", [segmented(Object.keys(PORTFOLIO_STYLES), st.style, function (v) { st.style = v; rebuild(); })]));

        var c = portfolioColors(st);
        panel.appendChild(group("Warna & Tipografi", [
          colorField("Background", c.bg, function (v) { st.bg = v; rebuild(); }),
          colorField("Teks", c.text, function (v) { st.text = v; rebuild(); }),
          colorField("Aksen", c.accent, function (v) { st.accent = v; rebuild(); }),
          rangeField("Ukuran Judul", st.titleSize, 28, 72, 1, function (v) { st.titleSize = v; rebuild(); }),
          el("button", { class: "btn btn--ghost btn--sm btn--block", type: "button", text: "Reset Warna ke Gaya",
            onClick: function () { st.bg = st.text = st.accent = null; buildPanel(); rebuild(); } })
        ]));

        // Page manager
        var pm = el("div", {});
        st.pages.forEach(function (pg, idx) {
          var rowEl = el("div", { class: "lb-row", style: "align-items:center;gap:6px;margin-bottom:6px;" + (idx === selected ? "" : "opacity:.85;") }, [
            el("button", { class: "btn btn--ghost btn--sm", type: "button", style: "flex:1;justify-content:flex-start;" + (idx === selected ? "border-color:var(--purple);" : ""), text: (idx + 1) + ". " + pageTypeLabel(pg.type), onClick: function () { selected = idx; buildPanel(); rebuild(); } }),
            el("button", { class: "chip", type: "button", title: "Naik", text: "↑", onClick: function () { movePage(idx, -1); } }),
            el("button", { class: "chip", type: "button", title: "Turun", text: "↓", onClick: function () { movePage(idx, 1); } }),
            el("button", { class: "chip", type: "button", title: "Hapus", text: "✕", onClick: function () { removePage(idx); } })
          ]);
          pm.appendChild(rowEl);
        });
        var addSel = el("select", {});
        PAGE_ADD_TYPES.forEach(function (t) { addSel.appendChild(el("option", { value: t, text: pageTypeLabel(t) })); });
        pm.appendChild(el("div", { class: "lb-row", style: "margin-top:8px;gap:6px;" }, [
          addSel,
          el("button", { class: "btn btn--sm", type: "button", text: "+ Tambah", onClick: function () { addPage(addSel.value); } })
        ]));
        panel.appendChild(group("Halaman (" + st.pages.length + ")", [pm]));

        // Selected page editor
        var pg = st.pages[selected];
        if (pg) {
          var meta = PAGE_META[pg.type];
          var fields = [
            el("div", { class: "section-label", style: "color:var(--purple-bright)", text: "Edit: Hal " + (selected + 1) + " · " + pageTypeLabel(pg.type) }),
            segmented(meta.layouts.map(function (x) { return { value: x, label: x }; }), pg.layout, function (v) { pg.layout = v; rebuild(); }),
            rangeField("Margin Halaman (%)", pg.margin, 4, 16, 1, function (v) { pg.margin = v; rebuild(); })
          ];
          if (meta.slots > 0) fields.push(rangeField("Ukuran Gambar (%)", pg.imgSize, 60, 130, 1, function (v) { pg.imgSize = v; rebuild(); }));
          fields = fields.concat(pageFieldEditors(pg, rebuild));
          panel.appendChild(group("Pengaturan Halaman", fields));
        }
      }

      function pageFieldEditors(pg, refresh) {
        var f = pg.fields, out = [];
        function tf(labelText, key, ta) { out.push(textField(labelText, f[key], function (v) { f[key] = v; refresh(); }, ta)); }
        if (pg.type === "cover") { tf("Judul / Nama", "title"); tf("Subjudul / Jurusan", "subtitle"); tf("Kicker", "kicker"); }
        else if (pg.type === "about") { tf("Judul", "title"); tf("Deskripsi Diri", "body", true); }
        else if (pg.type === "skills") { tf("Judul", "title"); tf("Daftar Skill (satu per baris)", "skills", true); }
        else if (pg.type === "project") { tf("Judul Proyek", "title"); tf("Peran / Tahun", "role"); tf("Tantangan", "challenge", true); tf("Solusi", "solution", true); tf("Hasil", "result", true); }
        else if (pg.type === "gallery") { tf("Judul", "title"); }
        else if (pg.type === "process") { tf("Judul", "title"); tf("Langkah 1", "s1"); tf("Deskripsi 1", "d1"); tf("Langkah 2", "s2"); tf("Deskripsi 2", "d2"); tf("Langkah 3", "s3"); tf("Deskripsi 3", "d3"); }
        else if (pg.type === "contact") { tf("Judul", "title"); tf("Email", "email"); tf("Telepon", "phone"); tf("Sosial", "social"); }
        return out;
      }

      function addPage(type) {
        if (st.pages.length >= 20) { toast("Maksimal 20 halaman.", "error"); return; }
        st.pages.splice(selected + 1, 0, makePage(type));
        selected = selected + 1;
        buildPanel(); rebuild(); toast("Halaman ditambahkan");
      }
      function removePage(idx) {
        if (st.pages.length <= 1) { toast("Minimal 1 halaman.", "error"); return; }
        if (!confirm("Hapus halaman " + (idx + 1) + " (" + pageTypeLabel(st.pages[idx].type) + ")?")) return;
        st.pages.splice(idx, 1);
        if (selected >= st.pages.length) selected = st.pages.length - 1;
        buildPanel(); rebuild(); toast("Halaman dihapus");
      }
      function movePage(idx, dir) {
        var j = idx + dir;
        if (j < 0 || j >= st.pages.length) return;
        var tmp = st.pages[idx]; st.pages[idx] = st.pages[j]; st.pages[j] = tmp;
        if (selected === idx) selected = j; else if (selected === j) selected = idx;
        buildPanel(); rebuild();
      }
      buildPanel();

      // ---------- toolbar ----------
      var toolbar = el("div", { class: "lb-toolbar" }, [
        el("div", { class: "lb-toolbar__group" }, [
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "⟳ Reset",
            onClick: function () { if (confirm("Reset ke template awal? Semua teks & gambar hilang.")) { st = defaultPortfolioState(tpl); selected = 0; buildPanel(); rebuild(); toast("Portfolio direset"); } } }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "⤓ Ganti Template", onClick: function () { G.navigate("#/templates?type=portfolio"); } })
        ]),
        el("div", { class: "lb-toolbar__group" }, [
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "💾 Simpan", onClick: doSave }),
          el("button", { class: "btn", type: "button", text: "⤑ Export PDF", onClick: doExport })
        ])
      ]);

      function doSave() {
        var bytes = portfolioImageBytes(st);
        if (bytes > 4.5 * 1024 * 1024) { toast("Gambar terlalu besar untuk disimpan (" + Math.round(bytes / 1048576) + "MB). Kurangi/perkecil gambar.", "error"); return; }
        var name = (st.pages[0] && st.pages[0].fields.title) || "Portfolio";
        var rec = layoutStore.save({ id: loaded ? loaded.id : null, kind: "portfolio", title: name + " — Portfolio", payload: st });
        if (rec) { loaded = rec; toast("Portfolio tersimpan"); }
      }
      function doExport() {
        if (portfolioImageBytes(st) > 40 * 1024 * 1024) { toast("Terlalu banyak gambar besar — export bisa gagal. Perkecil gambar dulu.", "error"); return; }
        var fmt = PORTFOLIO_FORMATS[st.format];
        var name = ((st.pages[0] && st.pages[0].fields.title) || "portfolio").replace(/\s+/g, "_");
        exportPDF(canvasNodes, fmt.pdf, fmt.orient, name);
      }

      var stage = el("div", { class: "lb-stage-wrap" }, [toolbar, pagesWrap,
        el("p", { class: "lb-note", text: "Export PDF memakai html2canvas + jsPDF (butuh internet untuk library). Setiap halaman portofolio = satu halaman PDF dengan format konsisten." })]);

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
      var th = tpl.thumb || "grid";
      if (th === "grid") { inner.appendChild(el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:4px;flex:1;" }, [thumbBox(c), thumbBox(c), thumbBox(c), thumbBox(c)])); }
      else if (th === "split") { inner.appendChild(el("div", { style: "display:flex;gap:4px;flex:1;" }, [thumbBox(c, "flex:1.3"), thumbLines(c)])); }
      else if (th === "image") { inner.appendChild(thumbBox(c, "flex:1")); }
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
