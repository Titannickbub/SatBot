# Instalação

## Requisitos

- Node.js 18 ou superior
- npm
- Git, caso use o instalador para baixar o repositório
- Um terminal interativo para fazer o primeiro login

## Instalar o bot

O instalador baixa o repositório principal na branch `main`, verifica se há
arquivos que seriam sobrescritos e cancela a instalação se encontrar conflitos.
Execute-o na pasta onde deseja instalar o bot:

- Windows: `install.bat`
- Linux, macOS e Android/Termux: `bash install.sh`

No Windows, a saída será parecida com:

```text
[INSTALL] Instalador do SatBot
[INSTALL] Repositorio: https://github.com/Titannickbub/SatBot.git
[INSTALL] Destino: C:\SatBot
[INFO] Instalando dependencias...
[INSTALL] Instalacao concluida.
[INFO] Para iniciar: start.bat
```

As mensagens podem variar conforme o sistema. Se o instalador encontrar uma
instalação existente, ele não a substitui; use o script de atualização
correspondente.

Para iniciar o bot:

```bat
start.bat
```

```bash
bash start.sh
```

Os scripts verificam as dependências, instalam-nas se necessário e reiniciam
o processo se ele sair. Também é possível executar `node index.js` diretamente;
nesse caso, se o processo encerrar durante o primeiro login, execute o comando
novamente para iniciar o bot conectado.

Na primeira inicialização, o bot cria arquivos de configuração e autenticação
dentro de `settings`.

## Primeiro login

Faça o primeiro início com `start.bat` ou `bash start.sh` em um terminal
interativo. Se nenhuma plataforma estiver autenticada, o bot pede qual
plataforma será conectada primeiro. Com as três plataformas ativadas, o menu
será semelhante a este:

```text
[AUTH] Nenhuma plataforma autenticada. Escolha uma para iniciar:
  1. Discord
  2. Telegram
  3. WhatsApp
Digite o número da plataforma:
```

Se somente uma plataforma estiver ativada, ela será selecionada
automaticamente. Para ver como ativar e desativar plataformas, consulte
[Configuração](./configuracao.md).

### Discord

Crie uma aplicação e um bot no [Portal de Desenvolvedores do
Discord](https://discord.com/developers/applications), copie o token do bot e
selecione Discord no menu. O terminal pedirá o token:

```text
Digite o número da plataforma: 1
[AUTH] Informe o token de Discord.
Discord token:
```

Cole o token no terminal e pressione Enter. O token é salvo em
`settings/.env`; mantenha esse arquivo privado. Quando a conexão for
estabelecida, o terminal mostrará uma confirmação semelhante a:

```text
🟩[DISCORD] Conectado como NomeDoBot#0000
```

### Telegram

Crie um bot pelo [BotFather](https://t.me/BotFather), copie o token e
selecione Telegram no menu:

```text
Digite o número da plataforma: 2
[AUTH] Informe o token de Telegram.
Telegram token:
```

Cole o token no terminal e pressione Enter. Ele será salvo em
`settings/.env`. Após a conexão, o terminal mostrará o nome do bot, por
exemplo:

```text
🟩[TELEGRAM] Conectado como MeuBot (@meu_bot)
```

### WhatsApp

Selecione WhatsApp no menu. O terminal oferecerá os métodos de login:

```text
Digite o número da plataforma: 3
[AUTH] Escolha o método de login do WhatsApp:
  1. QR Code no terminal
  2. Código de pareamento por número
Digite o número do método:
```

Para usar o QR, digite `1`. Quando o QR aparecer no terminal, abra o
WhatsApp no celular e acesse
`Configurações > Aparelhos conectados > Conectar aparelho`; escaneie o QR.
O terminal também informa quando a conexão é concluída:

```text
[WHATSAPP] QR code gerado.
[WHATSAPP] Escaneie o QR code com o app do WhatsApp:
<QR CODE exibido no terminal>
🟩[WHATSAPP] Conectado como 5533999999999
```

Para usar o código de pareamento, digite `2` e informe o telefone com DDI:

```text
Digite o número do método: 2
Número com DDI (aceita espaços e símbolos): +55 33 99999-9999
[WHATSAPP] Código de pareamento: <CÓDIGO GERADO PELO WHATSAPP>
```

No celular, abra `Configurações > Aparelhos conectados > Conectar aparelho` e
escolha a opção de conectar com número de telefone; informe o código. O número
pode ser digitado com espaços, `+`, parênteses ou hífens: esses caracteres são
removidos antes da solicitação.

Após a conexão inicial, o processo pode encerrar para aplicar a autenticação.
Os scripts `start.bat` e `bash start.sh` iniciam-no novamente.

## Primeiro Super Usuário

No primeiro início, se ainda não houver Super Usuário cadastrado, um código
temporário será exibido no terminal:

```text
=================================
[SU] Nenhum Super Usuário encontrado.
[SU] Código: <CÓDIGO TEMPORÁRIO>
=================================
```

Com o bot conectado, envie o código ao próprio bot usando o prefixo padrão `!`:

```text
!su code <CÓDIGO TEMPORÁRIO>
```

Exemplo da conversa:

```text
Você: !su code <CÓDIGO TEMPORÁRIO>
Bot: 👑 Você agora é um super usuário.
```

Use o código válido que apareceu no seu terminal; o valor acima é apenas um
marcador de exemplo. Se a resposta for `❌ Código inválido ou expirado.`, confira
se copiou o código atual. Esse código só registra o primeiro Super Usuário.

## Adicionar outras plataformas depois

Depois de registrar um Super Usuário, use um chat privado confiável para enviar
o token de Discord ou Telegram. Substitua `<TOKEN>` pelo token real:

```text
Você: !su token telegram <TOKEN>
Bot: ✅ Token de telegram registrado.
Bot: 🔄 Reiniciando Sat Bot para aplicar a configuração...
```

Para Discord, use `!su token discord <TOKEN>`. Os tokens são gravados em
`settings/.env`; nunca os publique ou compartilhe. O bot encerra o processo
depois de receber o comando. Com `start.bat` ou `bash start.sh`, ele inicia
novamente e tenta conectar a plataforma.

### Fazer login no WhatsApp depois

Se o WhatsApp não foi a primeira plataforma, ou se precisar autenticar
novamente, solicite o login como Super Usuário:

```text
!su whatsapp qr
```

Resposta inicial no chat:

```text
Bot: ✅ Login por QR solicitado. Reiniciando; o QR será enviado aqui como imagem.
```

Depois que o bot reiniciar, ele envia o QR como imagem no chat em que o comando
foi executado. Escaneie-o no celular em
`Configurações > Aparelhos conectados > Conectar aparelho`.

Para parear por número:

```text
Você: !su whatsapp codigo +55 33 99999-9999
Bot: ✅ Login por número solicitado. Reiniciando; o código será enviado aqui.
```

Após o reinício, o código aparece no terminal e é enviado ao chat:

```text
Bot: 🔐 Código de pareamento do WhatsApp: <CÓDIGO GERADO PELO WHATSAPP>
```

No celular, abra `Configurações > Aparelhos conectados > Conectar aparelho` e
escolha conectar com número de telefone. Esse processo remove a sessão anterior
do WhatsApp antes de iniciar o novo pareamento. Proteja o QR e o código: quem
os obtiver poderá tentar conectar um aparelho à conta.

Os comandos deste guia usam o prefixo padrão `!`. Se ele tiver sido alterado,
substitua `!` pelo prefixo configurado.

## Atualização

Use `update.bat` no Windows ou `bash update.sh` em sistemas Unix. Os scripts
preservam a pasta `settings`.
