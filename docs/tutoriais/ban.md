[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como banir ou remover membros

Os comandos `!ban` e `!kick` são ferramentas de moderação usadas para retirar
usuários de um grupo ou servidor.

- **`!ban` (Banir):** remove o usuário e impede que ele volte a entrar.
- **`!kick` (Expulsar/Remover):** retira o membro do grupo ou servidor no
  momento, mas permite que ele retorne caso receba um convite ou utilize um
  link válido.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e contexto

Ambos os comandos funcionam exclusivamente em grupos e servidores. Eles não
funcionam em conversas privadas (PV).

- **Quem executa:** precisa ter permissão para banir membros (ao usar `!ban`) ou
  permissão para expulsar membros (ao usar `!kick`) na plataforma. Super
  Usuários e Donos do bot também podem executar os comandos.
- **Permissão do bot:** o bot precisa ter a permissão correspondente na
  plataforma (permissão de banir para `!ban`, expulsar para `!kick` e ser
  administrador no WhatsApp e Telegram).
- **Limitações:**
  - Não é possível banir ou expulsar administradores do grupo/servidor.
  - Não é possível banir ou expulsar o próprio bot.
  - No Discord, a hierarquia de cargos é respeitada (o bot e o moderador
    precisam ter cargos acima do membro visado).

## Como escolher quem banir ou expulsar

Você pode definir o alvo de três formas, tanto no `!ban` quanto no `!kick`:

### 1. Mencionando o usuário

```text
!ban @usuario
!kick @usuario
```

### 2. Informando o ID ou número de telefone

```text
!ban 0000000000
!kick 0000000000
```

No WhatsApp, informe o número associado à conta com DDD, com ou sem formatação
(exemplo: `!ban 5511999999999` ou `!kick 5511999999999`).

### 3. Respondendo à mensagem da pessoa

Basta citar/responder diretamente a qualquer mensagem do usuário e enviar:

```text
!ban
```

ou

```text
!kick
```

O comando sempre prioriza o usuário da mensagem respondida ou mencionada antes
de considerar o texto digitado. Ao responder a uma mensagem, o bot também tenta
apagar a mensagem respondida e o próprio comando enviado (quando a plataforma
permitir a exclusão de mensagens).

## Diferenças entre banir e expulsar em cada plataforma

Cada plataforma trata a restrição de membros de forma diferente. Veja o que
acontece ao usar cada comando:

### Discord

- **`!ban`:** executa o banimento nativo do servidor (`guild.members.ban`). O
  membro é removido e seu ID é adicionado à lista de banimentos do Discord. Ele
  fica bloqueado de reentrar, mesmo que tenha um link de convite válido, até
  que um administrador desfaça o banimento manualmente nas configurações do
  servidor.
- **`!kick`:** executa a expulsão nativa (`guild.members.kick`). O membro é
  removido imediatamente do servidor, mas seu ID **não** entra na lista de
  banidos. Se ele tiver ou receber um link de convite válido, poderá entrar
  novamente a qualquer momento.

### Telegram

- **`!ban`:** executa a restrição de banimento no chat (`banChatMember`). O
  usuário é removido do grupo ou supergrupo e incluído na lista de membros
  bloqueados, ficando impedido de voltar mesmo através de links de convite.
- **`!kick`:** como a API de bots do Telegram não possui uma função nativa de
  "apenas expulsar sem banir", o bot realiza o banimento seguido de um
  desbanimento imediato (`banChatMember` seguido de `unbanChatMember`). Isso
  remove o usuário do grupo naquele instante, mas cancela o bloqueio para que
  ele possa retornar caso receba ou acesse um link de convite.

### WhatsApp

- **`!ban` e `!kick`:** no protocolo e na API de grupos do WhatsApp para bots,
  não existe um recurso de lista de bloqueio/banimento nativo por ID em nível
  de grupo. Por isso, tanto o `!ban` quanto o `!kick` realizam a mesma ação:
  **a remoção imediata do participante do grupo**.
- **Reentrada no WhatsApp:** o participante removido não é bloqueado
  automaticamente pelo aplicativo se usar um link de convite. Para evitar que
  alguém banido ou expulso volte a entrar no grupo:
  - Ative a opção nativa **"Aprovar novos participantes"** nas configurações do
    grupo; ou
  - Redefina o link de convite do grupo após a remoção.

## O que fazer se o comando falhar

1. **Permissões insuficientes:** confira se você e o bot têm a permissão
   necessária na plataforma (banir para `!ban`, expulsar para `!kick`, ou cargo
   de administrador).
2. **Alvo é administrador:** administradores não podem ser banidos ou expulsos
   pelos comandos. Remova o cargo de administrador da pessoa antes, se
   necessário.
3. **Membro já não está no grupo:** no WhatsApp e em expulsões do Discord, o
   membro precisa estar presente no grupo para que a remoção seja concluída.
4. **Formato do alvo:** verifique se mencionou corretamente, se o ID está
   certo ou se o número de telefone no WhatsApp inclui o DDD correto.

