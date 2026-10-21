[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como monitorar cotações da bolsa com `!monitorbolsa`

O comando `!monitorbolsa` (também chamado `!bolsamonitor`) agenda o envio
automático de cotações de índices financeiros e do dólar no chat. Os dados
são obtidos do Yahoo Finance (índices) e da AwesomeAPI (dólar comercial).

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat, Super Usuários e qualquer
  pessoa em conversas privadas.
- **Onde funciona:** grupos de **WhatsApp**, **Discord**, **Telegram** e
  conversas privadas.

---

## Passo a passo de configuração

### 1. Escolher quais ativos acompanhar

```text
!monitorbolsa set ibovespa,nasdaq,dolar
```

#### Ativos disponíveis

| Nome | Ativo |
| --- | --- |
| `ibovespa` | Ibovespa |
| `sp500` | S&P 500 |
| `nasdaq` | Nasdaq |
| `cafe` | Café Arábica |
| `dolar` | Dólar comercial (compra e venda) |

Informe um ou mais nomes separados por vírgula. Uma nova seleção **substitui**
a anterior.

### 2. Definir os horários de envio

```text
!monitorbolsa times 09:00,15:30
```

Use o formato de 24 horas `HH:MM`. Separe vários horários por vírgula. O
horário padrão é `09:00`.

### 3. Ativar o monitor

```text
!monitorbolsa on
```

O relatório será enviado diariamente nos horários configurados. Para pausar:

```text
!monitorbolsa off
```

---

## Consultar cotações imediatamente (`!monitorbolsa run`)

Para buscar e exibir as cotações agora, sem alterar a programação:

```text
!monitorbolsa run
```

---

## Conferir o estado (`!monitorbolsa status`)

```text
!monitorbolsa status
```

O bot exibirá:

```text
📈 Monitor da Bolsa

Status: ✅ Ativo
Ativos: ibovespa, nasdaq, dolar
Horários: 09:00, 15:30
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!monitorbolsa set <ativos>` | Define os ativos a acompanhar (separados por vírgula) |
| `!monitorbolsa times <HH:MM,...>` | Define os horários diários de envio |
| `!monitorbolsa on` | Ativa os envios automáticos |
| `!monitorbolsa off` | Pausa os envios sem apagar as configurações |
| `!monitorbolsa run` | Busca e exibe as cotações imediatamente |
| `!monitorbolsa status` | Exibe o estado e configurações atuais |
| `!monitorbolsa help` | Exibe a ajuda detalhada no chat |

---

## Solução de problemas comuns

1. **"Não foi possível consultar as cotações agora":** pode ser uma
   instabilidade temporária nas APIs do Yahoo Finance ou AwesomeAPI. Tente
   novamente em alguns minutos.
2. **O relatório não é enviado nos horários configurados:**
   - Confirme que o monitor está ativado (`!monitorbolsa status`).
   - Verifique se os horários estão no formato correto (`HH:MM`).
3. **Ativos inválidos:** certifique-se de usar exatamente os nomes listados
   (ibovespa, sp500, nasdaq, cafe, dolar).
