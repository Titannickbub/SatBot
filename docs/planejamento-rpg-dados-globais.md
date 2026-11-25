# Planejamento — Dados do criador de personagens

**Status:** catálogo global e regras iniciais do RPG Maker/combate PvP.

Este documento fica restrito aos dados que o criador de personagens deverá
armazenar. O catálogo de personagens, fraquezas, golpes e efeitos fica junto em
um único JSON dentro da pasta `settings/rpg`, para que o bot leia um arquivo
só. Cada personagem continua tendo sua própria imagem separada, seguindo o
padrão de referência de mídias usado pelas ações.

## Arquivo do catálogo

- Um JSON contém a lista global de fraquezas, todos os golpes e todos os
  personagens.
- Cada personagem é um objeto individual dentro da lista `personagens`.
- O bot pode carregar esse catálogo uma vez e reutilizá-lo durante as batalhas,
  sem abrir arquivos de definição separados.
- Cada personagem tem uma imagem separada. O JSON guarda o tipo e o nome do
  arquivo em `media`, sem embutir a imagem em base64.
- O exemplo usa uma mídia `photo` como nas ações. O criador deverá exigir
  exatamente uma imagem por personagem.
- A imagem continua em arquivo próprio, dentro da pasta `rpg`.

Organização proposta:

```text
settings/rpg/personagens.json
settings/rpg/personagens_media/
  0.png
```

## Campos e condições de cada personagem

| Campo | Significado |
|---|---|
| `id` | Número único do personagem; a sequência começa em `0` |
| `nome` | Nome exibido do personagem |
| `base` | Obra/franquia de origem ou inspiração; agrupa o catálogo (ex.: `REZERO`) |
| `sexo` | Sexo/categoria informativa: `feminino`, `masculino`, `intersexo`, `nao_binario`, `agenero` ou `desconhecido` |
| `raridade` | Uma das raridades globais usadas pelos cosméticos: `comum`, `incomum`, `raro`, `epico` ou `lendario` |
| `media` | Uma referência ao arquivo de imagem separado |
| `hp` | Vida inicial do personagem no nível inicial |
| `mana` | Quantidade inicial de mana |
| `stamina` | Quantidade inicial de energia física |
| `fraquezas` | Lista de IDs que aumentam o dano recebido; pode conter vários |
| `afinidades` | Opcional; IDs que reduzem bastante o dano recebido; pode conter vários |
| `agilidade` | Valor inicial usado futuramente para defesa e ordem de ação |
| `golpesPermanentes` | Obrigatório para quem não clona; lista fixa de IDs que desbloqueia por nível |
| `podeClonarGolpes` | Indica se o jogador pode aprender golpes de outros personagens |
| `golpeClonagemId` | Obrigatório para clonadores; ID do golpe fixo “Clone Travado” |
| `limiteGolpesAprendidos` | Máximo total de golpes mantidos; inclui permanentes e clonados; `null` representa sem limite |

Cada golpe fica definido uma vez na lista global `golpes`; os personagens
referenciam os IDs em `golpesPermanentes`, sem copiar os dados do golpe.
Para personagens clonadores, `golpesPermanentes` é opcional; eles têm o golpe
obrigatório `Clone Travado`, que não pode ser esquecido.

Regras de validação propostas: `afinidades` pode ser omitido e, nesse caso,
vale como lista vazia. Se `podeClonarGolpes` for `false`, `golpesPermanentes`
é obrigatório. Se for `true`, `golpeClonagemId` é obrigatório e
`golpesPermanentes` pode ser omitido.

### Exemplo do JSON único

Este exemplo reúne a lista editável de fraquezas, efeitos, golpes globais e dois
personagens. O primeiro tem progressão fixa e não tem afinidades; o segundo é
clonador e tem o golpe “Clone Travado”. Os nomes e números são ilustrativos.
Atributos no catálogo são valores-base de nível 1. Para personagens possuídos,
cada nível aplica 5% sobre o valor-base em HP, mana, stamina e agilidade:
`floor(valor base × (100 + 5 × (nível − 1)) / 100)`. O cálculo não altera o
catálogo nem os atributos de personagens exibidos na loja; valores-base zero
permanecem zero.

