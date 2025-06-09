pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    environment {
        DOCKER_IMAGE = "nadaelouedi/mongo"
        VERSION = "6.1"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main', credentialsId: 'github', url: 'https://github.com/nada-elouedi/Mongoimages.git'
            }
        }

        stage('Lint Dockerfile') {
            steps {
                sh '''
                    if command -v hadolint &> /dev/null; then
                        hadolint Dockerfile || echo "⚠️ Lint warnings detected"
                    else
                        echo "⚠️ hadolint non trouvé, veuillez l’installer sur la machine Jenkins"
                        exit 1
                    fi
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build --no-cache -t ${DOCKER_IMAGE}:${VERSION} ."
            }
        }

        stage('Security Scan with Trivy') {
            steps {
                sh '''
                    if command -v trivy &> /dev/null; then
                        echo "✅ Trivy est déjà installé : $(trivy --version)"
                    else
                        echo "❌ Trivy n'est pas installé sur cette machine."
                        exit 1
                    fi

                    echo "🔍 Scan de sécurité avec Trivy..."
                    trivy image --exit-code 0 --severity CRITICAL,HIGH --format json --output reports/trivy-report.json ${DOCKER_IMAGE}:${VERSION} || true
                '''
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push ${DOCKER_IMAGE}:${VERSION}
                        docker logout
                    '''
                }
            }
        }

stage('Cosign Sign') {
    steps {
        script {
            withCredentials([
                file(credentialsId: 'cosign-key', variable: 'COSIGN_KEY_FILE'),
                string(credentialsId: 'cosign-password', variable: 'COSIGN_PASSWORD'),
                usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')
            ]) {
                try {
                    sh '''
                        # 1. Authentification Docker
                        echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin

                        # 2. Configurer l'authentification Cosign
                        mkdir -p ~/.docker
                        echo '{"auths":{"https://index.docker.io/v1/":{"auth":"'$(echo -n "${DOCKER_USER}:${DOCKER_PASS}" | base64 | tr -d '\n')'"}}}' > ~/.docker/config.json
                        chmod 600 ~/.docker/config.json

                        # 3. Signer avec Cosign (en utilisant le tag)
                        export COSIGN_PASSWORD="${COSIGN_PASSWORD}"
                        cosign sign \
                            --key "${COSIGN_KEY_FILE}" \
                            --yes \
                            --registry-auth \
                            "${DOCKER_IMAGE}:${VERSION}"

                        # 4. Vérification
                        cosign verify \
                            --key "${COSIGN_KEY_FILE}" \
                            "${DOCKER_IMAGE}:${VERSION}"
                    '''
                } catch (Exception e) {
                    error "Échec de la signature Cosign: ${e.getMessage()}"
                } finally {
                    sh '''
                        docker logout || true
                        rm -f ~/.docker/config.json || true
                    '''
                }
            }
        }
    }
}


        stage('Compliance Report') {
            steps {
                archiveArtifacts artifacts: 'reports/trivy-report.json', fingerprint: true
            }
        }
    }

    post {
        always {
            echo '🧹 Nettoyage Docker local...'
            sh "docker rmi ${DOCKER_IMAGE}:${VERSION} || true"

            emailext (
                subject: "📦 Trivy Report - ${JOB_NAME} #${BUILD_NUMBER}",
                body: """
                    <p>Bonjour,</p>
                    <p>Le pipeline <b>${JOB_NAME}</b> (build #${BUILD_NUMBER}) a généré un rapport Trivy.</p>
                    <p>Status : <b>${currentBuild.currentResult}</b></p>
                    <p>Veuillez trouver ci-joint le rapport JSON du scan de sécurité Docker.</p>
                    <p>Cordialement,<br>Jenkins</p>
                """,
                mimeType: 'text/html',
                to: 'nada.elouedi@esprit.tn',
                attachmentsPattern: 'reports/trivy-report.json'
            )
        }
        success {
            echo '✅ Pipeline réussi.'
            emailext(
                subject: "Build succeeded: Job ${JOB_NAME} [#${BUILD_NUMBER}]",
                body: "The build was successful.\n\nCheck console output at: ${BUILD_URL}",
                to: 'nada.elouedi@esprit.tn',
                from: 'elouedinada19@gmail.com',
                mimeType: 'text/plain'
            )
        }
        failure {
            echo '🚨 Pipeline échoué.'
            emailext(
                subject: "❌ Build failed: Job ${JOB_NAME} [#${BUILD_NUMBER}]",
                body: "The build has failed.\n\nCheck console output at: ${BUILD_URL}",
                to: 'nada.elouedi@esprit.tn',
                from: 'elouedinada19@gmail.com',
                mimeType: 'text/plain'
            )
        }
    }
}
