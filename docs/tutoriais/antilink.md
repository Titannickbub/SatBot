[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como configurar a proteção contra links com `!antilink`

O comando `!antilink` permite que a equipe de moderação configure a detecção e remoção automática de links suspeitos ou não autorizados enviados no chat, aplicando punições proporcionais a quem descumprir as regras.

O sistema opera com suporte a **níveis hierárquicos** (servidor, categoria ou canal individual) e oferece controle detalhado através de listas de domínios permitidos, isenções por usuário ou cargo e filtros para links de mídia e do próprio chat.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Onde funciona:** exclusivamente em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).
- **Quem pode configurar:** apenas **administradores** do chat e superusuários do bot.
- **Permissão do bot para punições:** para ações de remoção simples (`delete`), o bot precisa de permissão de apagar mensagens. Para ações disciplinares (`kick` ou `ban`), o bot precisa de permissões administrativas de moderação de membros.

---

## Níveis hierárquicos suportados

Você pode aplicar regras de antilink em diferentes níveis:
- **Discord:** `server` (todo o servidor), `categoria` (canais sob a mesma categoria) ou `chat` (canal ou thread atual).
- **WhatsApp:** `chat` (grupo atual) ou `server` (comunidade inteira, quando aplicável).
- **Telegram:** `server` (grupo/canal) ou `chat` (tópico de fórum).

> [!NOTE]
> Se você omitir o nível ao digitar o comando (ex.: `!antilink on`), a alteração será aplicada automaticamente ao nível **`chat`** (o canal ou grupo atual).

---

## 1. Ativar ou desativar o antilink

- **Ativar:**
  ```text
  !antilink on
  !antilink chat on
  !antilink server on
  ```
- **Desativar:**
  ```text
  !antilink off
  !antilink chat off
  ```

---

## 2. Definir a ação de punição (`action`)

Escolha qual medida o bot tomará quando um link não autorizado for detectado:

```text
!antilink <nível> action <delete|warn|kick|ban>
```

| Ação | Efeito |
| --- | --- |
| **`delete`** | Deleta a mensagem com o link silenciosamente (sem aviso). |
| **`warn`** | Deleta a mensagem e envia um aviso público marcando o infrator. |
| **`kick`** | Deleta a mensagem e expulsa o membro do grupo/servidor. |
| **`ban`** | Deleta a mensagem e bane o infrator permanentemente. |

**Exemplo:**
```text
!antilink chat action warn
!antilink chat action delete
```

---

## 3. Mensagem personalizada de aviso (`message`)

Personalize o texto enviado pelo bot quando um link for barrado:

```text
!antilink <nível> message <texto...>
```

**Exemplo:**
```text
!antilink chat message ⚠️ Envio de links proibido neste grupo!
```

---

## 4. Configurar filtros e exceções automáticas

### Permitir links do próprio grupo/servidor (`ignoresame`)
Evita punir membros que compartilham links de convite ou canais do próprio grupo:
```text
!antilink chat ignoresame on
!antilink chat ignoresame off
```

### Permitir links de mídias (`ignoremedia`)
Permite o compartilhamento de vídeos e conteúdos de redes sociais conhecidas (como YouTube, TikTok, Instagram e Twitter) sem acionar o antilink:
```text
!antilink chat ignoremedia on
!antilink chat ignoremedia off
```

### Isolar regras e ignorar níveis superiores (`ignoreparent`)
Faz com que o canal atual não herde as regras do servidor ou da categoria pai:
```text
!antilink chat ignoreparent on
!antilink chat ignoreparent off
```

---

## 5. Domínios permitidos (`whitelist`)

Permita domínios específicos que todos os membros podem enviar livremente (ex: GitHub, site oficial da comunidade, etc.):

- **Adicionar domínio:**
  ```text
  !antilink chat whitelist add github.com
  !antilink chat whitelist add youtube.com
  ```
- **Remover domínio:**
  ```text
  !antilink chat whitelist remove github.com
  ```
- **Listar domínios permitidos:**
  ```text
  !antilink chat whitelist list
  ```

---

## 6. Gerenciar exceções de usuários e cargos

- **Usuários isentos (`userwhitelist`):**
  Membros na lista branca podem enviar qualquer link sem sofrer punição:
  ```text
  !antilink chat userwhitelist add @usuario
  !antilink chat userwhitelist remove @usuario
  !antilink chat userwhitelist list
  ```
- **Usuários restritos (`userblacklist`):**
  Membros na lista negra nunca recebem a isenção de links de mídia:
  ```text
  !antilink chat userblacklist add @usuario
  !antilink chat userblacklist list
  ```
- **Cargos no Discord (`rolewhitelist` e `roleblacklist`):**
  Isenta ou restringe membros que possuam determinado cargo:
  ```text
  !antilink server rolewhitelist add @Moderador
  !antilink server rolewhitelist list
  ```

---

## 7. Consultar o painel de status

Para verificar todas as configurações ativas, ações e listas brancas do chat:

```text
!antilink status
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!antilink on\|off` | Ativa ou desativa a proteção contra links no chat |
| `!antilink action <delete\|warn\|kick\|ban>` | Define a punição aplicada ao detectar links |
| `!antilink message <texto>` | Define a mensagem personalizada de punição |
| `!antilink ignoresame on\|off` | Permite ou bloqueia links do próprio grupo |
| `!antilink ignoremedia on\|off` | Permite ou bloqueia links de redes sociais (YouTube, TikTok...) |
| `!antilink whitelist add\|remove\|list <domínio>` | Gerencia a lista de domínios autorizados |
| `!antilink userwhitelist add\|remove\|list <membro>` | Gerencia membros isentos do antilink |
| `!antilink status` | Exibe o resumo de configurações em todos os níveis |

---

## Solução de problemas comuns

### 1. "⚠️ O bot não tem permissão para executar a ação [kick/ban]."
Você configurou uma ação de expulsão ou banimento, mas o cargo do bot não possui as permissões necessárias na plataforma. Conceda privilégios de administrador ou mude a ação para `warn` ou `delete`.

### 2. Membros enviam links e o bot não deleta
- Execute `!antilink status` e confirme se o nível correspondente está com estado `✅ Ativo`.
- Certifique-se de que o bot possui permissão de apagar mensagens no chat.
- Lembre-se de que **administradores do grupo e donos do bot são imunes** ao antilink. Teste com uma conta de membro comum.