```json
{
  "fraquezas": [
    {
      "id": 0,
      "nome": "Fogo"
    },
    {
      "id": 1,
      "nome": "Gelo"
    },
    {
      "id": 2,
      "nome": "Eletricidade"
    }
  ],
  "efeitos": [
    {
      "id": 0,
      "nome": "Congelado",
      "afinidadeId": 1,
      "danoPassivoPorRodada": 4
    },
    {
      "id": 1,
      "nome": "Paralisado"
    }
  ],
  "golpes": [
    {
      "id": 0,
      "nome": "Impacto Ígneo",
      "frases": [
        "{personagem} lançou um impacto ígneo contra {alvo}!",
        "{alvo} foi atingido pelas chamas de {personagem}!"
      ],
      "dano": 30,
      "custo": {
        "mana": 10,
        "stamina": 5,
        "hp": 0
      },
      "tipoFraquezaId": 0,
      "nivelDesbloqueio": 1,
      "efeitos": []
    },
    {
      "id": 1,
      "nome": "Investida",
      "frases": [
        "{personagem} avançou com uma investida contra {alvo}!"
      ],
      "dano": 45,
      "custo": {
        "mana": 0,
        "stamina": 20,
        "hp": 5
      },
      "tipoFraquezaId": 2,
      "nivelDesbloqueio": 3,
      "efeitos": [1]
    },
    {
      "id": 2,
      "nome": "Clone Travado",
      "frases": [
        "{personagem} ativou Clone Travado contra {alvo}!"
      ],
      "dano": 0,
      "custo": {
        "mana": 0,
        "stamina": 0,
        "hp": 0
      },
      "tipoFraquezaId": null,
      "nivelDesbloqueio": 1,
      "efeitos": [],
      "podeEsquecer": false
    }
  ],
  "personagens": [
    {
      "id": 0,
      "nome": "Lume",
      "base": "ORIGINAL",
      "sexo": "desconhecido",
      "raridade": "comum",
      "media": [
        {
          "type": "photo",
          "file": "0.png"
        }
      ],
      "hp": 120,
      "mana": 80,
      "stamina": 100,
      "fraquezas": [0, 2],
      "agilidade": 12,
      "golpesPermanentes": [0, 1],
      "podeClonarGolpes": false,
      "limiteGolpesAprendidos": 2
    },
    {
      "id": 1,
      "nome": "Eco",
      "base": "ORIGINAL",
      "sexo": "desconhecido",
      "raridade": "raro",
      "media": [
        {
          "type": "photo",
          "file": "1.png"
        }
      ],
      "hp": 110,
      "mana": 70,
      "stamina": 90,
      "fraquezas": [1],
      "afinidades": [0, 2],
      "agilidade": 14,
      "golpeClonagemId": 2,
      "podeClonarGolpes": true,
      "limiteGolpesAprendidos": 4
    }
  ]
}
```

Os IDs de personagem começam em `0`. No exemplo, `Lume` tem duas fraquezas e
não tem `afinidades`; `Eco` tem duas afinidades. Os campos `fraquezas` e
`afinidades` aceitam vários IDs e referenciam a lista global `fraquezas`.
`afinidades` pode ser omitido, o que equivale a uma lista vazia. Cada golpe
com tipo de dano também referencia um item dessa lista em `tipoFraquezaId`.
Qualquer personagem com raridade `comum` pode ser oferecido como personagem
inicial gratuito; cada jogador pode escolher somente um.
As imagens ficam em arquivos separados, como
`settings/rpg/personagens_media/0.png` e `settings/rpg/personagens_media/1.png`.

## Uso da lista global de fraquezas

O criador mantém uma única lista global e editável. Seus itens podem ser
selecionados várias vezes em cada personagem, tanto em `fraquezas` quanto em
`afinidades`:

- Em `fraquezas`, o tipo selecionado faz o personagem receber mais dano daquele
  tipo.
- Em `afinidades`, o tipo selecionado faz o personagem receber muito menos dano
  daquele tipo. A regra exata e se o dano pode chegar a zero ficam para o
  planejamento de combate.
- Os ataques precisarão referenciar esses mesmos IDs quando seus dados forem
  planejados, para que o combate possa comparar ataque e defesa.
