[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como consultar a posição e dados individuais com `!rankinfo`

O comando `!rankinfo` (também acessível por `!consultarank`, `!rankusuario` ou `!inforank`) permite consultar a **posição exata** e as **estatísticas detalhadas** de um membro específico em qualquer um dos três rankings do grupo ou servidor: **Atividade**, **XP** ou **Satcoins (Economia)**.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Onde funciona:** disponível em grupos e servidores no **WhatsApp**, **Telegram** e **Discord**. Não funciona em conversas privadas (PV).
- **Quem pode usar:** todos os membros e administradores do grupo.
- **Requisitos:** o sistema escolhido (Atividade, XP ou Economia) precisa estar ativado no grupo, e o membro consultado precisa ter pontuações ou registros gravados.

---

## Como identificar o membro a ser consultado

Você pode consultar os dados de qualquer participante (ou de si mesmo) de **3 formas**:

1. **Mencionando o usuário:**
   ```text
   !rankinfo atividade @membro
   ```
2. **Respondendo à mensagem do usuário:**
   Cite qualquer mensagem enviada pelo participante e digite apenas:
   ```text
   !rankinfo atividade
   !rankinfo xp
   !rankinfo rico
   ```
3. **Informando o ID numérico ou telefone:**
   ```text
   !rankinfo xp 123456789
   ```

---

## Modos de consulta

### 1. Estatísticas de Atividade (`atividade`)
Exibe a colocação do usuário no ranking de mensagens e interação do grupo:

```text
!rankinfo atividade @usuario
```
*(Aliases: `atividades`, `ativo`)*

**Exemplo de resposta do bot:**
```text
📊 ATIVIDADE DE Maria
🏆 Posição: #3
📈 Total: 450
📅 Hoje: 48
💬 Mensagens: 380
⚙️ Comandos: 40
🎨 Figurinhas: 20
📎 Arquivos: 10
```

---

### 2. Estatísticas de Nível e XP (`xp`)
Mostra a posição no ranking de experiência, nível alcançado e quanto falta para subir de nível:

```text
!rankinfo xp @usuario
```
*(Alias: `experiencia`)*

**Exemplo de resposta do bot:**
```text
⭐ XP DE João
🏆 Posição: #1
⭐ XP: 3450
🎚️ Nível: 8
📈 Próximo nível: 250 XP
```

---

### 3. Saldo e Posição na Economia (`rico`)
Informa a posição do usuário entre os mais ricos e o valor atual de sua carteira em satcoins:

```text
!rankinfo rico @usuario
```
*(Aliases: `riqueza`, `satcoins`, `dinheiro`)*

**Exemplo de resposta do bot:**
```text
💷 RIQUEZA DE Pedro
🏆 Posição: #5
💰 Saldo: 12.500,00 satcoins
```

---

## Resumo de comandos e aliases

| Consulta | Comando | Aliases do Tipo | Dados Retornados |
| --- | --- | --- | --- |
| **Atividade** | `!rankinfo atividade @membro` | `atividades`, `ativo` | Posição, total, hoje, mensagens, comandos, figurinhas e arquivos |
| **XP** | `!rankinfo xp @membro` | `experiencia` | Posição, XP total, nível atual e XP restante |
| **Riqueza** | `!rankinfo rico @membro` | `riqueza`, `satcoins`, `dinheiro` | Posição e saldo em satcoins |

**Aliases do comando:** `!consultarank`, `!rankusuario`, `!inforank`.

Para visualizar o pódio geral ou as listas completas de todos os membros, consulte o tutorial do comando [`!rank`](./rank.md).

---

## Solução de problemas comuns

### 1. "❌ Usuário não encontrado. Marque, responda à mensagem ou informe o ID."
Você executou o comando sem apontar o usuário. Mencione alguém com `@`, cite uma mensagem ou passe o ID.

### 2. "ℹ️ Esse usuário ainda não possui atividade/XP/saldo registrado."
O participante indicado ainda não enviou mensagens ou não participou da economia desde que o sistema foi ativado.

### 3. "ℹ️ O sistema de [XP/Atividade/Economia] está desativado neste grupo/servidor."
O recurso consultado está desligado pela moderação do grupo. Peça a um administrador para ativar o sistema correspondente.
