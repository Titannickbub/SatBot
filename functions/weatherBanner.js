const sharp = require("sharp");

const WIDTH = 1200;
const HEIGHT = 720;

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function valueOf(items) {
    return items?.[0]?.value || "";
}

function weatherIcon(description, x, y, scale = 1) {
    const condition = String(description || "").toLowerCase();
    const sun = `<circle cx="${x}" cy="${y}" r="${19 * scale}" fill="#ffd166"/><g stroke="#ffd166" stroke-width="${4 * scale}" stroke-linecap="round"><path d="M${x} ${y - 31 * scale}v-9M${x} ${y + 31 * scale}v9M${x - 31 * scale} ${y}h-9M${x + 31 * scale} ${y}h9M${x - 22 * scale} ${y - 22 * scale}l-7 -7M${x + 22 * scale} ${y + 22 * scale}l7 7M${x + 22 * scale} ${y - 22 * scale}l7 -7M${x - 22 * scale} ${y + 22 * scale}l-7 7"/></g>`;
    const cloud = `<path d="M${x - 29 * scale} ${y + 12 * scale}c-17 0-20-23-4-28 5-23 38-24 45-3 20-2 24 31 2 31Z" fill="#dce6f4"/>`;

    if (/thunder|trovo|storm/.test(condition)) {
        return `<path d="M${x - 28 * scale} ${y + 9 * scale}c-16 0-19-22-4-27 5-22 36-23 43-3 18-2 23 29 2 30Z" fill="#cdd7e8"/><path d="M${x + 2 * scale} ${y + 12 * scale}l-17 25h13l-5 20 21-29H${x + 2 * scale}Z" fill="#ffd166"/>`;
    }
    if (/rain|drizzle|shower|chuva/.test(condition)) {
        return `${cloud}<g stroke="#75c8ff" stroke-width="${5 * scale}" stroke-linecap="round"><path d="M${x - 16 * scale} ${y + 22 * scale}l-6 13M${x} ${y + 22 * scale}l-6 13M${x + 16 * scale} ${y + 22 * scale}l-6 13"/></g>`;
    }
    if (/snow|sleet|neve/.test(condition)) {
        return `${cloud}<g fill="#8be0ff"><circle cx="${x - 12 * scale}" cy="${y + 35 * scale}" r="${4 * scale}"/><circle cx="${x + 8 * scale}" cy="${y + 39 * scale}" r="${4 * scale}"/><circle cx="${x + 23 * scale}" cy="${y + 31 * scale}" r="${4 * scale}"/></g>`;
    }
    if (/cloud|nublado|overcast|encoberto|mist|fog|névoa|nevoeiro/.test(condition)) {
        return cloud;
    }
    if (/partly|parcial/.test(condition)) {
        return `${sun}<path d="M${x - 17 * scale} ${y + 22 * scale}c-15 0-17-19-3-23 4-19 30-20 36-3 16-1 19 26 2 26Z" fill="#dce6f4"/>`;
    }
    return sun;
}

function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString || "—";
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
    });
}

async function renderWeatherBanner(data, requestedCity = "") {
    const current = data?.current_condition?.[0];
    if (!current) throw new Error("A previsão não contém condições atuais.");

    const area = data.nearest_area?.[0];
    const location = [
        valueOf(area?.areaName) || requestedCity || "Local",
        valueOf(area?.region),
        valueOf(area?.country)
    ].filter(Boolean).join(" • ");
    const description = valueOf(current.lang_pt) || valueOf(current.weatherDesc) || "Condição indisponível";
    const forecast = Array.isArray(data.weather) ? data.weather.slice(0, 3) : [];
    const forecastCards = forecast.map((day, index) => {
        const x = 64 + index * 360;
        const hour = day.hourly?.[4] || day.hourly?.[0] || {};
        const dayDescription = valueOf(hour.lang_pt) || valueOf(hour.weatherDesc) || description;
        const label = index === 0 ? "HOJE" : formatDate(day.date);
        return [
            `<rect x="${x}" y="490" width="332" height="160" rx="22" fill="#192337" stroke="#35425a"/>`,
            `<text x="${x + 24}" y="527" fill="#aab7cb" font-family="Arial,Segoe UI,sans-serif" font-size="16px" font-weight="800" letter-spacing="1">${escapeXml(label)}</text>`,
            weatherIcon(dayDescription, x + 278, 550, 0.62),
            `<text x="${x + 24}" y="571" fill="#f4f6fb" font-family="Arial,Segoe UI,sans-serif" font-size="18px" font-weight="700">${escapeXml(dayDescription.slice(0, 20))}</text>`,
            `<text x="${x + 24}" y="615" fill="#dbe4f1" font-family="Arial,Segoe UI,sans-serif" font-size="20px" font-weight="700">${escapeXml(day.mintempC || "—")}°  /  ${escapeXml(day.maxtempC || "—")}°C</text>`
        ].join("");
    }).join("");

    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="weather-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c3550"/><stop offset=".58" stop-color="#111c30"/><stop offset="1" stop-color="#101522"/></linearGradient><radialGradient id="weather-glow"><stop offset="0" stop-color="#4bc4d0" stop-opacity=".28"/><stop offset="1" stop-color="#4bc4d0" stop-opacity="0"/></radialGradient></defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#weather-bg)"/>
<circle cx="1060" cy="120" r="330" fill="url(#weather-glow)"/>
<rect x="24" y="24" width="1152" height="672" rx="30" fill="#111827cc" stroke="#34445b" stroke-width="2"/>
<text x="64" y="80" fill="#70d6d2" font-family="Arial,Segoe UI,sans-serif" font-size="18px" font-weight="800" letter-spacing="2">CLIMA AGORA</text>
<text x="64" y="125" fill="#f4f6fb" font-family="Arial,Segoe UI,sans-serif" font-size="30px" font-weight="700">${escapeXml(location.slice(0, 50))}</text>
${weatherIcon(description, 950, 235, 1.7)}
<text x="72" y="244" fill="#ffffff" font-family="Arial,Segoe UI,sans-serif" font-size="112px" font-weight="800">${escapeXml(current.temp_C || "—")}°</text>
<text x="76" y="292" fill="#d2dceb" font-family="Arial,Segoe UI,sans-serif" font-size="26px" font-weight="600">SENSAÇÃO ${escapeXml(current.FeelsLikeC || "—")}°C</text>
<text x="76" y="346" fill="#70d6d2" font-family="Arial,Segoe UI,sans-serif" font-size="25px" font-weight="700">${escapeXml(description.slice(0, 46))}</text>
<rect x="64" y="388" width="1072" height="1" fill="#ffffff" opacity=".16"/>
<g fill="#dce4f0" font-family="Arial,Segoe UI,sans-serif" font-size="18px" font-weight="600">
<text x="76" y="432">UMIDADE</text><text x="76" y="463" fill="#ffffff" font-size="23px" font-weight="800">${escapeXml(current.humidity || "—")}%</text>
<text x="340" y="432">VENTO</text><text x="340" y="463" fill="#ffffff" font-size="23px" font-weight="800">${escapeXml(current.windspeedKmph || "—")} km/h</text>
<text x="650" y="432">CHUVA</text><text x="650" y="463" fill="#ffffff" font-size="23px" font-weight="800">${escapeXml(current.precipMM || "—")} mm</text>
</g>
${forecastCards}
<text x="1136" y="675" fill="#78879e" font-family="Arial,Segoe UI,sans-serif" font-size="13px" text-anchor="end">Previsão sujeita a alterações</text>
</svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { renderWeatherBanner };
