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

  async stop() { this.stopAutoSave(); this.stopCleanup(); await this.saveNow(); }
}

const store = new CentralAccountsStore();

module.exports = store;
