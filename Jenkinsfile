pipeline {
    agent { label 'host' }
    
    parameters {
        string(name: 'CONTAINER_NAME', defaultValue: 'github-quota-viz', description: 'Docker container name')
        string(name: 'PORT', defaultValue: '8085', description: 'Port to expose the application')
        booleanParam(name: 'CONNECT_TO_PROXY', defaultValue: true, description: 'Connect to proxy network')
    }
    
    environment {
        IMAGE_NAME = 'github-quota-viz'
        NODE_VERSION = '20'
    }
    
    stages {
        stage('Validate Branch Name') {
            steps {
                script {
                    // Skip validation for tags - they are inherently valid deployment triggers
                    if (env.TAG_NAME) {
                        echo "Tag '${env.TAG_NAME}' detected - skipping branch validation"
                        return
                    }
                    
                    def branchName = env.BRANCH_NAME ?: 'unknown'
                    def validPattern = /^(main|develop|feature\/.*|bugfix\/.*|hotfix\/.*|release\/.*|PR-\d+)$/
                    
                    if (!branchName.matches(validPattern)) {
                        error("""
                            Branch name '${branchName}' does not follow Git Flow naming convention!
                            
                            Allowed patterns:
                            - main (production)
                            - develop (integration)
                            - feature/* (new features)
                            - bugfix/* (bug fixes)
                            - hotfix/* (urgent production fixes)
                            - release/* (release preparation)
                            - PR-* (pull requests)
                            
                            Please rename your branch following these conventions.
                        """)
                    }
                    
                    echo "Branch name '${branchName}' is valid"
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                echo 'Cleaning up previous builds...'
                sh '''
                    # Always clean build artifacts
                    rm -rf node_modules build
                '''
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing Node.js dependencies...'
                sh '''
                    export PATH=/usr/local/bin:$PATH
                    node --version
                    npm --version
                    npm ci
                '''
            }
        }
        
        stage('Lint') {
            steps {
                echo 'Running ESLint...'
                sh 'npm run lint'
            }
        }
        
        stage('Test') {
            steps {
                echo 'Running tests...'
                sh 'npm test'
            }
        }
        
        stage('Build React App') {
            steps {
                echo 'Building React application...'
                sh '''
                    npm run build
                    ls -la build/
                '''
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh '''
                    docker build -t ${IMAGE_NAME} .
                    docker images | grep ${IMAGE_NAME}
                '''
            }
        }
        
        stage('Update Version') {
            when {
                tag 'v*'
            }
            steps {
                echo 'Updating package.json version...'
                script {
                    def versionTag = env.TAG_NAME
                    echo "Updating package.json to version ${versionTag}"
                    
                    sh """
                        sed -i 's/"version": ".*"/"version": "${versionTag.replace('v', '')}"/' package.json
                        cat package.json | grep '"version"'
                    """
                }
            }
        }
        
        stage('Deploy Container') {
            when {
                anyOf {
                    branch 'main'
                    tag 'v*'
                }
            }
            steps {
                echo 'Deploying Docker container...'
                script {
                    sh """
                        echo "Removing old container if exists..."
                        docker rm -f ${params.CONTAINER_NAME} 2>/dev/null || true
                    """
                    
                    withCredentials([
                        string(credentialsId: 'GITHUB_QUOTA_API_KEY', variable: 'API_SECRET_KEY'),
                        string(credentialsId: 'GITHUB_QUOTA_ENC_KEY', variable: 'TOKEN_ENCRYPTION_KEY')
                    ]) {
                        def volumeName = "${params.CONTAINER_NAME}-data"
                        
                        def dockerCmd = "docker run -d" +
                            " --name ${params.CONTAINER_NAME}" +
                            " -p ${params.PORT}:80" +
                            " --restart unless-stopped" +
                            " -v ${volumeName}:/data" +
                            " -e API_SECRET_KEY=\${API_SECRET_KEY}" +
                            " -e TOKEN_ENCRYPTION_KEY=\${TOKEN_ENCRYPTION_KEY}" +
                            " -e REACT_APP_API_KEY=\${API_SECRET_KEY}"
                        
                        if (params.CONNECT_TO_PROXY) {
                            dockerCmd += " --network proxy"
                        }
                        
                        dockerCmd += " ${env.IMAGE_NAME}"
                        
                        sh dockerCmd
                    }
                }
            }
        }
        
        stage('Verify Deployment') {
            when {
                anyOf {
                    branch 'main'
                    tag 'v*'
                }
            }
            steps {
                echo 'Verifying container is running...'
                sh """
                    sleep 5
                    docker ps | grep ${params.CONTAINER_NAME}
                    docker logs ${params.CONTAINER_NAME}
                    curl -f http://localhost:${params.PORT} || echo "Warning: HTTP check failed"
                """
            }
        }
    }
    
    post {
        success {
            script {
                if (env.TAG_NAME) {
                    echo "Deployment successful!"
                    echo "Version: ${env.TAG_NAME}"
                    echo "Access the dashboard at: http://localhost:${params.PORT}"
                    echo "Container name: ${params.CONTAINER_NAME}"
                    echo "Data volume: ${params.CONTAINER_NAME}-data"
                } else if (env.BRANCH_NAME == 'main') {
                    echo "Deployment successful!"
                    echo "Access the dashboard at: http://localhost:${params.PORT}"
                    echo "Container name: ${params.CONTAINER_NAME}"
                    echo "Data volume: ${params.CONTAINER_NAME}-data"
                } else {
                    echo "Build and tests successful! (Branch: ${env.BRANCH_NAME})"
                }
            }
        }

        failure {
            script {
                if (env.TAG_NAME || env.BRANCH_NAME == 'main') {
                    echo 'Deployment failed!'
                    sh """
                        docker logs ${params.CONTAINER_NAME} 2>/dev/null || true
                        docker rm -f ${params.CONTAINER_NAME} 2>/dev/null || true
                    """
                } else {
                    echo "Build failed! (Branch: ${env.BRANCH_NAME})"
                }
            }
        }

        always {
            echo 'Pipeline completed.'
        }
    }
}
