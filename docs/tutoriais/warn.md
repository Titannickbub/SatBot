[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como gerenciar advertências com `!warn`, `!unwarn` e `!warns`

O sistema de advertências do Sat Bot permite aplicar avisos formais aos membros
de um grupo ou servidor. Quando um usuário atinge o limite máximo de
advertências estabelecido, o bot pode puni-lo automaticamente com expulsão
(*kick*) ou banimento (*ban*).

- **`!warn`:** registra uma nova advertência para o usuário.
- **`!unwarn`:** perdoa/remove advertências acumuladas.
- **`!warns`:** consulta o total de advertências ativas de um membro ou de si
  mesmo.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Onde funciona:** disponível em grupos e servidores no **WhatsApp**,
  **Telegram** e **Discord**. Não funciona em conversas privadas (PV).
- **Quem pode aplicar ou remover (`!warn` e `!unwarn`):** exclusivamente
  **administradores** do grupo/servidor e Super Usuários.
- **Quem pode consultar (`!warns`):** qualquer membro pode consultar seus
  próprios avisos, e administradores podem consultar os de qualquer pessoa.
- **Punição automática:** para que o bot consiga expulsar ou banir o membro ao
  estourar o limite, ele precisa ter a permissão de moderação correspondente na
  plataforma.

---

## 1. Aplicar advertência com `!warn`

### Sintaxe

```text
!warn <@usuário|id/número> [motivo]
```

O motivo é opcional, mas recomendável para fins de histórico e moderação.

### Exemplos de uso

1. **Mencionando o usuário:**
   ```text
   !warn @user
   !warn @user Spam no chat geral
   ```
2. **Informando o ID ou número de telefone:**
   ```text
   !warn 123456789012345678 Envio indevido de links
   !warn 5511999999999 Desrespeito com membros
   ```
3. **Respondendo diretamente à mensagem da pessoa:**
   Responda à mensagem que violou as regras e digite:
   ```text
   !warn
   !warn Não permitimos divulgação aqui
   ```

### O que acontece após a advertência?

- O bot responde informando a quantidade atual de advertências do usuário em
  relação ao limite máximo (por exemplo: `2/3`).
- **Se o usuário atingir o limite:** o bot executa automaticamente a ação de
  punição configurada no grupo (expulsão ou banimento) e avisa no chat.

---

## 2. Remover advertências com `!unwarn`

Caso o membro tenha cumprido uma punição ou o aviso tenha sido aplicado por
engano, use `!unwarn`.

### Sintaxe

```text
!unwarn <@usuário|id/número> [quantidade]
```

- **Sem informar quantidade:** o bot remove **todas** as advertências do usuário.
- **Informando um número:** remove apenas a quantidade informada.

### Exemplos de uso

1. **Remover todas as advertências:**
   ```text
   !unwarn @user
   !unwarn 123456789012345678
   ```
2. **Remover uma quantidade específica:**
   ```text
   !unwarn @user 1
   !unwarn @user 2
   ```
3. **Respondendo à mensagem da pessoa:**
   Responda à mensagem do usuário e envie:
   ```text
   !unwarn
   !unwarn 1
   ```

---

## 3. Consultar advertências com `!warns`

O comando `!warns` exibe a quantidade atual de advertências de uma pessoa e o
teto máximo configurado para o grupo.

### Sintaxe

```text
!warns [@usuário|id/número]
```

### Exemplos de uso

1. **Consultar suas próprias advertências:**
   Basta digitar o comando sem nenhum argumento:
   ```text
   !warns
   ```
   O bot responderá: `⚠️ Você possui 1 advertência(s) de um máximo de 3.`
2. **Consultar as advertências de outro membro:**
   ```text
   !warns @user
   !warns 5511999999999
   ```
3. **Respondendo a uma mensagem:**
   Responda à mensagem da pessoa com `!warns`.

---

## Configuração do limite e punição (`!warnconfig`)

Para definir quantas advertências são necessárias para punir e qual ação será
tomada, os administradores utilizam o comando `!warnconfig`:

```text
!warnconfig <quantidade> <kick|ban>
```

- **Expulsar ao atingir o limite:**
  ```text
  !warnconfig 3 kick
  ```
- **Banir ao atingir o limite:**
  ```text
  !warnconfig 3 ban
  ```
- **Conferir a configuração atual do grupo:**
  ```text
  !warnconfig status
  ```

---

## Resumo dos comandos

| Comando | Descrição | Quem pode usar |
| --- | --- | --- |
| `!warn @user [motivo]` | Adiciona advertência | Administradores |
| `!unwarn @user` | Remove todas as advertências | Administradores |
| `!unwarn @user [qtd]` | Remove uma quantidade de advertências | Administradores |
| `!warns` | Consulta os próprios avisos | Todos os membros |
| `!warns @user` | Consulta os avisos de outro membro | Todos os membros |
| `!warnconfig <qtd> <kick\|ban>` | Define o limite e punição automática | Administradores |
