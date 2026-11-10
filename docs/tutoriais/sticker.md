# 🖼️ Comandos do menu Sticker

<p><a href="../tutoriais.md"><img src="https://img.shields.io/badge/%E2%86%90%20Voltar-Tutoriais-5865F2?style=for-the-badge" alt="Voltar para Tutoriais"></a></p>

Os comandos deste guia aparecem no menu **Sticker**:

```text
!menu sticker
```

O prefixo dos exemplos é `!`; substitua-o se o bot estiver configurado com
outro. O menu reúne criação de figurinhas e emojis, com comandos diferentes
para WhatsApp/Telegram e Discord.

## 📱 WhatsApp e Telegram

### `!sticker` — criar figurinha a partir de mídia

Envie uma foto, imagem, GIF ou vídeo curto junto com o comando na legenda, ou
responda à mensagem que contém a mídia:

```text
!sticker
!s
!fig
```

Por padrão, a imagem mantém a proporção original. Há dois modos alternativos:

```text
!f
!fsticker
!r
!rsticker
```

- **Modo `f` (fill):** estica a imagem para preencher o espaço da figurinha.
- **Modo `r` (cover):** recorta o centro em formato quadrado.

Aliases do modo padrão: `!sticker`, `!s`, `!fig` e `!figurinha`. Aliases do
modo esticado: `!f`, `!fsticker`, `!ffig` e `!ffigurinha`. Aliases do modo
recortado: `!r`, `!rsticker`, `!rfig` e `!rfigurinha`.

No WhatsApp, o vídeo ou GIF pode ter até **10 segundos**. O arquivo gerado
precisa respeitar o limite de **100 KB para figurinha estática** e
**500 KB (0,5 MB) para figurinha animada**; se ultrapassar, tente uma mídia
mais simples ou curta.

No Telegram, quando sua conta está vinculada à Conta Central, a figurinha
também pode ser adicionada ao seu pacote pessoal. Na primeira criação do
pacote, o bot envia um link para adicioná-lo ao Telegram.

### `!delpack` — apagar seu pacote pessoal no Telegram

Remove o pacote pessoal de figurinhas criado pelo bot:

```text
!delpack
```

A exclusão é permanente. É necessário ter uma Conta Central vinculada no
Telegram. Ao criar outra figurinha depois, um novo pacote pode ser criado.

Aliases: `!deletarpacote` e `!limparpacote`.

### `!delfig` — remover uma figurinha do pacote

Responda à figurinha que deseja remover do seu pacote pessoal e envie:

```text
!delfig
```

Aliases: `!delsticker`. A figurinha precisa pertencer a um pacote que o bot
consiga gerenciar. A remoção não apaga a figurinha de outros pacotes.

## 💬 Discord

Os comandos abaixo adicionam figurinhas e emojis personalizados ao servidor.
São exclusivos do Discord e requerem que **você e o bot** tenham permissão
para **Gerenciar Emojis e Figurinhas** (ou Administrador).

### `!dsticker` — adicionar figurinha ao servidor

Informe um nome e envie ou responda a uma imagem/GIF. Também é possível usar
um emoji ou uma figurinha do Discord como origem:

```text
!dsticker gato
!dsticker gato <:emoji:123456789012345678>
```

O nome pode conter letras, números, espaços, `_` e `-` e tem limite de
30 caracteres. Os modos `f` esticam a mídia para preencher o quadrado e `r`
recortam o centro:

```text
!fdsticker gato_estendido
!rdsticker gato_recortado
```

Aliases padrão: `!dsticker`, `!ds`, `!dfig` e `!dfigurinha`. Modo esticado:
`!fdsticker`, `!fds`, `!fdfig` e `!fdfigurinha`. Modo recortado:
`!rdsticker`, `!rds`, `!rdfig` e `!rdfigurinha`.

O servidor precisa ter espaço para mais figurinhas, e o arquivo final não
pode ultrapassar **512 KB**.

### `!emoji` — adicionar emoji personalizado ao servidor

Informe um nome e envie ou responda a uma imagem/GIF. Você também pode colar
um emoji personalizado de outro servidor:

```text
!emoji gato_feliz
!emoji gato <:emoji:123456789012345678>
```

Os modos alternativos esticam a mídia ou recortam o centro:

```text
!femoji gato_estendido
!remoji gato_recortado
```

Aliases padrão: `!emoji`, `!semoji`, `!addemoji` e `!e`. Modo esticado:
`!femoji` e `!fe`. Modo recortado: `!remoji` e `!re`.

O nome final aceita letras, números e `_` e tem limite de 32 caracteres. O
arquivo não pode ultrapassar **256 KB**, e o servidor precisa ter espaço para
mais emojis.

## Resumo rápido

| Comando | Plataforma | Para que serve |
| --- | --- | --- |
| `!sticker` | WhatsApp e Telegram | Cria figurinha mantendo a proporção |
| `!f` / `!fsticker` | WhatsApp e Telegram | Estica a mídia para preencher |
| `!r` / `!rsticker` | WhatsApp e Telegram | Recorta o centro em formato quadrado |
| `!delpack` | Telegram | Apaga seu pacote pessoal de figurinhas |
| `!delfig` | Telegram | Remove uma figurinha do pacote ao responder a ela |
| `!dsticker` | Discord | Adiciona figurinha ao servidor |
| `!emoji` | Discord | Adiciona emoji personalizado ao servidor |

Para consultar a ajuda de um comando no bot, use `!info <comando>`, por
exemplo `!info sticker`.
