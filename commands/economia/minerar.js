const economy = require("../../functions/economy");
const xp = require("../../functions/xp");
const { replyWorkActivity } = require("../../functions/workActivityReply");

const EVENTS = {
    common: [
        "Sua picareta revelou {mineral} numa camada escondida da caverna.",
        "Você encontrou {mineral} durante a escavação e guardou o achado.",
        "Uma pequena veia de {mineral} apareceu entre os blocos de pedra.",
        "Depois de abrir caminho pela mina, você coletou {mineral}.",
        "A mineração rendeu {mineral}, um recurso útil para suas próximas aventuras.",
        "Você ouviu o som da picareta e logo encontrou {mineral}.",
        "Um veio de {mineral} estava escondido atrás da parede da caverna.",
        "Você explorou mais um túnel e saiu de lá com {mineral}."
    ],
    rare: [
        "No fundo da mina, sua picareta encontrou {mineral}!",
        "Uma veia de {mineral} brilhou entre os blocos da caverna.",
        "Você encontrou {mineral}, um achado raro para guardar no inventário.",
        "Um brilho na parede chamou sua atenção: era {mineral}.",
        "Sua exploração foi recompensada com {mineral} escondido na pedra.",
        "Você abriu uma passagem e encontrou {mineral} do outro lado.",
        "A sorte sorriu na mineração: havia {mineral} neste veio.",
        "Entre os blocos de ardósia, você descobriu {mineral}."
    ],
    good: [
        "Uma descoberta lendária: {mineral}!",
        "Sua exploração revelou {mineral}. Que sorte!",
        "No coração da mina, seu grande achado foi {mineral}.",
        "Um brilho raro chamou sua atenção: {mineral}!",
        "Você explorou uma área escondida e voltou com {mineral}.",
        "A aventura rendeu uma grande recompensa: {mineral}!",
        "Uma câmara secreta guardava {mineral}.",
        "Nem todo dia se encontra {mineral}; hoje a mineração foi lendária!"
    ],
    bad: [
        "Um creeper explodiu perto da entrada da mina e danificou seu equipamento.",
        "A picareta quebrou ao atingir um bloco de ardósia profunda.",
        "Você caiu numa ravina e gastou satcoins para recuperar seus itens.",
        "Um esqueleto apareceu no escuro e você precisou fugir deixando o minério para trás.",
        "A lava bloqueou o caminho e queimou parte do seu equipamento.",
        "Uma aranha das cavernas surpreendeu você e a fuga custou algumas satcoins.",
        "Um bloco caiu do teto e danificou sua armadura na hora errada.",
        "Você entrou numa caverna escura sem tochas e precisou recuar às pressas.",
        "Um zumbi apareceu no túnel e você perdeu tempo escapando do combate.",
        "A picareta ficou presa entre os blocos e você precisou pagar pelo conserto.",
        "Uma poça de lava fechou a passagem; melhor voltar antes que piore.",
        "Você ouviu um rosnado no escuro e fugiu antes de descobrir o que era."
    ],
    minerals: {
        common: ["Carvão", "Cobre", "Ferro", "Pedregulho"],
        rare: ["Ouro", "Lápis-lazúli", "Redstone", "Esmeralda"],
        good: ["Diamante", "Esmeralda", "Fragmento de netherita", "Baú com loot OP"]
    }
};

const TYPE_LABELS = {
    common: "Minério comum",
    rare: "Minério raro",
    good: "Loot lendário"
};

module.exports = {
    name: "minerar",
    aliases: ["mineracao", "mineração", "mine"],
    category: "economia/trabalhos",
    description: `⛏️ Explora a caverna para extrair minérios, pedras raras e ganhar satcoins e XP para seu perfil.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}minerar

O bot sorteia os minerais encontrados e acontecimentos da mina, podendo render bons lucros ou eventuais custos de reparo de equipamento.

⏳ Limite de 2 tentativas diárias por usuário. Se esgotar, você pode comprar um reset na {prefix}loja.`,
    usage: "{prefix}minerar",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A mineração só funciona em grupos ou servidores." });
        }

        const result = economy.mine(message, EVENTS);
        const name = message.displayName || message.username || message.userId;

        const xpResult = result.mined
            ? await xp.addActivityXp(message, "mining", result)
            : null;
        return replyResult(message, {
            name,
            mined: result.mined,
            status: result.mined ? result.event : "⏳ Você já minerou duas vezes hoje.",
            amount: result.mined ? result.amount : 0,
            balance: result.balance,
            remaining: result.remaining,
            type: result.mined ? result.type : null,
            mineral: result.mined ? result.mineral : null,
            activityXp: xpResult?.amount || 0
        });
    }
};

async function replyResult(message, result) {
    return replyWorkActivity(message, {
        title: "MINERAÇÃO",
        emoji: "⛏️",
        name: result.name,
        status: result.status,
        amount: result.mined ? result.amount : null,
        balance: result.balance,
        remaining: result.mined ? result.remaining : null,
        remainingLabel: "Minerações",
        activityLabel: "minerações",
        resultLabel: result.mined && TYPE_LABELS[result.type] ? "Resultado" : null,
        resultValue: result.mined ? TYPE_LABELS[result.type] : null,
        extraLabel: result.mined && result.type !== "bad" ? "🔍Encontrado" : null,
        extraValue: result.mineral,
        xp: result.mined ? result.activityXp || 0 : null
    });
}
