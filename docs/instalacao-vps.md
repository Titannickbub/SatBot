# Instalação em VPS (guia genérico)

Este passo a passo serve para VPS Linux com Node.js, incluindo serviços como
Bedhost, Bronxys e outros painéis de hospedagem de bots. As opções e os nomes
dos menus podem variar um pouco entre provedores.

## Requisitos

- Um servidor novo ou sem arquivos importantes na pasta raiz
- Sistema baseado em Linux
- Node.js 18 ou superior disponível no servidor
- Acesso ao gerenciador de arquivos e ao console/terminal do painel

## 1. Crie o servidor

Escolha o procedimento do seu provedor:

### Bedhost

Se decidir contratar pela Bedhost, use [meu link de afiliado](https://bedhosting.com.br/financeiro/aff.php?aff=281).
Isso ajuda a manter o servidor do SatBot e o projeto. Obrigado pelo apoio!

1. Faça login e abra a área do cliente.
2. Acesse **Visualizar carrinho** e escolha **Iniciar pedido**.
3. Role a página até a categoria **Host de Bot** e selecione-a.
4. Escolha um plano e clique em **Assinar agora**.
5. No final da página, selecione **Node.js**.
6. Conclua o pedido e aguarde a criação do servidor após a confirmação do
   pagamento.

### Bronxys

1. No painel, selecione **Novo servidor** e depois **Hospede seu projeto**.
2. Escolha a categoria **Node.js** e informe um nome para o servidor.
3. Depois que o servidor for criado, abra **Gerir servidor** e entre no
   **Gerenciador de arquivos**.

Ao usar a Bronxys, você recebe uma API key para downloads, então não precisa
comprar uma separadamente.

Em outro provedor, crie um servidor Linux com Node.js e abra o gerenciador de
arquivos e o console/terminal correspondentes.

## 2. Prepare a VPS

> **Atenção:** o instalador pode apagar os arquivos que já estiverem na pasta
> raiz do servidor ou falhar se encontrar uma instalação existente. Use uma VPS
> nova e vazia. Não prossiga se houver arquivos que você queira manter; faça
> backup e confirme o conteúdo antes de instalar.

Baixe o [instalador do SatBot em ZIP](https://github.com/Titannickbub/SatBot-Zip-Updates/blob/main/SatBot_installer_sem_pastas.zip)
e envie o arquivo para a pasta raiz da VPS pelo gerenciador de arquivos.
Descompacte-o nessa pasta e confira se `install.sh` e `package.json` estão
diretamente na raiz, e não dentro de uma subpasta.

Se o painel não conseguir descompactar o arquivo ZIP, descompacte-o no seu
computador e envie para a raiz somente os arquivos `install.sh` e
`package.json`.

## Inicie o servidor

No painel da hospedagem, clique em **Iniciar servidor**. Na maioria das hosts,
o instalador é executado pelo próprio painel durante a inicialização. Se for
possível escolher ou editar o comando de inicialização, selecione ou informe
`npm start`:

```bash
npm start
```

### Se o instalador automático não executar

Só se o painel não executar o instalador, abra o console/terminal da VPS,
acesse a pasta raiz onde enviou os arquivos e execute:

```bash
bash install.sh
```

Esse passo costuma ser desnecessário. O `npm` é necessário para instalar as
dependências; sem ele, a instalação não pode ser concluída. Depois que o
instalador terminar, volte ao painel e inicie o servidor com `npm start` — não
use `bash install.sh` como comando permanente de inicialização.

Com o servidor iniciado, siga o [guia de login](./como-logar.md) para conectar
WhatsApp, Telegram ou Discord e registrar o primeiro Super Usuário.

## Atualização

Depois da instalação, use `bash update.sh` para atualizar o bot. O script
preserva a pasta `settings`.

<p><a href="./instalacao.md"><img src="https://img.shields.io/badge/←%20Voltar-op%C3%A7%C3%B5es%20de%20instala%C3%A7%C3%A3o-5865F2" alt="Voltar às opções de instalação"></a> <a href="./como-logar.md"><img src="https://img.shields.io/badge/🔐%20Pr%C3%B3ximo-passo%20a%20passo%20do%20login-00ACC1" alt="Ver o passo a passo do login"></a></p>
