#!/bin/bash
set -e

PACKAGE="@br.gov.dataprev.inji/wallet-sdk"
VERSION="1.0.8"
SOURCE_REGISTRY="https://www-bin.prevnet/repository/npm-public/"
TARGET_REGISTRY="https://registry.npmjs.org/"
NPM_USER="${NPM_USER:-dataprev-inji}"

echo "Baixando ${PACKAGE}@${VERSION} de ${SOURCE_REGISTRY}..."
npm pack "${PACKAGE}@${VERSION}" --registry "${SOURCE_REGISTRY}" --strict-ssl=false

TARBALL=$(ls br.gov.dataprev.inji-wallet-sdk-${VERSION}.tgz 2>/dev/null || ls *wallet-sdk-${VERSION}.tgz)

if [ -z "${NPM_TOKEN}" ]; then
  echo "Erro: variável NPM_TOKEN não definida."
  echo "Gere um Automation Token em https://www.npmjs.com/settings/${NPM_USER}/tokens"
  echo "e execute: NPM_TOKEN=<token> ./republish.sh"
  exit 1
fi

echo "Publicando ${TARBALL} em ${TARGET_REGISTRY}..."
npm publish "${TARBALL}" --registry "${TARGET_REGISTRY}" --//registry.npmjs.org/:_authToken="${NPM_TOKEN}"

echo "Concluído."
