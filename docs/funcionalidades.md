# Funcionalidades

## Categorias de comandos

Comandos podem declarar subcategorias usando `/`:

```js
module.exports = {
    name: "kick",
    category: "adm/ações imediatas"
};
```

`!menu adm` exibe as subcategorias e os comandos da categoria principal.

## Inteligência artificial

Provedores suportados:

- `gemini`
- `groq`
- `openrouter`

Configure uma chave:

```text
!setai <gemini|groq|openrouter> <sua_chave>
```

Use:

```text
!ia <texto>
!imagine <prompt>
```

As APIs podem aplicar limites de requisições, tokens e quota diária.
