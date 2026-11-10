# 🧰 Comandos do menu Utilitários

<p><a href="../tutoriais.md"><img src="https://img.shields.io/badge/%E2%86%90%20Voltar-Tutoriais-5865F2?style=for-the-badge" alt="Voltar para Tutoriais"></a></p>

Os comandos deste guia podem ser consultados no menu **Utilitários**:

```text
!menu utilitarios
```

O prefixo dos exemplos é `!`; troque-o pelo prefixo configurado no bot, se
necessário. A disponibilidade pode variar conforme o comando e a plataforma.

## 🤖 IA e criação de imagens

### `!ia` — perguntar ou responder sobre uma mensagem

Escreva sua pergunta ou instrução após o comando:

```text
!ia Qual é a velocidade da luz?
!ia Explique JavaScript para quem está começando
```

Também pode responder a uma mensagem e usar `!ia` para pedir uma explicação
sobre ela. É possível combinar a mensagem citada com uma pergunta:

```text
!ia resuma este texto
```

Aliases: `!gpt`, `!satella`, `!gemini` e `!ai`.

### `!imagine` — gerar uma imagem com IA

Descreva a imagem que deseja criar. Quanto mais detalhes de tema, cenário e
estilo você informar, mais contexto a solicitação oferece:

```text
!imagine Um gato astronauta flutuando no espaço, arte digital
!imagine Paisagem futurista cyberpunk com luzes neon
```

O bot envia a imagem gerada no chat. Aliases: `!gerarimg`, `!dalle`,
`!stablediffusion` e `!desenhar`.

## 🎵 Download de áudio e vídeo

### `!play` — baixar áudio

Pesquise pelo nome da música ou informe um link:

```text
!play nome da música
!play https://youtu.be/...
!play https://soundcloud.com/artista/faixa
```

O áudio é enviado como arquivo MP3. A busca por nome é feita no YouTube. Os
links suportados incluem YouTube, SoundCloud, TikTok, Instagram, Spotify, X
(Twitter) e Facebook. Para links do Kwai ou iFunny que contenham vídeo, use
`!video`.

### `!video` — baixar vídeo

Pesquise pelo título/assunto ou envie um link de vídeo:

```text
!video melhores momentos de futebol
!video https://youtu.be/...
!video https://www.tiktok.com/...
```

O bot envia o vídeo MP4. Links suportados: YouTube, TikTok, Instagram, X
(Twitter), Facebook, Kwai e iFunny. A busca por título é feita no YouTube.
Links de áudio do SoundCloud devem ser usados com `!play`.

## 💬 Ajuda, notas e identificação

### `!adms` — chamar administradores do grupo

Use em um grupo do WhatsApp ou Telegram para marcar os administradores:

```text
!adms
```

No Discord, o bot orienta a usar o cargo de administradores do servidor.
Aliases: não há.

### `!notas` — consultar notas do grupo/servidor

Sem argumentos, mostra a ajuda e a lista de notas:

```text
!notas
```

Leia uma nota pelo título ou pela posição na lista:

```text
!notas Regras
!notas 1
```

Administradores podem adicionar ou apagar notas. Formato para adicionar:

```text
!notas add Regras - Leiam as regras do grupo.
```

Para apagar, informe o título:

```text
!notas del Regras
```

Todos podem ler; somente administradores do chat e superusuários podem
adicionar ou apagar. As notas são separadas por grupo ou servidor. O título
precisa ser único nesse chat.

### `!id` — consultar identificador de usuário

Sem argumentos, mostra seu ID na plataforma atual. Para consultar outra
pessoa, mencione-a ou responda a uma mensagem dela:

```text
!id
!id @usuario
```

Útil para identificar uma conta ao configurar comandos que aceitam IDs. Não
tem aliases.

## 🎙️ Áudio e mídia

### `!transcrever` — converter fala em texto

Envie um áudio ou vídeo junto com o comando ou responda à mídia:

```text
!transcrever
```

O bot retorna o texto reconhecido. Formatos incompatíveis, mídia indisponível
ou falhas no serviço de transcrição podem impedir a conversão; nesses casos,
tente novamente com outro arquivo.

### `!revelar` — reenviar mídia de visualização única

No WhatsApp, responda diretamente a uma foto, vídeo ou áudio de visualização
única:

```text
!revelar
```

O bot reenvia a mídia no chat como arquivo comum e permanente, preservando a
legenda original quando houver. Use apenas com respeito à privacidade e ao
consentimento de quem enviou: depois de revelada, a mídia deixa de ser de
visualização única para os participantes que podem ver o chat.

Este comando é exclusivo do WhatsApp. Aliases: `!revela`, `!viewonce`, `!vo`,
`!quebrar`, `!antivo`, `!readvo` e `!desocultar`.

## Resumo rápido

| Comando | Para que serve |
| --- | --- |
| `!ia` | Faz perguntas ou analisa uma mensagem respondida |
| `!imagine` | Gera uma imagem a partir de uma descrição |
| `!play` | Baixa áudio por busca ou link |
| `!video` | Baixa vídeo por busca ou link |
| `!adms` | Marca os administradores em grupo WhatsApp/Telegram |
| `!notas` | Lê, lista e, para administradores, gerencia notas do chat |
| `!id` | Consulta o ID da sua conta ou de outro usuário |
| `!transcrever` | Transcreve áudio ou vídeo |
| `!revelar` | Reenvia mídia de visualização única no WhatsApp |

Para consultar a ajuda de um comando no bot, use `!info <comando>`, por
exemplo `!info transcrever`.
