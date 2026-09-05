# Plano de implementação: sistema `act`

## Objetivo

Criar um sistema universal de ações interativas para WhatsApp, Telegram e
Discord. O comando será genérico e usará um arquivo JSON para definir ações,
frases e mídias, sem precisar alterar o código para adicionar uma nova ação.

Exemplos:

```text
!act kiss @membro
!act kiss
```

Resultado possível:

```text
💋 João deu um beijo doce em Maria!
```

## Organização dos arquivos

```text
commands/
└── diversão/
    ├── act.js
    ├── act_edit.js
    └── act.json
```

O arquivo `act.json` ficará junto dos comandos, conforme solicitado. Mídias
enviadas como anexos continuarão sendo armazenadas em `settings/uploads/`,
seguindo o fluxo já utilizado pelo comando `welcome`.

## Formato do `act.json`

```json
{
  "kiss": {
    "enabled": true,
    "aliases": ["beijo"],
    "messages": [
      "{user1} deu um beijo em {user2}!",
      "{user1} deu um beijo doce em {user2}!",
      "{user1} roubou um beijo de {user2}!"
    ],
    "media": [
      {
        "url": "https://exemplo.com/beijo.gif",
        "type": "gif",
        "fileName": "beijo.gif"
      }
    ]
  }
}
```

### Campos

- `enabled`: permite desativar uma ação sem removê-la.
- `aliases`: nomes alternativos da ação.
- `messages`: frases escolhidas aleatoriamente.
- `media`: imagens, GIFs ou vídeos escolhidos aleatoriamente.
- `media.url`: URL pública ou caminho de arquivo local.
- `media.type`: `photo`, `gif` ou `video`.
- `media.fileName`: nome opcional para arquivos armazenados.

O formato de mídia seguirá o mesmo padrão do `welcome`: `{ url, type,
fileName }`. URLs serão usadas diretamente; anexos serão baixados e salvos por
`storeMedia`, respeitando a organização de `settings/uploads/`.

## Variáveis das frases

```text
{user1}          nome de quem executou a ação
{user2}          nome do alvo
{user1_mention}  menção de quem executou
{user2_mention}  menção do alvo
{platform}       plataforma atual
```

As variáveis de menção serão renderizadas de forma específica para cada
plataforma:

- WhatsApp: texto `@número` e lista `mentions` com o JID real;
- Telegram: menção HTML clicável usando o ID do usuário;
- Discord: menção nativa `<@id>`.

## Resolução dos usuários

O alvo será resolvido nesta ordem:

1. primeira menção encontrada;
2. usuário da mensagem respondida;
3. remetente do comando.

O executor sempre será o usuário que enviou o comando. A ação poderá ser usada
sem alvo explícito:

```text
!act hug
```

Nesse caso, a frase poderá usar o mesmo usuário em `{user1}` e `{user2}`.

## Envio da ação

1. Validar se a ação existe e está habilitada.
2. Escolher uma frase aleatória.
3. Escolher uma mídia aleatória, quando houver.
4. Substituir as variáveis.
5. Enviar texto ou mídia com legenda.
6. Usar fallback para texto se o envio da mídia falhar.

O envio de mídia deverá reutilizar os adaptadores existentes:

- WhatsApp: `sendMessage` com `image`, `video` ou URL local;
- Telegram: `sendPhoto`, `sendAnimation` ou `sendVideo`;
- Discord: anexo ou URL através do adaptador atual.

## Comandos de administração

Todos os comandos `act_edit` serão exclusivos para Super Usuários.

### Consulta

```text
!act_edit list
!act_edit show kiss
```

### Criar e editar ações

```text
!act_edit new kiss
!act_edit message kiss {user1} deu um beijo doce em {user2}!
!act_edit image kiss https://exemplo.com/beijo.gif
!act_edit alias kiss beijo
```

Para adicionar mídia anexada, o usuário poderá enviar ou responder uma imagem,
GIF ou vídeo junto do comando:

```text
!act_edit image kiss
```

O fluxo será o mesmo do `welcome`: baixar com `getBuffer`, salvar usando
`storeMedia` e registrar o resultado no JSON como `{ url, type, fileName }`.

### Remover, ativar e desativar

```text
!act_edit remove-message kiss 2
!act_edit remove-image kiss 1
!act_edit enable kiss
!act_edit disable kiss
!act_edit delete kiss
```

Os índices exibidos por `show` começarão em 1 para facilitar a edição.

## Segurança e consistência

- verificar Super Usuário antes de qualquer alteração;
- impedir nomes de ações duplicados;
- validar URLs e tipos de mídia;
- rejeitar frases vazias;
- limitar o tamanho do JSON e a quantidade de mídias/frases;
- salvar o arquivo de forma atômica;
- preservar o arquivo atual se a gravação falhar;
- informar erros no chat e no console;
- nunca derrubar o bot por falha em uma mídia externa.

## Compatibilidade e limitações

- Links externos precisam continuar acessíveis pela plataforma.
- Arquivos locais serão preferíveis quando a mídia for enviada como anexo.
- Cada plataforma pode impor limites de tamanho e formato.
- O fallback para texto garante que a ação ainda funcione quando a mídia não
  puder ser enviada.
- As mensagens enviadas pelo `act` não serão sincronizadas com edições ou
  exclusões posteriores.

## Checklist de implementação

- [ ] Criar `commands/diversão/act.js`.
- [ ] Criar `commands/diversão/act_edit.js`.
- [ ] Criar `commands/diversão/act.json` com ações iniciais.
- [ ] Extrair ou reutilizar resolução universal de menções.
- [ ] Reutilizar o formato `{ url, type, fileName }` do `welcome`.
- [ ] Reutilizar `storeMedia` para anexos.
- [ ] Implementar envio de texto e mídia nos três adaptadores.
- [ ] Implementar fallback de mídia para texto.
- [ ] Implementar operações do `act_edit`.
- [ ] Validar permissões, JSON e persistência atômica.
- [ ] Adicionar a funcionalidade à changelog 1.2 após a implementação.
