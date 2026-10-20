const sharp = require("sharp");
const { fetchBuffer } = require("./api");

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function splitTitle(title) {
    const normalized = String(title || "").replace(/\s+/g, " ").trim() || "Mídia solicitada";
    const words = normalized.split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length > 34 && line) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);

    if (lines.length > 2) {
        lines.length = 2;
        const lastLine = Array.from(lines[1]);
        if (lastLine.length > 31) lastLine.length = 31;
        lines[1] = `${lastLine.join("").replace(/[.,;:!?-]*$/, "")}…`;
    }

    return lines;
}

async function renderMediaBanner({ type, platform, title, author, duration, thumbnail }) {
    const isVideo = type === "video";
    const accent = isVideo ? "#ff5c57" : "#51d6c3";
    const titleLines = splitTitle(title);
    const titleStartY = titleLines.length > 1 ? 278 : 314;
    const titleSvg = titleLines
        .map((line, index) => `<text x="76" y="${titleStartY + index * 58}" fill="#ffffff" font-family="Arial,Segoe UI,sans-serif" font-size="46px" font-weight="800">${escapeXml(line)}</text>`)
        .join("");
    const metadata = [
        duration ? `DURAÇÃO  ${duration}` : null,
        author ? `CANAL  ${author}` : null
    ].filter(Boolean);
    const metadataSvg = metadata
        .map((item, index) => `<text x="78" y="${438 + index * 34}" fill="#e3e7ef" font-family="Arial,Segoe UI,sans-serif" font-size="20px" font-weight="600">${escapeXml(item)}</text>`)
        .join("");
    const glyph = isVideo
        ? `<path d="M967 276 L967 354 L1033 315 Z" fill="#ffffff"/>`
        : `<path d="M985 282 V343 A21 21 0 1 1 969 323 V296 L1031 280 V331 A21 21 0 1 1 1015 311 V260 Z" fill="#ffffff"/>`;
    const fallbackBackdrop = `<rect width="${WIDTH}" height="${HEIGHT}" fill="#111827"/><circle cx="1000" cy="130" r="290" fill="${accent}" opacity=".20"/><circle cx="1080" cy="560" r="220" fill="#7655c9" opacity=".18"/>`;
    const overlay = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#080b12" stop-opacity=".96"/><stop offset=".55" stop-color="#080b12" stop-opacity=".76"/><stop offset="1" stop-color="#080b12" stop-opacity=".34"/></linearGradient>
  <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop offset=".48" stop-color="#080b12" stop-opacity="0"/><stop offset="1" stop-color="#080b12" stop-opacity=".66"/></linearGradient>
</defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#shade)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bottom)"/>
<rect x="76" y="68" width="10" height="48" rx="5" fill="${accent}"/>
<text x="106" y="91" fill="#ffffff" font-family="Arial,Segoe UI,sans-serif" font-size="18px" font-weight="800" letter-spacing="2">${isVideo ? "VÍDEO" : "ÁUDIO"}  •  ${escapeXml(platform || "MÍDIA")}</text>
<text x="106" y="119" fill="#b9c2d2" font-family="Arial,Segoe UI,sans-serif" font-size="16px" font-weight="500">PRÉVIA DO DOWNLOAD</text>
<circle cx="1000" cy="315" r="58" fill="${accent}" opacity=".22"/><circle cx="1000" cy="315" r="43" fill="${accent}"/>${glyph}
${titleSvg}
${metadataSvg}
<rect x="76" y="526" width="1048" height="1" fill="#ffffff" opacity=".24"/>
<circle cx="84" cy="568" r="7" fill="${accent}"/>
<text x="106" y="576" fill="#ffffff" font-family="Arial,Segoe UI,sans-serif" font-size="19px" font-weight="700">${isVideo ? "Preparando seu vídeo..." : "Preparando seu áudio..."}</text>
<text x="1122" y="576" fill="#b9c2d2" font-family="Arial,Segoe UI,sans-serif" font-size="15px" font-weight="600" text-anchor="end">${escapeXml(platform || "")}</text>
</svg>`);

    let backdrop = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${fallbackBackdrop}</svg>`);
    if (thumbnail) {
        try {
            const thumbnailBuffer = await fetchBuffer(thumbnail, { timeout: 12000 });
            backdrop = await sharp(thumbnailBuffer)
                .resize(WIDTH, HEIGHT, { fit: "cover" })
                .png()
                .toBuffer();
        } catch (error) {
            console.warn("[MEDIA_BANNER] Não foi possível carregar a miniatura; usando fundo padrão:", error.message || error);
        }
    }

    return sharp(backdrop)
        .composite([{ input: overlay }])
        .png()
        .toBuffer();
}

module.exports = { renderMediaBanner };
