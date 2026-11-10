# ⚙️ Comandos do menu System

<p><a href="../../README.md"><img src="https://img.shields.io/badge/%E2%86%90%20Voltar-README%20do%20SatBot-5865F2?style=for-the-badge" alt="Voltar ao README do SatBot"></a> <a href="../tutoriais.md"><img src="https://img.shields.io/badge/%E2%86%90%20Tutoriais-5865F2?style=for-the-badge" alt="Voltar para Tutoriais"></a></p>

Os comandos deste conjunto aparecem no `!menu system` e nos seguintes
submenus, de acordo com a categoria definida pelo carregador do bot:

```text
!menu system
!menu system/configurações
!menu system/ações imediatas
!menu system/info
!menu system/bronxys
```

O prefixo dos exemplos é `!`; substitua-o se o bot estiver configurado com
outro. O menu **System** contém comandos de diagnóstico, configuração global,
manutenção e administração da instalação. Muitos deles afetam todas as
plataformas e só podem ser usados por superusuários (SU/donos do bot).

## 📚 Guias por submenu

<p>
  <a href="./system/gerais.md"><img src="https://img.shields.io/badge/Comandos%20gerais-guia-25A55F?style=for-the-badge" alt="Comandos gerais do System"></a><br>
  <a href="./system/configuracoes.md"><img src="https://img.shields.io/badge/Configura%C3%A7%C3%B5es-guia-673AB7?style=for-the-badge" alt="Configurações globais do System"></a><br>
  <a href="./system/acoes-imediatas.md"><img src="https://img.shields.io/badge/A%C3%A7%C3%B5es%20imediatas-guia-673AB7?style=for-the-badge" alt="Ações imediatas do System"></a><br>
  <a href="./system/info-bronxys.md"><img src="https://img.shields.io/badge/Info%20e%20Bronxys-guia-2196F3?style=for-the-badge" alt="Status do bot e integração Bronxys"></a><br>
</p>

## 🧭 Comandos documentados

| Categoria no menu | Comandos |
| --- | --- |
| `system` | `ping`, `botname`, `discordemoji`, `set_vip`, `actG_edit` |
| `system/configurações` | `su`, `su-token` (`su token`), `config`, `fuso`, `antispam`, `antipv`, `onlychats`, `blockcmd_su`, `autoupdate`, `autorepo_G`, `setai`, `setbotinfo`, `set_dominio`, `set_teste` |
| `system/ações imediatas` | `seradm`, `sermb`, `sercargo`, `delcargo` |
| `system/info` | `botstatus` |
| `system/bronxys` | `setkey`, `testbronxys` |

O comando `actG_edit` também aparece no guia de
[ações de roleplay](./act_edit.md), que detalha a edição de ações locais e
globais. Os guias de administração e economia cobrem comandos específicos
para gerenciar cada um desses módulos.
