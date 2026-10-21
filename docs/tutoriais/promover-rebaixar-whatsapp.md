[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como promover e rebaixar administradores no WhatsApp com `!promover` e `!rebaixar`

Os comandos `!promover` e `!rebaixar` permitem que administradores gerenciem os privilégios administrativos dos participantes de grupos do WhatsApp diretamente por mensagem de texto.

- **`!promover`:** eleva um participante comum à condição de **administrador do grupo**.
- **`!rebaixar`:** remove o cargo de administrador de um participante, retornando-o ao status de **membro comum**.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Compatibilidade:** exclusivo para grupos do **WhatsApp**.
- **Quem pode usar:** administradores do grupo ou superusuários do bot.
- **Permissão do bot:** o Sat Bot **precisa ser administrador do grupo** para que o WhatsApp permita alterar privilégios de outros membros.
- **Mensagens privadas (PV):** **não suportado** (cargos de administrador só existem dentro de grupos).

---

## Formas de identificar o participante

O bot aceita **4 maneiras práticas** de indicar qual membro será promovido ou rebaixado:

1. **Respondendo à mensagem:**
   Cite a mensagem enviada pelo usuário e digite apenas:
   ```text
   !promover
   !rebaixar
   ```
2. **Mencionando o usuário:**
   ```text
   !promover @membro
   !rebaixar @membro
   ```
3. **Informando o número de telefone (com DDI e DDD):**
   ```text
   !promover 5511999999999
   !rebaixar 5511999999999
   ```
4. **Informando o ID central do usuário:**
   ```text
   !promover <ID-central>
   ```

---

## 1. Promover a administrador (`!promover`)

Concede direitos administrativos a um membro do grupo.

### Exemplos práticos:
- Promover respondendo à mensagem do membro:
  1. Clique para responder à mensagem dele no grupo.
  2. Digite: `!promover`
- Promover por menção:
  ```text
  !promover @membro
  ```
- Promover por número de telefone:
  ```text
  !promover 5521988887777
  ```

---

## 2. Rebaixar para membro comum (`!rebaixar`)

Retira as permissões administrativas de um administrador do grupo.

### Exemplos práticos:
- Rebaixar respondendo à mensagem do administrador:
  1. Responda a uma mensagem enviada por ele.
  2. Digite: `!rebaixar`
- Rebaixar por menção:
  ```text
  !rebaixar @administrador
  ```
- Rebaixar por número:
  ```text
  !rebaixar 5521988887777
  ```

---

## Resumo dos comandos

| Comando | Descrição | Exemplo |
| --- | --- | --- |
| `!promover` | Torna o membro um administrador do grupo no WhatsApp | `!promover @membro` |
| `!rebaixar` | Retira o cargo de administrador e volta a membro comum | `!rebaixar @membro` |

---

## Solução de problemas comuns

### 1. "❌ Este comando é exclusivo do WhatsApp."
Você tentou rodar o comando no Discord ou Telegram. No Telegram, utilize o comando correspondente [`!tpromote` e `!trebaixar`](./promover-rebaixar-telegram.md).

### 2. "❌ Apenas administradores do grupo podem usar este comando."
O usuário que digitou o comando não é administrador do grupo no WhatsApp.

### 3. A promoção ou rebaixamento falhou silenciosamente
Verifique se o Sat Bot ainda possui cargo de administrador no grupo do WhatsApp. Se o bot for rebaixado, o WhatsApp impedirá qualquer alteração de membros enviada por ele.

### 4. Tentativa de rebaixar o criador do grupo
O criador original do grupo no WhatsApp não pode ser rebaixado por outros administradores devido às restrições nativas do próprio WhatsApp.
