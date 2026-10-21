[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como adicionar, remover e definir satcoins com `!darsatcoin`, `!remsatcoin` e `!setsatcoin`

Os administradores possuem comandos diretos para gerenciar os saldos de satcoins dos membros na economia local do grupo ou servidor. Eles permitem bonificar participantes, aplicar penalidades financeiras ou corrigir valores de carteira.

- **`!darsatcoin`:** acrescenta uma quantidade de satcoins ao saldo atual do usuário.
- **`!remsatcoin`:** subtrai uma quantidade de satcoins do saldo do usuário.
- **`!setsatcoin`:** define um valor exato para o saldo do usuário, substituindo o valor anterior.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (WhatsApp, Telegram e Discord).
- **Mensagens privadas (PV):** **não suportado** (os saldos pertencem à economia do grupo/servidor).

---

## Como identificar o membro destinatário

Para os três comandos, o Sat Bot oferece **3 maneiras práticas** de apontar qual membro terá o saldo ajustado:

1. **Mencionando o usuário:**
   `!darsatcoin 500 @usuario`
2. **Respondendo à mensagem do usuário:**
   Cite a mensagem do participante e envie apenas o comando com o valor:
   `!darsatcoin 500`
3. **Informando o ID ou número de telefone:**
   `!darsatcoin 500 5511999990000`

---

## 1. Adicionar satcoins (`!darsatcoin`)

Adiciona a quantia especificada ao saldo já existente do membro.

### Sintaxe
```text
!darsatcoin <quantidade> <id|@usuário>
```

### Exemplos práticos:
- Bonificar um membro mencionando-o:
  ```text
  !darsatcoin 500 @usuario
  ```
- Bonificar respondendo a uma mensagem dele no chat:
  ```text
  !darsatcoin 1000
  ```
- Bonificar informando o ID/telefone:
  ```text
  !darsatcoin 2500 5511999998888
  ```

**Aliases disponíveis:** `!darsatcoins`, `!addsatcoin`.

---

## 2. Remover satcoins (`!remsatcoin`)

Deduz a quantia especificada do saldo do membro.

### Sintaxe
```text
!remsatcoin <quantidade> <id|@usuário>
```

### Exemplos práticos:
- Aplicar multa ou cobrança mencionando o usuário:
  ```text
  !remsatcoin 200 @usuario
  ```
- Remover respondendo à mensagem do membro:
  ```text
  !remsatcoin 150
  ```

**Aliases disponíveis:** `!remsatcoins`, `!removesatcoin`.

---

## 3. Definir saldo exato (`!setsatcoin`)

Substitui o saldo do membro pelo valor informado, independentemente de quanto ele possuía antes.

### Sintaxe
```text
!setsatcoin <novo_saldo> <id|@usuário>
```

### Exemplos práticos:
- Ajustar a carteira para exatamente 1.000 satcoins:
  ```text
  !setsatcoin 1000 @usuario
  ```
- Zerar ou definir para um valor específico respondendo à mensagem:
  ```text
  !setsatcoin 0
  ```

**Aliases disponíveis:** `!setsatcoins`, `!setcoins`.

---

## Resumo de comandos e aliases

| Ação | Comando Principal | Aliases | Exemplo |
| --- | --- | --- | --- |
| **Adicionar Saldo** | `!darsatcoin` | `!darsatcoins`, `!addsatcoin` | `!darsatcoin 500 @membro` |
| **Remover Saldo** | `!remsatcoin` | `!remsatcoins`, `!removesatcoin` | `!remsatcoin 200 @membro` |
| **Definir Saldo** | `!setsatcoin` | `!setsatcoins`, `!setcoins` | `!setsatcoin 1500 @membro` |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem usar este comando."
Apenas moderadores e administradores do chat têm permissão para conceder, remover ou alterar moedas.

### 2. "❌ Esse usuário ainda não possui uma carteira de economia neste grupo/servidor."
O participante ainda não interagiu com os comandos de economia do bot no grupo. Peça para o membro usar um comando como `!carteira` ou `!trabalhar` para abrir sua conta antes do ajuste manual.

### 3. "❌ Uso: !darsatcoin <valor> <id|@usuário> ou responda à mensagem do usuário."
Você esqueceu de fornecer o valor numérico ou não indicou o usuário (por menção, ID ou resposta).
