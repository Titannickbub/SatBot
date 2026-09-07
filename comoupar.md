# Como atualizar o repositório no GitHub

## 1) Abrir o Prompt de Comando

```cmd
cd /d C:\Users\titan\Documents\satela
```

## 2) Verificar o status do Git

```cmd
git status
git remote -v
```

Se aparecer um repositório do GitHub, tudo certo. Se não aparecer, conecte com o GitHub:

```cmd
git remote add origin https://github.com/Titannickbub/SatBot.git
```

## 3) Garantir que está na branch principal

```cmd
git branch
git checkout main
```

Se a branch ainda não existir:

```cmd
git branch -M main
```

## 4) Ignorar dependências e dados locais

Crie ou mantenha o arquivo `.gitignore` na raiz do projeto. Ele impede que módulos instalados, credenciais, sessões e dados gerados pelo bot sejam enviados ao GitHub.

Se alguma dessas pastas já tiver sido adicionada ao Git anteriormente, remova-a apenas do índice (os arquivos locais continuam no computador):

```cmd
git rm -r --cached --ignore-unmatch node_modules data config settings/whatsapp-auth settings/uploads settings/groups
git rm --cached --ignore-unmatch settings/.env settings/central-accounts.json settings/crossplay.json
git add .gitignore
```

Confira o que será enviado antes de continuar:

```cmd
git status
git diff --cached --stat
```

## 5) Adicionar os arquivos modificados

```cmd
git add .
```

## 6) Fazer o commit

```cmd
git commit -m "Atualização do bot"
```

## 7) Atualizar antes de enviar

```cmd
git pull --rebase origin main
```

Se aparecer conflito, resolva e continue com:

```cmd
git add .
git rebase --continue
```

## 8) Enviar para o GitHub

```cmd
git push -u origin main
```

Depois disso, pode usar apenas:

```cmd
git push
```

---

## Fluxo completo normal

```cmd
cd /d C:\Users\titan\Documents\satela
git status
git add .
git commit -m "Atualização do bot"
git pull --rebase origin main
git push -u origin main
```

## Sobrescrever o conteúdo remoto

Use somente quando você tiver certeza de que a versão local deve substituir a branch `main` do GitHub. Isso pode apagar commits que existem apenas no remoto.

### Substituição completa usando a pasta local

Este fluxo remove do índice os arquivos antigos, adiciona novamente os arquivos atuais da pasta local e força a atualização da branch remota. Os arquivos ignorados pelo `.gitignore` não serão enviados.

```cmd
cd /d C:\Users\titan\Documents\SatBot
git checkout main
git rm -r --cached .
git add .
git commit -m "Substituição completa do projeto"
git push --force origin main
```

Não use `git pull --rebase` neste fluxo. O comando `git rm --cached` remove os arquivos apenas do controle do Git; ele não apaga os arquivos da pasta local.

Opção recomendada, que falha se o remoto mudar depois da sua última sincronização:

```cmd
git push --force-with-lease -u origin main
```

Para forçar mesmo assim, sobrescrevendo a branch remota:

```cmd
git push --force -u origin main
```

---

## Se o projeto ainda não foi inicializado no Git

```cmd
cd /d C:\Users\titan\Documents\satela
git init
git branch -M main
git remote add origin https://github.com/Titannickbub/SatBot.git
git add .
git commit -m "Primeiro commit"
git push -u origin main
```

---

## Observação

Se o Git pedir usuário e senha, use o GitHub personal access token em vez da senha da conta.
