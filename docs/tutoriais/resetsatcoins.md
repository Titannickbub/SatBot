[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como zerar e resetar satcoins com `!resetsatcoins` e `!resetsatcoinstodos`

Os comandos `!resetsatcoins` e `!resetsatcoinstodos` permitem que administradores redefinam (zerem) os saldos de satcoins acumulados na economia local do grupo ou servidor.

- **`!resetsatcoins`:** zera o saldo de satcoins de **um membro específico**.
- **`!resetsatcoinstodos`:** zera o saldo de satcoins de **todos os membros** do grupo ou servidor de uma só vez (ideal para temporadas econômicas ou reinício do jogo).

> [!CAUTION]
> As ações de reset são **permanentes e irreversíveis**. Por segurança, ambos os comandos exigem a palavra de confirmação `true` para serem executados. Ao zerar os saldos, os demais dados da conta (como histórico e registros não financeiros) são preservados.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (WhatsApp, Telegram e Discord).
- **Mensagens privadas (PV):** **não suportado**.

---

## 1. Zerar o saldo de um único membro (`!resetsatcoins`)

Zera apenas a carteira do usuário indicado, mantendo o saldo dos demais membros inalterado.

### Confirmação obrigatória com `true`
Para evitar resets acidentais, passe a palavra `true` antes de identificar o membro.

**Formas de uso:**

1. **Mencionando o usuário:**
   ```text
   !resetsatcoins true @usuario
   ```
2. **Respondendo à mensagem do usuário:**
   Cite a mensagem do membro e envie:
   ```text
   !resetsatcoins true
   ```
3. **Por ID ou número de telefone:**
   ```text
   !resetsatcoins true 5511999990000
   ```

### Se você esquecer o `true`:
Se enviar apenas `!resetsatcoins @usuario`, o bot não fará o reset e responderá com um aviso de confirmação:
> *⚠️ Este comando zerará permanentemente o saldo de satcoins de um membro. Para confirmar, use !resetsatcoins true respondendo à mensagem dele ou informando o ID.*

### Apelidos (aliases) disponíveis:
`!resetcoins`, `!zerarsatcoins`, `!zerarcoins`.

---

## 2. Zerar o saldo de todos os membros (`!resetsatcoinstodos`)

Redefine para zero o saldo financeiro de todas as contas cadastradas na economia daquele grupo ou servidor.

### Confirmação obrigatória com `true`
Envie o comando acompanhado da confirmação `true`:

```text
!resetsatcoinstodos true
```

Ao confirmar, o bot informará quantas contas foram redefinidas:
> *✅ Saldos de todos os membros zerados. 24 conta(s) atualizada(s).*

### Se você esquecer o `true`:
Se você enviar apenas `!resetsatcoinstodos`, o bot cancelará a operação e solicitará a confirmação:
> *⚠️ Este comando zerará permanentemente os saldos de satcoins de todos os membros. Para confirmar, envie !resetsatcoinstodos true.*

### Apelidos (aliases) disponíveis:
`!resetcoinstodos`, `!zerarsatcoinstodos`, `!zerarcoinstodos`, `!resetsatcoinsgrupo`.

---

## 3. Consultar a ajuda dos comandos

Para consultar a sintaxe rápida direto no chat:

```text
!resetsatcoins help
!resetsatcoinstodos help
```
*(ou `!resetsatcoins ajuda`)*

---

## Resumo dos comandos

| Ação | Comando Principal | Confirmação | Aliases |
| --- | --- | --- | --- |
| **Zerar Um Membro** | `!resetsatcoins` | Requer `true` | `!resetcoins`, `!zerarsatcoins`, `!zerarcoins` |
| **Zerar Todo o Grupo** | `!resetsatcoinstodos` | Requer `true` | `!resetcoinstodos`, `!zerarsatcoinstodos`, `!zerarcoinstodos` |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem resetar saldos de satcoins."
O usuário que executou o comando não possui permissões administrativas no grupo ou servidor.

### 2. "❌ Este membro não possui uma conta de economia registrada neste grupo/servidor."
O participante indicado nunca interagiu com os recursos financeiros do Sat Bot no chat.

### 3. "❌ Usuário não encontrado. Informe um membro após true ou responda à mensagem dele."
Certifique-se de marcar o usuário, citar uma mensagem dele ou fornecer o ID numérico logo após a palavra `true`.
