[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como bloquear comandos e categorias com `!blockcmd`

O comando `!blockcmd` (também acessível por `!bloquearcomando` ou `!cmdblock`) permite que administradores desativem seletivamente comandos individuais ou categorias inteiras de comandos do Sat Bot no grupo ou servidor.

Com esse recurso, você pode restringir comandos recreativos (como jogos, IA, economia ou figurinhas) em canais específicos de avisos ou estudos, permitindo que fiquem ativos apenas em canais dedicados.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Onde funciona:** disponível em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).
- **Quem pode configurar:** apenas **administradores** do chat e superusuários do bot.
- **Quem é imune ao bloqueio:** administradores do chat e os donos do bot **continuam podendo usar qualquer comando**, mesmo que esteja bloqueado para membros comuns.
- **Níveis hierárquicos:**
  - **Discord:** `server` (todo o servidor), `categoria` ou `chat` (canal atual).
  - **WhatsApp:** `chat` (grupo) ou `server` (comunidade).
  - **Telegram:** `server` (grupo/canal) ou `chat` (tópico de fórum).
  - *(Se o nível for omitido, a alteração será aplicada somente ao chat atual).*

---

## 1. Ativar ou desativar o bloqueio de comandos

- **Ativar o sistema no nível:**
  ```text
  !blockcmd on
  !blockcmd chat on
  ```
- **Desativar o bloqueio:**
  ```text
  !blockcmd off
  !blockcmd chat off
  ```

---

## 2. Bloquear e desbloquear comandos ou categorias (`add`, `remove`, `list`)

Você pode informar tanto o **nome de um comando específico** (sem o prefixo `!`) quanto o **nome de uma categoria inteira** (como `ia`, `diversão`, `economia`):

### Bloquear um comando ou categoria:
```text
!blockcmd chat add cotacao
!blockcmd chat add ia
!blockcmd chat add cassino
```
*(Bloquear `ia` desativa todos os comandos de inteligência artificial daquele canal de uma só vez).*

### Desbloquear (remover do bloqueio):
```text
!blockcmd chat remove cotacao
!blockcmd chat remove ia
```

### Consultar comandos bloqueados:
```text
!blockcmd chat list
```

### Limpar toda a lista de bloqueios:
```text
!blockcmd chat clear
```

---

## 3. Definir o modo de ação (`action`)

Escolha o que o bot fará quando um membro comum tentar utilizar um comando bloqueado:

```text
!blockcmd <nível> action <reply|ignore|delete>
```

| Modo | Efeito |
| --- | --- |
| **`reply`** | Envia uma mensagem pública avisando que o comando está bloqueado. |
| **`ignore`** | Silencia e ignora a mensagem completamente, sem responder nada no chat. |
| **`delete`** | Apaga a mensagem enviada pelo usuário (exige permissão de apagar mensagens). |

**Exemplos:**
```text
!blockcmd chat action ignore
!blockcmd chat action reply
```

---

## 4. Personalizar a mensagem de aviso (`message`)

Quando o modo for `reply` ou `delete`, você pode customizar o texto de resposta utilizando variáveis dinâmicas:

- `{cmd}` — Nome do comando acionado.
- `{user}` — Nome do usuário que enviou.
- `{prefix}` — Prefixo do bot.

```text
!blockcmd <nível> message <texto...>
```

**Exemplo:**
```text
!blockcmd chat message ⚠️ {user}, o comando {prefix}{cmd} está desativado neste canal!
```

---

## 5. Isolar regras de níveis superiores (`ignoreparent`)

Permite que um canal específico ignore as regras herdadas da categoria ou do servidor:

```text
!blockcmd chat ignoreparent on
!blockcmd chat ignoreparent off
```

---

## 6. Consultar o status

Para verificar os comandos bloqueados, o modo de ação e o status de cada nível:

```text
!blockcmd status
```

---

## Resumo de comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!blockcmd on\|off` | `!bloquearcomando on` | Ativa ou desativa o bloqueio de comandos no nível |
| `!blockcmd add <nome>` | — | Bloqueia um comando individual ou categoria inteira |
| `!blockcmd remove <nome>` | — | Remove o comando ou categoria da lista de bloqueio |
| `!blockcmd list` | — | Lista os comandos bloqueados no nível |
| `!blockcmd clear` | — | Limpa todos os comandos bloqueados do nível |
| `!blockcmd action <modo>` | — | Define o comportamento (`reply`, `ignore`, `delete`) |
| `!blockcmd message <texto>` | `!blockcmd msg` | Personaliza o aviso de comando bloqueado |
| `!blockcmd status` | — | Exibe o resumo do bloqueio de comandos |

---

## Solução de problemas comuns

### 1. Digitei o comando bloqueado e o bot respondeu normalmente
- Verifique se você é **administrador do grupo** ou superusuário do bot. Administradores são imunes às travas de comandos para evitar que fiquem sem acesso a recursos de moderação. Faça o teste com uma conta comum.
- Verifique com `!blockcmd status` se o bloqueio está ativado (`🟢 Ativo`).

### 2. "❌ Nível inválido..."
Use `chat`, `categoria` ou `server` conforme os níveis disponíveis na plataforma em uso. Omitindo o nível, o bot seleciona `chat` por padrão.
