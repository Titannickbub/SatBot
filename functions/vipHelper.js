const { getVipConfig } = require('./config');
const centralAccountsStore = require('./centralAccounts');

function _nowMs() { return Date.now(); }

function _safeCentral(centralId) {
    if (!centralId) return null;
    if (centralAccountsStore && typeof centralAccountsStore.getCentralById === 'function') {
        return centralAccountsStore.getCentralById(centralId);
    }
    return null;
}

function _toDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function _normalizeVip(vip) {
    if (!vip || typeof vip !== 'object') {
        return { active: false, permanent: false, expiresAt: null, startedAt: null, lastUpdatedAt: null };
    }
    return {
        active: !!vip.active,
        permanent: !!vip.permanent,
        expiresAt: vip.expiresAt || null,
        startedAt: vip.startedAt || null,
        lastUpdatedAt: vip.lastUpdatedAt || null
    };
}

function parseDurationString(input) {
    if (typeof input === 'number') {
        return Number.isFinite(input) && input >= 0 ? Math.round(input) : 0;
    }
    if (typeof input !== 'string') {
        return 0;
    }
    const text = input.trim().toLowerCase();
    if (!text) return 0;
    const regex = /(-?\d+(?:[.,]\d+)?)\s*([a-z]+)/g;
    let total = 0;
    let match;
    let hasValue = false;

    while ((match = regex.exec(text)) !== null) {
        hasValue = true;
        const amount = parseFloat(match[1].replace(',', '.'));
        const unit = match[2];
        if (!Number.isFinite(amount)) continue;
        if (unit === 'd' || unit === 'dia' || unit === 'dias') total += amount * 24 * 60 * 60 * 1000;
        else if (unit === 'h' || unit === 'hr' || unit === 'hora' || unit === 'horas') total += amount * 60 * 60 * 1000;
        else if (unit === 'm' || unit === 'min' || unit === 'minuto' || unit === 'minutos') total += amount * 60 * 1000;
        else if (unit === 's' || unit === 'sec' || unit === 'seg' || unit === 'segundo' || unit === 'segundos') total += amount * 1000;
    }

    if (!hasValue) {
        const single = text.match(/^(-?\d+(?:[.,]\d+)?)$/);
        if (single) return Math.round(parseFloat(single[1].replace(',', '.')) * 1000);
        return 0;
    }
    return Math.max(0, Math.round(total));
}

function formatDurationMs(value) {
    const ms = Number(value) || 0;
    if (ms <= 0) return '0 minutos';

    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
    if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);

    return parts.join(', ') || '0 minutos';
}

function formatDurationText(value) {
    const ms = Number(value) || 0;
    if (ms <= 0) return '0 minutos';

    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);

    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} e ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

