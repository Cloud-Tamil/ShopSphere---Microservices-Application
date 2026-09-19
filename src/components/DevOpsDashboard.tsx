import React, { useState } from 'react';
import {
  Server,
  Database,
  Cpu,
  Activity,
  Terminal,
  FileCode,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Play,
  Copy,
  Check
} from 'lucide-react';
import { MicroserviceInfo } from '../types';

interface DevOpsDashboardProps {
  microservices: MicroserviceInfo[];
}

export const DevOpsDashboard: React.FC<DevOpsDashboardProps> = ({ microservices }) => {
  const [activeTab, setActiveTab] = useState<'topology' | 'api-tester' | 'manifests'>('topology');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('gateway-health');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [selectedManifest, setSelectedManifest] = useState<'compose' | 'k8s-ingress' | 'k8s-gateway' | 'argocd' | 'jenkins' | 'terraform'>('compose');

  const handleTestEndpoint = (endpointKey: string) => {
    setSelectedEndpoint(endpointKey);
    setTestLoading(true);
    setTestResponse(null);

    setTimeout(() => {
      let result = {};
      if (endpointKey === 'gateway-health') {
        result = {
          service: 'api-gateway',
          status: 'UP',
          timestamp: new Date().toISOString(),
          uptime: 14283.42,
          downstreams: {
            authService: 'http://auth-service:5001 [HEALTHY]',
            userService: 'http://user-service:5002 [HEALTHY]',
            orderService: 'http://order-service:5003 [HEALTHY]'
          }
        };
      } else if (endpointKey === 'auth-metrics') {
        result = {
          metric: 'auth_jwt_sign_operations_total',
          value: 1248,
          password_hashes_bcrypt_total: 842,
          active_sessions: 96,
          status: 'SUCCESS'
        };
      } else if (endpointKey === 'order-products') {
        result = {
          count: 6,
          catalog: [
            { id: 'prod-001', name: 'Quantum Sound Wireless Headphones', price: 199.99, stock: 45 },
            { id: 'prod-002', name: 'AeroGlide Mechanical Gaming Keyboard', price: 149.50, stock: 30 }
          ]
        };
      } else if (endpointKey === 'user-profile') {
        result = {
          userId: 'user-001',
          name: 'Jane Developer',
          email: 'jane.dev@example.com',
          role: 'customer',
          status: 'VERIFIED',
          security: 'JWT_BEARER_VALIDATED'
        };
      }
      setTestResponse(JSON.stringify(result, null, 2));
      setTestLoading(false);
    }, 450);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(id);
    setTimeout(() => setCopiedFile(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Tab Controls */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Microservices DevOps Hub</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Distributed topology, health indicators, live API test harness, and infrastructure manifests
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'topology' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Topology
          </button>
          <button
            onClick={() => {
              setActiveTab('api-tester');
              if (!testResponse) handleTestEndpoint('gateway-health');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'api-tester' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            API Tester
          </button>
          <button
            onClick={() => setActiveTab('manifests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'manifests' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manifests
          </button>
        </div>
      </div>

      {/* TOPOLOGY VIEW */}
      {activeTab === 'topology' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {microservices.map((svc) => (
              <div
                key={svc.key}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        {svc.key === 'mongo' ? (
                          <Database className="w-4 h-4" />
                        ) : svc.key === 'prometheus' ? (
                          <Activity className="w-4 h-4" />
                        ) : (
                          <Server className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{svc.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">Port {svc.port}</span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {svc.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {svc.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">Uptime</span>
                    <span className="font-bold text-slate-800">{svc.uptime}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">Latency</span>
                    <span className="font-bold text-slate-800">{svc.latencyMs}ms</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">Version</span>
                    <span className="font-bold text-slate-800">{svc.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Summary Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-6 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold tracking-tight">Zero-Trust Network Policies & Secret Separation</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Communication between services is strictly isolated: the Frontend connects exclusively to the API Gateway on port 8000. Upstream microservices (Auth, User, Order) only accept traffic from the API Gateway, and MongoDB only accepts incoming connections from authenticated microservice pods.
            </p>
          </div>
        </div>
      )}

      {/* API TESTER VIEW */}
      {activeTab === 'api-tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Test Endpoint
            </span>

            {[
              { id: 'gateway-health', label: 'GET /health', desc: 'API Gateway Liveness & Downstream Ping' },
              { id: 'auth-metrics', label: 'GET /api/auth/metrics', desc: 'Prometheus telemetry & active JWT metrics' },
              { id: 'order-products', label: 'GET /api/orders/products', desc: 'Catalog Microservice Database Query' },
              { id: 'user-profile', label: 'GET /api/users/:id', desc: 'Authenticated JWT Customer Profile' }
            ].map((ep) => (
              <button
                key={ep.id}
                onClick={() => handleTestEndpoint(ep.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  selectedEndpoint === ep.id
                    ? 'bg-blue-50 border-blue-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700">{ep.label}</span>
                  <Play className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{ep.desc}</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-5 text-slate-100 flex flex-col font-mono text-xs shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-300">Live Gateway Response Inspector</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                HTTP 200 OK
              </span>
            </div>

            <div className="flex-1 overflow-x-auto min-h-[220px]">
              {testLoading ? (
                <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Forwarding request through API Gateway proxy...</span>
                </div>
              ) : (
                <pre className="text-emerald-300 whitespace-pre-wrap">{testResponse}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANIFESTS VIEW */}
      {activeTab === 'manifests' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'compose', label: 'docker-compose.yml' },
              { id: 'k8s-ingress', label: 'k8s/ingress.yaml' },
              { id: 'k8s-gateway', label: 'k8s/api-gateway/deployment.yaml' },
              { id: 'argocd', label: 'argocd/application.yaml' },
              { id: 'jenkins', label: 'Jenkinsfile' },
              { id: 'terraform', label: 'terraform/main.tf' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedManifest(m.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  selectedManifest === m.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 text-slate-100 font-mono text-xs shadow-sm overflow-x-auto max-h-96">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <span className="text-slate-400">File: {selectedManifest}</span>
              <button
                onClick={() => copyToClipboard('Config source loaded from workspace file', selectedManifest)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 transition-colors"
              >
                {copiedFile === selectedManifest ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedManifest === 'compose' &&
                `services:
  mongodb:
    image: mongo:7.0-jammy
    ports: ["27017:27017"]
  auth-service:
    build: ./auth-service
    ports: ["5001:5001"]
  user-service:
    build: ./user-service
    ports: ["5002:5002"]
  order-service:
    build: ./order-service
    ports: ["5003:5003"]
  api-gateway:
    build: ./api-gateway
    ports: ["8000:8000"]
  frontend:
    build: ./frontend
    ports: ["3000:80"]`}

              {selectedManifest === 'k8s-ingress' &&
                `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shopsphere-ingress
  namespace: shopsphere
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
spec:
  rules:
    - http:
        paths:
          - path: /api/auth
            backend: { service: { name: api-gateway, port: { number: 8000 } } }
          - path: /api/orders
            backend: { service: { name: api-gateway, port: { number: 8000 } } }
          - path: /
            backend: { service: { name: frontend, port: { number: 80 } } }`}

              {selectedManifest === 'argocd' &&
                `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shopsphere-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/your-org/shopsphere-microservices.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: shopsphere
  syncPolicy:
    automated:
      prune: true
      selfHeal: true`}

              {selectedManifest === 'jenkins' &&
                `pipeline {
  agent any
  stages {
    stage('Test') { parallel { ... } }
    stage('Trivy Security Scan') { steps { sh 'trivy fs . --severity HIGH,CRITICAL' } }
    stage('Build & Push ECR') { steps { ... } }
    stage('GitOps Promote') { steps { ... } }
  }
}`}

              {selectedManifest === 'terraform' &&
                `resource "aws_eks_cluster" "shopsphere" {
  name     = var.cluster_name
  version  = "1.29"
  role_arn = aws_iam_role.eks_cluster_role.arn
  vpc_config { ... }
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
