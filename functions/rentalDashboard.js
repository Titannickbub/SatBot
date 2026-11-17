const config = require("./config");
const rental = require("./rentalHelper");

const PAGES = {
    home: { title: "Superusuário", path: "/painel-su" },
    settings: { title: "Configurações do aluguel", path: "/painel-su/aluguel" },
    plans: { title: "Planos", path: "/painel-su/planos" },
    orders: { title: "Pedidos", path: "/painel-su/pedidos" },
    subscriptions: { title: "Assinaturas", path: "/painel-su/assinaturas" },
    onlychats: { title: "OnlyChats", path: "/painel-su/onlychats" }
};

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatPrice(cents) {
    return rental.formatPrice(cents);
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

function durationDays(ms) {
    const value = Number(ms) / rental.DAY_MS;
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 1;
}

function rentalEnabled(settings) {
    return Object.values(settings?.enabledPlatforms || {}).some(Boolean);
}

function onlyChatsAccessEntries(onlyChats) {
    const types = [
        ["servers", "Servidor"],
        ["categories", "Categoria"],
        ["chats", "Chat/canal"],
        ["topics", "Tópico"]
    ];
    return types.flatMap(([key, label]) =>
        (onlyChats?.whitelist?.[key] || []).map(item => {
            const id = typeof item === "object" && item !== null ? String(item.id) : String(item);
            return {
                id,
                name: typeof item === "object" && item !== null ? String(item.name || id) : id,
                type: label
            };
        })
    );
}

function navbar(platform, currentPage) {
    const links = Object.entries(PAGES).map(([key, page]) =>
        `<a class="nav-pill${key === currentPage ? " active" : ""}" href="${page.path}?plataforma=${encodeURIComponent(platform)}">${escapeHtml(page.title)}</a>`
    ).join("");
    return `<nav class="topbar"><a href="/dashboard" class="back">← Conta Central</a><span>Todas as plataformas · Superusuário</span></nav><nav class="nav-pills" aria-label="Páginas do painel">${links}</nav>`;
}

function homeContent(data) {
    const settings = data.settings;
    const freeOnlyChatsCount = rentalEnabled(settings)
        ? onlyChatsAccessEntries(data.onlyChats).length
        : 0;
    const subscriptionCount = data.subscriptions.filter(item => item.status !== "deleted").length +
        freeOnlyChatsCount;
    const links = [
        ["settings", "⚙", "Configurações", "Ativar o aluguel, ajustar a permanência, avisos e expiração."],
        ["plans", "◇", "Planos", `${data.plans.length} plano(s) · criar, editar ou apagar.`],
        ["orders", "⇄", "Pedidos", `${data.orders.filter(order => ["pending", "awaiting_payment"].includes(order.status)).length} pedido(s) em aberto · Pix e confirmação de pagamento.`],
        ["subscriptions", "♧", "Assinaturas", `${subscriptionCount} assinatura(s) e acessos permanentes gratuitos · consultar, editar, remover ou conceder.`],
        ["onlychats", "◉", "OnlyChats", "Configurar o bloqueio e as permissões permanentes."]
    ];
    const enabled = Object.entries(settings.enabledPlatforms || {})
        .filter(([, value]) => value)
        .map(([platform]) => platform)
        .join(", ") || "nenhuma";
    return `<section class="hero"><span class="eyebrow">${enabled === "nenhuma" ? "ALUGUEL DESATIVADO" : "ALUGUEL ATIVO"}</span><h1>Painel de superusuário</h1><p>Configurações, planos, pedidos e assinaturas são compartilhados. Plataformas com aluguel ativo: <strong>${escapeHtml(enabled)}</strong>.</p></section><section class="bubble-grid">${links.map(([key, icon, title, description]) => `<a class="bubble-card" href="${PAGES[key].path}?plataforma=${encodeURIComponent(data.platform)}"><span class="bubble-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><small>${description}</small><span class="bubble-open">Abrir →</span></a>`).join("")}</section><p class="notice">Os registros mantêm a plataforma de origem para aplicar cada ação ao serviço correto. Para administrar registros de outra plataforma, vincule-a à Conta Central.</p>`;
}

function settingsContent(data) {
    const settings = data.settings;
    const platformToggles = [
        ["whatsapp", "WhatsApp"],
        ["telegram", "Telegram"],
        ["discord", "Discord"]
    ].map(([key, label]) =>
        `<label class="toggle-row"><span><strong>${label}</strong><small>Ativa ou desativa o aluguel nesta plataforma.</small></span><input name="enabled-${key}" type="checkbox"${settings.enabledPlatforms?.[key] ? " checked" : ""}></label>`
    ).join("");
    return `<section class="panel"><h1>Configurações compartilhadas do aluguel</h1><p>Configure uma única vez para WhatsApp, Telegram e Discord. Cada plataforma pode ativar ou desativar o modo de aluguel de forma independente.</p><form id="settingsForm" class="form-grid">
      ${platformToggles}
      <label>Tempo de permanência (horas)<input name="presenceHours" type="number" min="0.02" max="87600" step="0.5" value="${(settings.presenceDurationMs / 3_600_000).toFixed(2)}" required></label>
      <label>Avisar antes do vencimento (dias)<input name="noticeDays" type="number" min="0" max="365" step="1" value="${settings.noticeDays}" required><small>O aviso é enviado uma vez por dia durante esse período.</small></label>
      <label>Ação ao terminar a permanência após o vencimento<select name="expiryAction"><option value="block"${settings.expiryAction === "block" ? " selected" : ""}>Permanecer no grupo, bloqueado pelo aluguel/OnlyChats</option><option value="leave"${settings.expiryAction === "leave" ? " selected" : ""}>Sair do grupo/servidor</option></select></label>
      <label class="full">Mensagem ao adicionar o bot<textarea name="welcomeMessage" rows="6" maxlength="4000" required>${escapeHtml(settings.welcomeMessage)}</textarea><small>Placeholders: {plans}, {prefix}, {bot} e {presence} (prazo inicial). O comando !dono informa o contato.</small></label>
      <button class="primary" type="submit">Salvar configurações</button><p class="feedback" id="settingsFeedback" role="status"></p>
    </form></section>`;
}

function plansContent(data) {
    const cards = data.plans.length ? data.plans.map(plan =>
        `<article class="record-card"><header><strong>${escapeHtml(rental.displayId(plan.id, "PL"))} · ${escapeHtml(plan.name)}</strong><span>${plan.active === false ? "Inativo" : "Ativo"}</span></header><form class="plan-form" data-id="${escapeHtml(plan.id)}"><label>Nome<input name="name" maxlength="80" value="${escapeHtml(plan.name)}" required></label><div class="two-col"><label>Valor (R$)<input name="price" type="number" min="0" step="0.01" value="${(plan.priceCents / 100).toFixed(2)}" required></label><label>Duração (dias)<input name="durationDays" type="number" min="0.01" step="0.01" value="${durationDays(plan.durationMs)}" required></label></div><div class="actions"><button type="submit">Salvar alterações</button><button type="button" class="danger" data-action="plan.delete" data-id="${escapeHtml(plan.id)}">Apagar plano</button></div></form></article>`
    ).join("") : `<p class="empty">Nenhum plano cadastrado ainda.</p>`;
    return `<section class="panel"><h1>Planos de aluguel</h1><p>Os pedidos guardam o preço e a duração do plano escolhido; alterações futuras não mudam pedidos já criados.</p><form id="planCreateForm" class="form-grid"><label>Nome<input name="name" maxlength="80" required></label><div class="two-col"><label>Valor (R$)<input name="price" type="number" min="0" step="0.01" required></label><label>Duração (dias)<input name="durationDays" type="number" min="0.01" step="0.01" required></label></div><button class="primary" type="submit">Criar plano</button><p class="feedback" id="planFeedback" role="status"></p></form><div class="records">${cards}</div></section>`;
}

function ordersContent(data) {
    const rows = data.orders.length ? data.orders.map(order => {
        const pending = order.status === "pending";
        const awaitingPayment = order.status === "awaiting_payment";
        const planOptions = data.plans.map(plan =>
            `<option value="${escapeHtml(plan.id)}"${plan.id === order.planId ? " selected" : ""}>${escapeHtml(rental.displayId(plan.id, "PL"))} · ${escapeHtml(plan.name)} · ${formatPrice(plan.priceCents)} · ${escapeHtml(rental.formatDuration(plan.durationMs))}</option>`
        ).join("");
        const details = `<p>Plano: ${escapeHtml(order.planName)} · ${formatPrice(order.priceCents)} · ${escapeHtml(rental.formatDuration(order.durationMs))}</p>`;
        const controls = pending
            ? `<form class="order-form" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}"><label>Plano do pedido<select name="planId" required>${planOptions}</select></label><div class="actions"><button type="submit">Salvar alteração</button><button type="button" class="primary" data-action="order.pix" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}">Enviar chave Pix</button><button type="button" class="danger" data-action="order.reject" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}">Recusar pedido</button><button type="button" class="danger outline" data-action="order.delete" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}">Apagar pedido</button></div></form>`
            : awaitingPayment
                ? `${details}<p>Prazo de pagamento: ${escapeHtml(formatDate(order.paymentExpiresAt))}${order.paymentReportedAt ? `<br>Solicitante informou o pagamento: ${escapeHtml(formatDate(order.paymentReportedAt))}` : ""}</p>${order.paymentDeliveryWarning ? `<p class="warning">${escapeHtml(order.paymentDeliveryWarning)} Reenvie a chave para tentar somente o destino pendente.</p><button type="button" class="primary" data-action="order.pix" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}">Reenviar chave Pix</button>` : ""}<div class="actions"><button type="button" class="primary" data-action="order.approve" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}">Pagamento recebido</button><button type="button" class="danger" data-action="order.reject" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}">Recusar pagamento</button><button type="button" class="danger outline" data-action="order.delete" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}">Apagar pedido</button></div>`
                : `${details}<button type="button" class="danger outline" data-action="order.delete" data-id="${escapeHtml(order.id)}" data-platform="${escapeHtml(order.platform)}">Apagar registro</button>`;
        return `<article class="record-card"><header><strong>${escapeHtml(rental.displayId(order.id, "AL"))} · ${order.type === "renewal" ? "Renovação" : "Contratação"} · ${escapeHtml(order.platform)}</strong><span class="status ${(pending || awaitingPayment) ? "pending" : ""}">${awaitingPayment ? order.paymentReportedAt ? "Pagamento informado pelo solicitante" : "Aguardando pagamento" : pending ? "Aguardando envio do Pix" : escapeHtml(order.status)}</span></header><p>Grupo/servidor: <code>${escapeHtml(order.scopeId)}</code><br>Solicitante: ${escapeHtml(order.creatorName || order.creatorId)}<br>Criado: ${escapeHtml(formatDate(order.createdAt))}</p>${controls}</article>`;
    }).join("") : `<p class="empty">Nenhum pedido criado.</p>`;
    return `<section class="panel"><h1>Pedidos</h1><p>Envie uma chave Pix para iniciar o prazo de pagamento de 24 horas. A assinatura só é ativada após confirmar o recebimento; pedidos sem decisão expiram automaticamente. Recusas e contratações iniciais expiradas seguem a política de aluguel configurada.</p><div class="records">${rows}</div><p class="feedback" id="ordersFeedback" role="status"></p></section>`;
}

function subscriptionsContent(data) {
    const planOptions = data.plans.filter(plan => plan.active !== false).map(plan =>
        `<option value="${escapeHtml(plan.id)}">${escapeHtml(rental.displayId(plan.id, "PL"))} · ${escapeHtml(plan.name)} · ${rental.formatDuration(plan.durationMs)}</option>`
    ).join("");
    const permanentAccesses = rentalEnabled(data.settings)
        ? onlyChatsAccessEntries(data.onlyChats).map(item =>
            `<article class="record-card"><header><strong>${escapeHtml(item.type)} · ${escapeHtml(item.name)}</strong><span class="status">Permanente · gratuita</span></header><p>OnlyChats · Todas as plataformas<br>ID: <code>${escapeHtml(item.id)}</code></p></article>`
        )
        : [];
    const onlyChatsAccess = permanentAccesses.length
        ? `<h2 class="section-title">Acessos permanentes gratuitos do OnlyChats</h2><p>As permissões da whitelist mantêm acesso permanente, sem cobrança. Edite ou remova esses acessos na página OnlyChats.</p><div class="records">${permanentAccesses.join("")}</div>`
        : "";
    const rows = data.subscriptions.length ? data.subscriptions.map(subscription => {
        const state = subscription.permanent ? "Permanente" :
            subscription.deletedAt ? "Removida · em permanência" :
                subscription.expiresAt <= Date.now() ? "Vencida" : "Ativa";
        return `<article class="record-card"><header><strong>${escapeHtml(subscription.id)} · ${escapeHtml(subscription.planName || "Assinatura manual")} · ${escapeHtml(subscription.platform)}</strong><span class="status">${state}</span></header><p>Grupo/servidor: <code>${escapeHtml(subscription.scopeId)}</code><br>Criada: ${escapeHtml(formatDate(subscription.createdAt))}<br>Solicitante: ${escapeHtml(subscription.creatorName || subscription.creatorId || "—")}</p><form class="subscription-form" data-id="${escapeHtml(subscription.id)}" data-platform="${escapeHtml(subscription.platform)}" data-expires-at="${Number(subscription.expiresAt) || ""}"><div class="two-col"><label>Vencimento<input name="expiresAt" type="datetime-local"${subscription.permanent ? " disabled" : ""}></label><label class="check-row">Permanente<input name="permanent" type="checkbox"${subscription.permanent ? " checked" : ""}></label></div><div class="actions"><button type="submit">Salvar alteração</button>${subscription.deletedAt ? "" : `<button type="button" class="danger" data-action="subscription.delete" data-id="${escapeHtml(subscription.id)}" data-platform="${escapeHtml(subscription.platform)}">Apagar assinatura</button>`}</div></form></article>`;
    }).join("") : `<p class="empty">Nenhuma assinatura cadastrada.</p>`;
    return `<section class="panel"><h1>Assinaturas</h1><p>Gerencie assinaturas de todas as plataformas ou conceda uma diretamente. Acessos liberados pelo OnlyChats são exibidos como permanentes e gratuitos enquanto o aluguel estiver ativo.</p><form id="subscriptionCreateForm" class="form-grid"><h2>Conceder assinatura sem pedido</h2><label>Plataforma<select name="targetPlatform"><option value="whatsapp"${data.platform === "whatsapp" ? " selected" : ""}>WhatsApp</option><option value="telegram"${data.platform === "telegram" ? " selected" : ""}>Telegram</option><option value="discord"${data.platform === "discord" ? " selected" : ""}>Discord</option></select></label><label>ID do grupo/servidor<input name="scopeId" maxlength="120" required></label><label>Canal/chat para os avisos<input name="chatId" maxlength="120" required><small>WhatsApp/Telegram: ID do grupo. Discord: ID de um canal de texto acessível ao bot.</small></label><label>Plano<select name="planId" required><option value="">Selecione</option>${planOptions}</select></label><label>ID do solicitante (opcional)<input name="creatorId" maxlength="120"></label><button class="primary" type="submit">Criar assinatura</button><p class="feedback" id="subscriptionFeedback" role="status"></p></form><div class="records">${rows}</div>${onlyChatsAccess}</section>`;
}

function onlyChatsContent(data) {
    const settings = data.onlyChats;
    const entries = Object.entries(settings.whitelist || {}).flatMap(([type, items]) =>
        (Array.isArray(items) ? items : []).map(item => {
            const id = typeof item === "object" && item !== null ? String(item.id) : String(item);
            const name = typeof item === "object" && item !== null ? String(item.name || item.id) : String(item);
            return `<article class="permission-row"><span><strong>${escapeHtml(type)}</strong><code>${escapeHtml(id)}</code><small>${escapeHtml(name)}</small></span><button type="button" class="danger outline" data-action="onlychats.remove" data-type="${escapeHtml(type)}" data-id="${escapeHtml(id)}">Remover</button></article>`;
        })
    ).join("") || `<p class="empty">A lista está vazia.</p>`;
    return `<section class="panel"><h1>OnlyChats</h1><p class="warning">A whitelist é global e compartilhada por WhatsApp, Telegram e Discord; esta página lista permissões de todas as plataformas, independentemente da plataforma selecionada. O acesso permitido por essa lista é permanente e gratuito no modo aluguel.</p><form id="onlyChatsForm" class="form-grid"><label class="toggle-row"><span><strong>OnlyChats</strong><small>Restringir respostas aos contextos permitidos.</small></span><input name="enabled" type="checkbox"${settings.enabled ? " checked" : ""}></label><label>Comportamento<select name="mode"><option value="ignore"${settings.mode === "ignore" ? " selected" : ""}>Ignorar sem responder</option><option value="reply"${settings.mode === "reply" ? " selected" : ""}>Responder com aviso</option></select></label><label class="full">Mensagem de bloqueio<textarea name="message" rows="3" maxlength="2000">${escapeHtml(settings.message)}</textarea></label><button class="primary" type="submit">Salvar OnlyChats</button><p class="feedback" id="onlyChatsFeedback" role="status"></p></form><form id="onlyChatsAddForm" class="form-grid compact"><h2>Adicionar acesso permanente</h2><label>Tipo<select name="type"><option value="server">Servidor</option><option value="chat">Chat/grupo/canal</option><option value="categoria">Categoria</option><option value="topic">Tópico</option><option value="command">Comando liberado</option></select></label><label>ID ou comando<input name="id" maxlength="120" required></label><label>Nome (opcional)<input name="name" maxlength="120"></label><button type="submit">Adicionar</button><p class="feedback" id="onlyChatsAddFeedback" role="status"></p></form><h2 class="section-title">Permissões cadastradas · todas as plataformas</h2><div class="records">${entries}</div></section>`;
}

function render(pageName, data) {
    const page = PAGES[pageName];
    if (!page) throw new Error("Página de superusuário inválida.");
    const body = pageName === "home" ? homeContent(data)
        : pageName === "settings" ? settingsContent(data)
            : pageName === "plans" ? plansContent(data)
                : pageName === "orders" ? ordersContent(data)
                    : pageName === "subscriptions" ? subscriptionsContent(data)
                        : onlyChatsContent(data);
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(page.title)} · ${escapeHtml(config.getBotName())}</title><style>
      :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#0c101b;color:#f5f7fb;--line:#ffffff18;--muted:#9da8bd;--surface:#151c2a;--accent:#a99dff}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:20px;background:radial-gradient(ellipse at 50% 0,#24304c 0,transparent 48%),linear-gradient(145deg,#090d16,#111324 75%,#151125)}button,input,textarea,select{font:inherit}.page{width:min(1080px,100%);margin:0 auto;padding-bottom:50px}.topbar{display:flex;justify-content:space-between;gap:12px;padding:12px 0 18px;border-bottom:1px solid var(--line);color:var(--muted);font-size:12px}.back,.nav-pill{color:#c6beff;text-decoration:none;font-weight:750}.nav-pills{display:flex;gap:8px;overflow:auto;padding:14px 0}.nav-pill{flex:none;padding:9px 13px;border:1px solid var(--line);border-radius:999px;background:#ffffff06;font-size:12px}.nav-pill.active,.nav-pill:hover{border-color:#a99dff77;background:#a99dff18;color:#fff}.hero,.panel{margin-top:20px;padding:24px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,#171e2d,#111722);box-shadow:0 16px 42px #05081055}.eyebrow{color:#9cf0cf;font-size:11px;font-weight:900;letter-spacing:.16em}.hero h1,.panel h1{margin:9px 0;font-size:clamp(25px,4vw,36px)}.hero p,.panel>p{color:#aab5ca;font-size:13px;line-height:1.65}.bubble-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:18px}.bubble-card{display:flex;min-height:196px;flex-direction:column;align-items:flex-start;gap:10px;padding:20px;border:1px solid #ffffff16;border-radius:20px;background:radial-gradient(circle at 88% 9%,#8479ff20,transparent 35%),linear-gradient(145deg,#181f30,#111722);color:#f5f7fb;text-decoration:none;transition:transform .18s ease,border-color .18s ease}.bubble-card:hover,.bubble-card:focus-visible{transform:translateY(-3px);border-color:#a99dff88;outline:none}.bubble-icon{display:grid;width:44px;height:44px;place-items:center;border:1px solid #a99dff55;border-radius:50%;background:#a99dff15;color:#d9d3ff;font-size:20px}.bubble-card strong{font-size:16px}.bubble-card small{color:var(--muted);font-size:12px;line-height:1.55}.bubble-open{margin-top:auto;color:#c3baff;font-size:12px;font-weight:800}.notice,.warning{padding:13px 15px;border:1px solid #f3c7683a;border-radius:12px;background:#f3c7680b;color:#e8d7a7;font-size:12px;line-height:1.6}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:18px 0}.form-grid label{display:grid;align-content:start;gap:6px;color:#cbd3e5;font-size:12px;font-weight:750}.form-grid input,.form-grid select,.form-grid textarea{width:100%;min-height:42px;padding:10px 12px;border:1px solid #39445d;border-radius:10px;background:#0d1320;color:#fff}.form-grid textarea{resize:vertical;line-height:1.55}.form-grid small{color:var(--muted);font-size:11px;line-height:1.5}.full,.toggle-row,.form-grid h2,.form-grid button,.feedback{grid-column:1/-1}.toggle-row{display:flex!important;align-items:center;justify-content:space-between;gap:12px;padding:13px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}.toggle-row span{display:grid;gap:4px}.toggle-row input{width:22px;height:22px;min-height:0;accent-color:#8f82ff}.two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.primary,button{min-height:39px;padding:9px 13px;border:1px solid #9e91ff66;border-radius:10px;background:#8877ff24;color:#e2deff;font-size:12px;font-weight:800;cursor:pointer}.primary:hover,button:hover{background:#8877ff3a}.danger{border-color:#ff829166;background:#f65b6c1a;color:#ffc2c8}.danger:hover{background:#f65b6c30}.outline{background:transparent}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.records{display:grid;gap:12px;margin-top:18px}.record-card{padding:16px;border:1px solid var(--line);border-radius:14px;background:#ffffff04}.record-card header{display:flex;justify-content:space-between;gap:12px;color:#f3f5fb;font-size:13px}.record-card p{color:#aab5ca;font-size:12px;line-height:1.7}.record-card code{color:#c9c1ff;overflow-wrap:anywhere}.status{color:#aab5ca;font-size:11px}.status.pending{color:#ffd47d}.record-card .plan-form,.record-card .order-form,.record-card .subscription-form{margin-top:12px}.permission-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#ffffff04}.permission-row span{display:grid;gap:4px;min-width:0}.permission-row code{overflow-wrap:anywhere;color:#c9c1ff}.permission-row small{color:var(--muted)}.section-title{margin:24px 0 0;font-size:16px}.empty{padding:18px;border:1px dashed #ffffff2a;border-radius:12px;color:var(--muted);text-align:center}.feedback{min-height:20px;margin:0;color:#9cf0cf;font-size:12px;line-height:1.5;white-space:pre-line}.feedback.error{color:#ff9caa}.compact{padding:16px;border:1px solid var(--line);border-radius:14px;background:#ffffff04}.compact h2{margin:0;font-size:15px}.check-row{display:flex!important;align-items:center;justify-content:space-between}.check-row input{width:20px;min-height:20px;accent-color:#8f82ff}@media(max-width:640px){body{padding:14px}.hero,.panel{padding:18px}.form-grid,.two-col{grid-template-columns:1fr}.form-grid .full,.form-grid button,.form-grid h2,.feedback{grid-column:1}.bubble-grid{grid-template-columns:1fr}.bubble-card{min-height:150px}.permission-row{align-items:flex-start;flex-direction:column}.actions button{flex:1}}
      </style></head><body><main class="page">${navbar(data.platform, pageName)}${body}<p class="feedback" id="actionFeedback" role="status" aria-live="polite"></p><footer class="notice">SatBot · Painel universal de superusuário.</footer></main><script>
        const platform=${JSON.stringify(data.platform)};
        async function post(action,payload={}){const response=await fetch("/api/account/su/rental",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform,action,...payload})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível salvar.");return result}
        function show(id,text,error=false){const node=document.getElementById(id);if(!node)return;node.textContent=text;node.classList.toggle("error",error)}
        function moneyToCents(value){const number=Number(value);if(!Number.isFinite(number)||number<0)throw new Error("Informe um valor válido.");return Math.round(number*100)}
        function daysToMs(value){const days=Number(value);if(!Number.isFinite(days)||days<=0)throw new Error("A duração precisa ser maior que zero.");return Math.round(days*86400000)}
        document.getElementById("settingsForm")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget;const button=form.querySelector("button");button.disabled=true;try{const fd=new FormData(form);const result=await post("settings.update",{settings:{enabledPlatforms:{whatsapp:fd.get("enabled-whatsapp")==="on",telegram:fd.get("enabled-telegram")==="on",discord:fd.get("enabled-discord")==="on"},presenceDurationMs:Math.round(Number(fd.get("presenceHours"))*3600000),noticeDays:Number(fd.get("noticeDays")),expiryAction:fd.get("expiryAction"),welcomeMessage:fd.get("welcomeMessage")}});show("settingsFeedback",result.message||"Configurações salvas.");setTimeout(()=>location.reload(),4000)}catch(error){show("settingsFeedback",error.message,true)}finally{button.disabled=false}});
        document.getElementById("planCreateForm")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget;const button=form.querySelector("button");button.disabled=true;try{const fd=new FormData(form);await post("plan.create",{name:fd.get("name"),priceCents:moneyToCents(fd.get("price")),durationMs:daysToMs(fd.get("durationDays"))});location.reload()}catch(error){show("planFeedback",error.message,true);button.disabled=false}});
        document.querySelectorAll(".plan-form").forEach(form=>form.addEventListener("submit",async event=>{event.preventDefault();const fd=new FormData(form);try{await post("plan.edit",{id:form.dataset.id,name:fd.get("name"),priceCents:moneyToCents(fd.get("price")),durationMs:daysToMs(fd.get("durationDays"))});location.reload()}catch(error){alert(error.message)}}));
        document.querySelectorAll(".order-form").forEach(form=>form.addEventListener("submit",async event=>{event.preventDefault();const fd=new FormData(form);try{await post("order.edit",{targetPlatform:form.dataset.platform,id:form.dataset.id,planId:fd.get("planId")});location.reload()}catch(error){show("ordersFeedback",error.message,true)}}));
        document.getElementById("subscriptionCreateForm")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget;const fd=new FormData(form);try{await post("subscription.create",{targetPlatform:fd.get("targetPlatform"),scopeId:fd.get("scopeId"),chatId:fd.get("chatId"),planId:fd.get("planId"),creatorId:fd.get("creatorId")||null});location.reload()}catch(error){show("subscriptionFeedback",error.message,true)}});
        document.querySelectorAll(".subscription-form").forEach(form=>{const permanent=form.elements.permanent;const expiresAt=form.elements.expiresAt;if(form.dataset.expiresAt){const date=new Date(Number(form.dataset.expiresAt));date.setMinutes(date.getMinutes()-date.getTimezoneOffset());expiresAt.value=date.toISOString().slice(0,16)}permanent?.addEventListener("change",()=>{expiresAt.disabled=permanent.checked});form.addEventListener("submit",async event=>{event.preventDefault();const fd=new FormData(form);try{await post("subscription.edit",{targetPlatform:form.dataset.platform,id:form.dataset.id,permanent:fd.get("permanent")==="on",expiresAt:fd.get("permanent")==="on"?null:new Date(fd.get("expiresAt")).getTime()});location.reload()}catch(error){show("actionFeedback",error.message,true)}})});
        document.getElementById("onlyChatsForm")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget;const fd=new FormData(form);try{await post("onlychats.update",{enabled:fd.get("enabled")==="on",mode:fd.get("mode"),message:fd.get("message")});show("onlyChatsFeedback","OnlyChats atualizado.");setTimeout(()=>location.reload(),1000)}catch(error){show("onlyChatsFeedback",error.message,true)}});
        document.getElementById("onlyChatsAddForm")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget;const fd=new FormData(form);try{await post("onlychats.add",{type:fd.get("type"),id:fd.get("id"),name:fd.get("name")});location.reload()}catch(error){show("onlyChatsAddFeedback",error.message,true)}});
        document.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",async()=>{const {action,id,type,platform:targetPlatform}=button.dataset;if(action==="plan.delete"&&!confirm("Apagar este plano? Pedidos já criados não serão alterados."))return;if(action==="order.pix"){const pixKey=prompt("Informe a chave Pix. No primeiro envio, ela vai ao grupo/servidor e ao privado; em reenvios, somente ao destino pendente:");if(!pixKey)return;try{await post(action,{id,targetPlatform,pixKey});location.reload()}catch(error){show("ordersFeedback",error.message,true)}return}if(action==="order.approve"&&!confirm("Confirmar que o pagamento foi recebido e ativar a assinatura?"))return;if(action==="order.reject"&&!confirm("Recusar o pedido/pagamento? A contratação inicial seguirá a política configurada."))return;if(action==="order.delete"&&!confirm("Apagar este pedido?"))return;if(action==="subscription.delete"&&!confirm("Apagar e bloquear esta assinatura? O período de permanência começará agora."))return;try{const result=await post(action,{id,type,targetPlatform});if(result.warning){show("actionFeedback",result.message||result.warning,true);setTimeout(()=>location.reload(),3500)}else location.reload()}catch(error){show("actionFeedback",error.message,true)}}));
      </script></body></html>`;
}

module.exports = { PAGES, render };
