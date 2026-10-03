# Sat Bot — Changelog Versão 3.0

## 💰 Padronização das respostas de economia

- `!minerar`, `!pescar`, `!trabalhar` e `!cassino` agora exibem respostas mais
  claras no Telegram e WhatsApp, com emojis identificando os campos e sem
  mostrar o ID do usuário.
- Perdas de saldo são identificadas com ❌; ganhos e saldos atuais também
  recebem indicadores visuais.
- Quando as tentativas diárias de mineração, pesca, trabalho ou cassino acabam,
  a resposta informa que é possível comprar um reset na loja ou aguardar a
  próxima virada do dia, mostrando a contagem regressiva.
- `!resgatar` mantém sua resposta existente, mas não exibe mais o ID do usuário.

## 🎰 Ajustes no cassino

- A roleta usa uma linha compacta para exibir as três frutas.
- Foram removidas as bordas superior e inferior da roleta.
- As respostas do cassino identificam aposta, prêmio, lucro ou perda, saldo e
  jogadas restantes com emojis.

## 📖 Descrições e ajuda dos comandos

- Comandos que não tinham descrição, como `!lembrete`, agora exibem objetivo,
  sintaxe e exemplos de uso.
- As descrições genéricas de moderação, configurações, contas, rankings,
  economia, diversão e ferramentas administrativas foram detalhadas para
  explicar a finalidade e os parâmetros principais.
- `!info <comando>` agora mostra a descrição, a sintaxe e os exemplos mesmo
  quando o comando também possui uma seção de ajuda detalhada.

## 📊 Lista de atividade do WhatsApp

- `!rankativos list` lista todos os membros do grupo em ordem decrescente de
  atividade, incluindo `0` para quem ainda não tem registro, sem criar entradas
  novas no arquivo de atividade.
- Cada participante é mencionado diretamente na lista do WhatsApp.
- A lista também mostra o total de mensagens, comandos, figurinhas e arquivos
  enviados por cada membro, facilitando identificar atividade concentrada em
  comandos.

## 🌐 Protocolo dos links do painel web

- `!set_dominio` agora aceita escolher `http` ou `https` ao configurar o
  domínio. O padrão é `http`, corrigindo os links dos rankings e perfis quando
  o painel não usa TLS.
- Para usar `https`, é necessário configurar TLS por meio de um proxy reverso;
  o painel continua atendendo HTTP internamente.

## 🛒 Loja de economia

- A loja agora apresenta os itens com emojis, preços, instruções e regras em
  formatos adequados ao embed do Discord e às mensagens do Telegram e WhatsApp.
- A compra pode ser feita pela posição ou pelo nome completo mostrado na loja;
  nomes com espaços agora são aceitos pelo comando `!comprar`.
