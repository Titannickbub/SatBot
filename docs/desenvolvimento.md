# Desenvolvimento e segurança

## Estrutura

```text
commands/       comandos
functions/      lógica auxiliar
middlewares/    filtros e interceptadores
platforms/      adaptadores das plataformas
settings/       configuração e dados locais
index.js        bootstrap e watcher
core.js         núcleo do bot
package.json    dependências e scripts
```

## Segurança

Antes de publicar uma instância, remova ou ignore:

- tokens em `.env`;
- sessões autenticadas do WhatsApp;
- logs sensíveis;
- uploads locais;
- dados de usuários e grupos.

Esses arquivos devem ser gerados individualmente em cada instalação.

## Documentação relacionada

- [Changelog 1.2](../changelog/1.2/README.md)
- [Changelog 1.1](../changelog/1.1/README.md)
- [Changelog 1.0](../changelog/1.0/README.md)
