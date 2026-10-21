[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como agendar previsão do tempo com `!monitorclima`

O comando `!monitorclima` agenda o envio diário da previsão do tempo para
uma cidade no chat ou tópico atual.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e Super Usuários.
- **Onde funciona:** grupos de **WhatsApp**, **Discord**, **Telegram** e
  conversas privadas.

---

## Passo a passo de configuração

### 1. Escolher a cidade

```text
!monitorclima set São Paulo
```

O nome pode conter espaços. Se quiser verificar se o bot reconhece a cidade,
consulte antes com:

```text
!clima São Paulo
```

### 2. Definir os horários de envio

```text
!monitorclima times 08:00,18:00
```

Informe os horários no formato de 24 horas `HH:MM`, separados por vírgula.
O horário padrão é `08:00`.

### 3. Ativar o monitor

```text
!monitorclima enable
```

A previsão será enviada diariamente nos horários configurados. Para pausar:

```text
!monitorclima disable
```

---

## Consultar a previsão imediatamente (`!monitorclima run`)

Para enviar uma previsão de teste para a cidade configurada:

```text
!monitorclima run
```

A programação automática não é alterada.

---

## Conferir o estado (`!monitorclima status`)

```text
!monitorclima status
```

O bot exibirá:

```text
📌 Monitor de clima:
Cidade: São Paulo
Ativo: Sim
Horários: 08:00, 18:00
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!monitorclima set <cidade>` | Define a cidade para a previsão |
| `!monitorclima times <HH:MM,...>` | Define os horários diários de envio |
| `!monitorclima enable` | Ativa os envios automáticos |
| `!monitorclima disable` | Pausa os envios sem apagar as configurações |
| `!monitorclima run` | Envia a previsão imediatamente (teste) |
| `!monitorclima status` | Exibe o estado e configurações atuais |
| `!monitorclima help` | Exibe a ajuda detalhada no chat |

### Aliases para ativar/desativar

| Alias | Equivalente |
| --- | --- |
| `!monitorclima on` | `!monitorclima enable` |
| `!monitorclima off` | `!monitorclima disable` |
| `!monitorclima ativar` | `!monitorclima enable` |
| `!monitorclima desativar` | `!monitorclima disable` |

---

## Solução de problemas comuns

1. **"Nenhuma cidade configurada para este chat":** defina uma cidade com
   `!monitorclima set <cidade>` antes de ativar ou executar o monitor.
2. **A previsão não é enviada nos horários:**
   - Confirme que o monitor está ativado (`!monitorclima status`).
   - Verifique se os horários estão corretos.
3. **Cidade não encontrada:** tente usar o nome oficial da cidade ou
   consulte antes com `!clima <cidade>` para confirmar.
