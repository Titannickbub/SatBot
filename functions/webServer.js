const http = require("http");
const economy = require("./economy");
const xp = require("./xp");
const centralAccounts = require("./centralAccounts");
const nofapHelper = require("./nofapHelper");
const groupSettings = require("./groupSettings");
const config = require("./config");
const activity = require("./activity");
const { sameUserId } = require("./moderationHelper");

const DEFAULT_PORT = 32013;

function getPort() {
  const domain = config.getWebDomain();
  const configuredPort = Number.parseInt(String(domain || "").split(":").pop(), 10);
  return Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
    ? configuredPort
    : DEFAULT_PORT;
}

function profileMessage(platform, groupId, userId) {
  const raw = platform === "discord"
    ? { guild: { id: groupId } }
    : { chat: { id: groupId } };
  return {
    platform,
    chatId: groupId,
    userId,
    raw
  };
}

async function getDiscordAvatar(groupId, userId) {
  const client = global.discordClient;
  if (!client) return null;

  const guild = client.guilds.cache.get(String(groupId));
  const member = guild?.members.cache.get(String(userId));
  let user = member?.user || client.users.cache.get(String(userId));
  if (!user && typeof client.users.fetch === "function") {
    try {
      user = await client.users.fetch(String(userId));
    } catch (error) {
      console.warn(`[WEB] Não foi possível buscar o avatar do usuário Discord ${userId}:`, error.message || error);
    }
  }

  const avatarOptions = { size: 128, forceStatic: true };

  return member?.displayAvatarURL(avatarOptions)
    || user?.displayAvatarURL(avatarOptions)
    || null;
}

async function getGroupName(platform, groupId, scope) {
  try {
    if (platform === "discord" && global.discordClient) {
      const guild = await global.discordClient.guilds.fetch(String(groupId));
      if (guild?.name) return guild.name;
    }
    if (platform === "telegram" && global.telegramBot?.telegram) {
      const chat = await global.telegramBot.telegram.getChat(String(groupId));
      if (chat?.title || chat?.username) return chat.title || `@${chat.username}`;
    }
    if (platform === "whatsapp" && global.whatsappSock?.groupMetadata) {
      const metadata = await global.whatsappSock.groupMetadata(String(groupId));
      if (metadata?.subject) return metadata.subject;
    }
  } catch (error) {
    console.warn(`[WEB] Não foi possível atualizar o nome de ${platform} ${groupId}:`, error.message || error);
  }

  const type = platform === "discord" ? "server" : "group";
  const settings = groupSettings.loadSettings(platform, groupId, type);
  return settings.serverName || settings.groupName || settings.chatName || scope?.name || `${scope?.type || "Grupo"} ${groupId}`;
}

