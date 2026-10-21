[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como bloquear tipos de mídia no chat com `!antimedia`

O comando `!antimedia` permite que moderadores controlem e restrinjam o envio de arquivos de mídia (como fotos, vídeos, figurinhas, áudios e documentos) no grupo ou servidor.

Você pode escolher exatamente quais tipos de arquivos deseja proibir (por exemplo, permitir fotos mas proibir figurinhas e vídeos), definir punições automáticas (apenas deletar, advertir ou expulsar) e cadastrar exceções por usuário ou cargo.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Onde funciona:** em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).
- **Quem pode configurar:** apenas **administradores** do chat e superusuários do bot.
- **Níveis hierárquicos:**
  - **Discord:** `server`, `categoria` e `chat`.
  - **WhatsApp:** `chat` (grupo) ou `server` (comunidade).
  - **Telegram:** `server` (grupo) ou `chat` (tópico em fóruns).
  - *(Se o nível for omitido, a configuração será aplicada ao canal/chat atual).*

---

## Tipos de mídia suportados

O Sat Bot reconhece e categoriza os seguintes tipos de arquivos (aceita nomes em português e inglês):

| Tipo | Sinônimos Aceitos | Descrição |
| --- | --- | --- |
| **`image`** | `imagem`, `foto` | Fotografias e imagens estáticas (PNG, JPG, etc.) |
| **`video`** | `vídeo`, `filme` | Arquivos e gravações de vídeo (MP4, MKV, etc.) |
| **`audio`** | `áudio`, `música`, `som` | Arquivos de áudio e faixas musicais |
| **`voice`** | `voz`, `audiovoz`, `gravacao` | Mensagens de voz gravadas pelo microfone |
| **`sticker`** | `figurinha`, `adesivo` | Figurinhas estáticas ou animadas |
| **`gif`** | `animacao` | GIFs animados |
| **`document`** | `documento`, `arquivo`, `pdf` | Documentos, planilhas, PDFs e arquivos compactados |
| **`location`** | `localização`, `local` | Compartilhamento de localização em tempo real ou estática |
| **`contact`** | `contato`, `vcard` | Compartilhamento de cartões de contato telefônico |

> [!NOTE]
> Se você ativar o antimedia sem cadastrar tipos específicos, **todos os tipos de mídia** serão considerados bloqueados por padrão.

---

## 1. Ativar ou desativar o antimedia

- **Ativar:**
  ```text
  !antimedia on
  !antimedia chat on
  ```
- **Desativar:**
  ```text
  !antimedia off
  !antimedia chat off
  ```

---

## 2. Configurar quais mídias bloquear (`add`, `remove`, `list`)

Você pode adicionar múltiplos tipos separados por vírgula:

- **Bloquear tipos específicos:**
  ```text
  !antimedia chat add sticker, video
  !antimedia chat add image, audio, document
  ```
- **Remover tipos da lista de bloqueio (voltar a permitir):**
  ```text
  !antimedia chat remove sticker
  ```
- **Listar as mídias proibidas no nível:**
  ```text
  !antimedia chat list
  ```

---

## 3. Definir a ação de punição (`action`)

Escolha como o bot reagirá quando uma mídia proibida for enviada:

```text
!antimedia <nível> action <delete|warn|kick|ban>
```

- **`delete`:** apenas apaga a mídia de forma silenciosa.
- **`warn`:** apaga a mídia e envia um aviso no chat marcando o membro.
- **`kick`:** apaga a mídia e expulsa o membro infrator.
- **`ban`:** apaga a mídia e bane o infrator.

**Exemplo:**
```text
!antimedia chat action warn
!antimedia chat action delete
```

---

## 4. Mensagem personalizada de aviso (`message`)

Personalize o texto do aviso enviado ao barrar uma mídia:

```text
!antimedia <nível> message <texto...>
```

**Exemplo:**
```text
!antimedia chat message ⚠️ Envio de figurinhas e vídeos bloqueado neste canal!
```

---

## 5. Exceções e listas brancas

- **Isentar membros específicos (`userwhitelist`):**
  ```text
  !antimedia chat userwhitelist add @usuario
  !antimedia chat userwhitelist remove @usuario
  !antimedia chat userwhitelist list
  ```
- **Membros restritos (`userblacklist`):**
  Usuários na lista negra são punidos caso enviem qualquer tipo de mídia, independentemente da lista de tipos cadastrada:
  ```text
  !antimedia chat userblacklist add @usuario
  !antimedia chat userblacklist list
  ```
- **Isentar cargos no Discord (`rolewhitelist`):**
  ```text
  !antimedia server rolewhitelist add @Vip
  !antimedia server rolewhitelist list
  ```
- **Ignorar regras de níveis superiores (`ignoreparent`):**
  ```text
  !antimedia chat ignoreparent on
  !antimedia chat ignoreparent off
  ```

---

## 6. Consultar o status

Para inspecionar as regras e tipos de mídias bloqueados em cada nível do grupo/servidor:

```text
!antimedia status
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!antimedia on\|off` | Liga ou desliga o bloqueio de mídias no chat |
| `!antimedia add <mídias>` | Adiciona tipos de mídia à lista proibida (ex: `sticker, video`) |
| `!antimedia remove <mídias>` | Remove tipos de mídia da lista de bloqueio |
| `!antimedia list` | Exibe os tipos de mídias bloqueados atualmente |
| `!antimedia action <ação>` | Define a punição (`delete`, `warn`, `kick`, `ban`) |
| `!antimedia message <texto>` | Configura a mensagem enviada ao punir |
| `!antimedia userwhitelist add\|remove\|list` | Gerencia usuários isentos do antimedia |
| `!antimedia status` | Exibe o painel de status do antimedia |

---

## Solução de problemas comuns

### 1. "❌ Informe uma ou mais mídias..."
Certifique-se de usar tipos válidos (como `image`, `video`, `sticker`, `audio`) e separá-los por vírgula.

### 2. O membro enviou uma mídia e ela não foi deletada
- Verifique com `!antimedia status` se o antimedia está ativo no chat.
- Verifique com `!antimedia list` se o tipo do arquivo enviado consta na lista de bloqueados.
- Lembre-se de que administradores são imunes às proteções de mídia.
