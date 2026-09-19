#!/usr/bin/env bash
# ==============================================================================
# ShopSphere - Kubernetes Secret Bootstrapper
# Safely provisions namespace and creates Kubernetes Secrets without committing secrets to Git.
# ==============================================================================
set -euo pipefail

NAMESPACE="shopsphere"
SECRET_NAME="shopsphere-secrets"

echo "==> [1/4] Checking prerequisites..."
if ! command -v kubectl &>/dev/null; then
  echo "ERROR: 'kubectl' command not found. Please install kubectl before running this script." >&2
  exit 1
fi

if ! kubectl cluster-info &>/dev/null; then
  echo "ERROR: Unable to connect to target Kubernetes cluster. Check your KUBECONFIG." >&2
  exit 1
fi

echo "==> [2/4] Ensuring namespace '${NAMESPACE}' exists..."
if ! kubectl get namespace "${NAMESPACE}" &>/dev/null; then
  kubectl create namespace "${NAMESPACE}"
  echo "Created namespace '${NAMESPACE}'"
else
  echo "Namespace '${NAMESPACE}' is present."
fi

echo "==> [3/4] Preparing secure runtime secrets..."
# Allow environment overrides or generate cryptographically secure defaults
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
MONGO_URI="${MONGO_URI:-mongodb://mongo.shopsphere.svc.cluster.local:27017/shopsphere}"

echo "Configured MONGO_URI=${MONGO_URI}"
echo "Configured JWT_SECRET length: ${#JWT_SECRET} characters"

echo "==> [4/4] Creating or updating Kubernetes Secret '${SECRET_NAME}'..."
kubectl create secret generic "${SECRET_NAME}" \
  --namespace="${NAMESPACE}" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=MONGO_URI="${MONGO_URI}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "=============================================================================="
echo " SUCCESS: Secret '${SECRET_NAME}' successfully provisioned in namespace '${NAMESPACE}'."
echo " Pods can now securely reference credentials via secretKeyRef."
echo "=============================================================================="
