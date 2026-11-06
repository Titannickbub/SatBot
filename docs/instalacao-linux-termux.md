# Instalação no Linux ou Termux

Este guia tem duas opções: instalar em um computador Linux ou em um dispositivo
Android usando o Termux. Os comandos são diferentes; siga somente a seção do
seu dispositivo.

> **Atenção:** os comandos instalam programas e dependências no seu dispositivo.
> Execute-os apenas se entender o que fazem e confira se está na pasta certa
> antes de instalar ou remover arquivos. No Android, o SatBot precisa rodar
> dentro do Termux; não funciona como um aplicativo Android independente.

## Android: instalar o Termux pelo F-Droid

1. Baixe o [aplicativo oficial do F-Droid](https://f-droid.org/F-Droid.apk) e
   instale-o. Se o Android pedir autorização para instalar o aplicativo, permita
   a instalação para essa fonte nas configurações do dispositivo.
2. Abra o F-Droid e aguarde a atualização dos repositórios.
3. Pesquise por **Termux** e instale **Termux: emulador de terminal com
   pacotes**.

Use o APK obtido diretamente do site oficial do F-Droid. Não recomendamos
desativar o Play Protect; se o Android bloquear o arquivo ou indicar um risco,
pare e confirme que o download veio do endereço oficial antes de continuar.

## Android: preparar o Termux e instalar

Abra o Termux e atualize os pacotes:

```bash
pkg update && pkg upgrade -y
```

Durante a atualização, se aparecer uma pergunta de confirmação, pressione
**Enter** para aceitar a opção padrão.

Instale Node.js LTS e Git:

```bash
pkg install nodejs-lts git -y
```

Confira se os programas estão disponíveis:

```bash
node --version
npm --version
git --version
```

O Node.js precisa ser versão 18 ou superior. Agora baixe o projeto e inicie o
bot:

```bash
cd ~
git clone --depth 1 https://github.com/Titannickbub/SatBot.git
cd SatBot
npm start
```

O primeiro início instala as dependências necessárias e abre o fluxo de login.
Mantenha o Termux aberto enquanto o bot estiver em execução; o Android pode
suspender o aplicativo em segundo plano conforme as configurações de bateria
do dispositivo. Para autenticar as plataformas e registrar o primeiro Super
Usuário, siga o [guia de login](./como-logar.md).

## Computador: instalar no Linux

Os comandos abaixo são para Debian 12 ou superior, Ubuntu 24.04 ou superior e
Fedora atual. Em outra distribuição, use o gerenciador de pacotes dela e
instale Git, Node.js 18 ou superior e npm antes de continuar.

### Debian ou Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nodejs npm unzip
```

### Fedora

```bash
sudo dnf upgrade --refresh -y
sudo dnf install -y git nodejs npm unzip
```

Se o gerenciador perguntar se deseja instalar pacotes ou dependências
adicionais, confirme com `y` e pressione **Enter**.

Confira as versões instaladas:

```bash
node --version
npm --version
git --version
```

Confirme que `node --version` mostra a versão 18 ou superior. Depois, escolha
uma das formas de obter o projeto.

### Opção 1: clonar o repositório

```bash
git clone --depth 1 https://github.com/Titannickbub/SatBot.git
cd SatBot
npm start
```

### Opção 2: usar o instalador ZIP

Baixe o [ZIP do instalador para Linux](https://github.com/Titannickbub/SatBot-Zip-Updates/blob/main/SatBot%20installer.zip)
e extraia o arquivo. Se a pasta extraída ainda não se chamar `SatBot`, renomeie
a pasta inteira para esse nome. Abra a pasta e dê dois cliques em `install.sh`.
Se o sistema perguntar, escolha executar o arquivo.

Se os dois cliques não iniciarem o instalador (por exemplo, se o arquivo abrir
em um editor de texto), abra o terminal nessa pasta e execute:

```bash
bash install.sh
```

Depois que a instalação terminar, inicie o bot dentro da pasta `SatBot`:

```bash
npm start
```

O primeiro início instala as dependências que faltarem e abre o fluxo de login.
Para conectar WhatsApp, Telegram ou Discord e registrar o primeiro Super
Usuário, siga o [guia de login](./como-logar.md).

<p><a href="./instalacao.md"><img src="https://img.shields.io/badge/←%20Voltar-op%C3%A7%C3%B5es%20de%20instala%C3%A7%C3%A3o-5865F2" alt="Voltar às opções de instalação"></a> <a href="./como-logar.md"><img src="https://img.shields.io/badge/🔐%20Pr%C3%B3ximo-passo%20a%20passo%20do%20login-00ACC1" alt="Ver o passo a passo do login"></a></p>
