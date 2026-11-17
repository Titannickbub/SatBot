# 💠 Fluxo de aluguel e pagamento Pix

Os comandos abaixo funcionam por texto no **WhatsApp, Telegram e Discord**.
Substitua `!` pelo prefixo configurado no bot.

## Etapa 1: consultar os planos

No grupo ou servidor, um administrador consulta os planos disponíveis com:

```text
!alugar
```

No Telegram e no Discord, também é possível escolher um plano pelo botão.

## Etapa 2: criar o pedido

Depois de consultar os planos, informe o ID exibido na lista:

```text
!alugar contratar <ID-do-plano>
```

Ao escolher um plano pelo botão, o bot pede uma confirmação antes de criar o
pedido. Se usar o comando de texto, o pedido é criado diretamente. Em ambos os
casos, aguarde o SU enviar a chave Pix; ainda não é necessário informar
pagamento.

Para consultar a assinatura atual:

```text
!alugar status
```

Para renovar, consulte os planos de renovação e escolha um:

```text
!alugar renovar
```

No Telegram e no Discord também é possível escolher o plano pelos botões. No
WhatsApp, use os comandos de texto.

Cada grupo/servidor pode ter **somente um pedido de aluguel aberto por vez**,
seja contratação ou renovação. Se já houver um, o bot mostra seu plano, valor,
estado e prazo em vez de criar outro. Informar que pagou não libera um novo
pedido: aguarde o SU confirmar ou recusar, ou cancele o pedido. A regra vale
igualmente para pedidos iniciados por botão.

## Enviar a chave Pix (SU)

O superusuário consulta os pedidos e envia a chave Pix pelo privado do bot:

```text
!alugarsu pedidos
```

Depois, envia a chave referente ao pedido:

```text
!alugarsu pix <ID-do-pedido> <chave-Pix>
```

O bot publica os dados do Pix no grupo/servidor, marcando quem solicitou, e
também os envia no privado da pessoa. No Telegram e no Discord, as mensagens
incluem botões; no WhatsApp, o fluxo é por texto.
Se uma das entregas falhar, o pedido informa qual destino ficou pendente; o SU
pode repetir o mesmo comando `pix` para tentar somente o envio que faltou. No
Telegram, a pessoa precisa iniciar uma conversa privada com o bot para que ele
possa enviar mensagens diretas.

## Informar pagamento ou cancelar

Sem ID, `status` consulta o pedido aberto no grupo/servidor ou mostra a assinatura
ativa. `paguei` e `cancelar` também localizam o único pedido aberto nesse
grupo/servidor. No privado, use um ID se houver mais de um pedido associado à
sua conta.

Somente depois que o SU enviar a chave Pix e o solicitante efetuar o pagamento,
ele pode usar o botão **Já paguei** ou o comando:

```text
!alugar paguei [ID-do-pedido]
```

Isso apenas avisa o SU; **não aprova o pedido nem ativa a assinatura**. Para
cancelar, use o botão correspondente ou:

```text
!alugar cancelar [ID-do-pedido]
```

O solicitante também pode consultar o pedido:

```text
!alugar status [ID-do-pedido]
```

## Confirmar o pagamento (SU)

Após conferir o recebimento do Pix, o SU ativa a assinatura com:

```text
!alugarsu pago <ID-do-pedido>
```

Para recusar um pedido ou pagamento:

```text
!alugarsu recusar <ID-do-pedido>
```

O pagamento precisa ser confirmado em até 24 horas após o envio da chave. O
botão ou comando **Já paguei** não substitui a conferência manual do SU.

### Referência rápida do SU

Cada comando abaixo é independente; use o que corresponde à operação desejada:

```text
!alugarsu modo <on|off>
```

```text
!alugarsu plano listar
```

```text
!alugarsu plano criar <nome> <preço> <duração>
```

```text
!alugarsu pedidos
```

```text
!alugarsu pix <ID-do-pedido> <chave-Pix>
```

```text
!alugarsu pago <ID-do-pedido>
```

```text
!alugarsu recusar <ID-do-pedido>
```

```text
!alugarsu assinaturas
```
