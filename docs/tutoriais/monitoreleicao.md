[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como monitorar parciais eleitorais com `!monitoreleicao`

O comando `!monitoreleicao` (também chamado `!monitoreleicoes` ou
`!monitoreleição`) agenda consultas automáticas de parciais eleitorais do
TSE, por cargo e localidade, com intervalo e atraso inicial configuráveis.
É possível cadastrar até **20 consultas** por chat.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e Super Usuários.
- **Onde funciona:** grupos de **WhatsApp**, **Discord**, **Telegram** e
  conversas privadas.

---

## Conceitos principais

| Conceito | Descrição |
| --- | --- |
| **Consulta (job)** | Uma parcial específica por cargo e localidade, com seu próprio intervalo e atraso inicial |
| **Intervalo** | Tempo entre cada envio automático (mínimo: 1 minuto) |
| **Atraso inicial (início)** | Tempo até o primeiro envio. `0m` dispara no próximo ciclo do agendador (até 30 segundos) |
| **ID** | Identificador único da consulta, usado para remover ou executar individualmente |

---

## Cargos disponíveis

| Cargo | Exemplo |
| --- | --- |
| `presidente` | `add presidente` |
| `governador` | `add governador uf MG` |
| `senador` | `add senador uf SP` |
| `deputado federal` | `add deputado federal uf SP busca PT` |
| `deputado estadual` | `add deputado estadual uf RJ busca 12345` |

> [!IMPORTANT]
> Para monitorar **deputados** (federal ou estadual), é obrigatório informar
> uma busca por nome, número ou partido com a opção `busca`.

---

## Passo a passo de configuração

### 1. Adicionar consultas

Cada `add` cria uma consulta independente com seus parâmetros:

```text
!monitoreleicao add presidente intervalo 5m inicio 0m
```

```text
!monitoreleicao add senador uf MG intervalo 10m inicio 30m
```

```text
!monitoreleicao add governador uf MG municipio Belo Horizonte intervalo 5m inicio 0m
```

```text
!monitoreleicao add deputado federal uf SP busca PT intervalo 15m inicio 0m
```

#### Opções disponíveis

| Opção | Descrição | Obrigatório |
| --- | --- | --- |
| `intervalo <duração>` | Tempo entre envios (ex: `5m`, `2h`, `1h30m`) | Não (padrão: 5m) |
| `inicio <duração>` | Atraso até o primeiro envio (ex: `0m`, `30m`) | Não (padrão: mesmo do intervalo) |
| `uf <sigla>` | Estado (sigla UF). Necessário para governador, senador e deputados | Depende do cargo |
| `municipio <nome>` | Município (requer UF) | Não |
| `busca <termo>` | Busca por nome, número ou partido | Obrigatório para deputados |

> [!NOTE]
> O intervalo mínimo entre consultas é **1 minuto**. O atraso inicial máximo
> é **30 dias**.

### 2. Ativar o monitor

```text
!monitoreleicao on
```

Para pausar sem remover as consultas:

```text
!monitoreleicao off
```

---

## Executar parciais agora (`!monitoreleicao run`)

Para enviar todas as parciais configuradas imediatamente:

```text
!monitoreleicao run
```

Para enviar apenas uma consulta específica (usando seu ID):

```text
!monitoreleicao run abc123
```

---

## Remover consultas (`!monitoreleicao remove`)

Para remover uma consulta específica pelo ID:

```text
!monitoreleicao remove abc123
```

Para remover **todas** as consultas:

```text
!monitoreleicao remove all
```

> [!TIP]
> Use `!monitoreleicao status` para ver os IDs das consultas cadastradas.

---

## Conferir o estado (`!monitoreleicao status`)

```text
!monitoreleicao status
```

O bot exibirá:

```text
🗳️ MONITOR ELEITORAL

Status: ✅ Ativo
Consultas: 2

1. Presidente — Nacional (ID: abc123)
   Início: 0m · repetição: a cada 5m
   Próximo envio: 21/10/2026 15:35:00

2. Senador — MG (ID: def456)
   Início: 30m · repetição: a cada 10m
   Próximo envio: 21/10/2026 16:05:00
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!monitoreleicao add <cargo> [opções]` | Adiciona uma consulta eleitoral |
| `!monitoreleicao on` | Ativa os envios de todas as consultas |
| `!monitoreleicao off` | Pausa os envios sem remover consultas |
| `!monitoreleicao status` | Exibe as consultas, IDs e próximos envios |
| `!monitoreleicao run [ID\|all]` | Envia uma ou todas as parciais agora |
| `!monitoreleicao remove <ID\|all>` | Remove uma ou todas as consultas |
| `!monitoreleicao help` | Exibe a ajuda detalhada no chat |

---

## Solução de problemas comuns

1. **"Informe um cargo":** o cargo é obrigatório. Use presidente, governador,
   senador, deputado federal ou deputado estadual.
2. **"Para monitorar deputados, informe uma busca":** ao adicionar deputado
   federal ou estadual, é necessário incluir `busca <termo>`.
3. **"O intervalo mínimo entre consultas é 1 minuto":** reduza o valor
   para no mínimo `1m`.
4. **"Este chat já possui 20 consultas configuradas":** remova consultas
   desnecessárias com `!monitoreleicao remove <ID>`.
5. **Parciais não são enviadas:**
   - Confirme que o monitor está ativo (`!monitoreleicao status`).
   - Verifique se há consultas cadastradas.
   - O TSE pode estar fora do período de apuração.
