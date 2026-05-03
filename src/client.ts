export type TranslateInput = {
  q: string;
  source: string;
  target: string;
  format: "text" | "html";
};

export type LangInfo = { code: string; name: string };

export type DetectHit = { language: string; confidence: number };

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

function headers(apiKey: string | undefined): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) {
    h.Authorization = `Bearer ${apiKey}`;
  }
  return h;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: string; message?: string };
    return j.error ?? j.message ?? text.slice(0, 500);
  } catch {
    return text.slice(0, 500) || res.statusText;
  }
}

export async function translate(
  baseUrl: string,
  apiKey: string | undefined,
  timeoutMs: number,
  input: TranslateInput,
): Promise<{ ok: true; translatedText: string; detectedLanguage?: string } | { ok: false; error: string }> {
  const url = `${normalizeBase(baseUrl)}/translate`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({
        q: input.q,
        source: input.source,
        target: input.target,
        format: input.format,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `translate_fetch_failed: ${msg}` };
  }
  if (!res.ok) {
    return { ok: false, error: await readError(res) };
  }
  const data = (await res.json()) as {
    translatedText?: string;
    detectedLanguage?: string;
  };
  if (typeof data.translatedText !== "string") {
    return { ok: false, error: "invalid_response: missing translatedText" };
  }
  return {
    ok: true,
    translatedText: data.translatedText,
    ...(typeof data.detectedLanguage === "string"
      ? { detectedLanguage: data.detectedLanguage }
      : {}),
  };
}

export async function detect(
  baseUrl: string,
  apiKey: string | undefined,
  timeoutMs: number,
  q: string,
): Promise<{ ok: true; detections: DetectHit[] } | { ok: false; error: string }> {
  const url = `${normalizeBase(baseUrl)}/detect`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ q }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `detect_fetch_failed: ${msg}` };
  }
  if (!res.ok) {
    return { ok: false, error: await readError(res) };
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    return { ok: false, error: "invalid_response: detect body must be array" };
  }
  const detections: DetectHit[] = [];
  for (const row of data) {
    if (
      row &&
      typeof row === "object" &&
      "language" in row &&
      typeof (row as { language: unknown }).language === "string" &&
      "confidence" in row &&
      typeof (row as { confidence: unknown }).confidence === "number"
    ) {
      detections.push({
        language: (row as { language: string }).language,
        confidence: (row as { confidence: number }).confidence,
      });
    }
  }
  return { ok: true, detections };
}

export async function languages(
  baseUrl: string,
  apiKey: string | undefined,
  timeoutMs: number,
): Promise<{ ok: true; languages: LangInfo[] } | { ok: false; error: string }> {
  const url = `${normalizeBase(baseUrl)}/languages`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: headers(apiKey),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `languages_fetch_failed: ${msg}` };
  }
  if (!res.ok) {
    return { ok: false, error: await readError(res) };
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    return { ok: false, error: "invalid_response: languages body must be array" };
  }
  const languages: LangInfo[] = [];
  for (const row of data) {
    if (
      row &&
      typeof row === "object" &&
      "code" in row &&
      "name" in row &&
      typeof (row as { code: unknown }).code === "string" &&
      typeof (row as { name: unknown }).name === "string"
    ) {
      languages.push({
        code: (row as { code: string }).code,
        name: (row as { name: string }).name,
      });
    }
  }
  return { ok: true, languages };
}
