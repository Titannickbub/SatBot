# VIP local e VIPG global

O SatBot mantém dois benefícios separados:

- **VIP local (`vip`)** vale apenas no grupo ou servidor atual. Pode liberar
  comandos VIP, ser comprado com SatCoins, ser solicitado por pedido manual e,
  no Discord, atribuir um cargo configurado.
- **VIPG (`vipg`)** pertence à Conta Central e controla somente o bypass do
  Anti-PV global. Ele não libera comandos VIP locais nem altera a economia de
  um grupo.

## Consulta e compra de VIP local

`!vip` mostra o status local e o status VIPG. Em um grupo com ofertas
cadastradas, o comando também lista como comprar ou solicitar:

```text
!vip
!vip comprar <ID da oferta>
!vip pedido <ID da oferta>
```

Uma compra desconta SatCoins da economia deste grupo. Um pedido manual fica
pendente até um administrador confirmar o pagamento e aprová-lo. Os pedidos
manuais não processam pagamentos automaticamente. Membros com VIP permanente
não podem comprar nem solicitar outra oferta; se um membro ficar permanente
enquanto já houver um pedido pendente, será necessário remover o VIP permanente
antes de aprovar esse pedido.

## Gerenciamento do VIP local

Administradores ou membros com permissão para gerenciar membros/cargos podem
usar os comandos abaixo no grupo/servidor:

```text
!set_vip <membro> 30d
!set_vip add <membro> 7d
!set_vip rem <membro> 2d
!set_vip <membro> permanente
!set_vip <membro> remover
!set_vip check [membro]
```

Sem ação explícita, ou usando `set`, a duração substitui o período anterior;
`add` soma tempo e `rem` desconta tempo restante. As compras, aprovações e
concessões pelo painel somam tempo ao VIP atual. No Discord, Gerenciar
Servidor ou Gerenciar Cargos permite administrar o VIP; no Telegram e no
WhatsApp, é necessário ser administrador do grupo.

### Ofertas

Cada oferta possui duração e preço próprios. `loja` usa SatCoins e `manual`
usa reais (preço informativo; pagamento é confirmado fora do bot):

```text
!set_vip loja listar
!set_vip loja add 30d 5000
!set_vip loja edit <ID> 60d 9000
!set_vip loja rem <ID>

!set_vip manual listar
!set_vip manual add 30d 10,00
!set_vip manual edit <ID> 90d 25,00
!set_vip manual rem <ID>
```

### Pedidos, comandos VIP e cargo

```text
!set_vip pedidos
!set_vip aprovar <ID do pedido>
!set_vip rejeitar <ID do pedido>

!set_vip comandos listar
!set_vip comandos add <comando>
!set_vip comandos rem <comando>

!set_vip cargo <ID ou menção do cargo>
!set_vip cargo off
```

Aprovar um pedido concede o período registrado nele. A lista de comandos é
local ao grupo/servidor. No Discord, o bot precisa de Gerenciar Cargos e seu
cargo mais alto deve ficar acima do cargo VIP.

O painel web oferece as mesmas configurações em **Gerenciar VIP local** no
painel do membro ou na bolha VIP local do painel administrativo. A API e o
formato do painel nativo estão documentados em
[`../apis-dashboard.txt`](../apis-dashboard.txt).

## Gerenciamento de VIPG global

Somente Super Usuários podem alterar o VIPG. Os comandos ficam na categoria
`system/vip`:

```text
!set_vipg check <usuário ou ID Central>
!set_vipg set <usuário> 30d
!set_vipg add <usuário> 15d
!set_vipg rem <usuário> 5d
!set_vipg perm <usuário>
!set_vipg date <usuário> 31/12/2026 [23:59]
!set_vipg reset <usuário>
!set_vipg pv on <plataforma>
!set_vipg pv off <plataforma>
```

`!set_vipg` não configura comandos locais. `!vip` é o comando de consulta
comum e exibe os dois estados separadamente.
