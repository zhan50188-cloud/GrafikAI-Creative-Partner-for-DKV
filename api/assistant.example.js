/* ============================================================
   GrafikAI — AI Creative Assistant backend (CONTOH / OPTIONAL)
   ============================================================
   Ini CONTOH serverless function (format Vercel: /api/assistant).
   Tujuannya: menjalankan AI API dengan AMAN dari sisi server,
   sehingga API KEY TIDAK PERNAH ada di JavaScript frontend.

   Cara pakai:
   1. Rename file ini menjadi `api/assistant.js` (hapus ".example").
   2. Set environment variable di dashboard hosting (mis. Vercel):
        OPENAI_API_KEY = sk-...        (JANGAN commit key ke repo)
   3. Deploy. Frontend otomatis memakai endpoint ini bila tersedia;
      jika tidak, frontend tetap jalan dengan mode demo lokal.

   Catatan keamanan:
   - Key dibaca dari process.env, bukan ditulis di kode.
   - Jangan pernah mengirim key ke client.
   - Batasi ukuran input & tambahkan rate limiting bila dipakai publik.
   ============================================================ */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY; // <- hanya ada di server
  if (!apiKey) {
    // Tidak ada key: beri sinyal agar frontend memakai mode demo.
    res.status(501).json({ error: "AI API belum dikonfigurasi. Frontend akan memakai mode demo." });
    return;
  }

  try {
    const input = req.body || {};
    // Validasi ringan
    const clean = (s) => String(s || "").slice(0, 500);
    const prompt = buildSystemPrompt({
      projectType: clean(input.projectType),
      goal: clean(input.goal),
      audience: clean(input.audience),
      message: clean(input.message),
      style: clean(input.style),
      media: clean(input.media),
      colors: clean(input.colors),
      constraints: clean(input.constraints),
    });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Kamu asisten desain grafis DKV. Jawab HANYA JSON valid sesuai skema yang diminta, dalam Bahasa Indonesia, spesifik dan beralasan — jangan mengulang input mentah." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!r.ok) {
      res.status(502).json({ error: "Upstream AI error" });
      return;
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = null; }
    if (!parsed || !parsed.brief || !parsed.concepts) {
      res.status(502).json({ error: "Format AI tidak sesuai" });
      return;
    }

    // Bentuk harus cocok dengan yang dipakai frontend (lihat js/assistant.js).
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

function buildSystemPrompt(i) {
  return `Buat rekomendasi desain untuk proyek DKV berikut dan kembalikan JSON dengan field:
{
  "brief": string,
  "concepts": [{"tag":string,"title":string,"body":string} x3],
  "hierarchy": [{"rank":number,"name":string,"desc":string}],
  "palette": {"note":string,"colors":[{"role":string,"hex":string,"why":string} x5]},
  "audienceNote": string,
  "fonts": {"pair":[[name,use] ...],"scaleNote":string},
  "layout": {"comp":string,"rule":string},
  "prompt": {"positive":string,"negative":string},
  "checklist": [string ...],
  "meta": {"style":string,"project":string}
}

Input:
- Jenis proyek: ${i.projectType}
- Tujuan: ${i.goal}
- Target audiens: ${i.audience}
- Pesan utama: ${i.message}
- Gaya visual: ${i.style}
- Ukuran media: ${i.media}
- Warna pilihan: ${i.colors}
- Batasan khusus: ${i.constraints}

Aturan: setiap rekomendasi WAJIB menjelaskan alasannya dan relevan dengan tujuan, audiens, dan media. Tiga konsep harus benar-benar berbeda pendekatannya. HEX palet harus valid.`;
}
