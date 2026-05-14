function normalizeBase(url) {
    return url.replace(/\/+$/, "");
}
function headers(apiKey) {
    const h = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };
    if (apiKey) {
        h.Authorization = `Bearer ${apiKey}`;
    }
    return h;
}
async function readError(res) {
    const text = await res.text();
    try {
        const j = JSON.parse(text);
        return j.error ?? j.message ?? text.slice(0, 500);
    }
    catch {
        return text.slice(0, 500) || res.statusText;
    }
}
export async function translate(baseUrl, apiKey, timeoutMs, input) {
    const url = `${normalizeBase(baseUrl)}/translate`;
    let res;
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
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `translate_fetch_failed: ${msg}` };
    }
    if (!res.ok) {
        return { ok: false, error: await readError(res) };
    }
    const data = (await res.json());
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
export async function detect(baseUrl, apiKey, timeoutMs, q) {
    const url = `${normalizeBase(baseUrl)}/detect`;
    let res;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: headers(apiKey),
            body: JSON.stringify({ q }),
            signal: AbortSignal.timeout(timeoutMs),
        });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `detect_fetch_failed: ${msg}` };
    }
    if (!res.ok) {
        return { ok: false, error: await readError(res) };
    }
    const data = (await res.json());
    if (!Array.isArray(data)) {
        return { ok: false, error: "invalid_response: detect body must be array" };
    }
    const detections = [];
    for (const row of data) {
        if (row &&
            typeof row === "object" &&
            "language" in row &&
            typeof row.language === "string" &&
            "confidence" in row &&
            typeof row.confidence === "number") {
            detections.push({
                language: row.language,
                confidence: row.confidence,
            });
        }
    }
    return { ok: true, detections };
}
export async function languages(baseUrl, apiKey, timeoutMs) {
    const url = `${normalizeBase(baseUrl)}/languages`;
    let res;
    try {
        res = await fetch(url, {
            method: "GET",
            headers: headers(apiKey),
            signal: AbortSignal.timeout(timeoutMs),
        });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `languages_fetch_failed: ${msg}` };
    }
    if (!res.ok) {
        return { ok: false, error: await readError(res) };
    }
    const data = (await res.json());
    if (!Array.isArray(data)) {
        return { ok: false, error: "invalid_response: languages body must be array" };
    }
    const languages = [];
    for (const row of data) {
        if (row &&
            typeof row === "object" &&
            "code" in row &&
            "name" in row &&
            typeof row.code === "string" &&
            typeof row.name === "string") {
            languages.push({
                code: row.code,
                name: row.name,
            });
        }
    }
    return { ok: true, languages };
}
