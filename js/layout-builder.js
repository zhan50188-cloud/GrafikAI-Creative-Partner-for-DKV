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
    // Element-based templates. x/y/w/h are PERCENT of canvas (0-100) so they are
    // format- and zoom-independent, and export matches exactly.
    function te(x, y, w, h, text, opts) {
      opts = opts || {};
      return { type: "text", x: x, y: y, w: w, h: h, text: text,
        size: opts.size || 5, color: opts.color || null, align: opts.align || "left",
        weight: opts.weight || 400, family: opts.family || "body", lh: opts.lh || 1.2 };
    }
    function ie(x, y, w, h, url) { return { type: "image", x: x, y: y, w: w, h: h, url: url || "" }; }
    function se(x, y, w, h, color) { return { type: "shape", x: x, y: y, w: w, h: h, color: color || "accent", radius: 0 }; }

    // 8 templates, each a DISTINCT composition (not just recolored).
    var POSTER_TEMPLATES = [
      { id: "po-min-center", name: "Clean Center", cat: "Minimalist", style: "Minimalist", layout: "centered", thumb: "centered",
        make: function () { return [
          te(12, 16, 76, 18, "JUDUL POSTER", { size: 11, weight: 800, align: "center", family: "head", color: "text" }),
          te(20, 34, 60, 6, "subjudul atau tagline", { size: 4.2, align: "center", color: "accent", weight: 600 }),
          ie(28, 44, 44, 30),
          te(18, 78, 64, 10, "Deskripsi acara atau pesan utama poster.", { size: 3.4, align: "center", color: "text" }),
          te(18, 90, 64, 5, "Tanggal · Lokasi", { size: 3.2, align: "center", weight: 700, color: "text" })
        ]; } },
      { id: "po-bold-type", name: "Loud Headline", cat: "Bold Typography", style: "Bold Typography", layout: "asymmetric", thumb: "asymmetric",
        make: function () { return [
          te(8, 44, 84, 34, "SUARA\nLANTANG", { size: 20, weight: 900, align: "left", family: "head", color: "text", lh: 0.92 }),
          se(8, 40, 20, 1.6, "accent"),
          te(8, 80, 60, 8, "deskripsi singkat yang menonjol", { size: 3.8, color: "accent", weight: 700 }),
          te(8, 90, 84, 5, "Tanggal · Lokasi · @akun", { size: 3, color: "text" })
        ]; } },
      { id: "po-swiss-grid", name: "Swiss Grid", cat: "Swiss Style", style: "Swiss Style", layout: "grid", thumb: "grid",
        make: function () { return [
          se(8, 8, 84, 1.2, "accent"),
          te(8, 12, 60, 16, "Swiss\nPoster", { size: 11, weight: 900, family: "head", color: "text", lh: 0.95 }),
          te(70, 12, 22, 10, "No. 01\n2024", { size: 3.2, color: "text", align: "right", weight: 700 }),
          ie(8, 40, 84, 40),
          te(8, 84, 50, 10, "Deskripsi mengikuti sistem grid yang ketat dan rapi.", { size: 3.2, color: "text" }),
          te(62, 84, 30, 6, "Tanggal · Lokasi", { size: 3.2, align: "right", weight: 700, color: "accent" })
        ]; } },
      { id: "po-retro-split", name: "Retro Split", cat: "Retro", style: "Retro", layout: "split", thumb: "split",
        make: function () { return [
          se(0, 0, 50, 100, "accent"),
          ie(4, 8, 42, 84),
          te(54, 20, 40, 24, "RETRO\nVIBES", { size: 12, weight: 700, family: "head", color: "text", lh: 1.0 }),
          te(54, 48, 40, 12, "Nuansa hangat ala 70-an dengan tekstur dan warna pudar.", { size: 3.4, color: "text" }),
          te(54, 80, 40, 6, "Tanggal · Lokasi", { size: 3.2, weight: 700, color: "text" })
        ]; } },
      { id: "po-futur-img", name: "Neon Focus", cat: "Futuristic", style: "Futuristic", layout: "image", thumb: "image",
        make: function () { return [
          ie(0, 0, 100, 100),
          se(0, 62, 100, 38, "overlay"),
          te(8, 70, 84, 16, "MASA\nDEPAN", { size: 13, weight: 700, family: "head", color: "#ffffff", lh: 0.95 }),
          te(8, 88, 60, 6, "subjudul neon", { size: 3.8, color: "accent", weight: 700 }),
          te(60, 88, 32, 6, "Tanggal · Lokasi", { size: 3, color: "#ffffff", align: "right" })
        ]; } },
      { id: "po-edi-mag", name: "Editorial Magazine", cat: "Editorial", style: "Editorial", layout: "editorial", thumb: "centered",
        make: function () { return [
          te(10, 8, 80, 4, "EDISI KHUSUS · 2024", { size: 2.8, align: "center", weight: 700, color: "accent" }),
          se(44, 13, 12, 0.6, "accent"),
          te(8, 18, 84, 20, "Judul Editorial yang Elegan", { size: 9, align: "center", family: "head", weight: 700, color: "text", lh: 1.05 }),
          ie(14, 42, 72, 34),
          te(14, 80, 72, 10, "Artikel pembuka dengan tipografi serif yang berkelas dan ruang napas.", { size: 3.2, align: "center", color: "text" })
        ]; } },
      { id: "po-min-sidebar", name: "Sidebar Minimal", cat: "Minimalist", style: "Minimalist", layout: "sidebar", thumb: "split",
        make: function () { return [
          se(0, 0, 6, 100, "accent"),
          te(12, 14, 76, 20, "Judul di Kiri", { size: 10, weight: 800, family: "head", color: "text", lh: 1.0 }),
          te(12, 38, 50, 8, "subjudul ringkas", { size: 4, color: "accent", weight: 600 }),
          ie(12, 50, 76, 30),
          te(12, 84, 76, 8, "Informasi tambahan di bagian bawah.", { size: 3.2, color: "text" })
        ]; } },
      { id: "po-bold-block", name: "Color Block", cat: "Bold Typography", style: "Bold Typography", layout: "block", thumb: "grid",
        make: function () { return [
          se(0, 0, 100, 46, "accent"),
          te(8, 10, 84, 28, "BLOK\nWARNA", { size: 17, weight: 900, family: "head", color: "#111111", lh: 0.92 }),
          ie(8, 52, 84, 30),
          te(8, 86, 60, 8, "Komposisi blok warna yang berani dan tegas.", { size: 3.4, color: "text" }),
          te(70, 86, 22, 5, "@akun", { size: 3.2, align: "right", weight: 700, color: "accent" })
        ]; } }
    ];

    function posterColors(st) {
      var s = POSTER_STYLES[st.style] || POSTER_STYLES.Minimalist;
      return { bg: st.bg || s.bg, text: st.text || s.text, accent: st.accent || s.accent, font: s.font, head: s.head, hw: s.headWeight };
    }

    function defaultPosterState(tpl) {
      var t = tpl || POSTER_TEMPLATES[0];
      var els = (t.make ? t.make() : POSTER_TEMPLATES[0].make());
      // assign ids
      els.forEach(function (e, i) { e.id = "e" + Date.now().toString(36) + i; });
      return {
        kind: "poster", format: "a4", style: t.style, templateName: t.name,
        bg: null, text: null, accent: null,
        elements: els
      };
    }

    function PosterBuilder(params) {
      var tpl = params && params.tpl ? POSTER_TEMPLATES.filter(function (t) { return t.id === params.tpl; })[0] : null;
      var loaded = params && params.load ? layoutStore.get(params.load) : null;
      var st = loaded ? loaded.payload : defaultPosterState(tpl);
      if (!st.elements) st = defaultPosterState(tpl); // migrate old shape
      var selectedId = null;
      var zoom = 1;
      var fitScale = 1;

      // ---- history ----
      var history = [], hpos = -1;
      function snapshot() {
        var s = JSON.stringify(st.elements) + "|" + st.bg + "|" + st.text + "|" + st.accent + "|" + st.format + "|" + st.style;
        // trim redo tail
        history = history.slice(0, hpos + 1);
        if (history[hpos] === s) return;
        history.push(s); hpos = history.length - 1;
        if (history.length > 60) { history.shift(); hpos--; }
        updateUndoRedo();
      }
      function restore(s) {
        var parts = s.split("|");
        st.elements = JSON.parse(parts[0]);
        st.bg = parts[1] === "null" ? null : parts[1];
        st.text = parts[2] === "null" ? null : parts[2];
        st.accent = parts[3] === "null" ? null : parts[3];
        st.format = parts[4]; st.style = parts[5];
        selectedId = null;
        buildPanel(); renderCanvas();
      }
      function undo() { if (hpos > 0) { hpos--; restore(history[hpos]); updateUndoRedo(); } }
      function redo() { if (hpos < history.length - 1) { hpos++; restore(history[hpos]); updateUndoRedo(); } }

      var page = el("div", { class: "lb" });
      page.appendChild(headerBlock("Poster Design Editor", "Editor interaktif: pilih & geser elemen di canvas, atur layer, ukuran, dan alignment. Undo/redo, duplicate, zoom, lalu export PDF/PNG."));

      var fmt = function () { return POSTER_FORMATS[st.format]; };
      function selEl() { return st.elements.filter(function (e) { return e.id === selectedId; })[0] || null; }

      // ---- canvas ----
      var canvasOuter = el("div", { class: "pe-canvas-outer" });
      var canvasNode = null;

      function colorVal(key, fallback) {
        var c = posterColors(st);
        if (key === "accent") return c.accent;
        if (key === "text") return c.text;
        if (!key) return fallback || c.text;
        return key; // literal hex
      }

      function renderCanvas() {
        canvasOuter.innerHTML = "";
        var c = posterColors(st);
        var f = fmt();
        canvasNode = el("div", { class: "pe-canvas", style:
          "width:" + f.w + "px;height:" + f.h + "px;background:" + c.bg + ";font-family:" + c.font + ";" });

        st.elements.forEach(function (e) {
          var node = el("div", { class: "pe-el" + (e.id === selectedId ? " selected" : ""), style:
            "left:" + e.x + "%;top:" + e.y + "%;width:" + e.w + "%;height:" + e.h + "%;" });
          node._eid = e.id;

          if (e.type === "text") {
            var fam = e.family === "head" ? c.head : c.font;
            var fontPx = Math.round(f.w * (e.size / 100));
            var span = el("div", { class: "pe-el__text", contenteditable: "false", style:
              "font-family:" + fam + ";font-weight:" + e.weight + ";font-size:" + fontPx + "px;line-height:" + e.lh +
              ";color:" + colorVal(e.color, c.text) + ";text-align:" + e.align + ";" });
            span.textContent = e.text;
            // double-click to edit inline
            span.addEventListener("dblclick", function (ev) {
              ev.stopPropagation();
              span.setAttribute("contenteditable", "true"); span.focus();
            });
            span.addEventListener("blur", function () {
              span.setAttribute("contenteditable", "false");
              if (span.textContent !== e.text) { e.text = span.textContent; snapshot(); }
            });
            node.appendChild(span);
          } else if (e.type === "image") {
            if (e.url) { node.appendChild(el("img", { class: "pe-el__img", src: e.url, alt: "elemen gambar" })); }
            else { node.appendChild(el("div", { class: "pe-el__imgempty", html: "＋ klik 2×<br>untuk upload" })); }
            node.addEventListener("dblclick", function (ev) { ev.stopPropagation(); pickImageFor(e); });
          } else if (e.type === "shape") {
            var fill = e.color === "overlay" ? "linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.02))" : colorVal(e.color, c.accent);
            node.appendChild(el("div", { class: "pe-el__shape", style: "background:" + fill + ";border-radius:" + (e.radius || 0) + "px;" }));
          }

          // selection + drag
          node.addEventListener("pointerdown", function (ev) {
            if (span2editing(ev.target)) return; // don't drag while editing text
            ev.preventDefault();
            selectedId = e.id; buildPanel(); markSelection();
            startDrag(e, node, ev);
          });

          // resize handle on selected
          if (e.id === selectedId) {
            var handle = el("div", { class: "pe-handle" });
            handle.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); ev.preventDefault(); startResize(e, node, ev); });
            node.appendChild(handle);
          }
          canvasNode.appendChild(node);
        });

        // click empty canvas to deselect
        canvasNode.addEventListener("pointerdown", function (ev) {
          if (ev.target === canvasNode) { selectedId = null; buildPanel(); markSelection(); }
        });

        canvasOuter.appendChild(canvasNode);
        applyZoom();
      }

      function span2editing(node) {
        return node && node.getAttribute && node.getAttribute("contenteditable") === "true";
      }
      function markSelection() {
        if (!canvasNode) return;
        $$(".pe-el", canvasNode).forEach(function (n) {
          var on = n._eid === selectedId;
          n.classList.toggle("selected", on);
          var h = n.querySelector(".pe-handle");
          if (on && !h) {
            var e = st.elements.filter(function (x) { return x.id === selectedId; })[0];
            var handle = el("div", { class: "pe-handle" });
            handle.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); ev.preventDefault(); startResize(e, n, ev); });
            n.appendChild(handle);
          } else if (!on && h) { h.remove(); }
        });
      }

      function startDrag(e, node, ev) {
        var rect = canvasNode.getBoundingClientRect();
        var startX = ev.clientX, startY = ev.clientY, ox = e.x, oy = e.y;
        function move(mv) {
          var dx = (mv.clientX - startX) / rect.width * 100;
          var dy = (mv.clientY - startY) / rect.height * 100;
          e.x = clamp(ox + dx, -5, 100 - 2); e.y = clamp(oy + dy, -5, 100 - 2);
          node.style.left = e.x + "%"; node.style.top = e.y + "%";
        }
        function up() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          snapshot(); buildPanel();
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }
      function startResize(e, node, ev) {
        var rect = canvasNode.getBoundingClientRect();
        var startX = ev.clientX, startY = ev.clientY, ow = e.w, oh = e.h;
        function move(mv) {
          var dw = (mv.clientX - startX) / rect.width * 100;
          var dh = (mv.clientY - startY) / rect.height * 100;
          e.w = clamp(ow + dw, 4, 100); e.h = clamp(oh + dh, 3, 100);
          node.style.width = e.w + "%"; node.style.height = e.h + "%";
          if (e.type === "text") { var span = node.querySelector(".pe-el__text"); } // font stays size-based
        }
        function up() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          snapshot(); buildPanel();
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

      function pickImageFor(e) {
        var input = el("input", { type: "file", accept: "image/*", style: "display:none" });
        document.body.appendChild(input);
        input.addEventListener("change", function (ev) {
          var fl = ev.target.files && ev.target.files[0];
          readImage(fl, function (dataUrl) { e.url = dataUrl; snapshot(); renderCanvas(); markSelection(); });
          document.body.removeChild(input);
        });
        input.click();
      }

      // ---- zoom (visual only; export uses true px) ----
      function applyZoom() {
        if (!canvasNode) return;
        var f = fmt();
        var avail = canvasOuter.clientWidth - 24;
        fitScale = Math.min(1, avail / f.w);
        var s = fitScale * zoom;
        canvasNode.style.transform = "scale(" + s + ")";
        canvasOuter.style.height = (f.h * s + 24) + "px";
        if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + "%";
      }

      // ---- panel ----
      var panel = el("div", { class: "lb-panel" });
      function buildPanel() {
        panel.innerHTML = "";

        panel.appendChild(group("Ukuran (preview)", [segmented(
          Object.keys(POSTER_FORMATS).map(function (k) { return { value: k, label: POSTER_FORMATS[k].label }; }),
          st.format, function (v) { st.format = v; snapshot(); renderCanvas(); })]));
        panel.appendChild(group("Gaya", [segmented(Object.keys(POSTER_STYLES), st.style, function (v) { st.style = v; snapshot(); buildPanel(); renderCanvas(); })]));

        var c = posterColors(st);
        panel.appendChild(group("Warna Dasar", [
          colorField("Background", c.bg, function (v) { st.bg = v; renderCanvas(); }),
          colorField("Teks", c.text, function (v) { st.text = v; renderCanvas(); }),
          colorField("Aksen", c.accent, function (v) { st.accent = v; renderCanvas(); }),
          el("button", { class: "btn btn--ghost btn--sm btn--block", type: "button", text: "🎨 Rekomendasi Palet", onClick: function () {
            try { var pal = G.generatePalette ? G.generatePalette({ theme: "poster", style: "" }).colors : null;
              if (pal && pal.length >= 5) { st.accent = pal[2].hex; st.bg = pal[4].hex; st.text = pal[0].hex; snapshot(); buildPanel(); renderCanvas(); toast("Palet diterapkan"); } } catch (e) { toast("Gagal.", "error"); }
          } }),
          el("button", { class: "btn btn--ghost btn--sm btn--block", type: "button", text: "↺ Reset Warna ke Gaya", onClick: function () { st.bg = st.text = st.accent = null; snapshot(); buildPanel(); renderCanvas(); } })
        ]));

        // Add elements
        panel.appendChild(group("Tambah Elemen", [el("div", { class: "pe-addbar" }, [
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "+ Teks", onClick: function () { addElement("text"); } }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "+ Gambar", onClick: function () { addElement("image"); } }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "+ Shape", onClick: function () { addElement("shape"); } })
        ])]));

        // Layers
        var layerList = el("div", { class: "pe-layerlist" });
        // top layer = last in array; show reversed so top is first
        st.elements.slice().reverse().forEach(function (e) {
          var idx = st.elements.indexOf(e);
          var name = e.type === "text" ? ("T: " + (e.text || "").slice(0, 14)) : (e.type === "image" ? "Gambar" : "Shape");
          var row = el("div", { class: "pe-layer" + (e.id === selectedId ? " active" : "") }, [
            el("span", { class: "pe-layer__name", text: name, onClick: function () { selectedId = e.id; buildPanel(); markSelection(); } }),
            el("button", { class: "pe-layer__btn", type: "button", title: "Naikkan layer", text: "▲", onClick: function () { reorder(idx, 1); } }),
            el("button", { class: "pe-layer__btn", type: "button", title: "Turunkan layer", text: "▼", onClick: function () { reorder(idx, -1); } }),
            el("button", { class: "pe-layer__btn", type: "button", title: "Hapus", text: "✕", onClick: function () { removeElement(idx); } })
          ]);
          layerList.appendChild(row);
        });
        panel.appendChild(group("Layer (" + st.elements.length + ")", [layerList]));

        // Selected element editor
        var e = selEl();
        if (e) {
          var fields = [el("div", { class: "section-label", style: "color:var(--purple-bright)", text: "Elemen terpilih: " + e.type })];
          // position & size
          fields.push(el("div", { class: "lb-row--2" }, [
            miniNum("X %", Math.round(e.x), function (v) { e.x = clamp(v, -10, 100); renderCanvas(); markSelection(); }),
            miniNum("Y %", Math.round(e.y), function (v) { e.y = clamp(v, -10, 100); renderCanvas(); markSelection(); }),
            miniNum("W %", Math.round(e.w), function (v) { e.w = clamp(v, 4, 100); renderCanvas(); markSelection(); }),
            miniNum("H %", Math.round(e.h), function (v) { e.h = clamp(v, 3, 100); renderCanvas(); markSelection(); })
          ]));
          // alignment on canvas
          fields.push(el("div", { class: "section-label", text: "Posisikan di Canvas" }));
          fields.push(el("div", { class: "seg" }, [
            alignBtn("⬅", function () { e.x = 6; after(); }),
            alignBtn("⬌", function () { e.x = 50 - e.w / 2; after(); }),
            alignBtn("➡", function () { e.x = 94 - e.w; after(); }),
            alignBtn("⬆", function () { e.y = 6; after(); }),
            alignBtn("⬍", function () { e.y = 50 - e.h / 2; after(); }),
            alignBtn("⬇", function () { e.y = 94 - e.h; after(); })
          ]));

          if (e.type === "text") {
            fields.push(textField("Teks", e.text, function (v) { e.text = v; renderCanvas(); markSelection(); }, true));
            fields.push(rangeField("Ukuran Font", e.size, 2, 24, 0.2, function (v) { e.size = v; renderCanvas(); markSelection(); }));
            fields.push(rangeField("Tebal (weight)", e.weight, 300, 900, 100, function (v) { e.weight = v; renderCanvas(); markSelection(); }));
            fields.push(rangeField("Line Height", e.lh, 0.8, 2, 0.05, function (v) { e.lh = v; renderCanvas(); markSelection(); }));
            fields.push(el("div", { class: "section-label", text: "Alignment Teks" }));
            fields.push(segmented([{ value: "left", label: "Kiri" }, { value: "center", label: "Tengah" }, { value: "right", label: "Kanan" }], e.align, function (v) { e.align = v; renderCanvas(); markSelection(); }));
            fields.push(el("div", { class: "section-label", text: "Font" }));
            fields.push(segmented([{ value: "head", label: "Display" }, { value: "body", label: "Body" }], e.family, function (v) { e.family = v; renderCanvas(); markSelection(); }));
            fields.push(el("div", { class: "section-label", text: "Warna Teks" }));
            fields.push(segmented([{ value: "text", label: "Teks" }, { value: "accent", label: "Aksen" }], (e.color === "accent" ? "accent" : "text"), function (v) { e.color = v; renderCanvas(); markSelection(); }));
          } else if (e.type === "image") {
            fields.push(el("button", { class: "btn btn--ghost btn--sm btn--block", type: "button", text: "Ganti Gambar", onClick: function () { pickImageFor(e); } }));
            if (e.url) fields.push(el("button", { class: "btn btn--ghost btn--sm btn--block", type: "button", text: "Hapus Gambar", onClick: function () { e.url = ""; snapshot(); renderCanvas(); markSelection(); } }));
          } else if (e.type === "shape") {
            fields.push(el("div", { class: "section-label", text: "Warna" }));
            fields.push(segmented([{ value: "accent", label: "Aksen" }, { value: "text", label: "Teks" }, { value: "overlay", label: "Overlay" }], e.color, function (v) { e.color = v; renderCanvas(); markSelection(); }));
            fields.push(rangeField("Sudut (radius)", e.radius || 0, 0, 60, 1, function (v) { e.radius = v; renderCanvas(); markSelection(); }));
          }

          fields.push(el("div", { class: "lb-row", style: "margin-top:8px;" }, [
            el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "⧉ Duplicate", onClick: duplicateSelected }),
            el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "✕ Hapus", onClick: function () { removeElement(st.elements.indexOf(e)); } })
          ]));
          panel.appendChild(group("Edit Elemen", fields));
        } else {
          panel.appendChild(group("Edit Elemen", [el("p", { class: "pe-empty-note", text: "Klik sebuah elemen di canvas untuk mengeditnya. Klik dua kali teks untuk mengetik, atau gambar untuk upload." })]));
        }

        function after() { snapshot(); renderCanvas(); markSelection(); }
      }

      function miniNum(labelText, value, onInput) {
        var inp = el("input", { type: "text", value: String(value), onChange: function (ev) { var n = parseFloat(ev.target.value); if (!isNaN(n)) onInput(n); } });
        return el("div", { class: "lb-field" }, [el("label", { text: labelText }), inp]);
      }
      function alignBtn(txt, fn) { return el("button", { class: "chip", type: "button", text: txt, onClick: fn }); }

      // ---- element ops ----
      function addElement(type) {
        var e;
        if (type === "text") e = te(20, 44, 60, 10, "Teks baru", { size: 6, color: "text", weight: 700 });
        else if (type === "image") e = ie(25, 30, 50, 40, "");
        else e = se(20, 46, 60, 4, "accent");
        e.id = "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        st.elements.push(e); selectedId = e.id;
        snapshot(); buildPanel(); renderCanvas(); markSelection();
      }
      function duplicateSelected() {
        var e = selEl(); if (!e) return;
        var copy = JSON.parse(JSON.stringify(e));
        copy.id = "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        copy.x = clamp(e.x + 4, 0, 90); copy.y = clamp(e.y + 4, 0, 90);
        st.elements.push(copy); selectedId = copy.id;
        snapshot(); buildPanel(); renderCanvas(); markSelection(); toast("Elemen diduplikasi");
      }
      function removeElement(idx) {
        if (idx < 0) return;
        var removed = st.elements.splice(idx, 1)[0];
        if (removed && removed.id === selectedId) selectedId = null;
        snapshot(); buildPanel(); renderCanvas();
      }
      function reorder(idx, dir) {
        var j = idx + dir;
        if (j < 0 || j >= st.elements.length) return;
        var tmp = st.elements[idx]; st.elements[idx] = st.elements[j]; st.elements[j] = tmp;
        snapshot(); buildPanel(); renderCanvas(); markSelection();
      }

      buildPanel();

      // ---- toolbar ----
      var undoBtn, redoBtn, zoomLabel;
      function updateUndoRedo() { if (undoBtn) undoBtn.disabled = hpos <= 0; if (redoBtn) redoBtn.disabled = hpos >= history.length - 1; }

      undoBtn = el("button", { class: "pe-iconbtn", type: "button", title: "Undo", html: "↶", onClick: undo });
      redoBtn = el("button", { class: "pe-iconbtn", type: "button", title: "Redo", html: "↷", onClick: redo });
      zoomLabel = el("span", { class: "pe-zoom", text: "100%" });

      var toolbar = el("div", { class: "pe-toolbar" }, [
        el("div", { class: "pe-toolbar__group" }, [
          undoBtn, redoBtn,
          el("button", { class: "pe-iconbtn", type: "button", title: "Reset ke template", html: "⟳",
            onClick: function () { if (confirm("Reset ke template awal? Semua perubahan hilang.")) { st = defaultPosterState(tpl); selectedId = null; history = []; hpos = -1; snapshot(); buildPanel(); renderCanvas(); toast("Direset"); } } }),
          el("button", { class: "pe-iconbtn", type: "button", title: "Duplicate elemen terpilih", html: "⧉", onClick: duplicateSelected }),
          el("button", { class: "pe-iconbtn", type: "button", title: "Ganti Template", html: "▦", onClick: function () { G.navigate("#/templates?type=poster"); } })
        ]),
        el("div", { class: "pe-toolbar__group" }, [
          el("button", { class: "pe-iconbtn", type: "button", title: "Zoom out", html: "−", onClick: function () { zoom = clamp(zoom - 0.1, 0.3, 2); applyZoom(); } }),
          zoomLabel,
          el("button", { class: "pe-iconbtn", type: "button", title: "Zoom in", html: "+", onClick: function () { zoom = clamp(zoom + 0.1, 0.3, 2); applyZoom(); } }),
          el("button", { class: "pe-iconbtn", type: "button", title: "Reset zoom", html: "⊡", onClick: function () { zoom = 1; applyZoom(); } })
        ]),
        el("div", { class: "pe-toolbar__group" }, [
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "💾 Simpan", onClick: doSave }),
          el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "🖼 PNG", onClick: doPNG }),
          el("button", { class: "btn", type: "button", text: "⤑ PDF", onClick: doPDF })
        ])
      ]);

      function posterTitle() {
        var t = st.elements.filter(function (e) { return e.type === "text"; })[0];
        return (t && t.text) || "Poster";
      }
      function posterImageBytes() { var tot = 0; st.elements.forEach(function (e) { if (e.type === "image" && e.url) tot += e.url.length; }); return tot; }

      function doSave() {
        if (posterImageBytes() > 4.5 * 1024 * 1024) { toast("Gambar terlalu besar untuk disimpan. Perkecil gambar.", "error"); return; }
        var rec = layoutStore.save({ id: loaded ? loaded.id : null, kind: "poster", title: posterTitle() + " — Poster", payload: st });
        if (rec) { loaded = rec; toast("Poster tersimpan"); }
      }
      function withDeselect(cb) {
        // Deselect (hide handles/outlines) and render the canvas at true 1:1 pixels
        // so the export matches the design exactly, independent of zoom/fit.
        var keep = selectedId; selectedId = null; renderCanvas();
        requestAnimationFrame(function () {
          var prevTransform = canvasNode.style.transform;
          var prevHeight = canvasOuter.style.height;
          canvasNode.style.transform = "none";
          requestAnimationFrame(function () {
            cb();
            // restore view
            canvasNode.style.transform = prevTransform;
            canvasOuter.style.height = prevHeight;
            selectedId = keep; renderCanvas();
          });
        });
      }
      function doPNG() { withDeselect(function () { exportPNG(canvasNode, posterTitle().replace(/\s+/g, "_")); }); }
      function doPDF() { withDeselect(function () { var f = fmt(); exportPDF([canvasNode], f.pdf, f.w >= f.h ? "landscape" : "portrait", posterTitle().replace(/\s+/g, "_")); }); }

      var stage = el("div", { class: "lb-stage-wrap" }, [toolbar, canvasOuter,
        el("p", { class: "lb-note", text: "Zoom hanya tampilan — ekspor memakai ukuran asli (A4/A3/digital). Export PDF/PNG via html2canvas + jsPDF (butuh internet)." })]);

      page.appendChild(el("div", { class: "lb-shell" }, [panel, stage]));
      renderCanvas();
      snapshot(); // initial history entry
      updateUndoRedo();

      window.addEventListener("resize", applyZoom);
      page._cleanup = function () { window.removeEventListener("resize", applyZoom); };
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
      var wrap = el("div", { class: "tpl-thumb", style: "background:" + c.bg + ";overflow:hidden;" });
      // Render the real template elements in miniature so each thumbnail is truly distinct.
      var els = tpl.make ? tpl.make() : [];
      els.forEach(function (e) {
        var node = el("div", { style: "position:absolute;left:" + e.x + "%;top:" + e.y + "%;width:" + e.w + "%;height:" + e.h + "%;overflow:hidden;" });
        if (e.type === "text") {
          var fam = e.family === "head" ? c.head : c.font;
          var col = e.color === "accent" ? c.accent : (e.color && e.color.charAt(0) === "#" ? e.color : c.text);
          node.style.fontFamily = fam; node.style.color = col;
          node.style.fontWeight = e.weight; node.style.textAlign = e.align;
          node.style.fontSize = Math.max(4, Math.round(e.size * 0.9)) + "px";
          node.style.lineHeight = e.lh; node.style.whiteSpace = "pre-wrap";
          node.textContent = e.text;
        } else if (e.type === "image") {
          node.style.background = "repeating-linear-gradient(45deg,#d7d7e0,#d7d7e0 4px,#e8e8ef 4px,#e8e8ef 8px)";
          node.style.borderRadius = "2px";
        } else if (e.type === "shape") {
          node.style.background = e.color === "overlay" ? "linear-gradient(to top,rgba(0,0,0,.6),transparent)" : (e.color === "text" ? c.text : c.accent);
          node.style.borderRadius = (e.radius || 0) + "px";
        }
        wrap.appendChild(node);
      });
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