- Os IDs devem ser únicos na lista e estáveis: renomear uma fraqueza não deve
  exigir alterar as referências nos personagens nem nos golpes.
- Remover uma entrada que já esteja sendo usada exige decidir como atualizar
  os personagens e golpes que a referenciam.

## Catálogo de golpes

Cada golpe é definido uma vez na lista global `golpes`. Campos propostos a
partir das regras descritas:

| Campo | Significado |
|---|---|
| `id` | Identificador único do golpe |
| `nome` | Nome exibido |
| `frases` | Lista de mensagens enviadas ao usar o golpe, com placeholders para os nomes do personagem atacante e do alvo |
| `dano` | Dano base causado pelo golpe |
| `custo.mana` | Mana consumida ao usar o golpe |
| `custo.stamina` | Stamina consumida ao usar o golpe |
| `custo.hp` | Vida consumida ao usar o golpe |
| `tipoFraquezaId` | ID da lista global que define o tipo do golpe; `null` para golpe sem tipo de dano |
| `nivelDesbloqueio` | Nível requerido para desbloquear o golpe |
| `efeitos` | IDs de efeitos globais aplicados pelo golpe; pode ser vazio |

Um custo pode ser zero se o golpe não consumir aquele recurso. Custos negativos
não são válidos. Um custo de HP pode derrotar quem usou o golpe.

`frases` contém uma ou mais mensagens alternativas. Ao executar o golpe, o bot
escolhe uma delas e substitui `{personagem}` pelo nome do personagem que usou o
golpe e `{alvo}` pelo nome do personagem atingido. O formato definitivo dos
placeholders pode seguir o padrão já usado pelo bot; os dois exemplos acima
representam esses valores.

### Dano por fraqueza e afinidade

Regra atual, aplicada ao dano base do golpe:

- Se o tipo do golpe corresponder a uma fraqueza do alvo:
  `dano = floor(danoBase × 2)`.
- Se corresponder a uma afinidade do alvo:
  `dano = floor(danoBase × 0,5)`.
- Se não corresponder a nenhum dos dois:
  `dano = danoBase`.

Como cada golpe tem um tipo, ter várias fraquezas ou afinidades permite cobrir
mais tipos diferentes; não acumula vários bônus para o mesmo golpe. Se um tipo
aparecer nas duas listas, fraqueza tem prioridade.

### Efeitos

Os efeitos também ficam no JSON global, e golpes os referenciam por ID. Cada
efeito possui `afinidadeId` (tipo associado, ou `null`) e
`danoPassivoPorRodada` (valor numérico, zero se não houver dano passivo).
**Congelado** aplica o tipo Gelo, causa 4 de dano passivo ao fim de cada rodada
e dura até a batalha terminar; não acumula. A afinidade correspondente impede
a aplicação do efeito sem anular o dano imediato do golpe. A fraqueza
correspondente dobra o dano passivo.

### Progressão fixa

Os golpes permanentes de cada personagem ficam na lista
`golpesPermanentes`, que contém IDs para as definições globais. O
`nivelDesbloqueio` pertence ao próprio golpe. A maioria dos personagens poderá
ter golpes exclusivos. `golpesPermanentes` é obrigatório para personagens que
não clonam e opcional para personagens clonadores.

“Permanente” indica que o golpe faz parte da progressão fixa do personagem,
não que seja impossível esquecê-lo. Se o limite de golpes estiver cheio, o
jogador pode esquecer um golpe mantido para abrir espaço para outro permitido
pela progressão. Um personagem que não clona também pode esquecer um golpe
permanente para aprender outro que já esteja disponível na progressão.

### Clonagem de golpes

`podeClonarGolpes` indica se o personagem pode aprender qualquer golpe do
catálogo, inclusive golpes exclusivos de outros personagens. O nível de
desbloqueio do golpe ainda precisa ser atendido.
`limiteGolpesAprendidos` limita o total de golpes que o personagem mantém,
somando permanentes e clonados. `null` representa sem limite em JSON.

Todo personagem clonador também referencia `Clone Travado` em
`golpeClonagemId`. Esse golpe é obrigatório e não pode ser esquecido; sua
mecânica de clonagem será detalhada depois. A definição global marca essa
regra com `podeEsquecer: false`. No exemplo, dano e custos zero e tipo `null`
são apenas valores provisórios para representar um golpe especial sem dano.

