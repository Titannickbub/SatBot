[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como ativar, desativar e verificar a economia com `!economia`

O comando `!economia` (também acessível por `!configeconomia` ou `!economy`) permite que administradores controlem o sistema financeiro de satcoins no grupo ou servidor.

Com a economia ativada, os membros podem trabalhar, pescar, minerar, apostar no cassino, comprar itens em lojas e transferir moedas. Ao desativar a economia, todas as atividades financeiras são temporariamente suspensas, **preservando integralmente os saldos** de todos os membros.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (WhatsApp, Telegram e Discord).
- **Mensagens privadas (PV):** **não suportado** (a economia possui configurações e saldos locais por grupo/servidor).

---

## Subcomandos e modos de uso

### 1. Ativar a economia
Habilita todas as funcionalidades de economia no grupo ou servidor:

```text
!economia ativar
```
*(ou `!economia on`, `!economia enable`)*

**O que acontece quando ativada:**
- Membros podem consultar saldos (`!carteira`), trabalhar (`!trabalhar`), pescar (`!pescar`), minerar (`!minerar`), apostar (`!cassino`), transferir (`!transferir`) e usar as lojas do chat (`!loja`, `!loja2`).

---

### 2. Desativar a economia
Pausa o módulo financeiro no chat sem apagar o histórico nem os saldos existentes:

```text
!economia desativar
```
*(ou `!economia off`, `!economia disable`)*

> [!NOTE]
> Desativar a economia **não apaga** as moedas de ninguém. Os saldos e inventários permanecem salvos no banco de dados e voltam a ficar disponíveis assim que a economia for reativada.

---

### 3. Consultar o estado atual (`status`)
Verifica se o sistema financeiro está ativo ou inativo no grupo:

```text
!economia status
```
*(ou apenas `!economia`)*

O bot responderá informando o status: `💰 Economia: ativada` ou `💰 Economia: desativada`.

---

### 4. Consultar o manual rápido (`help`)
Exibe as instruções de uso e opções disponíveis diretamente no chat:

```text
!economia help
```
*(ou `!economia ajuda`)*

---

## Resumo de comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!economia ativar` | `!economia on`, `!economia enable` | Ativa o sistema financeiro de satcoins no chat |
| `!economia desativar` | `!economia off`, `!economia disable` | Pausa a economia preservando os saldos |
| `!economia status` | `!economia` | Consulta se a economia está ligada ou desligada |
| `!economia help` | `!economia ajuda` | Exibe o menu de ajuda no chat |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem configurar a economia."
Apenas membros com cargo administrativo ou superusuários do bot podem ligar ou desligar a economia no grupo.

### 2. "❌ A economia só pode ser configurada em grupos ou servidores."
O comando foi enviado no privado (PV). Execute-o dentro do grupo ou servidor desejado.

### 3. Os membros tentam usar comandos de economia e recebem aviso de economia desativada
Execute `!economia ativar` no grupo para liberar o uso dos comandos econômicos.
