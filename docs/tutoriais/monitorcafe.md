[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como monitorar cotações do café com `!monitorcafe`

O comando `!monitorcafe` monitora e compara cotações de café das fontes
Minasul, Coocafé e CCCMG. Os dados coletados alimentam um histórico que
permite acompanhar a evolução dos preços.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e Super Usuários.
- **Onde funciona:** grupos de **WhatsApp**, **Discord** e **Telegram**.

---

## Modos de funcionamento

O monitor possui três modos:

| Modo | Comportamento |
| --- | --- |
| `loop` | Envia as cotações nos horários definidos (agendado) |
| `monitor` | Verifica as fontes a cada hora e envia apenas quando detecta **alteração de preço** |
| `both` | Combina os dois: envia nos horários e alerta quando há alteração |

> [!NOTE]
> Se nenhum modo for informado na configuração, o padrão é `both`.

---

## Passo a passo de configuração

### 1. Configurar o monitor

O subcomando `config` aceita modo, fontes e horários em uma única linha:

```text
!monitorcafe config [modo] [fontes] [horários]
```

#### Exemplos

Envio agendado com fontes específicas:

```text
!monitorcafe config loop minasul,coocafe 07:00 13:00 20:00
```

Apenas alertas de alteração de preço:

```text
!monitorcafe config monitor cccmg
```

Combinação de agendado + alertas de alteração, com todas as fontes:

```text
!monitorcafe config both all 07:00 13:00 20:00
```

#### Fontes disponíveis

| Nome | Fonte |
| --- | --- |
| `minasul` | Minasul |
| `coocafe` | Coocafé |
| `cccmg` | CCCMG |
| `all` | Todas as fontes |

Se nenhuma fonte for informada, todas serão acompanhadas.

#### Horários

Informe os horários no formato `HH:MM`, separados por espaço. Se não
informar, serão usados `07:00`, `13:00` e `20:00`.

> [!IMPORTANT]
> Os horários só controlam os envios do modo `loop`. O modo `monitor`
> verifica as cotações a cada hora automaticamente.

### 2. Ativar / desativar

O monitor é ativado automaticamente ao usar `config`. Para desativá-lo sem
apagar as configurações:

```text
!monitorcafe disable
```

---

## Consultar cotações imediatamente (`!monitorcafe run`)

Para buscar as cotações agora e enviar o relatório no chat:

```text
!monitorcafe run
```

O histórico é atualizado mesmo em execuções manuais.

---

## Conferir o estado (`!monitorcafe status`)

```text
!monitorcafe status
```

O bot exibirá:

```text
☕ Status do monitor do café
• Habilitado: sim
• Modo: both
• Fontes configuradas: Minasul, Coocafe, CCCMG
• Horários: 07:00, 13:00, 20:00
• Última atualização: 21/10/2026, 13:00:00
• Registros no histórico: 42
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!monitorcafe config [modo] [fontes] [horários]` | Configura e ativa o monitor |
| `!monitorcafe run` | Consulta e exibe as cotações imediatamente |
| `!monitorcafe status` | Exibe o estado, fontes, horários e histórico |
| `!monitorcafe disable` | Desativa os envios automáticos |
| `!monitorcafe help` | Exibe a ajuda detalhada no chat |

---

## Solução de problemas comuns

1. **Cotações não estão atualizando:** as fontes (Minasul, Coocafé, CCCMG)
   podem estar temporariamente indisponíveis. Use `!monitorcafe run` para
   testar manualmente.
2. **Modo `monitor` não envia mensagens:** o modo monitor só envia quando
   detecta alteração de preço. Se os preços estiverem estáveis, não haverá
   envio.
3. **Horários não funcionam:** os horários controlam apenas o modo `loop`.
   Verifique se o modo configurado está correto (`!monitorcafe status`).
