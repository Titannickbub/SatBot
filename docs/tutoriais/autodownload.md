[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como gerenciar o download automático de mídias com `!autodownload`

O comando `!autodownload` (também acessível por `!downloadlink` ou `!adl`) permite gerenciar o recurso de **download automático** de links de mídias enviados no chat.

Com esse recurso ativado, sempre que qualquer membro enviar um link suportado (como YouTube, TikTok, Instagram, Twitter, etc.), o Sat Bot processa e envia a mídia (vídeo ou áudio) diretamente no grupo, sem a necessidade de comandos manuais como `!play` ou `!tiktok`.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode configurar:** administradores do grupo ou servidor, e superusuários do bot.
- **Comportamento por tipo de chat:**
  - **Conversas privadas (PV):** o recurso fica **sempre ativado** por padrão para praticidade pessoal. Não é necessário ativá-lo no PV.
  - **Grupos e servidores (WhatsApp, Telegram, Discord):** o recurso vem **desativado por padrão** para evitar excesso de downloads não solicitados. Apenas administradores podem ativá-lo ou desativá-lo no grupo.

---

## Plataformas e conteúdos suportados

O sistema do AutoDownload processa automaticamente links das seguintes plataformas:

| Plataforma | Tipo de Mídia Entregue |
| --- | --- |
| 🎵 **YouTube** | Música / Áudio em MP3 |
| 🎬 **TikTok** | Vídeos sem marca d'água |
| 🎬 **Instagram** | Reels e publicações de vídeo |
| 🎬 **X / Twitter** | Vídeos de tweets e publicações |
| 🎬 **Facebook** | Vídeos públicos |
| 🎬 **Kwai** | Vídeos sem marca d'água |
| 🎵 **SoundCloud** | Músicas e faixas de áudio |
| 🎬 **iFunny** | Vídeos e memes |

---

## Como ativar e configurar no grupo

### 1. Ativar o download automático
Para que o bot comece a baixar os links enviados pelos membros:

```text
!autodownload on
```
*(ou `!adl on`)*

Após ativado, qualquer envio de link das plataformas suportadas resultará no download e envio direto da mídia no chat.

---

### 2. Desativar o download automático
Para pausar os downloads automáticos no grupo:

```text
!autodownload off
```
*(ou `!adl off`)*

---

### 3. Excluir o link original após o envio (`deletelink`)
Para evitar poluição visual no chat, você pode configurar o bot para apagar a mensagem contendo o link original assim que a mídia for entregue com sucesso:

- **Ativar a exclusão automática da mensagem com o link:**
  ```text
  !autodownload deletelink on
  ```
- **Desativar a exclusão automática:**
  ```text
  !autodownload deletelink off
  ```
- **Consultar o status da exclusão:**
  ```text
  !autodownload deletelink status
  ```

> [!NOTE]
> Para que a exclusão da mensagem do link funcione, o bot precisa ter permissão para apagar mensagens de outros membros no chat (permissão de Administrador no WhatsApp/Telegram ou cargo com *Gerenciar Mensagens* no Discord).

---

### 4. Consultar o status e configurações atuais
Para verificar se o AutoDownload está ligado no chat e conferir os parâmetros:

```text
!autodownload status
```
*(ou simplesmente `!autodownload`)*

O painel exibe:
- Estado atual no chat (✅ Ativado ou ❌ Desativado).
- Configuração de exclusão do link original (`deletelink`).
- Lista completa de plataformas compatíveis.

---

## Resumo de comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!autodownload on` | `!adl on` | Ativa o download automático de links no chat atual |
| `!autodownload off` | `!adl off` | Desativa o download automático no chat atual |
| `!autodownload status` | `!autodownload`, `!adl` | Exibe o painel de status e instruções de uso |
| `!autodownload deletelink on` | `!adl deletelink on` | Ativa a exclusão da mensagem com o link original após o download |
| `!autodownload deletelink off` | `!adl deletelink off` | Desativa a exclusão da mensagem com o link original |
| `!autodownload deletelink status` | `!adl deletelink status` | Consulta o status da exclusão do link |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem ativar o AutoDownload neste grupo."
Você tentou ligar ou desligar o recurso sem ter cargo de administrador no grupo/servidor. Solicite a um administrador para configurar.

### 2. "ℹ️ O AutoDownload fica sempre ativo no PV."
Nas mensagens diretas (PV) com o bot, o AutoDownload não precisa ser ativado, pois já funciona continuamente para qualquer link que você enviar.

### 3. O membro enviou um link, mas o bot não baixou
- Verifique com `!autodownload status` se o recurso está **ATIVADO** no chat.
- Certifique-se de que o link pertença a uma das plataformas suportadas (YouTube, TikTok, Instagram, X/Twitter, Facebook, Kwai, SoundCloud, iFunny).
- Links para conteúdos privados, contas trancadas ou links expirados não podem ser baixados.

### 4. A mídia foi baixada, mas o link original não foi apagado
Certifique-se de ter ativado com `!autodownload deletelink on` e verifique se o bot possui permissão de administrador para deletar mensagens no grupo/servidor.
