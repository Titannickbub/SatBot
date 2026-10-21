[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como gerenciar e resetar a atividade no grupo

O sistema de atividade do Sat Bot registra a participação dos membros e
contabiliza mensagens enviadas no grupo ou servidor, gerando rankings de
engajamento.

Os administradores contam com três comandos para controlar esse sistema:

- **`!atividade`:** ativa ou desativa a contagem de novas mensagens.
- **`!resetatividade`:** apaga os registros de atividade de **um membro**
  específico.
- **`!resetatividadetodos`:** limpa o ranking de atividade de **todos os
  membros** do grupo ou servidor.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** apenas **administradores** do chat e Super Usuários.
- **Onde funciona:** exclusivamente em grupos e servidores no **WhatsApp**,
  **Telegram** e **Discord**. O comando não funciona em conversas privadas (PV).

---

## 1. Ativar ou pausar o registro (`!atividade`)

Você pode ligar ou pausar a contabilização de mensagens a qualquer momento:

### Ativar o registro

```text
!atividade ativar
```

O bot passa a computar as mensagens enviadas pelos participantes a partir desse
momento.

### Desativar o registro

```text
!atividade desativar
```

O bot pausa a contagem.

> [!NOTE]
> Ao desativar, **nenhum dado existente é apagado**. Os registros e rankings
> acumulados até o momento continuam preservados no banco de dados.

---

## 2. Resetar a atividade de um único membro (`!resetatividade`)

Use para zerar a pontuação de um membro específico no chat atual.

### Confirmação obrigatória com `true`

Para evitar exclusões acidentais, o bot exige a palavra `true` no comando.

### Sintaxe e exemplos

1. **Mencionando o usuário:**
   ```text
   !resetatividade true @user
   ```
2. **Informando o ID ou número:**
   ```text
   !resetatividade true 123456789012345678
   !resetatividade true 5511999999999
   ```
3. **Respondendo diretamente à mensagem do membro:**
   Responda à mensagem da pessoa e envie:
   ```text
   !resetatividade true
   ```

> [!WARNING]
> O membro precisa ter pelo menos um registro de mensagem computado no ranking
> deste chat. A exclusão é permanente e não pode ser desfeita.

---

## 3. Resetar a atividade de todos os membros (`!resetatividadetodos`)

Ideal para encerrar uma temporada de ranking (por exemplo, no final do mês ou da
semana) e iniciar uma nova contagem do zero para todo o grupo.

### Confirmação obrigatória com `true`

```text
!resetatividadetodos true
```

### O que acontece após o comando?

- O bot apaga todo o histórico de atividade acumulado por todos os membros
  neste chat.
- O bot confirma no chat a quantidade de usuários que foram removidos do
  ranking.
- **O sistema continua funcionando:** se a atividade estiver ativada, as
  próximas mensagens começarão a ser computadas imediatamente em um ranking
  novo.

> [!CAUTION]
> Essa ação é definitiva e remove o histórico de mensagens de todos os
> participantes deste grupo/servidor. Tenha certeza antes de confirmar com `true`.

---

## Resumo dos comandos

| Comando | Descrição | Exige confirmação? |
| --- | --- | --- |
| `!atividade ativar` | Liga a contagem de atividade no chat | Não |
| `!atividade desativar` | Pausa a contagem (preserva histórico) | Não |
| `!atividade help` | Exibe a ajuda rápida no chat | Não |
| `!resetatividade true @user` | Zera a atividade de um usuário específico | Sim (`true`) |
| `!resetatividadetodos true` | Zera a atividade de todos os membros | Sim (`true`) |

---

## Solução de problemas comuns

- **"Para confirmar, use true":** certifique-se de digitar a palavra `true` logo
  após o comando (exemplo: `!resetatividade true @user` ou `!resetatividadetodos true`).
- **"Usuário não encontrado no ranking":** o membro informado ainda não possui
  nenhuma mensagem computada na atividade deste grupo.
- **"Apenas administradores podem resetar a atividade":** o comando exige cargo
  de administração no grupo ou servidor.
- **Como ver o ranking web da atividade:** para gerar o link web e acompanhar a
  pontuação antes de zerar, consulte o
  [tutorial de links do ranking de atividade](./gerarlink-rankativos.md).
