[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como filtrar palavras e frases proibidas com `!antipalavras`

O comando `!antipalavras` configura o filtro de conteúdo e moderação automática de mensagens que contenham termos ofensivos, insultos, xingamentos ou frases inadequadas no grupo ou servidor.

O sistema monitora cada mensagem enviada, apaga termos proibidos, aplica sanções graduadas (como advertências, expulsão ou banimento) e permite criar listas de exceções por usuário e cargo.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Onde funciona:** exclusivamente em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).
- **Quem pode configurar:** apenas **administradores** do chat e superusuários do bot.
- **Níveis de aplicação:**
  - **Discord:** `server` (todo o servidor), `categoria` ou `chat` (canal atual).
  - **WhatsApp:** `chat` (grupo) ou `server` (comunidade).
  - **Telegram:** `server` (grupo/canal) ou `chat` (tópico).
  - *(Se o nível for omitido, a configuração será aplicada ao chat atual).*

---

## 1. Ativar ou desativar o antipalavras

- **Ativar:**
  ```text
  !antipalavras on
  !antipalavras chat on
  ```
- **Desativar:**
  ```text
  !antipalavras off
  !antipalavras chat off
  ```

---

## 2. Gerenciar palavras e frases proibidas (`add`, `remove`, `list`)

Você pode cadastrar termos individuais ou frases completas, separando-os por vírgula:

- **Adicionar palavras ou frases à lista proibida:**
  ```text
  !antipalavras chat add xingamento1, palavra_ofensiva, frase proibida aqui
  ```
- **Remover termos da lista de bloqueio:**
  ```text
  !antipalavras chat remove xingamento1, palavra_ofensiva
  ```
- **Listar os termos proibidos cadastrados:**
  ```text
  !antipalavras chat list
  ```

---

## 3. Definir a ação de punição (`action`)

Escolha qual atitude o bot tomará quando uma palavra proibida for detectada:

```text
!antipalavras <nível> action <delete|warn|kick|ban>
```

| Ação | Efeito |
| --- | --- |
| **`delete`** | Apaga a mensagem silenciosamente sem emitir aviso público no chat. |
| **`warn`** | Apaga a mensagem ofensiva e envia um aviso advertindo o usuário. |
| **`kick`** | Apaga a mensagem e expulsa o infrator do grupo/servidor. |
| **`ban`** | Apaga a mensagem e aplica banimento permanente no infrator. |

**Exemplo:**
```text
!antipalavras chat action warn
!antipalavras chat action delete
```

---

## 4. Personalizar a mensagem de aviso (`message`)

Defina o texto que o bot responderá ao punir quem enviar palavras proibidas:

```text
!antipalavras <nível> message <texto...>
```

**Exemplo:**
```text
!antipalavras chat message ⚠️ Mensagens ofensivas não são toleradas nesta comunidade!
```

---

## 5. Exceções, listas brancas e negras

- **Isentar membros específicos (`userwhitelist`):**
  Membros na lista branca não sofrem punições do antipalavras:
  ```text
  !antipalavras chat userwhitelist add @usuario
  !antipalavras chat userwhitelist remove @usuario
  !antipalavras chat userwhitelist list
  ```
- **Membros restritos (`userblacklist`):**
  Membros na lista negra são monitorados com prioridade máxima:
  ```text
  !antipalavras chat userblacklist add @usuario
  !antipalavras chat userblacklist list
  ```
- **Isentar cargos no Discord (`rolewhitelist` e `roleblacklist`):**
  ```text
  !antipalavras server rolewhitelist add @Moderadores
  !antipalavras server rolewhitelist list
  ```
- **Ignorar regras de níveis superiores (`ignoreparent`):**
  Permite que um canal específico tenha sua própria lista sem herdar as palavras proibidas da categoria ou do servidor:
  ```text
  !antipalavras chat ignoreparent on
  !antipalavras chat ignoreparent off
  ```

---

## 6. Consultar o status

Para inspecionar o status, as ações e as palavras configuradas em cada nível:

```text
!antipalavras status
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!antipalavras on\|off` | Ativa ou desativa a filtragem de palavras proibidas |
| `!antipalavras add <termos>` | Adiciona palavras e frases à lista proibida (separadas por vírgula) |
| `!antipalavras remove <termos>` | Remove palavras da lista proibida |
| `!antipalavras list` | Exibe os termos proibidos cadastrados |
| `!antipalavras action <ação>` | Define a punição (`delete`, `warn`, `kick`, `ban`) |
| `!antipalavras message <texto>` | Personaliza o texto enviado ao aplicar advertência |
| `!antipalavras userwhitelist add\|remove\|list` | Gerencia membros isentos do filtro |
| `!antipalavras status` | Exibe o painel de status em todos os níveis |

---

## Solução de problemas comuns

### 1. O membro enviou uma palavra proibida e a mensagem não sumiu
- Verifique com `!antipalavras status` se o filtro está marcado como ativo no chat.
- Verifique com `!antipalavras list` se a palavra ou frase está exatamente na lista.
- Administradores do grupo e donos do bot são imunes ao filtro. Teste com uma conta de participante comum.

### 2. "⚠️ O bot não tem permissão para esta ação!"
Caso tenha escolhido `kick` ou `ban`, verifique se o bot possui cargo com permissões de banir/expulsar membros na plataforma.
