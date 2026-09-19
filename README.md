# ShopSphere - Modern Microservices E-Commerce Platform

ShopSphere is a production-style, locally testable, enterprise-grade e-commerce microservices platform built from the ground up with a decoupled distributed architecture, containerization, Kubernetes orchestration, GitOps automation with Argo CD, continuous integration with Jenkins, Infrastructure-as-Code with Terraform, security vulnerability scanning with Aqua Trivy, and observability with Prometheus.

---

## 1. Application Architecture

```text
                               ┌──────────────────────────┐
                               │   ShopSphere Frontend    │
                               │  (React 18 + Tailwind)   │
                               └────────────┬─────────────┘
                                            │
                                            ▼
                               ┌──────────────────────────┐
                               │       API Gateway        │
                               │    (Port 8000 / Ingress) │
                               └────────────┬─────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
       ┌────────────────────────┐┌────────────────────────┐┌────────────────────────┐
       │      Auth Service      ││      User Service      ││     Order Service      │
       │ (Port 5001 - Identity) ││  (Port 5002 - Profile) ││  (Port 5003 - Catalog) │
       └────────────┬───────────┘└──────────┬─────────────┘└──────────┬─────────────┘
                    │                       │                         │
                    └───────────────────────┼─────────────────────────┘
                                            │
                                            ▼
                               ┌──────────────────────────┐
                               │     MongoDB Cluster      │
                               │  (Collections: users,    │
                               │     products, orders)    │
                               └──────────────────────────┘
```

### Microservice Directory & Component Map

| Service | Port | Primary Responsibilities | Database Collections |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `8000` | Central reverse proxy, CORS, JWT bearer verification, request routing, rate limiting, structured telemetry | None (Stateless) |
| **Auth Service** | `5001` | User registration, credential validation, bcrypt password hashing (cost factor 10), signed JWT generation (`24h`) | `users` |
| **User Service** | `5002` | Customer profile retrieval, address book updates, user preferences, account metadata | `users` |
| **Order Service** | `5003` | Product catalog retrieval, inventory checks, shopping checkout, order status lifecycle tracking | `products`, `orders` |
| **Frontend** | `3000` / `80` | Modern responsive React SPA, catalog browsing, shopping cart, token management, checkout | Local Storage (JWT) |
| **MongoDB** | `27017` | Document store with persistent volumes and index optimization | `users`, `products`, `orders` |
| **Prometheus** | `9090` | Time-series scraper collecting `/metrics` across all running microservices | Metrics TSDB |

---

## 2. Prerequisites

Ensure the following tools are installed on your workstation:

- **Git** (`>= 2.38`)
- **Node.js** (`>= 20.x`) and **npm** (`>= 10.x`)
- **Docker Engine** (`>= 24.0`) and **Docker Compose v2** (`>= 2.20`)
- **kubectl** (`>= 1.28`)
- **Minikube** or **Kind** (for local Kubernetes testing)
- **Terraform** (`>= 1.5.0`)
- **AWS CLI v2** (configured with target AWS credentials)
- **Trivy** (`>= 0.50`) for filesystem and image scanning
- **Helm** (`>= 3.12`)
- **Argo CD CLI** (`>= 2.9`)

---

## 3. Local Development Setup (Docker Compose)

The entire microservices topology can be stood up locally using Docker Compose in less than two minutes.

### Step 1: Clone and Configure Environment

```bash
git clone https://github.com/your-org/shopsphere-microservices.git
cd shopsphere-microservices

# Copy example environment configuration
cp .env.example .env
```

### Step 2: Build and Run Services

```bash
# Build all production multi-stage container images
docker compose build

# Launch the full microservice stack in the background
docker compose up -d
```

### Step 3: Verify Running Containers & Health Checks

```bash
docker compose ps
```

