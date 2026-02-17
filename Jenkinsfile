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
                    def branchName = env.BRANCH_NAME ?: 'unknown'
                    def validPattern = /^(main|develop|feature\/.*|bugfix\/.*|hotfix\/.*|release\/.*|PR-\d+)$/
                    
                    if (!branchName.matches(validPattern)) {
                        error("""
                            ❌ Branch name '${branchName}' does not follow Git Flow naming convention!
                            
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
                    
                    echo "✅ Branch name '${branchName}' is valid"
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
                    # Use Node.js 20
                    export PATH=/usr/local/bin:$PATH
                    node --version
                    npm --version
                    
                    # Install dependencies
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
                    # Build the React app
                    npm run build
                    
                    # Verify build output
                    ls -la build/
                '''
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh '''
                    # Build Docker image using the Dockerfile
                    docker build -t ${IMAGE_NAME} .
                    
                    # Verify image was created
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
                        # Update package.json with the tag version
                        sed -i 's/"version": ".*"/"version": "${versionTag.replace('v', '')}"/' package.json
                        
                        # Show the updated version
                        cat package.json | grep '"version"'
                    """
                }
            }
        }
        
        stage('Deploy Container') {
            when {
                tag 'v*'
            }
            steps {
                echo 'Deploying Docker container...'
                script {
                    // Remove old container first
                    sh '''
                        echo "Removing old container if exists..."
                        docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
                        
                        echo "Removing old image if exists..."
                        docker rmi -f ${IMAGE_NAME} 2>/dev/null || true
                    '''
                    
                    def dockerCmd = "docker run -d --name ${params.CONTAINER_NAME} -p ${params.PORT}:80 --restart unless-stopped"
                    
                    // Add proxy network connection if requested
                    if (params.CONNECT_TO_PROXY) {
                        dockerCmd += " --network proxy"
                    }
                    
                    dockerCmd += " ${env.IMAGE_NAME}"
                    
                    sh dockerCmd
                }
            }
        }
        
        stage('Verify Deployment') {
            when {
                tag 'v*'
            }
            steps {
                echo 'Verifying container is running...'
                sh '''
                    # Wait for container to start
                    sleep 5
                    
                    # Check container status
                    docker ps | grep ${CONTAINER_NAME}
                    
                    # Check container logs
                    docker logs ${CONTAINER_NAME}
                    
                    # Test HTTP endpoint
                    curl -f http://localhost:${PORT} || echo "Warning: HTTP check failed"
                '''
            }
        }
    }
    
    post {
        success {
            script {
                if (env.TAG_NAME) {
                    echo "🚀 Deployment successful!"
                    echo "Version: ${env.TAG_NAME}"
                    echo "Access the dashboard at: http://localhost:${params.PORT}"
                    echo "Container name: ${params.CONTAINER_NAME}"
                } else if (env.BRANCH_NAME == 'main') {
                    echo "✅ Build and tests successful on main branch!"
                    echo "To deploy: create a version tag (e.g., git tag -a v1.0.0 -m 'Version 1.0.0')"
                } else {
                    echo "✅ Build and tests successful! (Branch: ${env.BRANCH_NAME})"
                }
            }
        }

        failure {
            script {
                if (env.TAG_NAME) {
                    echo '❌ Deployment failed!'
                    sh '''
                        # Show container logs if available
                        docker logs ${CONTAINER_NAME} 2>/dev/null || true

                        # Cleanup failed container
                        docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
                    '''
                } else {
                    echo "❌ Build failed! (Branch: ${env.BRANCH_NAME})"
                }
            }
        }

        always {
            echo 'Pipeline completed.'
        }
    }
}
