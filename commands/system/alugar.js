const rental = require("../../functions/rentalHelper");
const { isOwner } = require("../../functions/owners");
const send = require("../../functions/send");

function isSuperUser(message) {
    return Boolean(message.sender?.isOwner || isOwner(message));
}

function parsePrice(value) {
    const normalized = String(value || "")
        .replace(/R\$\s*/gi, "")
        .replace(/\s/g, "")
        .replace(/\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".");
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) {
        throw new Error("Informe um valor válido, por exemplo 19,90.");
    }
    return Math.round(amount * 100);
}

function platformOf(message) {
    return rental.assertPlatform(message.platform);
}

function formatOrder(order) {
    return `${rental.displayId(order.id, "AL")} · ${order.type === "renewal" ? "renovação" : "contratação"} · ${order.planName} · ${rental.formatPrice(order.priceCents)} · ${rental.formatDuration(order.durationMs)} · ${order.status}`;
}

function formatSubscription(subscription) {
    const end = subscription.permanent
        ? "permanente"
        : subscription.expiresAt
            ? new Date(subscription.expiresAt).toLocaleString("pt-BR")
            : "sem vencimento";
    return `${subscription.id} · ${subscription.scopeId} · ${subscription.planName || "Assinatura manual"} · ${end} · ${subscription.status}`;
}

async function reply(message, text) {
    return message.reply({ text });
}

