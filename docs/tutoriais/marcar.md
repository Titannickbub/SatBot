[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como marcar todos com `!marcar`

O comando `!marcar` (também conhecido pelos apelidos `!tag` e `!hidetag`) permite
que administradores enviem comunicados importantes chamando a atenção de todos os
membros do grupo ou servidor de uma só vez.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** apenas **administradores** do grupo/servidor e Super
  Usuários.
- **Onde funciona:** disponível em grupos do **WhatsApp** e servidores do
  **Discord**. O comando não funciona em conversas privadas (PV) e **não possui
  suporte no Telegram**.

---

## Como o comando funciona em cada plataforma

### 1. WhatsApp (Marcação Oculta / Hidetag)

No WhatsApp, o comando envia uma **marcação invisível**:

- Todos os participantes do grupo recebem a notificação de menção do WhatsApp no
  celular.
- O texto da mensagem permanece limpo e legível, **sem listar dezenas de arrobas
  ou números no chat**.
- O bot obtém a lista de membros do grupo e anexa as menções nos metadados da
  mensagem.

### 2. Discord (`@everyone`)

No Discord, o comando aciona a menção global do servidor:

- O bot envia a mensagem acompanhada da menção `@everyone`.
- Para manter o canal limpo e organizado, o bot tenta apagar automaticamente a
  mensagem digitada pelo administrador que disparou o comando.
- **Atenção:** tanto o administrador quanto o bot precisam ter permissão de
  mencionar `@everyone` no canal.

### 3. Telegram

- O Telegram não oferece um recurso de menção geral nativa sem listar o nome de
  cada membro no corpo da mensagem. Por conta dessa limitação, o bot informará
  que o recurso não é compatível com a plataforma.

---

## Como usar

Informe a mensagem que deseja transmitir logo após o comando:

```text
!marcar Comunicado importante: reunião hoje às 20h!
!hidetag Galera, confiram as novidades fixadas no grupo.
!tag Leiam as regras atualizadas.
```

O texto após o comando é **obrigatório**. Se você digitar apenas `!marcar` sem
nenhum texto, o bot pedirá que forneça a mensagem a ser enviada.

---

## Solução de problemas

- **"Apenas administradores podem usar este comando":** o usuário precisa ser
  administrador do grupo no WhatsApp ou possuir cargo de administração no
  servidor do Discord.
- **"Marcar todos ainda não é compatível com o Telegram":** o comando não opera
  no Telegram por restrições da plataforma.
- **"Informe a mensagem que deseja enviar":** adicione o texto do aviso após o
  comando (exemplo: `!hidetag Atenção a todos`).
- **Falha no Discord:** certifique-se de que o bot possui permissão para
  **Mencionar @everyone, @here e todos os cargos** e permissão para **Gerenciar
  Mensagens** (para apagar o comando original).
