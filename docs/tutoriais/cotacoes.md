# 📊 Comandos de cotações

<p><a href="../tutoriais.md"><img src="https://img.shields.io/badge/%E2%86%90%20Voltar-Tutoriais-5865F2?style=for-the-badge" alt="Voltar para Tutoriais"></a></p>

Os comandos deste guia aparecem no submenu **Cotações**. O carregador do menu
os identifica pela categoria declarada nos arquivos dos comandos:

```text
!menu cotações
```

O prefixo dos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
nos exemplos. As consultas buscam dados dos serviços e fontes indicados; se
alguma fonte estiver indisponível, tente novamente mais tarde.

## ☕ Cotações de café

### `!cotacao` — comparação consolidada

Consulta Minasul, Coocafé e CCCMG e apresenta os valores disponíveis por
padrão de café, as variações em relação ao registro anterior e o melhor preço
registrado na semana. A resposta também informa a data de atualização de cada
fonte.

```text
!cotacao
```

O painel aproveita os dados disponíveis: se uma fonte falhar, as demais ainda
podem aparecer. Se as três fontes estiverem indisponíveis, o bot avisa que a
consulta não pôde ser feita.

### `!minasul` — consulta direta à cooperativa

Exibe os preços publicados pela Minasul para padrões como Cereja Descascado,
Bebida Mole e Bebida Dura. Quando há histórico disponível, também mostra a
variação e o melhor preço da semana.

```text
!minasul
```

### `!coocafe` — Arábica e Conilon

Consulta a Coocafé para Arábica Tipo 7 Bebida Dura, Arábica Bebida Rio 7 e
Conilon Tipo 7 em Espírito Santo (ES) e Minas Gerais (MG). A resposta pode
incluir variação e melhor preço da semana.

```text
!coocafe
```

### `!cccmg` — preços por padrão de café

Busca a cotação mais recente do CCCMG e lista os padrões e preços físicos da
saca de 60 kg, com a data da cotação. Quando há histórico disponível, inclui
a variação em relação ao registro anterior e o melhor preço da semana.

```text
!cccmg
```

## 📈 Bolsa e câmbio

### `!bolsa` — índices financeiros

Consulta índices de mercado como Ibovespa, S&P 500 e Nasdaq, apresentando
valores, variações e horário da última atualização quando fornecido pela
fonte.

```text
!bolsa
```

Aliases: `!indices` e `!índices`.

### `!dolar` — dólar comercial

Exibe a cotação do dólar comercial em reais, com preços de compra e venda,
variação diária e data/hora de atualização.

```text
!dolar
```

Aliases: `!dólar` e `!usd`.

## Consulta imediata ou acompanhamento automático

Os comandos deste submenu fazem uma consulta quando são executados. Para
configurar envios automáticos, use os comandos de monitor correspondentes:

- [Monitor da bolsa](./monitorbolsa.md) — cotações programadas de índices e
  ativos disponíveis.
- [Monitor do café](./monitorcafe.md) — acompanhamento de Minasul, Coocafé e
  CCCMG, com horários ou alertas de variação.

## Resumo dos comandos

| Comando | Aliases | Consulta |
| --- | --- | --- |
| `!cotacao` | — | Comparativo de café de Minasul, Coocafé e CCCMG |
| `!minasul` | — | Preços de café da Minasul |
| `!coocafe` | — | Preços de Arábica e Conilon da Coocafé |
| `!cccmg` | — | Preços físicos de café do CCCMG |
| `!bolsa` | `!indices`, `!índices` | Índices do mercado financeiro |
| `!dolar` | `!dólar`, `!usd` | Compra e venda do dólar comercial |

Para consultar os detalhes de um comando pelo bot, use `!info <comando>`, por
exemplo `!info coocafe`.
