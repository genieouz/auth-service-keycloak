@Library('docker-build-library') _


dockerBuild([
    // Basic configuration
    imageName: 'senum1/senegal-service-auth-api',
    imageTag: "${env.BRANCH_NAME}-${env.BUILD_NUMBER}",
    additionalTags: ['latest', env.BRANCH_NAME],
    dockerfilePath: 'Dockerfile',
    disableBuildKit: true,
    

    // Registry configuration
    registryUrl: 'registry.gitlab.com',
    registryCredentialsId: 'gitlab-cred-eyone',
    pushToRegistry: true,
    
    // Build arguments
    buildArgs: [
        'APP_VERSION': env.BUILD_NUMBER,
        'BUILD_DATE': new Date().format('yyyy-MM-dd'),
        'GIT_COMMIT': env.GIT_COMMIT
    ],
    
    // Build options
    // buildOptions: '--no-cache --squash',
    enableCache: false,
    
    // Security scanning
    enableSecurity: true,
    securityTool: 'trivy',
    failOnCritical: false, 

    // Testing
    enableTests: false,
    testCommands: [
        '/app/healthcheck.sh',
        'curl -f http://localhost:8080/health'
    ],
    healthCheck: '/app/healthcheck.sh',
    
    // Multi-architecture
    enableMultiArch: false,
    platforms: ['linux/amd64', 'linux/arm64'],
    

    // Enable Helm chart updates
    updateHelmChart: true,
    helmChart: [
        gitUrl: 'https://gitlab.com/senum1/charts/services.git',
        gitBranch: 'main',
        gitCredentialsId: 'gitlab-cred-eyone',
        chartPath: 'production',              // Folder containing values.yaml
        imageTagPath: 'image.tag',             // Path in YAML to update
        valuesFile: 'values-senegal-service-auth-api.yaml'              // Values file name (optional, defaults to values.yaml)
    ],
    // Notifications
    enableNotifications: false,
    slackChannel: '#deployments',
    slackCredentialsId: 'slack-token',
    
    // Cleanup
    cleanupImages: true,
    keepImages: 3
])