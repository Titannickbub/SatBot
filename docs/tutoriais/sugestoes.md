# Sugestões, bugs e reports

Os comandos `!bug`, `!sugestao` e `!report` são aliases para o mesmo comando. Qualquer membro pode enviar texto, uma foto com o comando na legenda ou responder a uma foto com o comando:

```text
!bug O comando X não está funcionando.
!sugestao Adicione uma opção para consultar o status.
```

O bot registra um ID sequencial iniciado em `0`, a plataforma, nome/username/ID do autor, chat/tópico de origem, data e hora, texto e imagem (quando enviada). Se um canal de encaminhamento estiver configurado, o registro também é enviado para esse chat ou tópico.

O recebimento começa **desativado**. Um superusuário precisa ativá-lo com `!bugssu ativar`; use `!bugssu desativar` para pausar novos envios. A página Sugestões do painel SU também controla essa opção.

## Administração pelo comando SU

Use `!bugssu` (também `!sugestoessu` ou `!reportsu`) como superusuário:

```text
!bugssu
!bugssu listar [página]
!bugssu status
!bugssu ativar
!bugssu desativar
!bugssu canal
!bugssu canal off
!bugssu aceitar <ID>
!bugssu agradecer <ID>
!bugssu recusar <ID>
!bugssu deletar <ID>
```

`canal` configura o chat ou tópico atual para receber os próximos registros naquela plataforma; `canal off` remove o destino. No WhatsApp, as ações são feitas por esses comandos. No Telegram e no Discord, a listagem também apresenta botões para aceitar, agradecer, recusar ou apagar.

Sem argumentos, `!bugssu` abre o menu de administração: no Telegram e no Discord ele inclui botões para ver sugestões, ativar/desativar o recebimento e configurar/remover o canal da plataforma atual. No WhatsApp, o menu mostra os comandos equivalentes.

Aceitar, agradecer ou recusar envia uma resposta mencionando o autor no chat original. Deletar apaga o registro e a imagem armazenada, sem enviar mensagem ao autor.

## Painel de superusuário

A página **Sugestões** do painel SU lista os registros de todas as plataformas, mostra os dados do autor e do chat, exibe as imagens e oferece os mesmos botões de moderação. Nela também é possível ativar/desativar o recebimento e configurar o canal de encaminhamento da plataforma selecionada.