A definição global do personagem **não** é alterada quando alguém aprende ou
esquece um golpe. O progresso individual registra a lista de golpes atualmente
mantidos por aquele jogador e personagem, além do golpe fixo `Clone Travado`
que é determinado pelo personagem:

```json
{
  "characterId": 1,
  "level": 4,
  "golpesAprendidos": [0, 1]
}
```

`golpesAprendidos` contém os IDs de todos os golpes que o jogador mantém,
permanentes ou clonados. Para um personagem que não clona, todos devem estar
em sua lista `golpesPermanentes`; para um clonador, os IDs fora da lista
permanente são os golpes clonados daquele jogador. Assim, copiar uma técnica
não a concede a outros donos do mesmo personagem. Esquecer qualquer golpe
removível tira seu ID de `golpesAprendidos` e libera um espaço;
`Clone Travado` nunca é removido. Mudanças futuras na definição global do golpe
também valem para quem o clonou; não é salvo um snapshot individual do golpe.

## Crescimento por nível

Os valores `hp`, `mana`, `stamina` e `agilidade` deste JSON são os valores
iniciais do personagem. A sugestão para HP é crescimento exponencial:

```text
HP(nível) = arredondar(HP inicial × 1,08^(nível - 1))
```

Assim, o HP começa no valor-base no nível 1 e aproximadamente dobra no nível
10. É uma curva inicial para testar; será necessário definir um limite de nível
ou revisar a taxa para evitar crescimento excessivo. Mana, stamina e agilidade
também crescem com o nível, mas suas fórmulas ainda serão escolhidas.

Os atributos calculados podem ser exibidos sem reescrever os valores-base no
JSON do personagem.

O perfil do jogador guardará separadamente se ele possui cada personagem, seu
nível e a lista de golpes que mantém. Não guardará cópias dos atributos-base ou
das definições dos golpes.

A chave desse perfil será a identidade da Conta Central para que o progresso
seja compartilhado entre plataformas. Como o nome global pode ser
personalizado, ele deve ser usado apenas para exibição; a chave precisa ser o
identificador da conta, resolvido por um mecanismo estável de união. Antes de
criar saves RPG, a união de Contas Centrais precisa preservar dados, credenciais
e sessões do painel web; IDs consolidados não podem deixar referências antigas
órfãs.

## Próximos pontos para definir

- Confirmar os caminhos `settings/rpg/personagens.json` e
  `settings/rpg/personagens_media/`.
- Sequência e unicidade dos IDs de personagens, fraquezas e golpes; como lidar
  com IDs removidos.
- Como editar ou remover uma fraqueza que já esteja referenciada por
  personagens ou golpes.
- Testar e ajustar os modificadores de dano por fraqueza e afinidade.
- Testar a curva exponencial de HP e definir o limite de nível ou ajustar a taxa
  de crescimento.
- Definir o crescimento de mana, stamina e agilidade por nível.
- Definir efeitos adicionais, chance de aplicação e regras de recuperação.
- Definir se `Clone Travado` ocupa um espaço do limite total de golpes.
- Definir como golpes permanentes esquecidos podem ser reaprendidos.

## Criador RPG Maker implementado

O catálogo inicial é mantido em `settings/rpg/personagens.json`; as imagens
ficam em `settings/rpg/personagens_media/`. A edição é exclusiva para SU.

### Comandos

- `!rpgatributo adicionar <nome>` cria um tipo global usado em fraquezas,
  afinidades e tipos de golpes.
- `!rpgatributo efeito adicionar <nome>` cria um efeito global.
- `!rpgatributo listar` e `!rpgatributo efeitos` consultam as listas.
- `!rpggolpe criar` inicia o assistente de golpes. Cada frase é informada
  separadamente; `fim` encerra a lista de frases e os efeitos. Use
  `!rpggolpe tipo <id|nenhum>` ou os botões para escolher o tipo,
  `!rpggolpe efeito <id>` para adicionar um efeito e `!rpggolpe salvar` para
  gravar.
