# republish.sh

Script para baixar um pacote npm de um registry privado e republicá-lo no [npmjs.org](https://registry.npmjs.org/).

---

## Dependências

- `bash`
- `npm` (v7 ou superior)
- Acesso de rede ao registry de origem (`https://www-bin.prevnet`)

---

## Pré-requisitos

### 1. Conta no npmjs.org

O usuário deve pertencer à organização `@br.gov.dataprev.inji` no npmjs. Acesse https://www.npmjs.com para verificar o acesso ao pacote `@br.gov.dataprev.inji/wallet-sdk`.

### 2. Automation Token do npmjs

O token é necessário para publicar sem interação manual e para contornar a exigência de 2FA.

Para gerar:

1. Acesse `https://www.npmjs.com/settings/<seu-usuario>/tokens`
2. Clique em **Generate New Token → Granular Access Token**
3. Configure:
   - **Expiration:** conforme necessidade
   - **Packages:** selecione `@br.gov.dataprev.inji/wallet-sdk` com permissão **Read and Publish**
4. Copie o token gerado (formato `npm_xxxxxxxxxxxx`)

> O token é exibido apenas uma vez. Guarde-o em local seguro.

---

## Configuração do script

As variáveis no topo do `republish.sh` controlam o comportamento:

| Variável          | Descrição                                      |
|-------------------|------------------------------------------------|
| `PACKAGE`         | Nome do pacote a ser baixado e republicado     |
| `VERSION`         | Versão do pacote                               |
| `SOURCE_REGISTRY` | Registry de origem (privado)                   |
| `TARGET_REGISTRY` | Registry de destino (npmjs.org)                |
| `NPM_USER`        | Usuário npmjs da organização `@br.gov.dataprev.inji` (padrão: `dataprev-inji`) |

---

## Uso

```bash
NPM_TOKEN=npm_xxxxxxxxxxxx ./republish.sh
```

Para usar com outro usuário da organização:

```bash
NPM_USER=outro-usuario NPM_TOKEN=npm_xxxxxxxxxxxx ./republish.sh
```

---

## Observações

- O registry de origem usa certificado auto-assinado. O script já inclui `--strict-ssl=false` para contornar isso.
- O npmjs **não permite republicar uma versão após unpublish**. Se a versão foi removida, incremente a versão no `package.json` antes de publicar.
- Nunca commite o `NPM_TOKEN` no repositório. Passe-o sempre via variável de ambiente.
