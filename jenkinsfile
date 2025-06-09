pipeline {
    agent any

    options {
        // Timeout global pour éviter les builds bloqués
        timeout(time: 30, unit: 'MINUTES')
        timestamps() // Ajoute des horodatages aux logs
    }

    environment {
        DOCKER_IMAGE = "nadaelouedi/mongo"
        VERSION = "6.1"
    }

    stages {
        stage('Clone Repo') {
            steps {
                git branch: 'main', credentialsId: 'github', url: 'https://github.com/nada-elouedi/Mongoimages.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build --no-cache -t ${DOCKER_IMAGE}:${VERSION} ."
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
    }

    post {
        always {
            echo 'Nettoyage des artefacts Docker...'
            sh "docker rmi ${DOCKER_IMAGE}:${VERSION} || true"
        }
        failure {
            echo ' Le pipeline a échoué. Veuillez consulter les logs.'
        }
        success {
            echo ' Pipeline exécuté avec succès.'
        }
    }
}
