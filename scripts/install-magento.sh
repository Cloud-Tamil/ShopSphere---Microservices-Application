#!/usr/bin/env bash
# ==============================================================================
# ShopSphere - Magento 2.4+ CLI Provisioner & Setup Automation
# Executes real Magento installation, schema migrations, and indexing inside container.
# ==============================================================================
set -euo pipefail

CONTAINER_NAME="${MAGENTO_CONTAINER:-shopsphere-magento}"
BASE_URL="${MAGENTO_BASE_URL:-http://localhost:8080/}"
DB_HOST="${MAGENTO_DB_HOST:-mysql}"
DB_NAME="${MAGENTO_DB_NAME:-magento}"
DB_USER="${MAGENTO_DB_USER:-magento}"
DB_PASSWORD="${MAGENTO_DB_PASS:-MagentoPass123!}"
ADMIN_USER="${MAGENTO_ADMIN_USER:-admin}"
ADMIN_PASSWORD="${MAGENTO_ADMIN_PASS:-ShopAdmin2025!}"
ADMIN_EMAIL="${MAGENTO_ADMIN_EMAIL:-admin@shopsphere.io}"

echo "==> [1/5] Checking Magento container status '${CONTAINER_NAME}'..."
if ! docker ps --filter "name=${CONTAINER_NAME}" --format '{{.Names}}' | grep -w "${CONTAINER_NAME}" >/dev/null; then
  echo "WARNING: Container '${CONTAINER_NAME}' is not running. Starting Docker Compose service..."
  docker compose up -d magento mysql elasticsearch
  echo "Waiting 20 seconds for MySQL and ElasticSearch services to be ready..."
  sleep 20
fi

echo "==> [2/5] Running Magento installation command via bin/magento..."
docker exec -i "${CONTAINER_NAME}" bin/magento setup:install \
  --base-url="${BASE_URL}" \
  --db-host="${DB_HOST}" \
  --db-name="${DB_NAME}" \
  --db-user="${DB_USER}" \
  --db-password="${DB_PASSWORD}" \
  --admin-firstname="ShopSphere" \
  --admin-lastname="Admin" \
  --admin-email="${ADMIN_EMAIL}" \
  --admin-user="${ADMIN_USER}" \
  --admin-password="${ADMIN_PASSWORD}" \
  --language="en_US" \
  --currency="USD" \
  --timezone="America/New_York" \
  --use-rewrites=1 \
  --search-engine=elasticsearch7 \
  --elasticsearch-host=elasticsearch \
  --elasticsearch-port=9200

echo "==> [3/5] Deploying static content & compiling dependency injection..."
docker exec -i "${CONTAINER_NAME}" bin/magento setup:di:compile
docker exec -i "${CONTAINER_NAME}" bin/magento setup:static-content:deploy -f

echo "==> [4/5] Reindexing catalog & flushing full page cache..."
docker exec -i "${CONTAINER_NAME}" bin/magento indexer:reindex
docker exec -i "${CONTAINER_NAME}" bin/magento cache:flush

echo "==> [5/5] Setting developer/production permissions..."
docker exec -i "${CONTAINER_NAME}" chmod -R 775 var generated pub/static pub/media

echo "=============================================================================="
echo " SUCCESS: Magento setup completed successfully!"
echo " Storefront: ${BASE_URL}"
echo " Admin Panel: ${BASE_URL}admin (User: ${ADMIN_USER})"
echo "=============================================================================="
