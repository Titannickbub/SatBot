[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como agendar mensagens automáticas

O comando `!agendar` (também acessível por `!schedule` ou `!agendamento`)
permite criar e gerenciar envios automáticos de mensagens no grupo ou servidor
atual. Você pode programar avisos diários, lembretes semanais, regras periódicas
ou mensagens mensais, com suporte a texto, imagens e vídeos.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e Super Usuários.
- **Onde funciona:** em grupos e servidores no WhatsApp, Telegram e Discord.
  Cada agendamento pertence exclusivamente ao chat onde foi criado.

---

## Passo a passo para criar um agendamento

A criação de uma mensagem programada segue 5 etapas simples:

### 1. Criar o agendamento

Defina um nome de identificação para a programação:

```text
!agendar add Bom dia
```

O bot responderá confirmando a criação e informará um **ID** exclusivo (por
exemplo: `abc12`). Guarde esse ID, pois ele será usado para configurar e
gerenciar o agendamento. Nos exemplos a seguir, usaremos o ID `00000`.

### 2. Configurar o gatilho (quando enviar)

Você pode escolher entre horários fixos ou intervalos regulares:

#### Opção A: Horários fixos

Envia a mensagem em horários específicos do dia (formato `HH:MM` ou `H:MM`).
Você pode definir um ou vários horários no mesmo comando:

```text
!agendar set 00000 trigger fixed 07:00 12:00 18:00
!agendar set 00000 trigger fixed 08:30
```

#### Opção B: Intervalo regular

Dispara a mensagem repetidamente a cada intervalo de tempo informado. Combine
dias (`d`), horas (`h`), minutos (`m`) e segundos (`s`):

```text
!agendar set 00000 trigger interval 2h30m
!agendar set 00000 trigger interval 45m
!agendar set 00000 trigger interval 1d
```

> [!NOTE]
> Configurar um novo gatilho substitui o gatilho configurado anteriormente.

### 3. Configurar a repetição

Defina o padrão de frequência do disparo:

- **Uma única vez (`once`):** envia no próximo horário/gatilho e desativa
  automaticamente o agendamento:
  ```text
  !agendar set 00000 repeat once
  ```
- **Diariamente (`daily`):** repete todos os dias (nos horários fixos
  configurados ou a cada intervalo):
  ```text
  !agendar set 00000 repeat daily
  ```
- **Semanalmente (`weekly`):** repete nos dias da semana escolhidos e nos
  horários fixos definidos. Informe um ou mais dias (`seg`, `ter`, `qua`, `qui`,
  `sex`, `sab`, `dom`):
  ```text
  !agendar set 00000 repeat weekly seg qua sex
  !agendar set 00000 repeat weekly sab dom
  ```
- **Mensalmente (`monthly`):** repete em um dia específico do mês (1 a 31) nos
  horários fixos definidos:
  ```text
  !agendar set 00000 repeat monthly 5
  !agendar set 00000 repeat monthly 20
  ```

> [!IMPORTANT]
> Os modos `weekly` (semanal) e `monthly` (mensal) exigem que o gatilho seja de
> **horários fixos** (`trigger fixed`).

### 4. Configurar a mensagem (texto e mídia)

#### Definir o texto

```text
!agendar set 00000 text Bom dia, pessoal! Lembrem-se das regras do grupo.
```

#### Definir imagem ou vídeo (opcional)

Você pode associar uma foto ou vídeo ao agendamento de três maneiras:

1. **Respondendo a uma mídia:** responda diretamente a uma foto ou vídeo com:
   ```text
   !agendar set 00000 media
   ```
2. **Enviando com a legenda:** envie a imagem ou vídeo com a legenda
   `!agendar set 00000 media`.
3. **Por link:** informe uma URL direta para a mídia:
   ```text
   !agendar set 00000 media https://exemplo.com/imagem.png
   ```
   O bot baixa o arquivo e o armazena permanentemente no disco local para não
   depender de links temporários.

Para alternar entre enviar apenas texto ou mídia com legenda:

```text
!agendar set 00000 mode media
!agendar set 00000 mode text
```

### 5. Ativar o agendamento

Antes de ativar, o bot exige que você tenha configurado pelo menos o gatilho e o
texto (ou mídia). Com tudo pronto, ative o agendamento:

```text
!agendar on 00000
```

O bot confirmará a ativação e informará a data e hora do próximo disparo.

---

## Gerenciamento e testes

### Listar agendamentos do chat

Veja todos os agendamentos cadastrados no grupo atual, com seus respectivos IDs,
estados e horários:

```text
!agendar list
```

### Ver detalhes de um agendamento

Exibe o card completo com o estado atual, gatilho, repetição, texto, mídia,
quantidade de disparos e previsão do próximo disparo:

```text
!agendar status 00000
```

### Testar o disparo imediatamente

Envie a mensagem agora mesmo para conferir o visual e a formatação, sem precisar
aguardar o próximo horário:

```text
!agendar test 00000
```

### Desativar temporariamente

Pausa os disparos sem apagar as configurações:

```text
!agendar off 00000
```

Para reativar a qualquer momento, use `!agendar on 00000`.

### Apagar um agendamento

Remove permanentemente o agendamento e seus arquivos salvos:

```text
!agendar del 00000
```

(Também funcionam: `!agendar rm 00000` ou `!agendar remover 00000`).

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!agendar add <nome>` | Cria um novo agendamento e gera um ID |
| `!agendar set <id> trigger fixed <horários...>` | Define horários fixos (`HH:MM`) |
| `!agendar set <id> trigger interval <tempo>` | Define intervalo regular (`2h30m`, `1d`) |
| `!agendar set <id> repeat <once\|daily\|weekly\|monthly>` | Define a frequência de repetição |
| `!agendar set <id> text <mensagem>` | Define o texto da mensagem |
| `!agendar set <id> media [url]` | Adiciona foto ou vídeo (por resposta, anexo ou link) |
| `!agendar set <id> mode <text\|media>` | Alterna entre apenas texto ou mídia + texto |
| `!agendar on <id>` | Ativa o agendamento |
| `!agendar off <id>` | Pausa o agendamento sem apagar |
| `!agendar list` | Lista todos os agendamentos deste chat |
| `!agendar status <id>` | Mostra os detalhes e próximo disparo do agendamento |
| `!agendar test <id>` | Dispara um envio de teste imediatamente |
| `!agendar del <id>` | Remove o agendamento definitivamente |
