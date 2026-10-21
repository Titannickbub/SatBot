[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como obter o link de convite com `!link`

O comando `!link` (também acessível pelos apelidos `!convite`, `!invite` e
`!linkgp`) exibe o link oficial de entrada do grupo ou servidor atual. Se o
chat ainda não possuir um link gerado, o bot cria um novo convite
automaticamente.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

O comando funciona exclusivamente em grupos, canais e servidores. Ele não
funciona em conversas privadas (PV).

- **Quem executa:** você precisa ter permissão para criar ou gerenciar links de
  convite no grupo ou servidor.
- **Permissão do bot:** o bot também precisa de permissão de administrador ou de
  criação de convites na plataforma.

---

## Como o comando funciona em cada plataforma

O Sat Bot adapta o link gerado de acordo com a plataforma onde o comando é
executado:

### 1. WhatsApp

- O bot consulta o código oficial de convite do grupo (`groupInviteCode`).
- Retorna o link no formato oficial: `https://chat.whatsapp.com/CÓDIGO`.
- **Requisito:** o bot precisa ser **administrador** do grupo para conseguir ler
  ou gerar o código de convite.

### 2. Discord

- **Servidores com URL personalizada (Vanity URL):** se o servidor possuir um
  link personalizado (nível de Boost), o bot prioriza e envia
  `https://discord.gg/SEU_LINK`.
- **Servidores sem Vanity URL:** o bot cria automaticamente um convite
  permanente no canal de texto onde o comando foi digitado (`https://discord.gg/...`),
  sem limite de usos e sem expiração.
- **Requisito:** o bot precisa ter a permissão **Criar convite instantâneo**
  (*Create Instant Invite*) no canal.

### 3. Telegram

- **Grupos públicos:** se o grupo ou supergrupo possuir um `@username` público,
  o bot retorna o link direto `https://t.me/nome_do_grupo`.
- **Grupos privados:** o bot busca o link de convite existente ou exporta/cria um
  novo link permanente de acesso (`https://t.me/+...`).
- **Requisito:** o bot precisa ser **administrador** do grupo com permissão para
  convidar usuários via link.

---

## Exemplos de uso

Você pode usar o comando principal ou qualquer um dos seus apelidos:

```text
!link
!convite
!linkgp
!invite
```

O bot responderá diretamente no chat com a mensagem contendo o link pronto para
copiar e compartilhar.

---

## Solução de problemas

- **"Você não tem permissão para gerenciar ou criar links":** certifique-se de
  que você possui cargo com permissão de convite no servidor/grupo.
- **"O bot não tem permissão":** verifique se o bot é administrador no grupo do
  WhatsApp/Telegram ou se possui permissão de *Criar convite instantâneo* no
  Discord.
- **Erro em canais privados:** o comando precisa ser executado dentro do grupo
  ou servidor do qual você deseja obter o link.
