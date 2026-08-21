module.exports = {
  category: 'adm',
  name: 'crossplay_unlink',
  description: 'Desvincula/desativa o crossplay deste chat/grupo',
  usage: '{prefix}crossplay_unlink',
  async execute(message) {
    if (message.isPrivate) {
      return message.reply({ text: '❌ Este comando só funciona em grupos/chats de grupo.' });
    }

    const store = (message.functions && message.functions.crossplay) || global.crossplayStore;
    if (!store) {
      return message.reply({ text: '❌ Sistema de crossplay não está disponível.' });
    }

    const threadId = message.threadId || (message.target && message.target.threadId) || null;

    try {
      const removed = await store.unlinkChat(message.platform, message.chatId, threadId);
      if (removed) {
        return message.reply({ text: '✅ Este chat/grupo foi desvinculado do crossplay com sucesso.' });
      } else {
        return message.reply({ text: '⚠️ Este chat/grupo não possui nenhuma vinculação ativa no crossplay.' });
      }
    } catch (err) {
      console.error('crossplay_unlink error', err);
      return message.reply({ text: '❌ Falha ao desvincular o chat do crossplay.' });
    }
  }
};
