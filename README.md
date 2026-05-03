# openclaw-plugin-translation

Plugin OpenClaw mandiri: alat `translation_translate`, `translation_detect`, dan `translation_languages` memakai API [LibreTranslate](https://libretranslate.com)-compat (bisa self-hosted).

Tidak ada ketergantungan pada monorepo lain — hanya `@sinclair/typebox` dan peer `openclaw`.

## Prasyarat

- Node.js **≥ 22.14** (sesuai requirement paket `openclaw`)

## Pasang

```bash
npm install
npm run typecheck
```

## Variabel lingkungan

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `OPENCLAW_TRANSLATION_API_URL` | `https://libretranslate.com` | Basis URL server LibreTranslate |
| `OPENCLAW_TRANSLATION_API_KEY` | — | Opsional, header `Authorization: Bearer …` |
| `OPENCLAW_TRANSLATION_TIMEOUT_MS` | `45000` | Rentang 1000–120000 |

## Instal di OpenClaw Gateway

Id plugin: **`openclaw-translation`** (sama di `openclaw.plugin.json` dan `definePluginEntry`).

### 1. Siapkan paket

```bash
cd openclaw-plugin-translation
npm install
```

Pastikan CLI OpenClaw terpasang (`openclaw --version`) dan Gateway memenuhi `minGatewayVersion` di `package.json` (bidang `openclaw.compat`).

### 2. Pasang plugin

**Folder lokal (salinan ke direktori plugin OpenClaw):**

```bash
openclaw plugins install /Users/ANDA/Documents/openclaw-plugin-translation
```

**Folder lokal dengan symlink (cocok untuk development; ubah kode tanpa reinstall):**

```bash
openclaw plugins install --link ./openclaw-plugin-translation
```

**Setelah repo Anda di GitHub:**

```bash
openclaw plugins install git:github.com/<user>/<repo>
openclaw plugins install git:github.com/<user>/<repo>@v0.1.0
```

**Setelah publish ke npm:**

```bash
openclaw plugins install npm:@scope/openclaw-plugin-translation
```

Lihat juga [Manage plugins](https://docs.openclaw.ai/plugins/manage-plugins) dan referensi CLI [Plugins](https://docs.openclaw.ai/cli/plugins).

### 3. Aktifkan (jika perlu) dan restart Gateway

Beberapa plugin bundled perlu `enable`; untuk plugin Anda, cek inventaris:

```bash
openclaw plugins list --verbose
openclaw plugins enable openclaw-translation
```

Muat ulang proses Gateway agar `register(api)` dieksekusi:

```bash
openclaw gateway restart
```

### 4. Verifikasi

```bash
openclaw plugins inspect openclaw-translation --runtime --json
```

Keluaran runtime harus mencerminkan tool yang terdaftar (`translation_translate`, dll.).  
Set konfigurasi gateway bermasalah bisa diblok saat install — jalankan `openclaw doctor --fix` jika CLI menyarankan itu.

### 5. Variabel lingkungan untuk proses Gateway

Set `OPENCLAW_TRANSLATION_*` di lingkungan tempat **`openclaw gateway run`** berjalan (service manager, wrapper script, atau shell yang memulai gateway). Contoh:

```bash
export OPENCLAW_TRANSLATION_API_URL="https://libretranslate.com"
export OPENCLAW_TRANSLATION_API_KEY=""   # opsional
openclaw gateway restart
```

Jika Anda memakai **allowlist / denylist** plugin di konfigurasi gateway, tambahkan id **`openclaw-translation`** ke daftar yang diizinkan (lihat dokumentasi konfigurasi gateway Anda).

## Contoh alur agen

1. Panggil `translation_languages` untuk melihat kode bahasa yang didukung server Anda.
2. Panggil `translation_translate` dengan `text`, `target` (mis. `id`), dan opsional `source` (`auto` atau kode tetap).
3. Opsional: `translation_detect` untuk menebak bahasa sebelum menerjemahkan.

Struktur mengikuti pola [nashir-openclaw-plugin-lab](https://github.com/hunters-code/nashir-openclaw-plugin-lab).
