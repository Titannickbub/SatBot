[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como usar o modo AFK

O modo AFK informa que você está ausente. Quando alguém mencionar você ou
responder a uma mensagem sua, o bot avisa que você está AFK e mostra o motivo
que informou.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Ativar

Informe o motivo da ausência depois do comando:

```text
!afk estou trabalhando
!afk volto às 19h
```

O motivo é obrigatório. A mensagem pode explicar por que você está ausente ou
quando pretende voltar.

## Quem pode ativar e onde

- **Administrador do grupo:** pode ativar o AFK somente no grupo atual. O
  comando precisa ser enviado em um grupo.
- **Super Usuário:** ativa o AFK global, inclusive fora de um grupo. O estado
  global vale nas plataformas vinculadas à mesma Conta Central.

O AFK de administrador é específico ao grupo e à plataforma onde foi ativado;
ele não se estende aos outros grupos. Já o AFK global é compartilhado nas
plataformas conectadas à Conta Central do Super Usuário.

## Avisos e retorno

O bot avisa sobre o AFK quando alguém mencionar a pessoa ou responder a uma
mensagem dela. O aviso inclui o nome e o motivo da ausência. O AFK global pode
ser identificado nas plataformas vinculadas; o AFK de grupo só é avisado no
grupo onde foi ativado.

O modo é desativado automaticamente quando você voltar a enviar uma mensagem:

- No AFK de grupo, uma mensagem sua no mesmo grupo encerra a ausência daquele
  grupo.
- No AFK global, uma mensagem sua em uma plataforma vinculada encerra o estado
  global.

Para cancelar, basta enviar uma mensagem no escopo correspondente. Não é
necessário repetir `!afk`.

