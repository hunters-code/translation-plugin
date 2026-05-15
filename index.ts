import { Type, type Static } from "@sinclair/typebox";
import { definePluginEntry, jsonResult } from "openclaw/plugin-sdk/core";
import { registerOrbitUserBilling } from "@orbit-0g/sdk";
import { detect, languages, translate } from "./src/client";

const apiBaseUrl = (process.env.OPENCLAW_TRANSLATION_API_URL ?? "https://libretranslate.com").trim();
const apiKey = process.env.OPENCLAW_TRANSLATION_API_KEY?.trim() || undefined;

const timeoutMs = (() => {
  const raw = process.env.OPENCLAW_TRANSLATION_TIMEOUT_MS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 1_000 && n <= 120_000) return n;
  return 45_000;
})();

const translateParams = Type.Object({
  text: Type.String({ description: "Teks yang akan diterjemahkan" }),
  target: Type.String({
    description: "Kode bahasa tujuan ISO 639-1, mis. id, en, ja",
  }),
  source: Type.Optional(
    Type.String({
      description: 'Bahasa sumber (ISO 639-1) atau "auto" untuk deteksi otomatis',
      default: "auto",
    }),
  ),
  format: Type.Optional(
    Type.Union([Type.Literal("text"), Type.Literal("html")], {
      default: "text",
      description: "Format isi teks",
    }),
  ),
});

const detectParams = Type.Object({
  text: Type.String({ description: "Cuplikan teks untuk dideteksi bahasanya" }),
});

const languagesParams = Type.Object({});

export default definePluginEntry({
  id: "openclaw-translation",
  name: "Terjemahan teks",
  description:
    "Menerjemahkan teks dan mendeteksi bahasa lewat API LibreTranslate-compat (atur OPENCLAW_TRANSLATION_API_URL untuk server sendiri)",
  register(api) {
    registerOrbitUserBilling(api as any, {
      pluginId: process.env.ORBIT_PLUGIN_ID,
    });

    api.registerTool({
      name: "translation_translate",
      label: "Terjemahkan teks",
      description:
        "Menerjemahkan string ke bahasa target; sumber bisa auto. Butuh koneksi ke endpoint LibreTranslate.",
      parameters: translateParams,
      async execute(_id, params) {
        const p = params as Static<typeof translateParams>;
        const text = p.text.trim();
        if (!text) {
          return jsonResult({ ok: false, reason: "text_empty" });
        }
        const target = p.target.trim().toLowerCase();
        if (!target) {
          return jsonResult({ ok: false, reason: "target_empty" });
        }
        const source = (p.source ?? "auto").trim().toLowerCase() || "auto";
        const format = p.format ?? "text";
        const result = await translate(apiBaseUrl, apiKey, timeoutMs, {
          q: text,
          source,
          target,
          format,
        });
        if (!result.ok) {
          return jsonResult({ ok: false, error: result.error });
        }
        return jsonResult({
          ok: true,
          translatedText: result.translatedText,
          ...(result.detectedLanguage !== undefined
            ? { detectedLanguage: result.detectedLanguage }
            : {}),
          source,
          target,
        });
      },
    });

    api.registerTool({
      name: "translation_detect",
      label: "Deteksi bahasa",
      description: "Menebak bahasa dari cuplikan teks (peringkat confidence)",
      parameters: detectParams,
      async execute(_id, params) {
        const p = params as Static<typeof detectParams>;
        const text = p.text.trim();
        if (!text) {
          return jsonResult({ ok: false, reason: "text_empty" });
        }
        const result = await detect(apiBaseUrl, apiKey, timeoutMs, text);
        if (!result.ok) {
          return jsonResult({ ok: false, error: result.error });
        }
        return jsonResult({ ok: true, detections: result.detections });
      },
    });

    api.registerTool({
      name: "translation_languages",
      label: "Daftar bahasa",
      description:
        "Bahasa yang didukung server terjemahan (kode + nama) untuk memilih target translate",
      parameters: languagesParams,
      async execute(_id, _params) {
        const result = await languages(apiBaseUrl, apiKey, timeoutMs);
        if (!result.ok) {
          return jsonResult({ ok: false, error: result.error });
        }
        return jsonResult({ ok: true, languages: result.languages });
      },
    });
  },
});
