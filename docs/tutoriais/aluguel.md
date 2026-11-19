# 💠 Fluxo de aluguel e pagamento Pix

Os comandos abaixo funcionam por texto no **WhatsApp, Telegram e Discord**.
Substitua `!` pelo prefixo configurado no bot.

Para abrir os guias rápidos:

```text
!alugar help
!alugar_su help
```

O comando administrativo também continua disponível como `!alugarsu`.

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
incluem botões; no Discord, o resumo é apresentado em embed; no WhatsApp, o
fluxo é por texto. O resumo e a chave Pix são enviados em mensagens separadas
para facilitar a cópia. Ao adicionar o bot a um servidor Discord, a pessoa
responsável pela adição também recebe no privado um embed com os planos e as
instruções.
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

O pagamento precisa ser confirmado em até 24 horas após o envio da chave. Em
pagamentos manuais, o botão ou comando **Já paguei** avisa o SU e não substitui
a conferência do comprovante. Em Pix automático, ele também solicita uma
verificação imediata ao Mercado Pago.

## Pix automático com Mercado Pago

O modo automático gera o Pix ao criar o pedido e consulta o Mercado Pago a cada
minuto para confirmar o pagamento. Quando o cliente clica em **Já paguei** ou usa
o comando correspondente, o bot também consulta a cobrança imediatamente. Não é
necessário configurar domínio público, HTTPS ou webhook. Se o pagamento ainda
estiver pendente, o SU é avisado e as verificações automáticas continuam.
O resumo do pagamento, o código Pix copia e cola e a imagem do QR Code são
enviados separadamente para facilitar o pagamento em qualquer plataforma.

Antes de solicitar um pedido com o modo automático ativo, o cliente cadastra seu
e-mail na Conta Central pelo privado do bot:

```text
!alugar email <seu-e-mail>
```

Para consultar o e-mail mascarado ou removê-lo:

```text
!alugar email
```

```text
!alugar email remover
```

O e-mail fica somente na Conta Central e não é copiado para os pedidos. Se não
houver e-mail cadastrado, o bot orienta o cliente antes de criar o pedido.

O SU configura o token de acesso pelo privado do bot:

```text
!alugarsu mercadopago token <token-de-acesso>
```

Confira o estado e ative/desative a automação com:

```text
!alugarsu mercadopago status
```

```text
!alugarsu mercadopago automatico <on|off>
```

As mesmas opções estão disponíveis na aba **Mercado Pago** do painel SU. O token
salvo não é exibido novamente. O Pix manual continua disponível com
`!alugarsu pix`; a confirmação manual também continua disponível. Se o Pix
automático não puder ser entregue, o SU pode reenviar os destinos pendentes:

```text
!alugarsu mercadopago reenviar <ID-do-pedido>
```

O SU também pode enviar uma chave manual como alternativa ao Pix automático e
confirmar manualmente um recebimento após verificá-lo. Ao cancelar ou recusar
um pedido com cobrança automática pendente, o bot primeiro solicita o
cancelamento no Mercado Pago. Se o pagamento já tiver sido aprovado, ele não
cancela o pedido e orienta o SU a verificar a transação.

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
