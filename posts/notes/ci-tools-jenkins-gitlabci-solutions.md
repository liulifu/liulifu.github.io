# Jenkins 与 GitLab CI：企业级 CI/CD 方案与实战（含项目示例与命令）

面向中小企业的一套“能落地、可复制”的 CI/CD 方案，对比 Jenkins 与 GitLab CI，并给出同一示例项目的两套流水线配置与完整命令。

---

## 0. 示例项目与目标
- 语言/框架：Java 17 + Spring Boot（REST API）
- 构建工具：Maven 3.9+
- 交付制品：Docker 镜像 `demo-api:latest`
- 部署目标：一台 Linux 服务器（示例以 `root@your-ecs-ip` 表示）
- 目录结构（最小化）：
```
project-root/
  pom.xml
  src/main/java/com/example/demo/Application.java
  src/test/java/com/example/demo/ApplicationTests.java
  Dockerfile
```
- 示例 Dockerfile：
```
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY target/demo-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

---

## 1. Jenkins 方案

### 1.1 安装与准备（Linux / Docker）
- 创建网络与启动 Jenkins（具备使用 Docker 的能力）：
```
docker network create ci-net || true

docker run -d \
  --name jenkins \
  --user root \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/bin/docker:/usr/bin/docker \
  --restart=always \
  jenkins/jenkins:lts
```
- 初始密码：
```
docker exec -it jenkins bash -lc 'cat /var/jenkins_home/secrets/initialAdminPassword'
```
- 建议安装插件：Pipeline、Git、Blue Ocean、Credentials、Docker Pipeline。
- 全局工具（可选）：配置 JDK 17、Maven 3.9（也可在 Pipeline 中用容器镜像）。

### 1.2 Jenkinsfile（声明式 Pipeline）
- 将以下 `Jenkinsfile` 放在项目根目录：
```
pipeline {
  agent {
    docker {
      image 'maven:3.9.9-eclipse-temurin-17'
      args  '-v /var/run/docker.sock:/var/run/docker.sock'
    }
  }

  environment {
    REGISTRY   = 'registry-1.docker.io' // 或私有仓库
    IMAGE_NAME = 'your_dockerhub_user/demo-api'
    ECS_HOST   = 'your-ecs-ip'
    ECS_USER   = 'root'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build & Test') {
      steps {
        sh 'mvn -B -DskipTests=false clean test'
        sh 'mvn -B -DskipTests=true  package'
      }
      post {
        always { junit 'target/surefire-reports/*.xml' }
      }
    }

    stage('Docker Build') {
      steps { sh 'docker build -t ${IMAGE_NAME}:$BUILD_NUMBER .'
      }
    }

    stage('Docker Login & Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin ${REGISTRY}'
          sh 'docker tag ${IMAGE_NAME}:$BUILD_NUMBER ${IMAGE_NAME}:latest'
          sh 'docker push ${IMAGE_NAME}:$BUILD_NUMBER && docker push ${IMAGE_NAME}:latest'
        }
      }
    }

    stage('Deploy to ECS') {
      steps {
        sshagent(credentials: ['ecs-ssh-key']) {
          sh '''
            ssh -o StrictHostKeyChecking=no ${ECS_USER}@${ECS_HOST} \
              "docker rm -f demo-api || true && \
               docker pull ${IMAGE_NAME}:latest && \
               docker run -d --name demo-api --restart=always -p 8080:8080 ${IMAGE_NAME}:latest"
          '''
        }
      }
    }
  }
}
```
- Jenkins 凭据需要提前创建：
  - `dockerhub-creds`：Docker 仓库用户名/密码
  - `ecs-ssh-key`：到目标主机的 SSH 私钥

### 1.3 常用命令
```
# Jenkins 容器内查看日志
docker logs -f jenkins

# Jenkins 节点上清理 Docker 镜像/容器（示例）
docker image prune -f && docker container prune -f
```

---

## 2. GitLab CI 方案

### 2.1 安装/注册 Runner（Docker 推荐）
```
# 启动 GitLab Runner（Docker 方式）
docker run -d --name gitlab-runner --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v gitlab-runner-config:/etc/gitlab-runner \
  gitlab/gitlab-runner:latest

# 注册 Runner（替换 URL 与注册 Token）
docker exec -it gitlab-runner gitlab-runner register \
  --non-interactive \
  --url https://gitlab.example.com/ \
  --registration-token REG_TOKEN \
  --executor docker \
  --docker-image maven:3.9.9-eclipse-temurin-17 \
  --description "docker-runner" \
  --tag-list "docker,maven" \
  --run-untagged=true \
  --locked=false
```

### 2.2 .gitlab-ci.yml（与 Jenkinsfile 同等功能）
```
image: maven:3.9.9-eclipse-temurin-17

services:
  - name: docker:dind
    command: ["--tls=false"]

variables:
  DOCKER_HOST: tcp://docker:2375
  DOCKER_TLS_CERTDIR: ""
  IMAGE_NAME: your_dockerhub_user/demo-api
  REGISTRY: registry-1.docker.io

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .m2/repository

stages:
  - build
  - docker
  - deploy

build:
  stage: build
  script:
    - mvn -B -DskipTests=false clean test
    - mvn -B -DskipTests=true package
  artifacts:
    paths:
      - target/*.jar
    expire_in: 1 week

docker:
  stage: docker
  script:
    - echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin $REGISTRY
    - docker build -t $IMAGE_NAME:$CI_COMMIT_SHORT_SHA .
    - docker tag  $IMAGE_NAME:$CI_COMMIT_SHORT_SHA $IMAGE_NAME:latest
    - docker push $IMAGE_NAME:$CI_COMMIT_SHORT_SHA
    - docker push $IMAGE_NAME:latest
  only:
    - main

deploy:
  stage: deploy
  before_script:
    - 'which ssh || apt-get update && apt-get install -y openssh-client'
  script:
    - |
      ssh -o StrictHostKeyChecking=no $ECS_USER@$ECS_HOST \
        "docker rm -f demo-api || true && \
         docker pull $IMAGE_NAME:latest && \
         docker run -d --name demo-api --restart=always -p 8080:8080 $IMAGE_NAME:latest"
  only:
    - tags
  when: manual
```
- 项目 CI/CD 变量：`DOCKER_USER`、`DOCKER_PASS`、`ECS_HOST`、`ECS_USER` 在 GitLab 项目 Settings → CI/CD → Variables 配置。

### 2.3 常用命令
```
# Runner 日志
docker logs -f gitlab-runner

# 手工在 Runner 主机验证 Docker 是否可用
docker info && docker run --rm hello-world
```

---

## 3. 方案对比与选型
- Jenkins：高度可定制，插件生态丰富；需自运维（备份、升级、HA）。
- GitLab CI：与 GitLab 代码、Issue、MR 无缝整合；Runner 弹性好；SaaS/自建均可。
- 通用建议：
  - 代码托管在 GitLab → 优先 GitLab CI；
  - 需跨多源代码平台、复杂编排 → Jenkins；
  - 生产镜像统一通过 Docker 构建，流水线中尽量采用容器化环境保证一致性。

---

## 4. 故障排查速查表
- 凭据失败：检查 Jenkins/GitLab 变量与权限；Docker Hub 速率限制。
- 构建失败：优先查看 `target/surefire-reports` 与控制台日志；确认 JDK/Maven 版本一致。
- Docker 失败：确认 Runner/Agent 有权访问 `/var/run/docker.sock` 或 dind；`DOCKER_HOST` 设置正确。
- 部署失败：确认目标主机能访问镜像仓库；SSH 连通、磁盘端口占用、旧容器清理。