Expected output:
```text
NAME                   IMAGE                               STATUS                   PORTS
shopsphere-mongo       mongo:7.0-jammy                     Up (healthy)             0.0.0.0:27017->27017/tcp
shopsphere-auth        shopsphere-microservices-auth-service   Up (healthy)             0.0.0.0:5001->5001/tcp
shopsphere-user        shopsphere-microservices-user-service   Up (healthy)             0.0.0.0:5002->5002/tcp
shopsphere-order       shopsphere-microservices-order-service  Up (healthy)             0.0.0.0:5003->5003/tcp
shopsphere-gateway     shopsphere-microservices-api-gateway    Up (healthy)             0.0.0.0:8000->8000/tcp
shopsphere-frontend    shopsphere-microservices-frontend       Up (healthy)             0.0.0.0:3000->80/tcp
shopsphere-prometheus  prom/prometheus:v2.50.0             Up                       0.0.0.0:9090->9090/tcp
```

### Step 4: Access Web Applications

- **ShopSphere Storefront**: [http://localhost:3000](http://localhost:3000)
- **API Gateway**: [http://localhost:8000](http://localhost:8000)
- **Prometheus Dashboard**: [http://localhost:9090](http://localhost:9090)

---

## 4. End-to-End API Testing with `curl`

### 1. Health Checks
```bash
# Gateway Health
curl -s http://localhost:8000/health | jq .

# Auth Service Health
curl -s http://localhost:5001/health | jq .

# Order Service Health
curl -s http://localhost:5003/health | jq .
```

### 2. User Registration via Gateway
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Developer",
    "email": "jane.dev@example.com",
    "password": "SecurePassword123!",
    "phone": "+1-555-0199",
    "address": {
      "street": "100 Innovation Way",
      "city": "Austin",
      "state": "TX",
      "zipCode": "78701"
    }
  }' | jq .
```

### 3. User Login & Token Acquisition
```bash
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.dev@example.com",
    "password": "SecurePassword123!"
  }')

echo "$LOGIN_RESPONSE" | jq .

# Extract the JWT token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
echo "Extracted Token: $TOKEN"
```

### 4. Fetch User Profile
```bash
curl -s -X GET "http://localhost:8000/api/users/${USER_ID}" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 5. Fetch Products Catalog
```bash
curl -s http://localhost:8000/api/orders/products | jq .
```

### 6. Create New Order
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "670000000000000000000001",
        "name": "Quantum Sound Wireless Headphones",
        "price": 199.99,
        "quantity": 1
      }
    ],
    "shippingAddress": {
      "street": "100 Innovation Way",
      "city": "Austin",
      "state": "TX",
      "zipCode": "78701"
    },
    "paymentMethod": "CREDIT_CARD"
  }' | jq .
```

---

## 5. Kubernetes Deployment (Minikube / EKS)

All Kubernetes resource definitions are cleanly structured in the `k8s/` directory.

### Directory Layout
```text
k8s/
├── namespace.yaml           # Namespace: shopsphere
├── configmap.yaml           # Non-sensitive service URLs & configurations
├── hpa.yaml                 # HorizontalPodAutoscalers for microservices
├── pdb.yaml                 # PodDisruptionBudgets for zero-downtime maintenance
├── ingress.yaml             # Ingress rules (ALB / Nginx)
├── network-policy.yaml      # Zero-trust inter-pod communication restrictions
├── api-gateway/deployment.yaml
├── auth-service/deployment.yaml
├── user-service/deployment.yaml
├── order-service/deployment.yaml
├── frontend/deployment.yaml
└── mongo/deployment.yaml
```

### Step 1: Bootstrap Secrets
Kubernetes Secrets must never be committed to Git. Run the automated script:
```bash
chmod +x scripts/bootstrap-k8s-secret.sh
./scripts/bootstrap-k8s-secret.sh
```

### Step 2: Apply All Manifests
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/network-policy.yaml
kubectl apply -f k8s/mongo/deployment.yaml
kubectl apply -f k8s/auth-service/deployment.yaml
kubectl apply -f k8s/user-service/deployment.yaml
kubectl apply -f k8s/order-service/deployment.yaml
kubectl apply -f k8s/api-gateway/deployment.yaml
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/pdb.yaml
kubectl apply -f k8s/ingress.yaml
```

### Step 3: Verify Workloads
```bash
kubectl get pods -n shopsphere
kubectl get svc -n shopsphere
kubectl get hpa -n shopsphere
kubectl get ingress -n shopsphere
```

---

## 6. Kubernetes Security & Hardening

