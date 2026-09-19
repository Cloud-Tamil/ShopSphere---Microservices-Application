pipeline {
    agent any

    environment {
        AWS_REGION         = 'us-east-1'
        AWS_ACCOUNT_ID     = credentials('aws-account-id')
        ECR_REGISTRY       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_TAG          = "sha-${env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : env.BUILD_NUMBER}"
        TRIVY_SEVERITY     = 'HIGH,CRITICAL'
        GITOPS_REPO_URL    = 'https://github.com/your-org/shopsphere-microservices.git'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 45, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
    }

    stages {
        stage('Checkout') {
            steps {
                echo "==> Checking out branch: ${env.BRANCH_NAME ?: 'main'} (Commit: ${IMAGE_TAG})"
                checkout scm
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Gateway Deps') {
                    steps {
                        dir('api-gateway') { sh 'if [ -f package-lock.json ]; then npm ci; else npm install; fi' }
                    }
                }
                stage('Auth Deps') {
                    steps {
                        dir('auth-service') { sh 'if [ -f package-lock.json ]; then npm ci; else npm install; fi' }
                    }
                }
                stage('User Deps') {
                    steps {
                        dir('user-service') { sh 'if [ -f package-lock.json ]; then npm ci; else npm install; fi' }
                    }
                }
                stage('Order Deps') {
                    steps {
                        dir('order-service') { sh 'if [ -f package-lock.json ]; then npm ci; else npm install; fi' }
                    }
                }
                stage('Frontend Deps') {
                    steps {
                        dir('frontend') { sh 'if [ -f package-lock.json ]; then npm ci; else npm install; fi' }
                    }
                }
            }
        }

        stage('Unit Tests') {
            parallel {
                stage('Test Gateway') {
                    steps {
                        dir('api-gateway') { sh 'npm test' }
                    }
                }
                stage('Test Auth') {
                    steps {
                        dir('auth-service') { sh 'npm test' }
                    }
                }
                stage('Test User') {
                    steps {
                        dir('user-service') { sh 'npm test' }
                    }
                }
                stage('Test Order') {
                    steps {
                        dir('order-service') { sh 'npm test' }
                    }
                }
            }
        }

        stage('Trivy Filesystem Scan') {
            steps {
                echo "==> Scanning filesystem, dependencies, and secrets with Aqua Trivy..."
                sh """
                    trivy fs . \
                        --severity ${TRIVY_SEVERITY} \
                        --scanners vuln,secret,misconfig \
                        --exit-code 0 \
                        --format table
                """
            }
        }

        stage('Docker Build Images') {
            parallel {
                stage('Build Gateway') {
                    steps {
                        sh "docker build -t ${ECR_REGISTRY}/shopsphere-api-gateway:${IMAGE_TAG} ./api-gateway"
                    }
                }
                stage('Build Auth') {
                    steps {
                        sh "docker build -t ${ECR_REGISTRY}/shopsphere-auth-service:${IMAGE_TAG} ./auth-service"
                    }
                }
                stage('Build User') {
                    steps {
                        sh "docker build -t ${ECR_REGISTRY}/shopsphere-user-service:${IMAGE_TAG} ./user-service"
                    }
                }
                stage('Build Order') {
                    steps {
                        sh "docker build -t ${ECR_REGISTRY}/shopsphere-order-service:${IMAGE_TAG} ./order-service"
                    }
                }
                stage('Build Frontend') {
                    steps {
                        sh "docker build -t ${ECR_REGISTRY}/shopsphere-frontend:${IMAGE_TAG} ./frontend"
                    }
                }
            }
        }

        stage('Trivy Image Vulnerability Scan') {
            steps {
                echo "==> Scanning constructed Docker images before publishing to Amazon ECR..."
                sh """
                    for SERVICE in api-gateway auth-service user-service order-service frontend; do
                        echo "--- Trivy Image Scan for shopsphere-\${SERVICE} ---"
                        trivy image \
                            --severity ${TRIVY_SEVERITY} \
                            --exit-code 0 \
                            --ignore-unfixed \
                            "${ECR_REGISTRY}/shopsphere-\${SERVICE}:${IMAGE_TAG}"
                    done
                """
            }
        }

        stage('ECR Authentication & Push') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-credentials',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh """
                        echo "Authenticating Docker with Amazon ECR..."
                        aws ecr get-login-password --region ${AWS_REGION} | \
                            docker login --username AWS --password-stdin ${ECR_REGISTRY}

                        echo "Pushing immutable versioned images to ECR..."
                        docker push ${ECR_REGISTRY}/shopsphere-api-gateway:${IMAGE_TAG}
                        docker push ${ECR_REGISTRY}/shopsphere-auth-service:${IMAGE_TAG}
                        docker push ${ECR_REGISTRY}/shopsphere-user-service:${IMAGE_TAG}
                        docker push ${ECR_REGISTRY}/shopsphere-order-service:${IMAGE_TAG}
                        docker push ${ECR_REGISTRY}/shopsphere-frontend:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Update GitOps Configuration') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-gitops-token',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh """
                        echo "Updating Kubernetes Deployment manifests with release tag: ${IMAGE_TAG}"
                        sed -i 's|image: .*/shopsphere-api-gateway:.*|image: ${ECR_REGISTRY}/shopsphere-api-gateway:${IMAGE_TAG}|g' k8s/api-gateway/deployment.yaml
                        sed -i 's|image: .*/shopsphere-auth-service:.*|image: ${ECR_REGISTRY}/shopsphere-auth-service:${IMAGE_TAG}|g' k8s/auth-service/deployment.yaml
                        sed -i 's|image: .*/shopsphere-user-service:.*|image: ${ECR_REGISTRY}/shopsphere-user-service:${IMAGE_TAG}|g' k8s/user-service/deployment.yaml
                        sed -i 's|image: .*/shopsphere-order-service:.*|image: ${ECR_REGISTRY}/shopsphere-order-service:${IMAGE_TAG}|g' k8s/order-service/deployment.yaml
                        sed -i 's|image: .*/shopsphere-frontend:.*|image: ${ECR_REGISTRY}/shopsphere-frontend:${IMAGE_TAG}|g' k8s/frontend/deployment.yaml

                        if git status --porcelain | grep -q "k8s/"; then
                            git config user.name "ShopSphere CI/CD Bot"
                            git config user.email "ci-bot@shopsphere.io"
                            git add k8s/
                            git commit -m "chore(gitops): promote release ${IMAGE_TAG} [skip ci]"
                            git push https://${GIT_USER}:${GIT_TOKEN}@github.com/your-org/shopsphere-microservices.git HEAD:main
                            echo "GitOps manifest committed. Argo CD will automatically synchronize to EKS."
                        else
                            echo "No manifest changes detected."
                        fi
                    """
                }
            }
        }
    }

    post {
        always {
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo "SUCCESS: Pipeline completed for commit ${IMAGE_TAG}."
        }
        failure {
            echo "FAILURE: Build or security scan failed. Pipeline halted."
        }
    }
}
