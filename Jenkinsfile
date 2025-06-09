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
trivy image --exit-code 0 --severity CRITICAL,HIGH ${DOCKER_IMAGE}:${VERSION} || true
                '''
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh '''
                        echo "$PASS" | docker login -u "$USER" --password-stdin
                        docker push ${DOCKER_IMAGE}:${VERSION}
                        docker logout
                    '''
                }
            }
        }

        stage('Compliance Report (Trivy JSON Export)') {
            steps {
                sh '''
                    mkdir -p reports
                    trivy image --format json -o reports/trivy-report.json ${DOCKER_IMAGE}:${VERSION}
                '''
                archiveArtifacts artifacts: 'reports/trivy-report.json', fingerprint: true
            }
        }

    }

    post {
    always {
        echo ' Nettoyage Docker local...'
        sh "docker rmi ${DOCKER_IMAGE}:${VERSION} || true"

        // Envoi du rapport Trivy par email
        emailext (
            subject: "Rapport Trivy - ${JOB_NAME} [${BUILD_NUMBER}]",
            body: """<p>Bonjour,</p>
                     <p>Veuillez trouver ci-joint le rapport Trivy généré lors du pipeline <b>${JOB_NAME}</b> (build #${BUILD_NUMBER}).</p>
                     <p>Statut du pipeline : <b>${currentBuild.currentResult}</b></p>
                     <p>Cordialement,<br>Votre Jenkins</p>""",
            mimeType: 'text/html',
            to: 'nadaelouedi@esprit.tn'
            attachLog: false,
            attachmentsPattern: 'reports/trivy-report.json'
        )
    }
    failure {
        echo '🚨 Pipeline échoué.'
    }
    success {
        echo '✅ Pipeline réussi.'
    }
}