1. **Non-Root Containers**: All application images enforce `USER node` and run with `runAsNonRoot: true`, `runAsUser: 1000`.
2. **Read-Only Root Filesystems**: Containers feature `readOnlyRootFilesystem: true` with ephemeral scratch spaces mounted to `/tmp` via `emptyDir`.
3. **Dropped Linux Capabilities**: All containers drop all privileges via `capabilities.drop: ["ALL"]` and disallow privilege escalation (`allowPrivilegeEscalation: false`).
4. **Network Policies**:
   - `default-deny-ingress`: Drops all unsolicited inbound traffic across the namespace.
   - `allow-frontend-ingress`: Permits traffic to frontend port 80.
   - `allow-gateway-ingress`: Permits external & frontend traffic to API Gateway port 8000.
   - `allow-microservices-from-gateway`: Only allows Auth, User, and Order services to receive requests originating from the API Gateway pods.
   - `allow-mongo-from-services`: MongoDB only allows TCP traffic on port 27017 from Auth, User, and Order pods.

### ConfigMap vs. Secret Separation

- **`ConfigMap` (`shopsphere-config`)**: Used strictly for non-sensitive operational settings such as upstream microservice DNS names (`AUTH_SERVICE_URL`, `USER_SERVICE_URL`), port bindings, and log levels. These are safely versioned in Git.
- **`Secret` (`shopsphere-secrets`)**: Used strictly for sensitive credentials (`JWT_SECRET`, database passwords, connection URIs with embedded credentials). Created dynamically via `scripts/bootstrap-k8s-secret.sh` or external secret stores (e.g. AWS Secrets Manager / External Secrets Operator). Never committed to source control.

---

## 7. GitOps with Argo CD

ShopSphere leverages GitOps to eliminate manual `kubectl apply` commands in staging and production.

```text
Developer Push ──► GitHub ──► Jenkins CI (Test, Build, Trivy, Push to ECR)
                                    │
                                    ▼
                         Update k8s/ Deployment Tag
                                    │
                                    ▼
                          GitHub (GitOps Repo)
                                    │
                                    ▼
                          Argo CD Controller
                     (Reconciles Git with EKS Cluster)
                                    │
                                    ▼
                           Kubernetes / EKS
```

### Installing Argo CD & Deploying ShopSphere
```bash
# 1. Install Argo CD into the cluster
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. Access the Argo CD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 3. Retrieve admin password
argocd admin initial-password -n argocd

# 4. Apply ShopSphere GitOps Application
kubectl apply -f argocd/application.yaml
```

The configuration in `argocd/application.yaml` enables:
- **Automated Synchronization**: Auto-applies changes when commits land on `main`.
- **Self-Healing**: Automatically repairs cluster drift caused by manual overrides.
- **Pruning**: Automatically cleans up removed Kubernetes resources.
- **Ignore Differences**: Configured to ignore `/spec/replicas` so HPA autoscaling can scale replicas without triggering false out-of-sync states.

---

## 8. Jenkins CI/CD Pipeline & Trivy Security

The `Jenkinsfile` orchestrates a 10-stage automated pipeline:

1. **Checkout**: Retrieves source code and extracts immutable commit SHA.
2. **Install Dependencies**: Executes `npm ci` concurrently across all 5 applications.
3. **Unit Tests**: Runs service test suites in parallel.
4. **Trivy Filesystem Scan**: Audits project dependencies and code for exposed secrets and vulnerabilities:
   ```bash
   trivy fs . --severity HIGH,CRITICAL --scanners vuln,secret,misconfig
   ```
5. **Docker Build Images**: Builds production container images tagged with `sha-<commit>`.
6. **Trivy Container Image Scan**: Inspects built images for CVEs before pushing:
   ```bash
   trivy image --severity HIGH,CRITICAL --exit-code 0 <image-tag>
   ```
7. **ECR Authentication & Push**: Authenticates to AWS ECR and pushes immutable image tags.
8. **Update GitOps Configuration**: Uses `sed` to update image references in `k8s/*/deployment.yaml` and commits back to Git, triggering Argo CD deployment.

---

## 9. Infrastructure as Code with Terraform

