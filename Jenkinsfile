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
        stage('Cleanup') {
            steps {
                echo 'Cleaning up previous builds...'
                sh '''
                    # Remove old container if exists
                    docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
                    
                    # Remove old image if exists
                    docker rmi -f ${IMAGE_NAME} 2>/dev/null || true
                    
                    # Clean npm cache and node_modules
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
        
        stage('Deploy Container') {
            steps {
                echo 'Deploying Docker container...'
                script {
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
            echo "Deployment successful!"
            echo "Access the dashboard at: http://localhost:${params.PORT}"
            echo "Container name: ${params.CONTAINER_NAME}"
        }
        
        failure {
            echo 'Deployment failed!'
            sh '''
                # Show container logs if available
                docker logs ${CONTAINER_NAME} 2>/dev/null || true
                
                # Cleanup failed container
                docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
            '''
        }
        
        always {
            echo 'Pipeline completed.'
        }
    }
}
