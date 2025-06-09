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
                        usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS'),
                        string(credentialsId: 'cosign_password', variable: 'COSIGN_PASSWORD')
                    ]) {
                        sh '''
                            echo "Setting up Docker authentication for Cosign signing..."

                            mkdir -p /var/lib/jenkins/.docker

                            # Encode Docker credentials in base64 without newline
                            AUTH_B64=$(echo -n "${DOCKER_USER}:${DOCKER_PASS}" | base64 | tr -d '\\n')

                            # Create a valid Docker config.json with proper JSON format
                            cat > /var/lib/jenkins/.docker/config.json <<EOF
{
  "auths": {
    "https://index.docker.io/v1/": {
      "auth": "${AUTH_B64}"
    }
  }
}
EOF
                            chmod 600 /var/lib/jenkins/.docker/config.json

                            echo "Docker config.json content:"
                            cat /var/lib/jenkins/.docker/config.json

                            # Verify cosign version
                            cosign version

                            # Export COSIGN_PASSWORD env var for cosign to pick up
                            export COSIGN_PASSWORD=${COSIGN_PASSWORD}

                            # Use full image reference with digest for signing
                            IMAGE_DIGEST=\$(docker inspect --format='{{index .RepoDigests 0}}' ${DOCKER_IMAGE}:${VERSION})
                            echo "Signing image \$IMAGE_DIGEST with cosign..."
                            cosign sign --key cosign.key --yes "\$IMAGE_DIGEST"
                        '''
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
