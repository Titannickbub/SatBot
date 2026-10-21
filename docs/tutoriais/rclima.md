[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como enviar previsão aleatória do tempo com `!rclima`

O comando `!rclima` (também chamado `!randomclima` ou `!climarandom`) agenda
o envio diário da previsão do tempo de uma **cidade sorteada** entre as
cadastradas no chat. A cada horário configurado, o bot escolhe
aleatoriamente uma cidade da lista e envia a previsão.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e Super Usuários.
- **Onde funciona:** grupos de **WhatsApp**, **Discord** e **Telegram**.
  Não funciona em conversas privadas.

---

## Passo a passo de configuração

### 1. Adicionar cidades à lista

Adicione cada cidade separadamente:

```text
!rclima add Salvador
!rclima add São Paulo
!rclima add Belo Horizonte
```

> [!NOTE]
> Cidades repetidas não são duplicadas. A lista é exclusiva do chat onde o
> comando é executado.

#### Remover uma cidade

```text
!rclima remove Salvador
```

#### Limpar toda a lista

```text
!rclima clear
```

### 2. Definir os horários de envio

```text
!rclima times 08:00,18:00
```

Informe os horários no formato `HH:MM`, separados por vírgula. O horário
padrão é `08:00`. Cada nova configuração substitui os horários anteriores.

### 3. Ativar o monitor

```text
!rclima enable
```

A cada horário configurado, o bot sorteará uma cidade da lista e enviará a
previsão. Para pausar:

```text
!rclima disable
```

---

## Fazer um sorteio imediato (`!rclima run`)

Para sortear uma cidade e enviar a previsão agora, sem alterar a programação:

```text
!rclima run
```

É necessário ter pelo menos uma cidade cadastrada.

---

## Conferir o estado (`!rclima status`)

```text
!rclima status
```

O bot exibirá:

```text
📌 Monitor rclima:
• Cidades: Salvador, São Paulo, Belo Horizonte
• Ativo: ✅ Sim
• Horários: 08:00, 18:00
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!rclima add <cidade>` | Adiciona uma cidade à lista de sorteio |
| `!rclima remove <cidade>` | Remove uma cidade da lista |
| `!rclima clear` | Remove todas as cidades da lista |
| `!rclima times <HH:MM,...>` | Define os horários diários de envio |
| `!rclima enable` | Ativa os envios automáticos |
| `!rclima disable` | Pausa os envios sem apagar cidades ou horários |
| `!rclima run` | Sorteia uma cidade e envia a previsão agora |
| `!rclima status` | Exibe a lista, estado e horários |
| `!rclima help` | Exibe a ajuda detalhada no chat |

### Aliases

| Alias | Equivalente |
| --- | --- |
| `!randomclima` | `!rclima` |
| `!climarandom` | `!rclima` |
| `!rclima on` | `!rclima enable` |
| `!rclima off` | `!rclima disable` |

---

## Diferença entre `!monitorclima` e `!rclima`

| | `!monitorclima` | `!rclima` |
| --- | --- | --- |
| **Cidade** | Uma cidade fixa por chat | Lista de cidades; uma é **sorteada** a cada envio |
| **Quando usar** | Acompanhar uma cidade específica diariamente | Variedade — cada envio traz uma cidade diferente |

---

## Solução de problemas comuns

1. **"Este comando só pode ser usado em grupos":** o rclima não funciona em
   conversas privadas.
2. **"Nenhuma cidade cadastrada na lista":** adicione ao menos uma cidade
   com `!rclima add <cidade>` antes de ativar ou executar.
3. **A previsão não é enviada nos horários:**
   - Confirme que o monitor está ativado (`!rclima status`).
   - Verifique se há cidades na lista.
   - Verifique se os horários estão corretos.
4. **Cidade não reconhecida ao enviar a previsão:** tente usar o nome
   oficial da cidade ou teste antes com `!clima <cidade>`.
