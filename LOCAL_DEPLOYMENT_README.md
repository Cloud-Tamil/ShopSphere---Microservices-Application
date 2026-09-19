# ShopSphere - Local Deployment, Operations & Workload Testing Guide

This guide provides everything needed to understand the ShopSphere architecture, deploy the full microservices cluster locally on your machine, access all services and user interfaces, run operational maintenance commands, and execute temporary synthetic workloads to test performance, resilience, and metrics under load.

---

## 1. Application Overall Information

**ShopSphere** is a decoupled, cloud-native e-commerce microservices platform. Every business capability is split into dedicated, independently deployable services that communicate over low-latency internal HTTP REST APIs orchestrated by a central API Gateway.

### System Architecture Flow

```text
                  Browser / User Client
                           │
                           ▼
               ┌───────────────────────┐
               │    React Storefront   │ (Port 3000 -> Nginx 80)
               └───────────┬───────────┘
                           │ HTTP / REST
                           ▼
               ┌───────────────────────┐
               │      API Gateway      │ (Port 8000)
               │ (Proxy & JWT Verifier)│
               └───────────┬───────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Auth Service │  │ User Service │  │Order Service │
  │ (Port 5001)  │  │ (Port 5002)  │  │ (Port 5003)  │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │    MongoDB Database   │ (Port 27017)
               │ (Persistent Volumes)  │
               └───────────────────────┘
                           ▲
                           │ Metrics Scrape (15s)
               ┌───────────┴───────────┐
               │    Prometheus TSDB    │ (Port 9090)
               └───────────────────────┘
```

### Microservices Directory & Roles

| Service | Container Name | Host Port | Technology | Primary Function |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `shopsphere-frontend` | `3000` | React 18, Tailwind, Nginx | Responsive catalog browsing, cart drawer, checkout, order tracking |
| **API Gateway** | `shopsphere-gateway` | `8000` | Node.js, Express, Proxy | Central routing, CORS headers, JWT bearer validation, request metrics |
| **Auth Service** | `shopsphere-auth` | `5001` | Node.js, Express, Mongoose | User registration, bcrypt password hashing (10 rounds), signed JWT tokens |
| **User Service** | `shopsphere-user` | `5002` | Node.js, Express, Mongoose | Customer profile management, shipping address book, role authorization |
| **Order Service**| `shopsphere-order` | `5003` | Node.js, Express, Mongoose | Product catalog database queries, order creation, order lifecycle progression |
| **MongoDB** | `shopsphere-mongo` | `27017` | MongoDB 7.0 Jammy | Persistent storage for users, products, and orders collections |
| **Prometheus** | `shopsphere-prometheus` | `9090` | Prometheus v2.50 | Time-series metrics scraper scraping `/metrics` across all containers |

---

## 2. How to Deploy Locally

### Prerequisites
Make sure your machine has:
- **Docker Engine** (`>= 24.0.0`)
- **Docker Compose v2** (`>= 2.20.0`)
- **cURL** and optionally **jq** (for API testing)

### Step-by-Step Deployment Commands

```bash
# 1. Clone the project repository
git clone https://github.com/your-org/shopsphere-microservices.git
cd shopsphere-microservices

# 2. Configure local environment variables
cp .env.example .env

# 3. Build all microservice container images
docker compose build

# 4. Start all services in detached mode
docker compose up -d

# 5. Check container statuses and health probes
docker compose ps
```

### Verifying Service Readiness
When all containers show `Up (healthy)`, the platform is ready:

```text
NAME                    IMAGE                             STATUS                   PORTS
shopsphere-mongo        mongo:7.0-jammy                   Up (healthy)             0.0.0.0:27017->27017/tcp
shopsphere-auth         shopsphere-auth-service           Up (healthy)             0.0.0.0:5001->5001/tcp
shopsphere-user         shopsphere-user-service           Up (healthy)             0.0.0.0:5002->5002/tcp
shopsphere-order        shopsphere-order-service          Up (healthy)             0.0.0.0:5003->5003/tcp
shopsphere-gateway      shopsphere-api-gateway            Up (healthy)             0.0.0.0:8000->8000/tcp
shopsphere-frontend     shopsphere-frontend               Up (healthy)             0.0.0.0:3000->80/tcp
shopsphere-prometheus   prom/prometheus:v2.50.0           Up                       0.0.0.0:9090->9090/tcp
```

---

## 3. How to Access Locally

