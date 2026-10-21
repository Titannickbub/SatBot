[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como configurar o sistema de XP e avisos de level-up com `!xpconfig`

O comando `!xpconfig` (também acessível por `!configxp` ou `!configurarxp`) permite que administradores configurem o sistema de experiência (XP), ganho de níveis e as mensagens automáticas de parabéns ao subir de nível (*level-up*) no grupo ou servidor.

Você pode ligar ou pausar a contagem de XP, silenciar mensagens de level-up para evitar poluição visual no chat principal ou redirecionar esses avisos para um canal ou tópico específico.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** apenas administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).

---

## 1. Ativar ou desativar o ganho de XP

- **Ativar o ganho de XP:**
  ```text
  !xpconfig ativar
  ```
  *(Os membros passam a acumular experiência ao conversar e interagir no chat).*

- **Desativar o ganho de XP:**
  ```text
  !xpconfig desativar
  ```
  *(Pausa a contabilização de novos pontos de experiência).*

> [!NOTE]
> Desativar o XP **não apaga** os pontos nem os níveis acumulados pelos membros. Todo o progresso histórico permanece preservado no banco de dados.

---

## 2. Silenciar ou reativar mensagens de level-up

Quando um membro atinge experiência suficiente para subir de nível, o bot normalmente envia uma mensagem de felicitações no chat. Você pode controlar esse comportamento:

- **Silenciar os avisos de level-up:**
  ```text
  !xpconfig mutar
  ```
  *(ou `!xpconfig silenciar`)* — O bot deixará de enviar mensagens automáticas de subida de nível.

- **Reativar os avisos de level-up:**
  ```text
  !xpconfig desmutar
  ```

---

## 3. Redirecionar os avisos de level-up para um canal ou tópico

Para manter o chat geral limpo, você pode direcionar os anúncios de subida de nível para um canal de texto específico (Discord) ou para um tópico (Telegram):

- **No Discord (definir canal de destino):**
  Acesse o canal onde deseja receber as notificações (ex.: `#level-up` ou `#conquistas`) e digite:
  ```text
  !xpconfig canal
  ```
- **No Telegram (definir tópico de destino):**
  Entre no tópico desejado do supergrupo e digite:
  ```text
  !xpconfig topico
  ```
- **Voltar os avisos para o chat atual:**
  ```text
  !xpconfig chat
  ```
  *(ou `!xpconfig atual`)*

> [!TIP]
> Ao definir um novo canal ou tópico de destino com `!xpconfig canal` ou `!xpconfig topico`, os avisos de level-up são automaticamente desmutados caso estivessem silenciados.

---

## 4. Consultar o status atual

Para verificar se o ganho de XP está ligado e conferir onde os avisos de level-up estão sendo entregues:

```text
!xpconfig status
```

**Exemplo de resposta do bot:**
```text
📊 XP: ativado
🔔 Level-up: #conquistas (ou chat atual / silenciado)
```

---

## Resumo de comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!xpconfig ativar` | `!xpconfig ativarxp` | Ativa a contagem de XP no chat |
| `!xpconfig desativar` | `!xpconfig desativarxp` | Pausa a contagem de XP preservando o histórico |
| `!xpconfig mutar` | `!xpconfig silenciar` | Silencia as mensagens automáticas de level-up |
| `!xpconfig desmutar` | — | Reativa o envio das mensagens de level-up |
| `!xpconfig canal` | — | Define o canal do Discord atual para os avisos |
| `!xpconfig topico` | — | Define o tópico do Telegram atual para os avisos |
| `!xpconfig chat` | `!xpconfig atual` | Restaura os avisos para o chat atual |
| `!xpconfig status` | — | Exibe o status do sistema de XP e destino de avisos |
| `!xpconfig help` | `!xpconfig ajuda` | Exibe o guia de ajuda rápido no chat |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem configurar o XP."
Você precisa ser administrador do grupo ou servidor para ajustar as configurações de XP.

### 2. "❌ No Discord, use este comando em um canal para defini-lo como destino."
O comando `!xpconfig canal` foi executado em uma plataforma diferente do Discord. No Telegram, utilize `!xpconfig topico`.

### 3. "❌ Use este comando dentro de um tópico do Telegram."
No Telegram, você digitou `!xpconfig topico` no chat geral do grupo em vez de entrar no tópico correspondente.
