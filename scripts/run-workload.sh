#!/usr/bin/env bash
# ==============================================================================
# ShopSphere - Synthetic Workload & Traffic Generator
# Simulates realistic multi-user concurrent traffic against the ShopSphere cluster.
# Tests API Gateway routing, authentication, catalog querying, and order processing.
# ==============================================================================
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
ITERATIONS="${2:-25}"
CONCURRENCY="${3:-4}"

echo "=============================================================================="
echo " Starting ShopSphere Workload Generator"
echo " Target Gateway: ${BASE_URL}"
echo " Total Sessions: ${ITERATIONS}"
echo " Concurrency:    ${CONCURRENCY} parallel workers"
echo "=============================================================================="

# Check if curl and jq exist
if ! command -v curl &>/dev/null; then
  echo "ERROR: 'curl' is required to execute workload tests." >&2
  exit 1
fi

# Step 0: Gateway Health Check
echo "==> Step 0: Checking API Gateway readiness..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health" || echo "000")
if [ "${HEALTH_STATUS}" != "200" ]; then
  echo "ERROR: API Gateway is not responding with HTTP 200 at ${BASE_URL}/health (Received: ${HEALTH_STATUS})" >&2
  echo "Ensure 'docker compose up -d' is running." >&2
  exit 1
fi
echo "✓ API Gateway is HEALTHY (HTTP 200)"
echo ""

# Temporary directory for workload stats
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "${TEMP_DIR}"' EXIT

run_worker() {
  local worker_id="$1"
  local count="$2"
  local success=0
  local failed=0

  for i in $(seq 1 "${count}"); do
    local rand_id=$((RANDOM % 90000 + 10000))
    local email="loadtest_${worker_id}_${rand_id}@shopsphere.local"
    local password="WorkloadPass123!"

    # 1. Register User
    local reg_res
    reg_res=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/register" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Load Tester ${worker_id}-${i}\",
        \"email\": \"${email}\",
        \"password\": \"${password}\",
        \"phone\": \"+1555${rand_id}\",
        \"address\": {
          \"street\": \"${rand_id} Performance Blvd\",
          \"city\": \"Seattle\",
          \"state\": \"WA\",
          \"zipCode\": \"98101\",
          \"country\": \"US\"
        }
      }")
    local reg_code=$(echo "${reg_res}" | tail -n1)
    local reg_body=$(echo "${reg_res}" | sed '$d')

    if [ "${reg_code}" != "201" ] && [ "${reg_code}" != "200" ]; then
      failed=$((failed + 1))
      continue
    fi

    # 2. Login to acquire JWT token
    local login_res
    login_res=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"${email}\", \"password\": \"${password}\"}")
    local login_code=$(echo "${login_res}" | tail -n1)
    local login_body=$(echo "${login_res}" | sed '$d')

    if [ "${login_code}" != "200" ]; then
      failed=$((failed + 1))
      continue
    fi

    # Extract Token (fallback grep if jq not installed)
    local token=""
    if command -v jq &>/dev/null; then
      token=$(echo "${login_body}" | jq -r '.token // empty')
    else
      token=$(echo "${login_body}" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    fi

    if [ -z "${token}" ]; then
      failed=$((failed + 1))
      continue
    fi

    # 3. Query Catalog
    local cat_res
    cat_res=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/orders/products")
    if [ "${cat_res}" != "200" ]; then
      failed=$((failed + 1))
      continue
    fi

    # 4. Place Order
    local order_res
    order_res=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/orders" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -d "{
        \"items\": [
          {
            \"productId\": \"prod-001\",
            \"name\": \"Quantum Sound Wireless Headphones\",
            \"price\": 199.99,
            \"quantity\": 1
          },
          {
            \"productId\": \"prod-006\",
            \"name\": \"VoltStream 100W GaN Fast Charger\",
            \"price\": 49.99,
            \"quantity\": 2
          }
        ],
        \"shippingAddress\": {
          \"street\": \"${rand_id} Performance Blvd\",
          \"city\": \"Seattle\",
          \"state\": \"WA\",
          \"zipCode\": \"98101\",
          \"country\": \"US\"
        },
        \"paymentMethod\": \"CREDIT_CARD\"
      }")
    local order_code=$(echo "${order_res}" | tail -n1)

    if [ "${order_code}" = "201" ] || [ "${order_code}" = "200" ]; then
      success=$((success + 1))
    else
      failed=$((failed + 1))
    fi

    # Progress ticker
    echo -n "."
  done

  echo "${success},${failed}" > "${TEMP_DIR}/worker_${worker_id}.txt"
}

echo "==> Step 1: Dispatching ${CONCURRENCY} concurrent worker threads..."
START_TIME=$(date +%s)

# Launch concurrent workers in parallel
PIDS=()
for w in $(seq 1 "${CONCURRENCY}"); do
  run_worker "${w}" "${ITERATIONS}" &
  PIDS+=($!)
done

# Wait for all workers to finish
for pid in "${PIDS[@]}"; do
  wait "${pid}"
done
echo ""

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
if [ "${DURATION}" -le 0 ]; then DURATION=1; fi

TOTAL_SUCCESS=0
TOTAL_FAILED=0

for res_file in "${TEMP_DIR}"/worker_*.txt; do
  if [ -f "${res_file}" ]; then
    IFS=',' read -r succ fail < "${res_file}"
    TOTAL_SUCCESS=$((TOTAL_SUCCESS + succ))
    TOTAL_FAILED=$((TOTAL_FAILED + fail))
  fi
done

TOTAL_TX=$((TOTAL_SUCCESS + TOTAL_FAILED))
THROUGHPUT=$((TOTAL_TX / DURATION))

echo "=============================================================================="
echo " Workload Execution Summary"
echo "=============================================================================="
echo " Total Completed Transactions: ${TOTAL_TX}"
echo " Successful Checkouts:         ${TOTAL_SUCCESS}"
echo " Failed Transactions:           ${TOTAL_FAILED}"
echo " Total Execution Duration:     ${DURATION}s"
echo " Average System Throughput:    ~${THROUGHPUT} user workflows/sec"
echo "=============================================================================="

# Query Prometheus metrics if available
echo "==> Step 2: Fetching live API Gateway metrics..."
curl -s "${BASE_URL}/metrics" | grep -E "shopsphere_gateway" || true
echo ""
echo "Done! You can verify created records in MongoDB using:"
echo "  docker exec -it shopsphere-mongo mongosh shopsphere --eval 'db.orders.countDocuments()'"
echo "=============================================================================="
