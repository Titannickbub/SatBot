const sharp = require("sharp");

const WIDTH = 1200;
const HEIGHT = 630;
const AVATAR_SIZE = 144;

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function fitText(value, maxLength) {
    const characters = Array.from(String(value ?? ""));
    if (characters.length <= maxLength) return characters.join("");
    return `${characters.slice(0, maxLength - 1).join("")}…`;
}

async function renderWalletBanner({
    name,
    userId,
    balance,
    scopeName,
    scopeType,
    platform,
    canClaimDaily,
    dailyReward,
    avatar
}) {
    const displayName = fitText(name || userId || "Usuário", 27);
    const displayId = fitText(userId || "—", 40);
    const displayScope = fitText(scopeName || "Comunidade", 42);
    const formattedBalance = String(balance || "0,00💷").replace(/💷/g, "").trim();
    const balanceFontSize = Math.max(50, 82 - Math.max(0, Array.from(formattedBalance).length - 9) * 3);
    const claimMessage = canClaimDaily
        ? `RESGATE DIÁRIO DISPONÍVEL • +${dailyReward.replace(/💷/g, "").trim()} SATCOINS`
        : "RESGATE DIÁRIO JÁ UTILIZADO";
    const claimColor = canClaimDaily ? "#9bf2ce" : "#a5b5bd";
    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="wallet-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#203949"/><stop offset=".56" stop-color="#172b3b"/><stop offset="1" stop-color="#111c2b"/></linearGradient>
  <linearGradient id="wallet-card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#213b4b"/><stop offset="1" stop-color="#142535"/></linearGradient>
  <linearGradient id="wallet-accent" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6f5d3"/><stop offset="1" stop-color="#52d7aa"/></linearGradient>
  <radialGradient id="wallet-glow"><stop offset="0" stop-color="#54d5ae" stop-opacity=".17"/><stop offset="1" stop-color="#54d5ae" stop-opacity="0"/></radialGradient>
  <linearGradient id="chip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d18c"/><stop offset="1" stop-color="#c99e58"/></linearGradient>
</defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="#10222c"/>
<circle cx="1080" cy="-12" r="260" fill="#264b48" opacity=".25"/>
<circle cx="10" cy="600" r="190" fill="#394d79" opacity=".23"/>
<rect x="66" y="46" width="1080" height="548" rx="34" fill="#080f19" opacity=".55"/>
<rect x="54" y="38" width="1080" height="548" rx="34" fill="url(#wallet-card)" stroke="#42645d" stroke-width="2"/>
<rect x="56" y="40" width="1076" height="92" rx="32" fill="#ffffff" opacity=".035"/>
<circle cx="1015" cy="136" r="240" fill="url(#wallet-glow)"/>
<rect x="94" y="80" width="8" height="34" rx="4" fill="url(#wallet-accent)"/>
<text x="121" y="96" fill="#d9e7e6" font-family="Arial,Segoe UI,sans-serif" font-size="16px" font-weight="800" letter-spacing="2.5">SATCOIN • CARTEIRA DIGITAL</text>
<text x="121" y="119" fill="#8fa4ad" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="600">${escapeXml(fitText(`${scopeType || "GRUPO"} • ${displayScope}`, 54))}</text>
<text x="1084" y="97" fill="#b6c7c8" font-family="Arial,Segoe UI,sans-serif" font-size="12px" font-weight="700" text-anchor="end">${escapeXml(String(platform || "").toUpperCase())}</text>
<circle cx="1065" cy="92" r="5" fill="#73e3bb"/>
<rect x="94" y="147" width="992" height="1" fill="#ffffff" opacity=".12"/>
<circle cx="196" cy="263" r="77" fill="#12312f" stroke="#80e9c3" stroke-width="3"/>
<circle cx="196" cy="263" r="68" fill="#2a4653"/>
<circle cx="196" cy="242" r="23" fill="#8ea5a9"/>
<path d="M145 309c4-30 24-47 51-47s47 17 51 47c-13 16-30 24-51 24s-38-8-51-24Z" fill="#8ea5a9"/>
<text x="305" y="215" fill="#9bb9b5" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="800" letter-spacing="2">TITULAR DA CARTEIRA</text>
<text x="305" y="253" fill="#f2f6f5" font-family="Arial,Segoe UI,sans-serif" font-size="30px" font-weight="800">${escapeXml(displayName)}</text>
<text x="305" y="282" fill="#a9bbc1" font-family="Arial,Segoe UI,sans-serif" font-size="15px" font-weight="500">ID ${escapeXml(displayId)}</text>
<rect x="790" y="189" width="92" height="70" rx="14" fill="url(#chip)" stroke="#f2d694" stroke-width="2"/>
<path d="M813 190v68m22-68v68m23-68v68M792 212h88m-88 23h88" stroke="#a78349" stroke-width="2" opacity=".78"/>
<circle cx="982" cy="224" r="38" fill="#73dbb4" opacity=".86"/>
<circle cx="1024" cy="224" r="38" fill="#dbb36f" opacity=".86"/>
<path d="M918 203q43 21 0 43m14-57q57 35 0 71m14-86q70 43 0 101" fill="none" stroke="#a4b7b7" stroke-width="4" stroke-linecap="round" opacity=".8"/>
<text x="145" y="392" fill="#9bb9b5" font-family="Arial,Segoe UI,sans-serif" font-size="14px" font-weight="800" letter-spacing="2">SALDO DISPONÍVEL</text>
<text x="145" y="460" fill="#f2f7f5" font-family="Arial,Segoe UI,sans-serif" font-size="${balanceFontSize}px" font-weight="800">${escapeXml(formattedBalance)}</text>
<text x="149" y="489" fill="#81e7bf" font-family="Arial,Segoe UI,sans-serif" font-size="15px" font-weight="800" letter-spacing="3">SATCOINS</text>
<rect x="110" y="516" width="960" height="1" fill="#ffffff" opacity=".17"/>
<circle cx="120" cy="556" r="5" fill="${canClaimDaily ? "#82e9bf" : "#81959c"}"/>
<text x="140" y="561" fill="${claimColor}" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="800" letter-spacing="1">${escapeXml(claimMessage)}</text>
<text x="1070" y="561" fill="#80949c" font-family="Arial,Segoe UI,sans-serif" font-size="11px" font-weight="700" text-anchor="end">ID DA CONTA ${escapeXml(displayId)}</text>
</svg>`;

    const layers = [{ input: Buffer.from(svg) }];
    if (avatar && Buffer.isBuffer(avatar)) {
        const mask = Buffer.from(
            `<svg width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" xmlns="http://www.w3.org/2000/svg"><circle cx="${AVATAR_SIZE / 2}" cy="${AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}" fill="white"/></svg>`
        );
        const avatarBuffer = await sharp(avatar)
            .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
            .composite([{ input: mask, blend: "dest-in" }])
            .png()
            .toBuffer();
        layers.push({ input: avatarBuffer, left: 124, top: 191 });
        layers.push({
            input: Buffer.from('<svg width="156" height="156" xmlns="http://www.w3.org/2000/svg"><circle cx="78" cy="78" r="75" fill="none" stroke="#80e9c3" stroke-width="3"/></svg>'),
            left: 118,
            top: 185
        });
    }

    return sharp({
        create: {
            width: WIDTH,
            height: HEIGHT,
            channels: 4,
            background: "#10222c"
        }
    }).composite(layers).png().toBuffer();
}

module.exports = { renderWalletBanner };
