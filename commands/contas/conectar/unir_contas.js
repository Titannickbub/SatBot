module.exports = {
    name: "unir_contas",
    category: "contas/conectar",
    description: `🔗 Conecta contas de plataformas diferentes à mesma Conta Central.

📝 Gere um código temporário em uma conta:
{prefix}unir_contas codigo

Na outra plataforma, confirme a união com esse código:
{prefix}unir_contas login <codigo>

Se executar o comando sem opções, esta ajuda será exibida. O código é temporário e de uso único.`,
    usage: "{prefix}unir_contas [codigo | login <codigo>]",
    async execute(message) {
        const args = message.args || [];
        const action = String(args[0] || "").trim().toLowerCase();
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;

        if (!action) {
            return message.reply({ text: this.description.replaceAll("{prefix}", message.prefix || "!") });
        }

        if (!store) {
            return message.reply({ text: "❌ Sistema de contas centralizadas não está disponível." });
        }

        if (action === "codigo") {
            const central = store.findByPlatform(message.platform, message.userId);
            if (!central) {
                return message.reply({ text: "❌ Nenhuma conta central encontrada para este usuário." });
            }

            try {
                const { code, expiresAt } = await store.generateMergeCode(central.id);
                return message.reply({
                    text: `✅ Código gerado: ${code}\nExpira em: ${expiresAt}\n\nNa outra plataforma, confirme com: ${message.prefix || "!"}unir_contas login ${code}`
                });
            } catch (error) {
                console.error("unir_contas codigo error", error);
                return message.reply({ text: "❌ Falha ao gerar código de união." });
            }
        }

        if (action === "login") {
            const code = args[1];
            if (!code) {
                return message.reply({
                    text: `🔑 Informe o código recebido da outra plataforma:\n${message.prefix || "!"}unir_contas login <codigo>`
                });
            }

            const targetCentral = store.findByPlatform(message.platform, message.userId);
            if (!targetCentral) {
                return message.reply({ text: "❌ Nenhuma conta central encontrada para este usuário." });
            }

            try {
                const merged = await store.useMergeCode(code, targetCentral.id);
                return message.reply({ text: `✅ Contas unidas com sucesso. Central resultante: ${merged.id}` });
            } catch (error) {
                console.error("unir_contas login error", error);
                const reason = String(error?.message || "");
                const msg = reason === "invalid-code"
                    ? "Código inválido."
                    : reason === "code-expired"
                        ? "Código expirado."
                        : reason.startsWith("conflict-platform")
                            ? "Conflito entre plataformas ao unir."
                            : "Falha ao unir contas.";
                return message.reply({ text: `❌ ${msg}` });
            }
        }

        return message.reply({
            text: `❌ Opção inválida.\nUse ${message.prefix || "!"}unir_contas codigo para gerar um código ou ${message.prefix || "!"}unir_contas login <codigo> para confirmar a união.`
        });
    }
};
