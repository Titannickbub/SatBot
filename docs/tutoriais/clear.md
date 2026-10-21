[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como limpar mensagens com `!clear`

O comando `!clear` apaga mensagens recentes no Discord. Você pode limpar o
canal atual, canais específicos ou todos os canais de texto do servidor.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e limites

Use o comando em um canal de servidor no Discord. Ele não está disponível no
WhatsApp nem no Telegram.

Você e o bot precisam ter permissão para gerenciar mensagens no canal atual.
Ao limpar outros canais, o bot verifica também as permissões nesses canais;
canais em que as permissões necessárias não estejam disponíveis não serão
limpos.

Cada execução apaga no máximo 20 mensagens por canal. Informe um número de
`1` a `20`; se não informar a quantidade em um modo com escopo, o padrão é
10. O comando usado para iniciar a limpeza não é apagado. Somente mensagens
com até 2 dias de idade são consideradas.

## Limpar o canal atual

Informe a quantidade de mensagens:

```text
!clear 10
```

O bot tenta apagar até 10 mensagens recentes do canal onde o comando foi
enviado.

## Limpar canais específicos

Mencione um ou mais canais de texto do servidor. A quantidade vale para cada
canal mencionado:

```text
!clear 10 #geral #midia
```

Neste exemplo, o bot tenta apagar até 10 mensagens em `#geral` e até 10 em
`#midia`. Canais não mencionados não são afetados.

## Limpar todos os canais

Use `all` para aplicar a quantidade em todos os canais de texto do servidor
que o bot puder gerenciar:

```text
!clear 10 all
```

Para excluir canais específicos da operação, mencione-os com `!` antes da
menção:

```text
!clear 10 all !#adms !#geral
```

Com essa forma, o bot tenta limpar os demais canais elegíveis, exceto
`#adms` e `#geral`.

## Cuidados

A exclusão de mensagens é uma ação que não pode ser desfeita pelo comando.
Confira a quantidade e os canais antes de executar. O limite por canal é
aplicado separadamente em cada canal, não ao total do servidor.

Você pode consultar os exemplos diretamente no Discord com:

```text
!clear ajuda
```

