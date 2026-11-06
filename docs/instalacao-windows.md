# Instalação no Windows

Este guia é para instalar o SatBot em um computador com Windows. O instalador
precisa do Node.js 18 ou superior (que já inclui o npm) e do Git.

> **Atenção:** instale programas somente pelos sites oficiais e confira se
> está usando uma pasta nova para o SatBot. O instalador não substitui arquivos
> existentes e pode cancelar se encontrar conflitos.

## 1. Instale os requisitos

1. Baixe a versão **LTS** do Node.js pelo [site oficial do
   Node.js](https://nodejs.org/pt). Execute o instalador e mantenha as opções
   padrão. O npm é instalado junto com o Node.js.
2. Baixe o Git para Windows pelo [site oficial do
   Git](https://git-scm.com/download/win). Execute o instalador e mantenha as
   opções padrão.
3. Quando os instaladores terminarem, feche e abra novamente as janelas de
   terminal ou Prompt de Comando que estiverem abertas.

Para conferir a instalação, abra o **Prompt de Comando** e execute:

```bat
node --version
npm --version
git --version
```

Confirme que o Node.js é versão 18 ou superior e que os três comandos mostram
uma versão. Se algum comando não for reconhecido, reinicie o computador e
confira se a instalação terminou corretamente antes de continuar.

## 2. Baixe e extraia o instalador do SatBot

Baixe o [ZIP do instalador do SatBot](https://github.com/Titannickbub/SatBot-Zip-Updates/blob/main/SatBot%20installer.zip)
e extraia-o. Se a pasta extraída ainda não se chamar `SatBot`, renomeie a pasta
inteira para `SatBot`. Escolha uma pasta onde você tenha permissão para gravar
arquivos, por exemplo, `Documentos`.

## 3. Instale e inicie o bot

1. Abra a pasta `SatBot` que foi extraída.
2. Dê dois cliques em `install.bat` e aguarde a instalação terminar. O script
   baixa os arquivos do projeto e instala as dependências; mantenha a janela
   aberta enquanto ele trabalha.
3. Quando aparecer a mensagem de instalação concluída, volte à pasta e dê dois
   cliques em `start.bat` para iniciar o bot.

Se o Windows perguntar se deseja executar o arquivo, confirme somente se o
arquivo veio do ZIP oficial do projeto. Se o instalador informar que Git ou npm
não foi encontrado, instale os requisitos da primeira etapa, feche e abra o
terminal novamente e tente outra vez.

Na primeira inicialização, o bot abre o fluxo de login. Siga o [guia de
login](./como-logar.md) para conectar WhatsApp, Telegram ou Discord e registrar
o primeiro Super Usuário.

<p><a href="./instalacao.md"><img src="https://img.shields.io/badge/←%20Voltar-op%C3%A7%C3%B5es%20de%20instala%C3%A7%C3%A3o-5865F2" alt="Voltar às opções de instalação"></a> <a href="./como-logar.md"><img src="https://img.shields.io/badge/🔐%20Pr%C3%B3ximo-passo%20a%20passo%20do%20login-00ACC1" alt="Ver o passo a passo do login"></a></p>
