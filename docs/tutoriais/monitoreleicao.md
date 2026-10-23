[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como monitorar parciais eleitorais com `!monitoreleicao`

O comando `!monitoreleicao` (também chamado `!monitoreleicoes` ou
`!monitoreleição`) agenda consultas automáticas de parciais eleitorais do
2º turno do TSE (cargo de **Presidente**), por localidade (Brasil, estado ou município),
com intervalo e atraso inicial configuráveis.
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
| **Consulta (job)** | Uma parcial específica de Presidente (nacional, por estado ou município), com seu próprio intervalo e atraso inicial |
| **Intervalo** | Tempo entre cada envio automático (mínimo: 1 minuto) |
| **Atraso inicial (início)** | Tempo até o primeiro envio. `0m` dispara no próximo ciclo do agendador (até 30 segundos) |
| **ID** | Identificador único da consulta, usado para remover ou executar individualmente |

---

## Cargo no 2º Turno

No 2º turno das eleições, está disponível o cargo de **Presidente**.

| Cargo | Exemplo |
| --- | --- |
| `presidente` | `add intervalo 5m inicio 0m` (ou `add presidente`) |
| Presidente por Estado | `add uf MG intervalo 10m inicio 30m` |
| Presidente por Município | `add uf MG municipio Belo Horizonte intervalo 5m inicio 0m` |

> [!NOTE]
> Para consultar os resultados consolidados do **1º turno** (Presidente, Governador, Senador e Deputados), utilize o comando `!eleicao1`.

---

## Passo a passo de configuração

### 1. Adicionar consultas

Cada `add` cria uma consulta independente com seus parâmetros de repetição:

```text
!monitoreleicao add intervalo 5m inicio 0m
```

```text
!monitoreleicao add uf MG intervalo 10m inicio 30m
```

```text
!monitoreleicao add uf SP municipio Campinas intervalo 5m inicio 0m
```

#### Opções disponíveis

| Opção | Descrição | Obrigatório |
| --- | --- | --- |
| `intervalo <duração>` | Tempo entre envios (ex: `5m`, `2h`, `1h30m`) | Não (padrão: 5m) |
| `inicio <duração>` | Atraso até o primeiro envio (ex: `0m`, `30m`) | Não (padrão: mesmo do intervalo) |
| `uf <sigla>` | Estado (sigla UF) para parcial estadual do Presidente | Não |
| `municipio <nome>` | Município (requer UF) para parcial municipal do Presidente | Não |

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
🗳️ MONITOR ELEITORAL (2º TURNO — PRESIDENTE)

Status: ✅ Ativo
Consultas: 2

1. Presidente — Brasil (ID: abc123)
   Início: 0m · repetição: a cada 5m
   Próximo envio: 25/10/2026 17:05:00

2. Presidente — MG (ID: def456)
   Início: 30m · repetição: a cada 10m
   Próximo envio: 25/10/2026 17:35:00
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!monitoreleicao add [opções]` | Adiciona uma consulta eleitoral do 2º turno |
| `!monitoreleicao on` | Ativa os envios de todas as consultas |
| `!monitoreleicao off` | Pausa os envios sem remover consultas |
| `!monitoreleicao status` | Exibe as consultas, IDs e próximos envios |
| `!monitoreleicao run [ID\|all]` | Envia uma ou todas as parciais agora |
| `!monitoreleicao remove <ID\|all>` | Remove uma ou todas as consultas |
| `!monitoreleicao help` | Exibe a ajuda detalhada no chat |

---

## Comandos de consulta direta

- `!eleicao` — Consulta direta da apuração oficial do **2º turno** (Presidente).
- `!eleicao1` — Consulta direta dos resultados do **1º turno** (Presidente, Governador, Senador, Deputados).

---

## Solução de problemas comuns

1. **"No 2º turno está disponível apenas o cargo de Presidente":** no segundo turno, os outros cargos já foram decididos. Use `!eleicao1` para ver o 1º turno.
2. **"O intervalo mínimo entre consultas é 1 minuto":** reduza o valor para no mínimo `1m`.
3. **"Este chat já possui 20 consultas configuradas":** remova consultas desnecessárias com `!monitoreleicao remove <ID>`.
4. **Parciais não são enviadas:**
   - Confirme que o monitor está ativo (`!monitoreleicao status`).
   - Verifique se há consultas cadastradas.
   - O TSE pode estar fora do período de apuração ou sem novas atualizações.