- `!rpgpersonagem criar` inicia o assistente de personagens. Informe nome e
  base/obra de origem (ex.: `REZERO`), selecione o sexo (por botões ou com
  `!rpgpersonagem sexo <feminino|masculino|intersexo|nao_binario|agenero|desconhecido>`),
  depois envie a imagem anexada ou responda à imagem com
  `!rpgpersonagem continuar`. Use `fim` para concluir
  seleções, `!rpgpersonagem clonar sim|nao` para definir clonagem,
  `!rpgpersonagem golpe <id>` para selecionar um golpe permanente,
  `!rpgpersonagem limite ilimitado` para remover o limite e escolha uma
  raridade (`comum`, `incomum`, `raro`, `epico`, `lendario`) com os botões ou
  `!rpgpersonagem raridade <valor>`; por fim,
  `!rpgpersonagem salvar` para gravar.
- `cancelar` encerra um rascunho ativo nos assistentes de golpe e personagem.

Discord e Telegram oferecem botões para as escolhas; no WhatsApp, as mesmas
etapas podem ser feitas pelos comandos e IDs mostrados nas listas. Os
rascunhos dos assistentes ficam em memória e são perdidos se o processo do bot
reiniciar antes de salvar.

### Painel web

No Painel SU há o link **RPG Maker**. O painel separa **Atributos**, **Golpes**
e **Personagens** em áreas próprias; cada área oferece as ações **Criar**,
**Editar** e **Ver lista**. A área de atributos também administra efeitos.
O criador de personagens permite informar a base e escolher sexo e raridade.
Edições preservam os IDs e validam referências existentes. A API valida sessão, origem
da solicitação e vínculo SU da plataforma. Imagens aceitas: PNG, JPEG, GIF ou
WebP, com limite de 8 MB.

## Progresso de jogador RPG

O perfil RPG fica dentro do registro da Conta Central em
`settings/central-accounts.json`, separado dos dados de XP local e SatCoins.
Esse armazenamento faz o progresso acompanhar a identidade central nas uniões
de contas. Quando duas contas são unidas, XP e saldo global são somados;
personagens são combinados, preservando o maior nível e unindo golpes
aprendidos. Uma escolha inicial existente na conta de destino tem precedência;
caso contrário, a escolha da conta de origem é mantida.
Personagens existentes no catálogo que ainda não tenham o campo `raridade`
recebem `incomum` automaticamente na primeira leitura, evitando torná-los
opções iniciais comuns sem uma decisão explícita do SU.
Personagens legados sem `base` recebem `Sem base`; os que não tiverem `sexo`
recebem `desconhecido`. Novos personagens exigem ambos os campos.

Estrutura inicial:

```json
{
  "rpg": {
    "xp": 0,
    "globalCurrency": 0,
    "initialCharacterId": 0,
    "characters": [
      {
        "characterId": 0,
        "level": 1,
        "learnedMoveIds": [0]
      }
    ]
  }
}
```

`globalCurrency` é um saldo técnico, ainda sem nome ou regras de obtenção.
Escolher o personagem inicial grava a decisão uma única vez, concede o
personagem no nível 1 e registra os golpes disponíveis nesse nível.

### Comandos de jogador

Os comandos ficam na categoria `contas/RPG`:

- `!rpg` exibe o perfil RPG, incluindo XP, personagem inicial e personagens
  possuídos.
- `!meus_personagens [página]` lista personagens possuídos em texto, até 10 por
  página.
- `!catalogo [help|página]` exibe as instruções ou lista apenas as bases disponíveis, até 10 por página.
  Escolher uma base abre a lista dos personagens dela; no Discord e Telegram,
  selecionar um personagem abre seu card, com retorno à lista da base.
- `!catalogo base <número> [página]` abre os personagens da base escolhida.
  No WhatsApp, use `!catalogo ver <id> base <número> pagina <página>` para
  abrir um card e retornar à base. Personagens comuns elegíveis podem ser
  escolhidos como inicial pelo card ou com `!catalogo escolher <id>`.
- `!rpgver <id ou nome>` mostra o card e os dados de um personagem do catálogo.
- As listas de bases e personagens são paginadas em todos os canais; no
  WhatsApp, omitir a página abre a primeira.
- A escolha inicial é permanente e só pode ser feita uma vez por Conta
  Central. Raridade `comum` é o nível mais baixo e o único elegível.