| Interface | Local URL | Description / Notes |
| :--- | :--- | :--- |
| **Web Storefront** | [http://localhost:3000](http://localhost:3000) | Main e-commerce shop UI (browse, add to cart, checkout, view orders) |
| **API Gateway** | [http://localhost:8000](http://localhost:8000) | Root API endpoint (routes to downstream services) |
| **Gateway Health** | [http://localhost:8000/health](http://localhost:8000/health) | Real-time health check & downstream service ping statuses |
| **Prometheus UI** | [http://localhost:9090](http://localhost:9090) | Query metrics (e.g. `shopsphere_gateway_requests_total`) |
| **Catalog Endpoint**| [http://localhost:8000/api/orders/products](http://localhost:8000/api/orders/products) | Public product catalog JSON |
| **Prometheus Metrics**| [http://localhost:8000/metrics](http://localhost:8000/metrics) | Live Prometheus text metrics exported by API Gateway |

### Pre-Seeded / Default Test Accounts

You can register any new account instantly via the UI or API, or use the pre-configured sandbox credentials:

| Email | Password | Role |
| :--- | :--- | :--- |
| `alex.morgan@example.com` | `Password123!` | Customer |
| `admin@shopsphere.io` | `ShopAdmin2025!` | Admin |

---

## 4. Useful Operations & Management Commands

### Docker Compose Lifecycle Commands
```bash
# Start all microservices in background
docker compose up -d

# View live aggregate logs from all microservices
docker compose logs -f

# View logs from a single microservice (e.g. API Gateway)
docker compose logs -f api-gateway

# Restart a specific service after modifying code
docker compose restart order-service

# Inspect real-time container CPU, Memory, and Network I/O
docker stats

# Stop all containers safely
docker compose down

# Stop and wipe persistent database volumes (fresh clean slate)
docker compose down -v
```

### Inspecting MongoDB Inside Docker
```bash
# Open interactive MongoDB shell
docker exec -it shopsphere-mongo mongosh shopsphere

# Quick one-liner: Count users in database
docker exec -it shopsphere-mongo mongosh shopsphere --eval "db.users.countDocuments()"

# Quick one-liner: Count orders placed
docker exec -it shopsphere-mongo mongosh shopsphere --eval "db.orders.countDocuments()"

# Quick one-liner: View latest order document
docker exec -it shopsphere-mongo mongosh shopsphere --eval "db.orders.find().sort({createdAt: -1}).limit(1)"
```

### Quick cURL One-Liners
```bash
# Check API Gateway liveness
curl -i http://localhost:8000/health

# Check Order Service readiness
curl -i http://localhost:5003/ready

# Check Prometheus metrics export
curl -s http://localhost:8000/metrics | grep shopsphere_gateway
```

---

## 5. Temporary Workload & Load Testing

To verify how the application handles concurrent requests, database reads/writes, and telemetry generation, you can run synthetic workloads using any of the methods below.

### Option A: The Automated Workload Script (Recommended)

ShopSphere includes a built-in multi-threaded workload generator script in `./scripts/run-workload.sh`.

```bash
# Make script executable
chmod +x scripts/run-workload.sh

# Run workload: 25 user transaction sessions across 4 concurrent workers
./scripts/run-workload.sh http://localhost:8000 25 4
```

#### What This Workload Does Automatically:
1. Pings `/health` to verify API Gateway connectivity.
2. Dispatches 4 concurrent background worker threads.
3. Dynamically registers unique customer accounts via `/api/auth/register`.
4. Authenticates the created users via `/api/auth/login` to obtain signed JWT tokens.
5. Performs catalog lookups via `/api/orders/products`.
6. Creates new shopping orders via `POST /api/orders` with JWT bearer authorization headers.
7. Computes total transactions, success rates, duration, and requests per second.
8. Displays live Prometheus metrics from the Gateway.

---

### Option B: Quick Bash Workload (No Dependencies)

If you just want to run an immediate burst of 100 concurrent requests against the catalog and health endpoints from your terminal:

```bash
# Blast 100 concurrent queries to the catalog endpoint
echo "==> Running 100 parallel catalog queries..."
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/orders/products &
done; wait
echo "✓ Workload completed."
```

```bash
# Blast 50 concurrent authenticated token validations
echo "==> Generating 50 concurrent login validations..."
for i in {1..50}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"alex.morgan@example.com","password":"Password123!"}' &
done; wait
echo "✓ Workload completed."
```

---

### Option C: Using Benchmark Tools (`hey` or `ApacheBench`)

If you have benchmarking utilities installed, test with high concurrency:

#### With ApacheBench (`ab`):
```bash
# 1,000 requests with 25 concurrent connections to API Gateway
ab -n 1000 -c 25 http://localhost:8000/api/orders/products
```

#### With `hey`:
```bash
# 2,000 requests with 50 concurrent connections
hey -n 2000 -c 50 http://localhost:8000/health
```

---

## 6. How to Verify Workload Results

After or during running the workload, verify that the system handled the load correctly:

1. **Watch Live Container Metrics**:
   ```bash
   docker stats --no-stream
   ```
   *Notice CPU and Memory metrics adjusting gracefully across all microservices.*

2. **Verify Database Records Created**:
   ```bash
   docker exec -it shopsphere-mongo mongosh shopsphere --eval "db.orders.countDocuments()"
   ```
   *The document count will increase by the number of completed order checkouts.*

3. **Inspect Prometheus Metrics**:
   Open [http://localhost:9090](http://localhost:9090) or run:
   ```bash
   curl -s http://localhost:8000/metrics | grep shopsphere_gateway_requests_total
   ```
   *Confirm the total processed counter matches the request volume.*

4. **Verify Gateway Access Logs**:
   ```bash
   docker compose logs --tail=50 api-gateway
   ```
   *All requests show structured logging with duration and HTTP status codes.*