Terraform manages all required AWS resources for an enterprise EKS deployment in the `terraform/` directory:

- **VPC & Subnets**: Multi-AZ public and private subnets with Internet Gateway and NAT Gateway.
- **Security Groups**: Granular control plane and worker node security rules.
- **IAM Roles**: Least-privilege IAM roles for EKS cluster and managed EC2 worker nodes.
- **EKS Cluster & Node Group**: Managed EKS cluster with autoscaling node groups (`min: 2, max: 6`).
- **Amazon ECR Repositories**: Immutable registries for each microservice with automatic scan-on-push and 14-day untagged lifecycle expiration.

### Provisioning Infrastructure
```bash
cd terraform

# 1. Initialize providers
terraform init

# 2. Validate configuration syntax
terraform validate

# 3. Review planned resources
terraform plan -out=tfplan

# 4. Provision AWS resources
terraform apply tfplan

# 5. Teardown when no longer needed
terraform destroy
```

---

## 10. Monitoring & Observability (Prometheus)

Every ShopSphere microservice provides a `/metrics` endpoint exporting Prometheus-formatted application indicators:

- `shopsphere_gateway_requests_total`: Cumulative counter of all HTTP requests processed by the API Gateway.
- `shopsphere_gateway_status_codes{status="2xx|4xx|5xx"}`: Breakdown of response status categories.
- `shopsphere_auth_uptime_seconds`, `shopsphere_user_uptime_seconds`, `shopsphere_order_uptime_seconds`: Service uptime gauges.
- `shopsphere_*_db_connected`: MongoDB connectivity state (1 = connected, 0 = disconnected).

Prometheus is configured in `monitoring/prometheus.yml` to automatically scrape these endpoints every 15 seconds. In Kubernetes, Prometheus uses pod discovery annotations (`prometheus.io/scrape: "true"`).

To visualize these metrics in Grafana:
1. Add Prometheus datasource pointing to `http://prometheus:9090`.
2. Import standard Node.js & HTTP metrics dashboards.

---

## 11. Structured Logging

All services emit structured JSON logs to standard output:
```json
{
  "timestamp": "2026-09-19T12:00:00.000Z",
  "service": "order-service",
  "level": "INFO",
  "message": "Order created successfully",
  "orderId": "670000000000000000000008",
  "userId": "670000000000000000000001",
  "totalAmount": 199.99
}
```

- Passwords, credit cards, and JWT tokens are strictly excluded from logs.
- Standardized log levels: `INFO`, `WARN`, `ERROR`, `CRITICAL`.
- Compatible with FluentBit, Logstash, AWS CloudWatch Container Insights, and Datadog.

---

## 12. Magento 2.4+ Hybrid Setup

For organizations migrating from or integrating with Magento, ShopSphere includes an isolated Magento container setup in `docker/magento/`:

- PHP 8.2-FPM with all mandatory Magento extensions.
- Tuned `php.ini` (2G memory, OpCache enabled).
- Multi-process management via Supervisord.
- Fully automated installer script in `scripts/install-magento.sh`.

Magento is decoupled so the core ShopSphere microservices platform operates independently without Magento running.

---

## 13. Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **MongoDB connection refused** | MongoDB container still initializing | Verify with `docker compose ps`. Services auto-retry connection. |
| **`401 Unauthorized` on Gateway** | Missing or expired JWT Bearer header | Sign in via `/api/auth/login` and provide `Authorization: Bearer <token>`. |
| **Kubernetes `CrashLoopBackOff`** | Missing `shopsphere-secrets` Secret | Run `./scripts/bootstrap-k8s-secret.sh` before applying deployments. |
| **Kubernetes `ImagePullBackOff`** | Incorrect ECR registry URL or IAM credentials | Verify AWS account ID in manifests or run `aws ecr get-login-password`. |
| **Argo CD `OutOfSync`** | Git branch has new commits or HPA replica drift | Ensure `/spec/replicas` is ignored in `argocd/application.yaml`. |
| **Trivy scan fails build** | Critical CVE detected in base image | Upgrade base image to latest Alpine patch or add approved CVE exception. |

---

## License
Apache-2.0 License. Designed for production microservice architectures.
