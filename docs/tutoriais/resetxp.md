[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como zerar e resetar o XP com `!resetxp` e `!resetxptodos`

Os comandos `!resetxp` e `!resetxptodos` permitem que moderadores redefinam (zerem) as pontuações de experiência (XP) acumuladas no grupo ou servidor.

- **`!resetxp`:** zera os pontos de experiência de **um membro específico**.
- **`!resetxptodos`:** zera o XP e reinicia os níveis de **todos os membros** do grupo/servidor de uma só vez (ideal para iniciar novas temporadas de engajamento ou rankings mensais).

> [!CAUTION]
> As ações de reset de XP são **permanentes e não podem ser desfeitas**. Por medida de proteção, ambos os comandos exigem a palavra de confirmação `true` para serem concluídos.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** apenas administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).

---

## 1. Zerar o XP de um único membro (`!resetxp`)

Redefine para zero o XP do usuário indicado, preservando seu cadastro no grupo e os dados dos demais membros.

### Confirmação obrigatória com `true`
Para evitar resets acidentais, passe a palavra `true` antes de identificar o membro.

**Formas de uso:**

1. **Mencionando o usuário:**
   ```text
   !resetxp true @usuario
   ```
2. **Respondendo à mensagem do usuário:**
   Cite a mensagem enviada pelo participante e envie:
   ```text
   !resetxp true
   ```
3. **Por ID numérico ou telefone:**
   ```text
   !resetxp true 5511999990000
   ```

### Se você esquecer o `true`:
Se enviar apenas `!resetxp @usuario`, o bot não executará o reset e avisará:
> *⚠️ Este comando zerará permanentemente o XP de um membro. Para confirmar, use !resetxp true respondendo à mensagem dele ou informando o ID.*

### Apelidos (aliases) disponíveis:
`!zerarxp`, `!resetarxp`.

---

## 2. Zerar o XP de todos os membros (`!resetxptodos`)

Zera simultaneamente a pontuação de experiência de todos os participantes do grupo ou servidor.

### Confirmação obrigatória com `true`
Envie o comando acompanhado da confirmação `true`:

```text
!resetxptodos true
```

Ao confirmar, o bot informará quantas contas foram redefinidas:
> *✅ XP de todos os membros resetado. 28 membro(s) atualizado(s).*

### Se você esquecer o `true`:
Se você enviar apenas `!resetxptodos`, o bot cancelará a operação e solicitará a confirmação:
> *⚠️ Este comando zerará permanentemente o XP de todos os membros registrados. Para confirmar, envie !resetxptodos true.*

### Apelidos (aliases) disponíveis:
`!zerarxptodos`, `!resetxpgrupo`.

---

## 3. Consultar ajuda no chat

Para rever a sintaxe rápida direto no chat:

```text
!resetxp help
!resetxptodos help
```
*(ou `!resetxp ajuda`)*

---

## Resumo dos comandos

| Ação | Comando Principal | Confirmação | Aliases |
| --- | --- | --- | --- |
| **Zerar Um Membro** | `!resetxp` | Requer `true` | `!zerarxp`, `!resetarxp` |
| **Zerar Todo o Grupo** | `!resetxptodos` | Requer `true` | `!zerarxptodos`, `!resetxpgrupo` |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem resetar o XP."
Você precisa ser administrador no grupo ou servidor para redefinir as pontuações de experiência.

### 2. "❌ Usuário não encontrado no ranking de XP..."
O membro indicado ainda não possui histórico de XP registrado no chat atual.

### 3. "❌ Usuário não encontrado. Informe um membro após true..."
Certifique-se de marcar o usuário, citar uma mensagem dele ou informar o ID numérico logo após a palavra `true`.
