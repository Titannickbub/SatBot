[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como sincronizar chats entre plataformas com `!crossplay`

O comando `!crossplay` (também chamado `!cplay`) cria uma **ponte de
mensagens** entre grupos de WhatsApp, Discord e Telegram. Após a vinculação,
textos, imagens, vídeos, áudios, figurinhas e documentos enviados em um grupo
são automaticamente retransmitidos para os demais grupos conectados.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** apenas **administradores** do chat e Super Usuários.
- **Onde funciona:** grupos de **WhatsApp**, **Discord** e **Telegram**.
  Não funciona em conversas privadas.

---

## Conceitos principais

| Conceito | Descrição |
| --- | --- |
| **Grupo de crossplay** | Conjunto virtual de chats conectados entre si. Cada mensagem enviada em um deles é replicada nos outros. |
| **Código de vínculo** | Código alfanumérico de 8 caracteres, válido por 5 minutos, usado para conectar dois ou mais chats no mesmo grupo de crossplay. |
| **Preferências de mídia** | Filtros por tipo de mídia que cada chat recebe. Permite ignorar ou aceitar determinados tipos (texto, imagem, vídeo, áudio, documento, sticker). |

---

## Passo a passo: vincular dois grupos

### 1. Gerar o código de vínculo no primeiro grupo

No grupo de uma plataforma (por exemplo, WhatsApp), digite:

```text
!crossplay link
```

O bot responderá com algo parecido com:

```text
🔗 VÍNCULO DE CROSSPLAY

🔑 Código gerado: A1B2C3D4
⏳ Validade: 5 minutos

📋 Como conectar o outro grupo:
1. Vá até o grupo da outra plataforma (WhatsApp / Discord / Telegram).
2. Digite o comando:
   !crossplay claim A1B2C3D4
   (ou simplesmente: !crossplay A1B2C3D4)
```

> [!IMPORTANT]
> O código expira em **5 minutos**. Se expirar, basta gerar um novo com
> `!crossplay link`.

### 2. Resgatar o código no segundo grupo

No grupo da outra plataforma (por exemplo, Discord), digite o código gerado:

```text
!crossplay claim A1B2C3D4
```

Ou, de forma abreviada:

```text
!crossplay A1B2C3D4
```

O bot confirmará a conexão:

```text
✅ CROSSPLAY VINCULADO COM SUCESSO!

🌐 Este grupo agora faz parte da ponte de crossplay.
👥 Total de chats conectados nesta rede: 2

💬 As mensagens e mídias compatíveis enviadas aqui serão sincronizadas
   com os outros grupos vinculados.
```

### 3. Conectar mais grupos (opcional)

Você pode repetir o processo para adicionar um terceiro (ou mais) grupo à
mesma ponte. Basta gerar um novo código em qualquer chat que já faça parte
do grupo de crossplay e resgatá-lo no chat novo.

---

## Verificar o status do crossplay (`!crossplay status`)

Para ver se o chat atual está conectado e quais plataformas fazem parte da
ponte:

```text
!crossplay status
```

Exemplo de resposta quando conectado:

```text
📊 STATUS DO CROSSPLAY

🌐 Grupo Crossplay ID: a1b2c3d4-5678-...
👤 Conta Central: Nome do Usuário
🔗 Chats conectados (3):
  1. 🟢 WhatsApp *(este chat)*
  2. 🟣 Discord
  3. 🔵 Telegram

📥 Mídias recebidas: text, image, video, audio, document, sticker
🚫 Mídias ignoradas: nenhuma
```

Se o chat não estiver vinculado, o bot orientará sobre como iniciar.

---

## Configurar preferências de mídia (`!crossplay pref`)

Cada chat conectado pode escolher quais tipos de mídia deseja **receber** ou
**ignorar**. Por padrão, todos os tipos são recebidos.

### Consultar preferências atuais

```text
!crossplay pref
```

### Ignorar um tipo de mídia

Para que o chat deixe de receber figurinhas, por exemplo:

```text
!crossplay pref ignorar sticker
```

### Voltar a receber um tipo ignorado

```text
!crossplay pref receber sticker
```

### Tipos de mídia suportados

| Tipo | Descrição |
| --- | --- |
| `text` | Mensagens de texto |
| `image` | Imagens (fotos, capturas de tela) |
| `video` | Vídeos |
| `audio` | Áudios e notas de voz |
| `document` | Documentos e arquivos |
| `sticker` | Figurinhas / stickers |

> [!NOTE]
> A preferência é aplicada **apenas ao chat onde o comando foi executado**.
> Os outros chats da ponte mantêm suas próprias preferências de forma
> independente.

---

## Desvincular o chat do crossplay (`!crossplay unlink`)

Para remover o chat atual da ponte e parar de receber mensagens sincronizadas:

```text
!crossplay unlink
```

O bot confirmará:

```text
🔌 CROSSPLAY DESCONECTADO

✅ Este chat foi desvinculado com sucesso.
O encaminhamento de mensagens e mídias para este grupo foi encerrado.
```

Se o grupo de crossplay ficar sem nenhum chat, ele é removido
automaticamente.

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!crossplay link` | Gera um código de 8 caracteres para vincular outro chat (expira em 5 min) |
| `!crossplay claim <código>` | Conecta o chat atual usando o código gerado em outro grupo |
| `!crossplay <código>` | Atalho para `claim` — basta digitar o código diretamente |
| `!crossplay status` | Exibe o estado da ponte, chats conectados e preferências |
| `!crossplay pref` | Mostra as preferências de mídia do chat atual |
| `!crossplay pref ignorar <tipo>` | Deixa de receber o tipo de mídia informado |
| `!crossplay pref receber <tipo>` | Volta a receber o tipo de mídia informado |
| `!crossplay unlink` | Remove o chat da ponte de crossplay |
| `!crossplay help` | Exibe a ajuda detalhada no chat |

### Aliases

Os seguintes aliases também são aceitos:

| Alias | Equivalente |
| --- | --- |
| `!cplay` | `!crossplay` |
| `!crossplay gerar` | `!crossplay link` |
| `!crossplay desvincular` | `!crossplay unlink` |
| `!crossplay info` | `!crossplay status` |
| `!crossplay_link` | `!crossplay link` |
| `!crossplay_claim <código>` | `!crossplay claim <código>` |
| `!crossplay_unlink` | `!crossplay unlink` |
| `!crossplay_pref` | `!crossplay pref` |

---

## Como as mensagens são retransmitidas

Quando alguém envia uma mensagem em um chat vinculado, o bot encaminha o
conteúdo para todos os outros chats da ponte no seguinte formato:

```text
🟢 NomeDoUsuário: texto da mensagem
```

O ícone indica a plataforma de origem:

| Ícone | Plataforma |
| --- | --- |
| 🟢 | WhatsApp |
| 🟣 | Discord |
| 🔵 | Telegram |

> [!NOTE]
> Comandos do bot (mensagens que começam com o prefixo `!`) **não** são
> retransmitidos pelo crossplay.

---

## Limites de tamanho de mídia

Cada plataforma possui um limite máximo de envio. Se uma mídia exceder o
limite da plataforma de destino, o bot enviará um aviso orientando o
destinatário a acessar a plataforma de origem para visualizar o conteúdo.

| Plataforma | Limite de vídeo | Limite de áudio |
| --- | --- | --- |
| WhatsApp | 16 MB | 16 MB |
| Telegram | 20 MB | 20 MB |
| Discord | 25 MB | 25 MB |

---

## Solução de problemas comuns

1. **"Este comando só funciona em grupos/chats de grupo":** o crossplay não
   opera em conversas privadas. Execute o comando dentro de um grupo.
2. **"O sistema de crossplay não está disponível no momento":** o módulo de
   crossplay não foi carregado corretamente. Verifique se o bot está
   executando com o módulo habilitado.
3. **"Código inválido ou inexistente":** verifique se digitou o código
   corretamente (8 caracteres alfanuméricos, letras maiúsculas).
4. **"Este código expirou":** o código é válido por apenas 5 minutos. Gere
   um novo com `!crossplay link` no grupo de origem.
5. **Mensagens não estão sendo retransmitidas:**
   - Confirme que ambos os chats estão vinculados (`!crossplay status`).
   - Verifique se o tipo de mídia não foi bloqueado nas preferências
     (`!crossplay pref`).
   - Confirme que a mensagem não é um comando (comandos são ignorados).
6. **Vídeo/áudio não chegou no outro grupo:** o arquivo pode ter excedido o
   limite de tamanho da plataforma de destino. O bot envia um aviso quando
   isso acontece.
