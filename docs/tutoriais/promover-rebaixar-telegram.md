[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como promover e rebaixar administradores no Telegram com `!tpromote` e `!trebaixar`

Os comandos `!tpromote` e `!trebaixar` fornecem controle avançado sobre a equipe administrativa em grupos e supergrupos do Telegram.

Diferente de plataformas com permissões simples, o Telegram permite granularidade de acessos. O Sat Bot organiza esses acessos em **4 níveis hierárquicos predefinidos** (`staff`, `mod`, `gerente` e `adm`), facilitando a delegação segura de funções para cada membro da moderação.

- **`!tpromote`:** promove um participante atribuindo um nível de permissões administrativas específicas.
- **`!trebaixar`:** revoga todas as permissões de administrador e retorna o participante à condição de **membro comum**.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e requisitos no Telegram

- **Compatibilidade:** exclusivo para grupos e supergrupos do **Telegram**.
- **Permissão do usuário executor:** você precisa ser administrador no Telegram com a permissão específica de **Adicionar Novos Administradores**.
- **Permissão do bot:** o Sat Bot precisa ser administrador com a permissão de **Adicionar Novos Administradores**.
- **Restrições:** o criador/dono original do grupo e o próprio bot não podem ser rebaixados.

---

## Os 4 níveis de promoção (`!tpromote`)

Ao promover alguém com `!tpromote`, você escolhe um dos quatro níveis de acesso:

| Nível | Permissões Concedidas |
| --- | --- |
| **`staff`** | • Apagar mensagens enviadas por outros membros<br>• Restringir e silenciar (*mutar*) participantes |
| **`mod`** | • Todas as permissões de **staff**<br>• Expulsar e banir membros<br>• Gerenciar links de convite<br>• Alterar informações do chat (título, foto, descrição)<br>• Gerenciar chats de vídeo e chamadas |
| **`gerente`** | • Permissões administrativas gerais do grupo<br>• *Não pode promover outros administradores e não tem modo anônimo* |
| **`adm`** | • Acesso administrativo quase total<br>• **Pode adicionar e promover outros administradores**<br>• *Modo anônimo permanece desabilitado por segurança* |

---

## 1. Como promover no Telegram (`!tpromote`)

Você pode promover informando o **nível desejado** e o **ID do usuário**, ou citando diretamente uma mensagem dele no grupo:

### Sintaxe
```text
!tpromote <nível> <ID>
!tpromote <nível> (respondendo à mensagem)
```

### Exemplos práticos:
- Promover respondendo à mensagem do membro no grupo:
  1. Clique em responder à mensagem do participante.
  2. Envie:
     ```text
     !tpromote staff
     ```
- Promover para moderador informando o ID numérico do Telegram:
  ```text
  !tpromote mod 123456789
  ```
- Promover para gerente ou administrador:
  ```text
  !tpromote gerente 123456789
  !tpromote adm 123456789
  ```

---

## 2. Como rebaixar para membro comum (`!trebaixar`)

Remove todos os privilégios administrativos do usuário no grupo do Telegram:

### Sintaxe
```text
!trebaixar <ID>
!trebaixar (respondendo à mensagem)
```

### Exemplos práticos:
- Rebaixar respondendo à mensagem do administrador:
  1. Responda a qualquer mensagem enviada por ele no chat.
  2. Envie:
     ```text
     !trebaixar
     ```
- Rebaixar informando o ID numérico:
  ```text
  !trebaixar 123456789
  ```

---

## Resumo dos comandos

| Comando | Níveis / Parâmetros | Descrição |
| --- | --- | --- |
| `!tpromote` | `staff`, `mod`, `gerente`, `adm` | Promove o membro no Telegram com o nível de permissões escolhido |
| `!trebaixar` | `<ID>` ou resposta à mensagem | Revoga todas as permissões e volta para membro comum |

---

## Solução de problemas comuns

### 1. "❌ O bot precisa ser administrador com permissão para adicionar administradores."
Acesse as configurações do grupo no Telegram, abra a lista de administradores, selecione o Sat Bot e ative a permissão **Adicionar Novos Administradores**.

### 2. "❌ Você precisa ser administrador com permissão para promover membros."
O Telegram só permite que administradores promovam pessoas se eles próprios possuírem a permissão de adicionar novos administradores habilitada pelo dono do grupo.

### 3. "❌ O criador do grupo e o próprio bot não podem ser rebaixados."
A API do Telegram proíbe qualquer alteração de permissão ou rebaixamento do criador original do grupo.

### 4. "Como descobrir o ID do usuário no Telegram?"
Se não souber o ID numérico, basta **responder diretamente a qualquer mensagem** enviada pelo usuário no grupo com `!tpromote <nível>` ou `!trebaixar`.
