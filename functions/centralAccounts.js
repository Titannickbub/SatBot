const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CentralAccountsStore {
  constructor() {
    this.filePath = null;
    this.data = { centralAccounts: {}, mergeCodes: {} };
    this.dirty = false;
    this.saving = false;
    this._autoSaveHandle = null;
    this._cleanupHandle = null;
  }

  async init(filePath) {
    this.filePath = filePath;
    try {
      const txt = await fs.readFile(filePath, 'utf8');
      this.data = JSON.parse(txt || '{}');
      if (!this.data.centralAccounts) this.data.centralAccounts = {};
      if (!this.data.mergeCodes) this.data.mergeCodes = {};
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.data = { centralAccounts: {}, mergeCodes: {} };
      await this._ensureDirForFile();
      await this._atomicWrite(JSON.stringify(this.data, null, 2));
    }
    return this;
  }

  async _ensureDirForFile() {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  _nowISO() { return new Date().toISOString(); }
  _genId() { if (crypto.randomUUID) return crypto.randomUUID(); return crypto.createHash('sha1').update(crypto.randomBytes(16)).digest('hex'); }
  _genCode(len = 8) { return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len).toUpperCase(); }

  async _atomicWrite(content) {
    await this._ensureDirForFile();
    const tmp = this.filePath + '.tmp';
    await fs.writeFile(tmp, content, 'utf8');
    await fs.rename(tmp, this.filePath);
  }

  async saveNow() {
    if (!this.filePath) throw new Error('Store not initialized');
    if (!this.dirty) return false;
    if (this.saving) return false;
    this.saving = true;
    try {
      await this._atomicWrite(JSON.stringify(this.data, null, 2));
      this.dirty = false;
      return true;
    } finally { this.saving = false; }
  }

  startAutoSave(intervalMs = 300_000) {
    if (this._autoSaveHandle) return;
    this._autoSaveHandle = setInterval(() => this.saveNow().catch(() => {}), intervalMs);
  }

  stopAutoSave() { if (!this._autoSaveHandle) return; clearInterval(this._autoSaveHandle); this._autoSaveHandle = null; }

  startCleanup(intervalMs = 24 * 3600 * 1000, thresholdDays = 30) {
    if (this._cleanupHandle) return;
    this._cleanupHandle = setInterval(() => this.cleanupInactive(thresholdDays).catch(() => {}), intervalMs);
  }

  stopCleanup() { if (!this._cleanupHandle) return; clearInterval(this._cleanupHandle); this._cleanupHandle = null; }

  _markDirty() { this.dirty = true; }

  getCentralById(id) { return this.data.centralAccounts[id] || null; }

  getAllCentralAccounts() { return Object.values(this.data.centralAccounts || {}); }

  findByPlatform(platform, platformId) {
    return Object.values(this.data.centralAccounts).find(c => c.platformAccounts && c.platformAccounts.some(p => p.platform === platform && p.platformId === platformId)) || null;
  }

  async getOrCreateByPlatform(platform, platformId, { username = null, displayName = null } = {}) {
    let central = this.findByPlatform(platform, platformId);
    if (central) { central.lastActivityAt = this._nowISO(); this._markDirty(); return central; }
    const id = this._genId();
    central = { id, name: displayName || username || null, createdAt: this._nowISO(), platformAccounts: [{ platform, platformId, username, displayName, linkedAt: this._nowISO() }], lastActivityAt: this._nowISO(), mergedCodes: [] };
    this.data.centralAccounts[id] = central;
    this._markDirty();
    return central;
  }

  async linkPlatform(centralId, platformAccount) {
    const central = this.getCentralById(centralId);
    if (!central) throw new Error('central not found');
    if ((central.platformAccounts || []).some(p => p.platform === platformAccount.platform)) throw new Error('A platform account with same platform already linked');
    central.platformAccounts.push({ ...platformAccount, linkedAt: this._nowISO() });
    central.lastActivityAt = this._nowISO(); this._markDirty(); return central;
  }

  async updateCentralName(centralId, name) {
    const central = this.getCentralById(centralId);
    if (!central) throw new Error('central not found');
    central.name = name || null;
    central.lastActivityAt = this._nowISO();
    this._markDirty();
    return central;
  }

  async setWebPassword(centralId, password) {
    const central = this.getCentralById(centralId);
    if (!central) throw new Error('central not found');
    const salt = crypto.randomBytes(16);
    const passwordHash = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) return reject(error);
        resolve(derivedKey.toString('hex'));
      });
    });
    central.webAuth = {
      passwordSalt: salt.toString('hex'),
      passwordHash
    };
    central.lastActivityAt = this._nowISO();
    this._markDirty();
    await this.saveNow();
  }

  async verifyWebPassword(centralId, password) {
    const central = this.getCentralById(centralId);
    const saltHex = central?.webAuth?.passwordSalt;
    const passwordHash = central?.webAuth?.passwordHash;
    if (!saltHex || !passwordHash) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(passwordHash, 'hex');
    if (salt.length !== 16 || expectedHash.length !== 64) return false;

    const derivedKey = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, expectedHash.length, (error, key) => {
        if (error) return reject(error);
        resolve(key);
      });
    });
    return crypto.timingSafeEqual(derivedKey, expectedHash);
  }

  async createWebLoginToken(centralId, ttlMinutes = 10) {
    const central = this.getCentralById(centralId);
    if (!central?.webAuth?.passwordHash) throw new Error('web password not configured');
    const token = crypto.randomBytes(32).toString('base64url');
    central.webAuth.loginTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    central.webAuth.loginTokenExpiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
    this._markDirty();
    await this.saveNow();
    return token;
  }

  async consumeWebLoginToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const central = Object.values(this.data.centralAccounts).find(account => {
      const storedHash = account.webAuth?.loginTokenHash;
      if (!storedHash || storedHash.length !== tokenHash.length) return false;
      return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(tokenHash));
    });
    if (!central) return null;

    const expiresAt = Date.parse(central.webAuth.loginTokenExpiresAt || '');
    delete central.webAuth.loginTokenHash;
    delete central.webAuth.loginTokenExpiresAt;
    this._markDirty();
    await this.saveNow();
    return expiresAt > Date.now() ? central : null;
  }

  async createRememberedWebSession(centralId, ttlDays = 30) {
    const central = this.getCentralById(centralId);
    if (!central?.webAuth?.passwordHash) throw new Error('web password not configured');

    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const sessions = Array.isArray(central.webAuth.rememberedSessions)
      ? central.webAuth.rememberedSessions.filter(session => Date.parse(session.expiresAt) > now)
      : [];
    sessions.push({
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(now + ttlDays * 24 * 60 * 60 * 1000).toISOString()
    });
    central.webAuth.rememberedSessions = sessions.slice(-10);
    this._markDirty();
    await this.saveNow();
    return token;
  }

  async getCentralByRememberedWebSession(token) {
    if (!/^[a-f0-9]{64}$/i.test(token)) return null;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = Date.now();
    let removedExpiredSession = false;

    for (const central of Object.values(this.data.centralAccounts)) {
      const sessions = central.webAuth?.rememberedSessions;
      if (!Array.isArray(sessions)) continue;

      const activeSessions = [];
      let matched = false;
      for (const session of sessions) {
        if (Date.parse(session.expiresAt) <= now) {
          removedExpiredSession = true;
          continue;
        }
        activeSessions.push(session);
        if (!/^[a-f0-9]{64}$/i.test(session.tokenHash || "")) continue;
        const storedHash = Buffer.from(session.tokenHash, 'hex');
        const expectedHash = Buffer.from(tokenHash, 'hex');
        if (storedHash.length === expectedHash.length && crypto.timingSafeEqual(storedHash, expectedHash)) {
          matched = true;
        }
      }
      central.webAuth.rememberedSessions = activeSessions;
      if (matched) {
        if (removedExpiredSession) {
          this._markDirty();
          await this.saveNow();
        }
        return central;
      }
    }

    if (removedExpiredSession) {
      this._markDirty();
      await this.saveNow();
    }
    return null;
  }

  async revokeRememberedWebSession(token) {
    if (!/^[a-f0-9]{64}$/i.test(token)) return false;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    let removed = false;

    for (const central of Object.values(this.data.centralAccounts)) {
      const sessions = central.webAuth?.rememberedSessions;
      if (!Array.isArray(sessions)) continue;
      const activeSessions = sessions.filter(session => {
        const storedHash = session.tokenHash || "";
        const isMatch = /^[a-f0-9]{64}$/i.test(storedHash) &&
          crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(tokenHash, 'hex'));
        if (isMatch) removed = true;
        return !isMatch && Date.parse(session.expiresAt) > Date.now();
      });
      central.webAuth.rememberedSessions = activeSessions;
    }

    if (removed) {
      this._markDirty();
      await this.saveNow();
    }
    return removed;
  }

  async generateMergeCode(centralId, ttlHours = 24) {
    const central = this.getCentralById(centralId);
    if (!central) throw new Error('central not found');
    const code = this._genCode(8);
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
    this.data.mergeCodes[code] = { code, centralId, expiresAt };
    central.mergedCodes = central.mergedCodes || []; central.mergedCodes.push(code);
    this._markDirty(); return { code, expiresAt };
  }

  async useMergeCode(code, targetCentralId) {
    const entry = this.data.mergeCodes[code]; if (!entry) throw new Error('invalid-code');
    if (new Date(entry.expiresAt) < new Date()) { delete this.data.mergeCodes[code]; this._markDirty(); throw new Error('code-expired'); }
    const source = this.getCentralById(entry.centralId); const target = this.getCentralById(targetCentralId);
    if (!source || !target) throw new Error('central-not-found'); if (source.id === target.id) throw new Error('same-central');
    const sourcePlatforms = (source.platformAccounts || []).map(p => p.platform);
    const targetPlatforms = (target.platformAccounts || []).map(p => p.platform);
    for (const p of sourcePlatforms) { if (targetPlatforms.includes(p)) throw new Error('conflict-platform-' + p); }
    target.platformAccounts = target.platformAccounts.concat(source.platformAccounts || []);
    target.lastActivityAt = this._nowISO(); delete this.data.centralAccounts[source.id]; delete this.data.mergeCodes[code]; this._markDirty(); return target;
  }

  async cleanupInactive(thresholdDays = 30) {
    const cutoff = Date.now() - thresholdDays * 24 * 3600 * 1000; const toDelete = [];
    for (const [id, central] of Object.entries(this.data.centralAccounts)) {
      const last = central.lastActivityAt ? new Date(central.lastActivityAt).getTime() : new Date(central.createdAt).getTime();
      if (last < cutoff) toDelete.push(id);
    }
    for (const id of toDelete) delete this.data.centralAccounts[id]; if (toDelete.length) this._markDirty(); return toDelete.length;
  }

  async cleanupMergeCodes() { const now = Date.now(); let removed = 0; for (const [code, entry] of Object.entries(this.data.mergeCodes)) { if (new Date(entry.expiresAt).getTime() < now) { delete this.data.mergeCodes[code]; removed++; } } if (removed) this._markDirty(); return removed; }

  getNofap(centralId) {
    const central = this.getCentralById(centralId);
    return central?.nofap || null;
  }

  async setNofap(centralId, nofapData) {
    const central = this.getCentralById(centralId);
    if (!central) throw new Error('central not found');
    central.nofap = { ...(central.nofap || {}), ...(nofapData || {}) };
    central.lastActivityAt = this._nowISO();
    this._markDirty();
    return central.nofap;
  }

  async setLastInteraction(centralId, timestamp = null) {
    const central = this.getCentralById(centralId);
    if (!central) return null;
    const iso = timestamp ? new Date(timestamp).toISOString() : this._nowISO();
    central.lastInteractionAt = iso;
    central.lastActivityAt = iso;
    this._markDirty();
    return central;
  }

  async resetNofap(centralId) {
    const central = this.getCentralById(centralId);
    if (!central) throw new Error('central not found');
    central.nofap = null;
    central.lastActivityAt = this._nowISO();
    this._markDirty();
    return central;
  }

  getTelegramStickerPack(centralId) {
    const central = this.getCentralById(centralId);
    return central?.telegramStickerPack || null;
  }

  async setTelegramStickerPack(centralId, packName) {
    const central = this.getCentralById(centralId);
    if (!central) throw new Error('central not found');
    central.telegramStickerPack = packName || null;
    central.lastActivityAt = this._nowISO();
    this._markDirty();
    return central;
  }

  async stop() { this.stopAutoSave(); this.stopCleanup(); await this.saveNow(); }
}

const store = new CentralAccountsStore();

module.exports = store;