async function runSuperUserCommand(message, args, isModeAlias) {
    const platform = platformOf(message);
    const prefix = message.prefix || "!";
    const groupId = rental.getScopeId(message);
    const chatId = rental.getChatId(message);
    const actorId = String(message.userId || "");
    const action = isModeAlias ? "modo" : String(args[0] || "").toLowerCase();
    const rest = isModeAlias ? args : args.slice(1);

    if (action === "modo") {
        const mode = String(rest[0] || "").toLowerCase();
        if (mode !== "on" && mode !== "off") {
            return reply(message, `Uso: ${prefix}modoaluguel <on|off>`);
        }
        const wasEnabled = rental.getSettings(platform).enabled;
        const settings = rental.setSettings(platform, { enabled: mode === "on" });
        if (!wasEnabled && settings.enabled) {
            await rental.runMaintenance();
        }
        let warning = "";
        if (wasEnabled && !settings.enabled) {
            const active = rental.listSubscriptions(platform).filter(subscription =>
                subscription.permanent || Number(subscription.expiresAt) > Date.now()
            );
            const notice = `ℹ️ O modo de aluguel foi desligado em ${platform}. Há ${active.length} assinatura(s) ativa(s):\n${active.slice(0, 20).map(formatSubscription).join("\n") || "Nenhuma."}`;
            try {
                await send.text(platform, actorId, null, notice);
            } catch (error) {
                warning = `\n⚠️ Não consegui enviar o aviso no privado: ${error.message || error}`;
            }
        }
        return reply(message, `✅ Modo de aluguel ${settings.enabled ? "ativado" : "desativado"}.${warning}`);
    }

    if (action === "config" || action === "permanencia" || action === "aviso" ||
        action === "expiracao" || action === "mensagem") {
        const setting = action === "config" ? String(rest[0] || "").toLowerCase() : action;
        const value = action === "config" ? rest.slice(1) : rest;
        if (setting === "permanencia") {
            const duration = rental.parseDuration(value[0]);
            rental.setSettings(platform, { presenceDurationMs: duration });
            return reply(message, `✅ Permanência configurada para ${rental.formatDuration(duration)}.`);
        }
        if (setting === "aviso") {
            const days = Number(value[0]);
            if (!Number.isSafeInteger(days)) throw new Error("Informe a antecedência em dias inteiros.");
            rental.setSettings(platform, { noticeDays: days });
            return reply(message, `✅ Avisos de vencimento configurados para ${days} dia(s) antes, uma vez por dia.`);
        }
        if (setting === "expiracao") {
            const mode = String(value[0] || "").toLowerCase();
            const expiryAction = mode === "sair" ? "leave" : mode === "bloquear" ? "block" : null;
            if (!expiryAction) return reply(message, `Uso: ${prefix}alugar expiracao <bloquear|sair>`);
            rental.setSettings(platform, { expiryAction });
            return reply(message, `✅ Após a permanência, o bot ${expiryAction === "leave" ? "sairá do grupo/servidor" : "permanecerá bloqueado pelo OnlyChats"}.`);
        }
        if (setting === "mensagem") {
            const text = value.join(" ").trim();
            if (!text) return reply(message, `Uso: ${prefix}alugar mensagem <texto>\nPlaceholders disponíveis: {plans}, {prefix}, {bot}, {presence}`);
            rental.setSettings(platform, { welcomeMessage: text });
            return reply(message, "✅ Mensagem de apresentação do aluguel atualizada.");
        }
        return reply(message, `Configuração: permanência ${rental.formatDuration(rental.getSettings(platform).presenceDurationMs)}, aviso ${rental.getSettings(platform).noticeDays} dia(s), expiração ${rental.getSettings(platform).expiryAction}.`);
    }

    if (action === "plano" || action === "planos") {
        const operation = action === "planos" ? "listar" : String(rest[0] || "listar").toLowerCase();
        const values = action === "planos" ? [] : rest.slice(1);
        if (operation === "listar" || operation === "list") {
            const plans = rental.getPlans(platform);
            return reply(message, plans.length
                ? plans.map(plan => `${rental.displayId(plan.id, "PL")} · ${plan.name} · ${rental.formatPrice(plan.priceCents)} · ${rental.formatDuration(plan.durationMs)}${plan.active === false ? " · inativo" : ""}`).join("\n")
                : "Nenhum plano cadastrado. Use !alugar plano criar <nome> <preço> <duração>.");
        }
        if (operation === "criar" || operation === "create") {
            if (values.length < 3) return reply(message, `Uso: ${prefix}alugar plano criar <nome> <preço> <duração>`);
            const durationMs = rental.parseDuration(values[values.length - 1]);
            const priceCents = parsePrice(values[values.length - 2]);
            const name = values.slice(0, -2).join(" ");
            const plan = rental.createPlan(platform, { name, priceCents, durationMs });
            return reply(message, `✅ Plano ${rental.displayId(plan.id, "PL")} criado: ${plan.name}, ${rental.formatPrice(plan.priceCents)} por ${rental.formatDuration(plan.durationMs)}.`);
        }
        if (operation === "editar" || operation === "edit") {
            if (values.length < 4) return reply(message, `Uso: ${prefix}alugar plano editar <ID> <nome> <preço> <duração>`);
            const durationMs = rental.parseDuration(values[values.length - 1]);
            const priceCents = parsePrice(values[values.length - 2]);
            const name = values.slice(1, -2).join(" ");
            const plan = rental.editPlan(platform, values[0], { name, priceCents, durationMs });
            return reply(message, `✅ Plano ${rental.displayId(plan.id, "PL")} atualizado.`);
        }
        if (operation === "apagar" || operation === "delete") {
            if (!values[0]) return reply(message, `Uso: ${prefix}alugar plano apagar <ID>`);
            rental.deletePlan(platform, values[0]);
            return reply(message, `✅ Plano ${values[0]} apagado. Pedidos existentes mantêm os dados do plano que escolheram.`);
        }
        return reply(message, `Uso: ${prefix}alugar plano <listar|criar|editar|apagar> ...`);
    }

    if (action === "pedidos") {
        const pending = rental.listOrders(platform, "pending");
        return reply(message, pending.length
            ? pending.map(formatOrder).join("\n")
            : "Não há pedidos pendentes.");
    }
    if (action === "aceitar" || action === "aprovar") {
        if (!rest[0]) return reply(message, `Uso: ${prefix}alugar aceitar <ID-do-pedido>`);
        const result = await rental.approveOrder(platform, rest[0], actorId);
        return reply(message, `✅ Pedido ${rental.displayId(result.order.id, "AL")} aprovado. A assinatura termina em ${new Date(result.subscription.expiresAt).toLocaleString("pt-BR")}.${result.warning ? `\n⚠️ ${result.warning}` : ""}`);
    }
    if (action === "recusar") {
        if (!rest[0]) return reply(message, `Uso: ${prefix}alugar recusar <ID-do-pedido>`);
        const order = await rental.rejectOrder(platform, rest[0], actorId);
        return reply(message, `Pedido ${rental.displayId(order.id, "AL")} recusado.${order.warning ? `\n⚠️ ${order.warning}` : ""}`);
    }
    if (action === "editarpedido") {
        if (!rest[0] || !rest[1]) return reply(message, `Uso: ${prefix}alugar editarpedido <ID-do-pedido> <ID-do-plano>`);
        const order = rental.editOrder(platform, rest[0], rest[1]);
        return reply(message, `✅ Pedido ${rental.displayId(order.id, "AL")} atualizado para o plano ${order.planName}.`);
    }
    if (action === "apagarpedido") {
        if (!rest[0]) return reply(message, `Uso: ${prefix}alugar apagarpedido <ID-do-pedido>`);
        const order = rental.deleteOrder(platform, rest[0]);
        return reply(message, `✅ Pedido ${rental.displayId(order.id, "AL")} apagado.`);
    }
    if (action === "assinaturas") {
        const subscriptions = rental.listSubscriptions(platform);
        return reply(message, subscriptions.length
            ? subscriptions.map(formatSubscription).join("\n")
            : "Nenhuma assinatura registrada.");
    }
    if (action === "conceder") {
        if (rest.length < 2) return reply(message, `Uso: ${prefix}alugar conceder <ID-do-grupo-ou-servidor> <ID-do-plano> [ID-do-chat/canal]`);
        const chatId = rest[2] || (message.isPrivate ? "" : rental.getChatId(message));
        if (!chatId) return reply(message, `Informe o ID do chat/canal de avisos: ${prefix}alugar conceder <grupo> <plano> <chat/canal>`);
        const subscription = rental.createSubscription(platform, {
            scopeId: rest[0],
            planId: rest[1],
            chatId,
            creatorId: actorId,
            createdBy: actorId
        });
        const failures = await rental.notifySubscription(
            platform,
            subscription,
            `✅ A assinatura ${subscription.id} foi ativada até ${new Date(subscription.expiresAt).toLocaleString("pt-BR")}.`
        );
        return reply(message, `✅ Assinatura ${subscription.id} concedida até ${new Date(subscription.expiresAt).toLocaleString("pt-BR")}.${failures.length ? `\n⚠️ ${failures.join(" ")}` : ""}`);
    }
    if (action === "editarassinatura") {
        if (rest.length < 2) return reply(message, `Uso: ${prefix}alugar editarassinatura <ID-da-assinatura> <duração|permanente>`);
        const updates = String(rest[1]).toLowerCase() === "permanente"
            ? { permanent: true }
            : { durationMs: rental.parseDuration(rest[1]) };
        const subscription = rental.editSubscription(platform, rest[0], updates);
        return reply(message, `✅ Assinatura ${subscription.id} atualizada${subscription.permanent ? " para permanente" : ` até ${new Date(subscription.expiresAt).toLocaleString("pt-BR")}`}.`);
    }
    if (action === "apagarassinatura" || action === "apagarsignatura" || action === "apagarsub") {
        if (!rest[0]) return reply(message, `Uso: ${prefix}alugar apagarassinatura <ID-da-assinatura>`);
        const subscription = await rental.deleteSubscription(platform, rest[0], actorId);
        return reply(message, `⚠️ Assinatura ${subscription.id} removida e bloqueada. O prazo de permanência foi iniciado.${subscription.warning ? `\n⚠️ ${subscription.warning}` : ""}`);
    }
    if (action === "sair") {
        const destination = rest[0] || groupId;
        if (!destination) return reply(message, `Uso: ${prefix}alugar sair <ID-do-grupo-ou-servidor>`);
        await rental.leaveChat(platform, destination);
        return reply(message, `✅ O bot saiu de ${destination}.`);
    }
    if (action === "status") {
        if (rest[0]) {
            const order = rental.getOrder(platform, rest[0]);
            if (!order) return reply(message, "Pedido não encontrado.");
            return reply(message, `Status do pedido ${rental.displayId(order.id, "AL")}: ${order.status}\nPlano: ${order.planName} · ${rental.formatDuration(order.durationMs)}\nCriado em: ${new Date(order.createdAt).toLocaleString("pt-BR")}`);
        }
        const settings = rental.getSettings(platform);
        const pendingOrders = rental.listOrders(platform, "pending").length;
        const subscriptions = rental.listSubscriptions(platform);
        return reply(message, `Modo: ${settings.enabled ? "ativo" : "desativado"}\nPlanos: ${rental.getPlans(platform).length}\nPedidos pendentes: ${pendingOrders}\nAssinaturas: ${subscriptions.length}`);
    }
    return reply(message, `Comandos SU:\n${prefix}alugar modo <on|off>\n${prefix}alugar plano <listar|criar|editar|apagar>\n${prefix}alugar pedidos | aceitar|recusar|editarpedido|apagarpedido <ID>\n${prefix}alugar assinaturas | conceder <grupo> <plano> [chat/canal]\n${prefix}alugar editarassinatura|apagarassinatura <ID> ...\n${prefix}alugar status [ID-do-pedido]\n${prefix}alugar permanencia <duração> · aviso <dias> · expiracao <bloquear|sair>\n${prefix}alugar sair <ID>`);
}

