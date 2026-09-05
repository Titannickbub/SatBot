module.exports = {
  category: 'adm/configurações',
  name: 'crossplay_link',
  description: 'Gera um código para vincular um grupo/chat entre plataformas',
  usage: '{prefix}crossplay_link',
  async execute(message) {
    if (message.isPrivate) return message.reply({ text: '❌ Este comando só funciona em grupos/chats de grupo.' });

    const store = (message.functions && message.functions.crossplay) || global.crossplayStore;
    const centralStore = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
    if (!store || !centralStore) return message.reply({ text: '❌ Sistema de crossplay não está disponível.' });

    const central = centralStore.findByPlatform ? await centralStore.findByPlatform(message.platform, message.userId) : null;
    if (!central) return message.reply({ text: '❌ Nenhuma conta central foi encontrada para este usuário.' });

    try {
      const code = await store.createLinkCode(message.platform, message.chatId, {
        centralId: central.id,
        centralName: central.name || null,
        threadId: message.threadId || (message.target && message.target.threadId) || null,
        ttlMinutes: 5
      });
      return message.reply({ text: `✅ Código de crossplay gerado: ${code.code}\nExpira em 5 minutos.` });
    } catch (err) {
      console.error('crossplay_link error', err);
      return message.reply({ text: '❌ Falha ao gerar código de crossplay.' });
    }
  }
};
