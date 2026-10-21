[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como adicionar, remover e definir XP com `!darxp`, `!remxp` e `!setxp`

Os administradores possuem comandos manuais para gerenciar a pontuação de experiência (XP) dos membros no grupo ou servidor. Eles permitem premiar participantes em eventos, deduzir pontos por conduta inadequada ou calibrar o progresso de níveis.

- **`!darxp`:** soma a quantia de XP informada ao total atual do membro.
- **`!remxp`:** subtrai a quantia de XP informada do total do membro.
- **`!setxp`:** substitui o total de XP do membro pelo valor especificado, ignorando o total anterior.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** apenas administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).

---

## Formas de identificar o membro

O Sat Bot oferece **3 maneiras práticas** de indicar qual usuário terá o XP ajustado:

1. **Mencionando o usuário:**
   `!darxp 500 @usuario`
2. **Respondendo à mensagem do usuário:**
   Cite a mensagem enviada pelo membro no chat e envie:
   `!darxp 500`
3. **Informando o ID ou número de telefone:**
   `!darxp 500 5511999990000`

---

## 1. Conceder XP (`!darxp`)

Adiciona experiência ao perfil do participante, somando ao total que ele já possuía:

### Sintaxe
```text
!darxp <quantidade> <id|@usuário>
```

### Exemplos práticos:
- Premiar um membro mencionando-o no chat:
  ```text
  !darxp 500 @usuario
  ```
- Premiar respondendo à mensagem dele:
  ```text
  !darxp 1000
  ```
- Premiar informando o ID numérico:
  ```text
  !darxp 2500 123456789
  ```

**Aliases disponíveis:** `!addxp`.

---

## 2. Remover XP (`!remxp`)

Deduz uma quantidade de experiência do perfil do participante:

### Sintaxe
```text
!remxp <quantidade> <id|@usuário>
```

### Exemplos práticos:
- Deduzir XP mencionando o membro:
  ```text
  !remxp 200 @usuario
  ```
- Deduzir XP respondendo à mensagem do membro:
  ```text
  !remxp 300
  ```

**Aliases disponíveis:** `!removexp`.

---

## 3. Definir XP exato (`!setxp`)

Substitui o saldo de experiência do membro pelo valor informado, independentemente de quanto ele possuía antes:

### Sintaxe
```text
!setxp <novo_xp> <id|@usuário>
```

### Exemplos práticos:
- Ajustar o membro para exatamente 5.000 XP:
  ```text
  !setxp 5000 @usuario
  ```
- Zerar ou definir para um valor específico respondendo à mensagem:
  ```text
  !setxp 0
  ```

**Aliases disponíveis:** `!definirxp`.

---

## Resumo de comandos e aliases

| Ação | Comando Principal | Aliases | Exemplo |
| --- | --- | --- | --- |
| **Adicionar XP** | `!darxp` | `!addxp` | `!darxp 500 @membro` |
| **Remover XP** | `!remxp` | `!removexp` | `!remxp 200 @membro` |
| **Definir XP** | `!setxp` | `!definirxp` | `!setxp 1500 @membro` |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem usar este comando."
O usuário que digitou o comando não possui permissões administrativas no grupo ou servidor.

### 2. "❌ Esse usuário ainda não possui um registro de XP neste grupo/servidor."
O participante indicado ainda não enviou mensagens suficientes para gerar um perfil de XP no chat atual. Peça para o membro enviar mensagens no grupo antes de realizar o ajuste manual.

### 3. "❌ Uso: !darxp <quantidade> <id|@usuário> ou responda à mensagem..."
Você esqueceu de fornecer o valor numérico ou não indicou o participante (por menção, ID ou resposta).