module.exports = {
    name: "alugar",
    aliases: ["modoaluguel"],
    category: "system/configurações",
    description: "Consulta planos, cria pedidos de aluguel e permite que o superusuário administre o sistema.",
    usage: "{prefix}alugar [planos|contratar|renovar|status|comando SU]",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },

    async execute(message) {
        const args = message.args || [];
        const isModeAlias = message.command === "modoaluguel";
        const publicAction = isModeAlias ? "" : String(args[0] || "").toLowerCase();

        if (isSuperUser(message)) {
            if (isModeAlias || ["modo", "config", "permanencia", "aviso", "expiracao", "mensagem",
                "plano", "planos", "pedidos", "aceitar", "aprovar", "recusar", "editarpedido",
                "apagarpedido", "assinaturas", "conceder", "editarassinatura", "apagarassinatura", "apagarsignatura",
                "apagarsub", "sair", "status"].includes(publicAction)) {
                try {
                    return await runSuperUserCommand(message, args, isModeAlias);
                } catch (error) {
                    return reply(message, `❌ ${error.message || "Não foi possível concluir o comando."}`);
                }
            }
        }

        const platform = platformOf(message);
        if (publicAction === "status") {
            const orderId = String(args[1] || "");
            const order = rental.getOrder(platform, orderId);
            if (!order) return reply(message, "Pedido não encontrado.");
            if (!isSuperUser(message) && String(order.creatorId) !== String(message.userId)) {
                return reply(message, "Você só pode consultar pedidos criados pela sua conta.");
            }
            return reply(message, `Status do pedido ${rental.displayId(order.id, "AL")}: ${order.status}\nPlano: ${order.planName} · ${rental.formatDuration(order.durationMs)}\nCriado em: ${new Date(order.createdAt).toLocaleString("pt-BR")}`);
        }

        if (publicAction === "contratar" || publicAction === "comprar" || publicAction === "renovar") {
            if (message.isPrivate) {
                return reply(message, "Para iniciar o pedido, adicione o bot a um grupo/servidor e use o comando lá. No PV, `!alugar` mostra os planos e `!dono` informa o contato.");
            }
            const scopeId = rental.getScopeId(message);
            const chatId = rental.getChatId(message);
            if (!scopeId || !chatId) return reply(message, "Não consegui identificar o grupo ou servidor.");
            const creatorId = String(message.userId || "");
            if (!creatorId) return reply(message, "Não consegui identificar sua conta nesta plataforma.");
            try {
                const order = rental.createOrder(platform, {
                    scopeId,
                    chatId,
                    threadId: message.threadId || message.topicId || null,
                    categoryId: message.categoryId || null,
                    creatorId,
                    creatorName: message.sender?.name || message.sender?.pushName || creatorId,
                    planId: args[1],
                    type: publicAction === "renovar" ? "renewal" : "initial"
                });
                return reply(message, `✅ Pedido ${order.id} criado e enviado para análise manual do superusuário.\nPlano: ${order.planName} · ${rental.formatPrice(order.priceCents)} · ${rental.formatDuration(order.durationMs)}\nConsulte com ${message.prefix || "!"}alugar status ${order.id}. Para falar com o dono: ${message.prefix || "!"}dono.`);
            } catch (error) {
                return reply(message, `❌ ${error.message || "Não foi possível criar o pedido."}`);
            }
        }

        return reply(message, `Planos de aluguel:\n${rental.formatPlanList(platform)}\n\nPara contratar, use ${message.prefix || "!"}alugar contratar <ID-do-plano> no grupo/servidor depois de adicionar o bot.\nContato do dono: ${message.prefix || "!"}dono.`);
    }
};
