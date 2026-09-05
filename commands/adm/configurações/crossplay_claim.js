module.exports = {
  category: 'adm/configurações',
  name: 'crossplay_claim',
  description: 'Vincula um chat/grupo ao código de crossplay gerado em outra plataforma',
  usage: '{prefix}crossplay_claim <codigo>',
  async execute(message) {
    if (message.isPrivate) return message.reply({ text: '❌ Este comando só funciona em grupos/chats de grupo.' });

    const args = message.args || [];
    const code = args[0];
    if (!code) return message.reply({ text: '❌ Use: crossplay_claim <codigo>' });

    const store = (message.functions && message.functions.crossplay) || global.crossplayStore;
    const centralStore = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
    if (!store || !centralStore) return message.reply({ text: '❌ Sistema de crossplay não está disponível.' });

    const central = centralStore.findByPlatform ? await centralStore.findByPlatform(message.platform, message.userId) : null;

    try {
      const linked = await store.claimLinkCode(code, message.platform, message.chatId, {
        centralId: central?.id || null,
        centralName: central?.name || null,
        threadId: message.threadId || (message.target && message.target.threadId) || null
      });
      return message.reply({ text: `✅ Vinculação concluída para este chat.` });
    } catch (err) {
      const msg = err.message === 'invalid-code' ? 'Código inválido.' : err.message === 'code-expired' ? 'Código expirado.' : 'Falha ao vincular.';
      return message.reply({ text: `❌ ${msg}` });
    }
  }
};