function parseDateTimeString(dateStr, timeStr) {
    if (dateStr instanceof Date) return dateStr;
    let raw = String(dateStr || '').trim();
    if (!raw) return null;

    if (timeStr !== undefined && timeStr !== null) {
        raw = `${raw} ${String(timeStr).trim()}`;
    }

    const normalized = raw.replace(/\s+/g, ' ').trim();
    const direct = new Date(normalized);
    if (!Number.isNaN(direct.getTime())) return direct;

    const match = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) return null;

    const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
    const safeYear = Number(year) < 100 ? (Number(year) < 50 ? 2000 + Number(year) : 1900 + Number(year)) : Number(year);
    const parsed = new Date(
        safeYear,
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(dateValue) {
    const date = _toDate(dateValue);
    if (!date) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDateTimeDetailed(dateValue) {
    const date = _toDate(dateValue);
    if (!date) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

function _syncVipState(central) {
    if (!central || !central.vip) {
        return { active: false, permanent: false, expiresAt: null, startedAt: null, lastUpdatedAt: null };
    }

    const vip = _normalizeVip(central.vip);
    if (vip.permanent) {
        vip.active = true;
        vip.expiresAt = null;
    } else if (vip.expiresAt) {
        const expiry = _toDate(vip.expiresAt);
        if (expiry && expiry.getTime() <= _nowMs()) {
            vip.active = false;
            vip.expiresAt = null;
        } else {
            vip.active = true;
        }
    } else {
        vip.active = false;
    }

    central.vip = vip;
    return vip;
}

function getVipStatus(centralId) {
    const central = _safeCentral(centralId);
    if (!central) {
        return { active: false, permanent: false, expiresAt: null, startedAt: null, remainingMs: 0, remainingText: '❌ Não', display: '❌ Não', expiresAtText: '—' };
    }

    const vip = _syncVipState(central);
    if (vip.permanent) {
        return {
            active: true,
            permanent: true,
            expiresAt: null,
            startedAt: vip.startedAt || central.createdAt || null,
            remainingMs: Number.MAX_SAFE_INTEGER,
            remainingText: '👑 Permanente',
            display: '👑 Permanente',
            expiresAtText: '—'
        };
    }

    if (!vip.expiresAt) {
        return {
            active: false,
            permanent: false,
            expiresAt: null,
            startedAt: vip.startedAt || null,
            remainingMs: 0,
            remainingText: '❌ Não',
            display: '❌ Não',
            expiresAtText: '—'
        };
    }

    const expiry = _toDate(vip.expiresAt);
    const remainingMs = expiry ? Math.max(0, expiry.getTime() - _nowMs()) : 0;
    if (remainingMs <= 0) {
        central.vip = { ...vip, active: false, expiresAt: null, lastUpdatedAt: new Date().toISOString() };
        return {
            active: false,
            permanent: false,
            expiresAt: null,
            startedAt: vip.startedAt || null,
            remainingMs: 0,
            remainingText: '❌ Não',
            display: '❌ Não',
            expiresAtText: '—'
        };
    }

    return {
        active: true,
        permanent: false,
        expiresAt: vip.expiresAt,
        startedAt: vip.startedAt || null,
        remainingMs,
        remainingText: `${formatDurationMs(remainingMs)} (expira em ${formatDateTime(vip.expiresAt)})`,
        display: `${formatDurationMs(remainingMs)} (expira em ${formatDateTime(vip.expiresAt)})`,
        expiresAtText: formatDateTime(vip.expiresAt)
    };
}

function hasVip(centralId) {
    const status = getVipStatus(centralId);
    return !!status.active || !!status.permanent;
}

function setVipDuration(centralId, durationMs) {
    const central = _safeCentral(centralId);
    if (!central) throw new Error('central not found');
    const totalMs = Math.max(0, Number(durationMs) || 0);
    const now = new Date();
    const vip = {
        active: totalMs > 0,
        permanent: false,
        startedAt: now.toISOString(),
        expiresAt: totalMs > 0 ? new Date(now.getTime() + totalMs).toISOString() : null,
        lastUpdatedAt: now.toISOString()
    };
    central.vip = vip;
    return getVipStatus(centralId);
}

function addVipDuration(centralId, durationMs) {
    const central = _safeCentral(centralId);
    if (!central) throw new Error('central not found');
    const totalMs = Math.max(0, Number(durationMs) || 0);
    if (totalMs <= 0) {
        return getVipStatus(centralId);
    }

    const vip = _normalizeVip(central.vip);
    if (vip.permanent) {
        return getVipStatus(centralId);
    }

    const currentExpiry = vip.expiresAt ? _toDate(vip.expiresAt) : null;
    const now = _nowMs();
    const baseMs = currentExpiry && currentExpiry.getTime() > now ? currentExpiry.getTime() : now;
    vip.active = true;
    vip.permanent = false;
    vip.startedAt = vip.startedAt || new Date(now).toISOString();
    vip.expiresAt = new Date(baseMs + totalMs).toISOString();
    vip.lastUpdatedAt = new Date(now).toISOString();
    central.vip = vip;
    return getVipStatus(centralId);
}

function removeVipDuration(centralId, durationMs) {
    const central = _safeCentral(centralId);
    if (!central) throw new Error('central not found');
    const totalMs = Math.max(0, Number(durationMs) || 0);
    if (totalMs <= 0) {
        return getVipStatus(centralId);
    }

    const vip = _normalizeVip(central.vip);
    if (vip.permanent) {
        return getVipStatus(centralId);
    }

    if (!vip.expiresAt) {
        return getVipStatus(centralId);
    }

    const expiry = _toDate(vip.expiresAt);
    if (!expiry) {
        return getVipStatus(centralId);
    }

    const now = _nowMs();
    const newExpiry = expiry.getTime() - totalMs;
    if (newExpiry <= now) {
        vip.active = false;
        vip.permanent = false;
        vip.expiresAt = null;
        vip.lastUpdatedAt = new Date(now).toISOString();
        central.vip = vip;
        return getVipStatus(centralId);
    }

    vip.active = true;
    vip.permanent = false;
    vip.expiresAt = new Date(newExpiry).toISOString();
    vip.lastUpdatedAt = new Date(now).toISOString();
    central.vip = vip;
    return getVipStatus(centralId);
}

function resetVip(centralId) {
    const central = _safeCentral(centralId);
    if (!central) throw new Error('central not found');
    central.vip = {
        active: false,
        permanent: false,
        expiresAt: null,
        startedAt: null,
        lastUpdatedAt: new Date().toISOString()
    };
    return getVipStatus(centralId);
}

function setVipDate(centralId, dateInput, timeInput) {
    const central = _safeCentral(centralId);
    if (!central) throw new Error('central not found');
    const date = parseDateTimeString(dateInput, timeInput);
    if (!date) throw new Error('invalid-date');
    const vip = _normalizeVip(central.vip);
    vip.active = true;
    vip.permanent = false;
    vip.startedAt = vip.startedAt || new Date().toISOString();
    vip.expiresAt = new Date(date.getTime()).toISOString();
    vip.lastUpdatedAt = new Date().toISOString();
    central.vip = vip;
    return getVipStatus(centralId);
}

function setPermanentVip(centralId) {
    const central = _safeCentral(centralId);
    if (!central) throw new Error('central not found');
    const now = new Date();
    central.vip = {
        active: true,
        permanent: true,
        expiresAt: null,
        startedAt: central.vip?.startedAt || now.toISOString(),
        lastUpdatedAt: now.toISOString()
    };
    return getVipStatus(centralId);
}

function getVipCommandList() {
    const config = getVipConfig();
    return Array.isArray(config.vipCommands) ? config.vipCommands : [];
}

function canVipBypassPv(platform, centralId) {
    const normalizedPlatform = String(platform || '').toLowerCase();
    if (!normalizedPlatform) return false;
    const status = getVipStatus(centralId);
    if (!status.active && !status.permanent) return false;
    const config = getVipConfig();
    const map = config.pvBypass || {};
    return !!map[normalizedPlatform];
}

function formatVipStatusCard({ userName, centralId, status }) {
    const name = String(userName || 'Usuário').replace(/^@/, '').trim() || 'Usuário';
    const statusLabel = status?.permanent ? '🟢 VIP ATIVO' : (status?.active ? '🟢 VIP ATIVO' : '🔴 VIP INATIVO');
    const tipoLabel = status?.permanent ? '👑 Permanente' : (status?.active ? '⏳ Duração' : '❌ Inativo');
    const remainder = status?.permanent ? 'Vitalício' : (status?.active ? formatDurationText(status.remainingMs) : '0 minutos');
    const expiresAt = status?.permanent ? '∞ Permanente' : (status?.expiresAt ? formatDateTimeDetailed(status.expiresAt) : '—');

    return [
        'Sistema VIP / Premium',
        '',
        `Usuário: ${name}`,
        `ID Central: ${centralId || '—'}`,
        '',
        `Status: ${statusLabel}`,
        `Tipo: ${tipoLabel}`,
        `Tempo Restante: ${remainder}`,
        `Expira em: ${expiresAt}`
    ].join('\n');
}

module.exports = {
    parseDurationString,
    formatDurationMs,
    formatDurationText,
    parseDateTimeString,
    formatDateTime,
    formatDateTimeDetailed,
    getVipStatus,
    hasVip,
    setVipDuration,
    addVipDuration,
    removeVipDuration,
    resetVip,
    setVipDate,
    setPermanentVip,
    getVipCommandList,
    canVipBypassPv,
    formatVipStatusCard
};
