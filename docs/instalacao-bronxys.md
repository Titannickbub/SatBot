# Instalação na Bronxys

Na Bronxys, use a opção de bot SatBot no painel. O painel baixa a versão mais
recente e inicia o bot; não é necessário seguir o procedimento manual de envio
de ZIP do [guia genérico para VPS](./instalacao-vps.md).

## Criar e configurar o servidor

1. No painel da Bronxys, clique em **Novo servidor**.
2. Selecione **Bots diversos** e depois **WhatsApp**.
3. Escolha um plano e clique em **Criar servidor**.
4. Aguarde alguns segundos. Se a página não atualizar sozinha, atualize-a
   manualmente. Se o servidor ainda não aparecer, aguarde cerca de um minuto e
   atualize a página novamente.
5. Quando o servidor estiver criado, clique em **Configurar servidor**.
6. Na opção **Selecione um bot**, escolha **SatBot**.
7. Abra o **Console** e clique em **Iniciar**. A Bronxys baixará a versão mais
   recente e iniciará o fluxo de login.

Para conectar WhatsApp, Telegram ou Discord e registrar o primeiro Super
Usuário (dono), siga o [guia de login](./como-logar.md).

## Ativar a API gratuita para downloads

O SatBot já inclui uma API key gratuita para downloads quando está hospedado na
Bronxys. Ela é configurada automaticamente ao iniciar, então normalmente você
não precisa fazer nada nem pagar separadamente para liberar os downloads.

Se a API gratuita não estiver funcionando, depois de concluir o login e se
tornar Super Usuário (dono), envie ao bot para validar e ativar a chave:

```text
!setkey bronxys
```

O comando precisa ser enviado por um Super Usuário. Se estiver hospedando o
SatBot fora da Bronxys, essa chave gratuita não funciona: compre uma chave em
https://api.bronxyshost.com.br/ e configure-a com `!setkey SUA_APIKEY`.

## Atualizar o SatBot

O comando `!autoupdate on` ativa as atualizações automáticas. Quando houver uma
nova versão disponível, envie `!su restart` em uma conversa com o bot para
reiniciá-lo e aplicar a atualização. Faça isso somente quando uma atualização
estiver disponível.

Esses comandos exigem que você já seja Super Usuário (dono). Se, após o
reinício, o servidor não voltar a iniciar automaticamente, abra o Console da
Bronxys e clique em **Iniciar**.

<p><a href="./instalacao.md"><img src="https://img.shields.io/badge/←%20Voltar-op%C3%A7%C3%B5es%20de%20instala%C3%A7%C3%A3o-5865F2" alt="Voltar às opções de instalação"></a> <a href="./como-logar.md"><img src="https://img.shields.io/badge/🔐%20Pr%C3%B3ximo-passo%20a%20passo%20do%20login-00ACC1" alt="Ver o passo a passo do login"></a></p>