async function readProfile(url) {
  const platform = String(url.searchParams.get("plataforma") || url.searchParams.get("platform") || "discord").toLowerCase();
  const groupId = url.searchParams.get("grupo") || url.searchParams.get("group");
  const userId = url.searchParams.get("usuario") || url.searchParams.get("user");

  if (!["discord", "telegram", "whatsapp"].includes(platform) || !groupId || !userId) {
    return { error: "Informe grupo, usuario e plataforma válida para consultar o perfil." };
  }

  const message = profileMessage(platform, groupId, userId);
  const scope = economy.getScope(message);
  const groupName = await getGroupName(platform, groupId, scope);
  const account = economy.getAccountByUser(message, userId);
  const xpData = xp.load(message);
  const xpUser = xp.getUserById(message, userId);
  const activityResult = activity.ranking(message);
  const activityUser = activityResult?.users?.find(user => String(user.userId) === String(userId)) || null;
  const central = centralAccounts.findByPlatform(platform, userId);
  const nofap = central
    ? nofapHelper.getNofapStatus(central.id)
    : { active: false, currentDays: 0, recordDays: 0, totalResets: 0, title: "🌱 Iniciante" };

  if (!scope || (!account && !xpUser && !activityUser)) {
    return { error: "Não encontrei um usuário ou grupo com esses identificadores." };
  }

  const xpValue = Number(xpUser?.xp) || 0;
  const activityPosition = activityUser
    ? activityResult.users.findIndex(user => String(user.userId) === String(userId)) + 1
    : null;
  return {
    platform,
    groupId,
    groupName,
    userId,
    avatarUrl: platform === "discord" ? await getDiscordAvatar(groupId, userId) : null,
    name: account?.displayName || account?.username || xpUser?.displayName || xpUser?.username || activityUser?.displayName || activityUser?.username || central?.name || "Usuário",
    economy: {
      exists: Boolean(account),
      balance: Number(account?.balance) || 0,
      position: account ? economy.getBalancePosition(message, userId) : null
    },
    xp: {
      exists: Boolean(xpUser),
      value: xpValue,
      level: xp.levelForXp(xpValue).level,
      position: xpUser ? xp.position(message, userId) : null
    },
    activity: {
      enabled: Boolean(activityResult?.enabled),
      total: Number(activityUser?.total) || 0,
      messages: Number(activityUser?.messages) || 0,
      commands: Number(activityUser?.commands) || 0,
      stickers: Number(activityUser?.stickers) || 0,
      files: Number(activityUser?.files) || 0,
      position: activityPosition
    },
    nofap
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(cents) {
  return `${(Number(cents || 0) / 100).toFixed(2)}💷`;
}

function renderProfile(profile) {
  const botName = config.getBotName();
  if (profile.error) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Perfil não encontrado - ${escapeHtml(botName)}</title><style>${styles()}</style></head><body><main class="card error"><div class="brand">${escapeHtml(botName)}</div><h1>Perfil não encontrado</h1><p>${escapeHtml(profile.error)}</p><p class="hint">Use /perfil?grupo=ID&usuario=ID&plataforma=discord</p></main></body></html>`;
  }

  const economyPosition = profile.economy.position ? `#${profile.economy.position}` : "Não classificado";
  const xpPosition = profile.xp.position ? `#${profile.xp.position}` : "Não classificado";
  const activityPosition = profile.activity.position ? `#${profile.activity.position}` : "Não classificado";
  const nofapText = profile.nofap.active
    ? `${profile.nofap.currentDays} dias • ${profile.nofap.title}`
    : "Inativo";
  const avatarContent = profile.platform === "discord" && profile.avatarUrl
    ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="" onerror="this.remove()">`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Perfil de ${escapeHtml(profile.name)} - ${escapeHtml(botName)}</title><style>${styles()}</style></head>
<body>
  <main class="card">
    <div class="brand">${escapeHtml(botName)} <span>PERFIL</span></div>
    <header><div class="avatar">${escapeHtml(profile.name.charAt(0).toUpperCase())}${avatarContent}</div><div><h1>${escapeHtml(profile.name)}</h1><p class="muted">ID: ${escapeHtml(profile.userId)}</p></div></header>
    <div class="scope">Plataforma: ${escapeHtml(profile.platform)} <span>•</span> ${escapeHtml(profile.groupName)} <span>•</span> ID: ${escapeHtml(profile.groupId)}</div>
    <section class="grid">
      <article><div class="label">SATCOINS</div><div class="value money">${formatMoney(profile.economy.balance)}</div><div class="meta">Posição no dinheiro: ${economyPosition}</div></article>
      <article><div class="label">XP</div><div class="value">${profile.xp.value}</div><div class="meta">Posição no XP: ${xpPosition}</div></article>
      <article><div class="label">ATIVIDADE</div><div class="value">${profile.activity.total}</div><div class="meta">Posição na atividade: ${activityPosition}<br>💬 ${profile.activity.messages} • ⚙️ ${profile.activity.commands} • 🎨 ${profile.activity.stickers} • 📎 ${profile.activity.files}</div></article>
      <article><div class="label">NÍVEL XP</div><div class="value">${profile.xp.level}</div><div class="meta">Ranking de experiência</div></article>
      <article><div class="label">NOFAP</div><div class="value small">${escapeHtml(nofapText)}</div><div class="meta">Recorde: ${profile.nofap.recordDays || 0} dias • Resets: ${profile.nofap.totalResets || 0}</div></article>
    </section>
    <footer>Perfil local do grupo/servidor • ${escapeHtml(botName)}</footer>
  </main>
</body></html>`;
}

async function readRanking(url, type, order = "rich") {
  if (type === "activity") return readActivityRanking(url);
  const platform = String(url.searchParams.get("plataforma") || url.searchParams.get("platform") || "discord").toLowerCase();
  const groupId = url.searchParams.get("grupo") || url.searchParams.get("group");
  if (!["discord", "telegram", "whatsapp"].includes(platform) || !groupId) {
    return { error: "Informe o ID do grupo/servidor e uma plataforma válida." };
  }

  const message = profileMessage(platform, groupId, "");
  const scope = economy.getScope(message);
  const groupName = await getGroupName(platform, groupId, scope);
  if (!scope) return { error: "Não encontrei um grupo ou servidor com esse identificador." };

  if (type === "xp") {
    const data = xp.load(message);
    if (!data.enabled) return { error: "O sistema de XP está desativado neste grupo/servidor." };
    const users = xp.ranking(message);
    const selectedUsers = order === "poor" ? users.slice(-5).reverse() : users.slice(0, 5);
    return {
      type,
      platform,
      groupId,
      groupName,
      entries: selectedUsers.map(user => ({
        position: users.findIndex(item => String(item.userId) === String(user.userId)) + 1,
        name: user.displayName || user.username || user.userId,
        userId: user.userId,
        xp: Number(user.xp) || 0,
        level: xp.levelForXp(user.xp).level
      }))
    };
  }

  if (!economy.isEnabled(message)) return { error: "A economia está desativada neste grupo/servidor." };
  return {
    type,
    platform,
    groupId,
    groupName,
    entries: economy.getRanking(message, order === "poor" ? "poor" : "rich").map((account, index) => ({
      position: index + 1,
      name: account.name || account.username || account.userId,
      userId: account.userId,
      balance: Number(account.balance) || 0
    }))
  };
}

async function readActivityRanking(url, includeAll = false) {
  const platform = String(url.searchParams.get("plataforma") || url.searchParams.get("platform") || "discord").toLowerCase();
  const groupId = url.searchParams.get("grupo") || url.searchParams.get("group");
  if (!["discord", "telegram", "whatsapp"].includes(platform) || !groupId) {
    return { error: "Informe o ID do grupo/servidor e uma plataforma válida." };
  }

  const message = profileMessage(platform, groupId, "");
  const scope = economy.getScope(message);
  if (!scope) return { error: "Não encontrei um grupo ou servidor com esse identificador." };

  const groupName = await getGroupName(platform, groupId, scope);
  const result = activity.ranking(message);
  if (!result?.enabled) {
    return { error: "O sistema de atividade está desativado neste grupo/servidor." };
  }

  let users = result.users;
  if (includeAll && platform === "whatsapp") {
    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupMetadata !== "function") {
      return { error: "O suporte ao WhatsApp não está disponível para carregar os membros deste grupo." };
    }

    let metadata;
    try {
      metadata = await sock.groupMetadata(String(groupId));
    } catch (error) {
      console.error("[WEB] Falha ao buscar membros do grupo WhatsApp para o ranking:", error);
      return { error: "Não foi possível carregar os membros deste grupo do WhatsApp." };
    }

    if (!Array.isArray(metadata?.participants)) {
      return { error: "A lista de membros deste grupo do WhatsApp está indisponível." };
    }

    users = metadata.participants.map((participant, index) => {
      const identifiers = [participant.id, participant.lid, participant.phoneNumber].filter(Boolean);
      const recordedUser = result.users.find(user =>
        identifiers.some(identifier => sameUserId(identifier, user.userId))
      );
      const userId = String(participant.id || participant.lid || participant.phoneNumber || `membro-${index + 1}`);
      return {
        ...(recordedUser || {}),
        userId,
        displayName: participant.name || participant.notify || recordedUser?.displayName || null,
        username: recordedUser?.username || null,
        total: recordedUser?.total || 0,
        dailyTotal: recordedUser?.dailyTotal || 0,
        messages: recordedUser?.messages || 0,
        commands: recordedUser?.commands || 0,
        stickers: recordedUser?.stickers || 0,
        files: recordedUser?.files || 0,
        profileAvailable: Boolean(recordedUser)
      };
    });
  }

  return {
    type: "activity",
    platform,
    groupId,
    groupName,
    entries: (includeAll ? users : users.slice(0, 5)).map((user, index) => ({
      position: index + 1,
      name: user.displayName || user.username || user.userId,
      userId: user.userId,
      total: user.total,
      dailyTotal: user.dailyTotal,
      messages: user.messages,
      commands: user.commands,
      stickers: user.stickers,
      files: user.files,
      profileAvailable: user.profileAvailable !== false
    })).sort((a, b) => b.total - a.total || String(a.name).localeCompare(String(b.name)))
      .map((entry, index) => ({ ...entry, position: index + 1 }))
  };
}

function renderRanking(ranking) {
  const botName = config.getBotName();
  if (ranking.error) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ranking não encontrado - ${escapeHtml(botName)}</title><style>${styles()}</style></head><body><main class="card error"><div class="brand">${escapeHtml(botName)}</div><h1>Ranking indisponível</h1><p>${escapeHtml(ranking.error)}</p></main></body></html>`;
  }

  const isXp = ranking.type === "xp";
  const isActivity = ranking.type === "activity";
  const title = isXp ? "Ranking XP" : isActivity ? (ranking.includeAll ? "Ranking de atividade — todos" : "Ranking de atividade") : "Ranking de riqueza";
  const rows = ranking.entries.length
    ? ranking.entries.map(entry => isXp
      ? renderRankingEntry(ranking, entry, `<b>${entry.xp} XP</b><em>Nível ${entry.level}</em>`)
      : isActivity
        ? renderRankingEntry(ranking, entry, `<b>${entry.total} atividades</b><em>💬 ${entry.messages} • ⚙️ ${entry.commands} • 🎨 ${entry.stickers} • 📎 ${entry.files}</em>`)
      : renderRankingEntry(ranking, entry, `<b class="money">${formatMoney(entry.balance)}</b>`)
    ).join("")
    : `<p class="muted">Ainda não há usuários neste ranking.</p>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} - ${escapeHtml(botName)}</title><style>${styles()} .ranking{margin-top:22px;display:grid;gap:10px}.rank-row{display:grid;grid-template-columns:60px 1fr auto auto;align-items:center;gap:14px;padding:17px 18px;border:1px solid #334566;border-radius:14px;background:#202a40;color:inherit;text-decoration:none;transition:transform .15s ease,border-color .15s ease,background .15s ease}.rank-row:hover,.rank-row:focus-visible{transform:translateY(-2px);border-color:#7ea7ff;background:#273653;outline:none}.rank-row strong{font-size:22px;color:#8eaaff}.rank-row span{font-weight:700}.rank-row small{display:block;color:#8998b3;font-weight:400;font-size:11px;margin-top:4px}.rank-row b{white-space:nowrap}.rank-row em{font-style:normal;color:#b8c3d9;font-size:13px}@media(max-width:600px){.rank-row{grid-template-columns:42px 1fr auto}.rank-row em{grid-column:2}.rank-row b{font-size:13px}}</style></head><body><main class="card"><div class="brand">${escapeHtml(botName)} <span>RANKING</span></div><header><div><h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(ranking.groupName)}</p></div></header><div class="scope">Plataforma: ${escapeHtml(ranking.platform)} <span>•</span> ID: ${escapeHtml(ranking.groupId)}</div><section class="ranking">${rows}</section><footer>Ranking local do grupo/servidor • ${escapeHtml(botName)}</footer></main></body></html>`;
}

function renderRankingEntry(ranking, entry, metrics) {
  const profileUrl = `/perfil?grupo=${encodeURIComponent(ranking.groupId)}&plataforma=${encodeURIComponent(ranking.platform)}&usuario=${encodeURIComponent(entry.userId)}`;
  const row = `<strong>#${entry.position}</strong><span>${escapeHtml(entry.name)}<small>ID: ${escapeHtml(entry.userId)}</small></span>${metrics}`;
  return entry.profileAvailable === false
    ? `<div class="rank-row">${row}</div>`
    : `<a class="rank-row" href="${profileUrl}" aria-label="Abrir perfil de ${escapeHtml(entry.name)}">${row}</a>`;
}

function styles() {
  return `:root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}.card{width:min(860px,100%);padding:34px;border:1px solid #334366;border-radius:24px;background:linear-gradient(145deg,#1c2438ee,#111521f2);box-shadow:0 24px 80px #0008}.brand{letter-spacing:.18em;color:#7ea7ff;font-weight:800}.brand span{color:#9da8bd;font-weight:500;font-size:.75em}header{display:flex;align-items:center;gap:18px;margin:34px 0 18px}.avatar{position:relative;overflow:hidden;flex:none;width:72px;height:72px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(135deg,#6d5dfc,#3aa8ff);font-size:32px;font-weight:800}.avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}h1{margin:0;font-size:clamp(28px,5vw,46px)}p{margin:8px 0}.muted,.hint{color:#9da8bd}.scope{padding:13px 16px;border-radius:12px;background:#0e1422;color:#b7c5e7;font-size:14px}.scope span{color:#536486;margin:0 8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.grid article{padding:22px;border-radius:16px;background:#202a40;border:1px solid #334566}.label{color:#9da8bd;font-size:12px;letter-spacing:.12em;font-weight:700}.value{font-size:32px;font-weight:800;margin:12px 0 8px}.value.small{font-size:22px}.money{color:#8ff0bf}.meta{color:#b8c3d9;font-size:14px}footer{margin-top:26px;color:#71809d;font-size:13px}.error{text-align:center}.error h1{margin-top:28px}@media(max-width:600px){.card{padding:24px}.grid{grid-template-columns:1fr}header{margin-top:26px}}`;
}

function start() {
  const domain = config.getWebDomain();
  if (!domain) {
    console.log("[WEB] Painel web desativado: nenhum domínio foi configurado.");
    return null;
  }

  const port = getPort();
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }

    if (requestUrl.pathname === "/perfil" || requestUrl.pathname === "/profile") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderProfile(await readProfile(requestUrl)));
      return;
    }

    if (requestUrl.pathname === "/api/perfil") {
      const profile = await readProfile(requestUrl);
      response.writeHead(profile.error ? 404 : 200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(profile));
      return;
    }

    if (requestUrl.pathname === "/rankxp" || requestUrl.pathname === "/rankrico") {
      const type = requestUrl.pathname === "/rankxp" ? "xp" : "rich";
      const ranking = await readRanking(requestUrl, type);
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderRanking(ranking));
      return;
    }

    if (requestUrl.pathname === "/api/rankxp" || requestUrl.pathname === "/api/rankrico") {
      const type = requestUrl.pathname === "/api/rankxp" ? "xp" : "rich";
      const ranking = await readRanking(requestUrl, type);
      response.writeHead(ranking.error ? 404 : 200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(ranking));
      return;
    }

    if (requestUrl.pathname === "/rankatividade" || requestUrl.pathname === "/rankativos") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderRanking(await readActivityRanking(requestUrl)));
      return;
    }

    if (requestUrl.pathname === "/rankatividade-all") {
      const ranking = await readActivityRanking(requestUrl, true);
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderRanking({ ...ranking, includeAll: true }));
      return;
    }

    if (requestUrl.pathname === "/api/rankatividade" || requestUrl.pathname === "/api/rankativos") {
      const ranking = await readActivityRanking(requestUrl);
      response.writeHead(ranking.error ? 404 : 200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(ranking));
      return;
    }

    if (requestUrl.pathname === "/api/rankatividade-all") {
      const ranking = await readActivityRanking(requestUrl, true);
      response.writeHead(ranking.error ? 404 : 200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(ranking));
      return;
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      const botName = escapeHtml(config.getBotName());
      response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${botName}</title><body><h1>${botName}</h1><p>Use <code>/perfil?grupo=ID&usuario=ID&plataforma=discord</code> para abrir um perfil.</p></body></html>`);
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  server.on("error", error => console.error(`[WEB] Falha ao iniciar o site na porta ${port}:`, error));
  server.listen(port, "0.0.0.0", () => console.log(`[WEB] Site disponível na porta ${port}.`));
  return server;
}

module.exports = { start, readProfile, renderProfile, readRanking, readActivityRanking, renderRanking };
