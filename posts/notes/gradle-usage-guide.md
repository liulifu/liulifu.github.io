# Gradle 使用方案：从入门到实践（含项目与命令）

目标：给出一套可在本地/CI 直接上手的 Gradle 实践方案，覆盖初始化、构建、测试、多模块与 CI 集成。

---

## 1. 环境与安装
- 建议：JDK 17，Gradle 8.10+
- 推荐使用 Gradle Wrapper（gradlew）确保 CI 与本地版本一致。

安装与检查（Linux/macOS 举例）：
```
# 若使用 SDKMAN!
curl -s https://get.sdkman.io | bash
sdk install java 17.0.10-tem
sdk install gradle 8.10

# 也可直接下载 zip；项目内优先使用 wrapper
java -version && gradle -v
```

Windows 建议通过 Winget/Zip，并在项目中使用 wrapper。

---

## 2. 初始化一个 Java 应用
在空目录执行：
```
gradle init --type java-application --dsl kotlin --test-framework junit-jupiter \
  --project-name demo --package com.example
```
核心结构：
```
demo/
  build.gradle.kts
  settings.gradle.kts
  gradle/wrapper/
  gradlew  gradlew.bat
  src/main/java/com/example/App.java
  src/test/java/com/example/AppTest.java
```

---

## 3. 关键构建脚本（build.gradle.kts）
下面是一个最小可用、含测试与应用插件的示例：
```
plugins {
  application
  java
}

group = "com.example"
version = "1.0.0"

java {
  toolchain { languageVersion.set(JavaLanguageVersion.of(17)) }
}

repositories { mavenCentral() }

dependencies {
  testImplementation(platform("org.junit:junit-bom:5.10.3"))
  testImplementation("org.junit.jupiter:junit-jupiter")
}

tasks.test {
  useJUnitPlatform()
  testLogging { events("PASSED", "FAILED", "SKIPPED") }
}

application {
  mainClass.set("com.example.App")
}
```
常用命令：
```
./gradlew clean test build     # 清理、测试、构建
./gradlew run                  # 运行应用（application 插件）
./gradlew tasks                # 查看可用任务
```

---

## 4. 依赖管理与版本对齐
- 使用 BOM：统一测试或 Spring 依赖版本
```
dependencies {
  implementation(platform("org.springframework.boot:spring-boot-dependencies:3.3.5"))
  implementation("org.springframework.boot:spring-boot-starter-web")
  testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```
- 锁定 Java 工具链避免“我机器行、CI 不行”。

---

## 5. 多模块（Multi-Project）
目录：
```
root/
  settings.gradle.kts
  build.gradle.kts       # 父级公共配置
  app/                   # 应用模块
    build.gradle.kts
  lib/                   # 库模块
    build.gradle.kts
```
settings.gradle.kts：
```
rootProject.name = "demo"
include(":app", ":lib")
```
父级 build.gradle.kts（公共约定）：
```
plugins { java }

subprojects {
  apply(plugin = "java")
  group = "com.example"
  version = "1.0.0"

  repositories { mavenCentral() }
  java { toolchain { languageVersion.set(JavaLanguageVersion.of(17)) } }

  tasks.test { useJUnitPlatform() }
}
```
模块 lib/build.gradle.kts：
```
dependencies {
  // 仅示例：无第三方依赖
}
```
模块 app/build.gradle.kts：
```
plugins { application }

dependencies {
  implementation(project(":lib"))
}

application { mainClass.set("com.example.App") }
```
构建与运行：
```
./gradlew :lib:build
./gradlew :app:run
```

---

## 6. 常见增强：代码质量与覆盖率
- Spotless（格式化）、Checkstyle/PMD（静态检查）、Jacoco（覆盖率）
以 Jacoco 为例：
```
plugins { jacoco }

tasks.jacocoTestReport {
  dependsOn(tasks.test)
  reports { xml.required.set(true); html.required.set(true) }
}

# 生成覆盖率报告
./gradlew test jacocoTestReport
```

---

## 7. 与 Spring Boot 的轻量集成
如需 Spring Boot：
```
plugins {
  id("org.springframework.boot") version "3.3.5"
  id("io.spring.dependency-management") version "1.1.6"
  java
}

dependencies {
  implementation("org.springframework.boot:spring-boot-starter-web")
  testImplementation("org.springframework.boot:spring-boot-starter-test")
}

# 运行与构建
./gradlew bootRun
./gradlew bootJar
```

---

## 8. CI 集成（Jenkins/GitLab/GitHub Actions）
通用建议：
- 固化 JDK 与 Gradle Wrapper：仅执行 `./gradlew ...`；
- 开启构建缓存与依赖缓存（CI 层缓存 ~/.gradle 与 wrapper）。

Jenkins 片段：
```
stage('Build & Test') { sh './gradlew -S clean test build' }
```
GitLab CI 片段：
```
image: gradle:8.10.0-jdk17
cache: { paths: [ .gradle, .gradle/wrapper, build ] }
script:
  - ./gradlew -S clean test build
```
GitHub Actions 片段：
```
- uses: actions/setup-java@v4
  with: { distribution: temurin, java-version: '17' }
- uses: gradle/actions/setup-gradle@v3
- run: ./gradlew -S clean test build
```

---

## 9. 常见问题速查
- Wrapper 版本不一致：删除本地 `.gradle` 与 `gradle/wrapper` 后重置，再由 CI 产出的 wrapper 为准；
- JUnit 未执行：确保 `useJUnitPlatform()`；
- 依赖冲突：使用 `./gradlew dependencies` 与 `./gradlew dependencyInsight --dependency xxx` 定位；
- 构建慢：开启 Gradle Daemon（默认）、本地与 CI 缓存、并行 `--parallel`（多模块）。

