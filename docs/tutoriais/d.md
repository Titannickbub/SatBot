[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como apagar uma mensagem com `!d`

O comando `!d` apaga uma mensagem específica no chat atual. Para escolher a
mensagem, responda a ela com o comando:

```text
!d
```

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Passo a passo

1. Use a função de responder/citar na mensagem que deseja apagar.
2. Envie `!d` como resposta a essa mensagem.
3. O bot tenta apagar a mensagem citada e, em seguida, também tenta apagar a
   mensagem `!d` usada para executar o comando.

Se você enviar `!d` sem responder a uma mensagem, o bot pedirá que escolha
uma mensagem respondendo a ela. Não é necessário informar o nome da pessoa,
ID da mensagem ou canal.

## Permissões

Você precisa ter permissão para gerenciar mensagens no chat, e o bot também
precisa dessa permissão. Se uma das permissões estiver faltando ou a
plataforma não permitir apagar a mensagem, a exclusão pode falhar.

O comando apaga somente a mensagem citada e tenta remover a própria mensagem
do comando; ele não limpa outras mensagens do chat. Para apagar várias
mensagens no Discord, consulte o tutorial do [`!clear`](./clear.md).

