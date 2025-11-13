# Apache Maven 自动化构建与测试：案例教学与命令行

面向“零到一”的入门与企业常见用法（含完整命令）。

---

## 1. 环境与安装
- 操作系统：Windows/Linux/macOS 任意
- 依赖：JDK 17、Maven 3.9+

安装建议：
- Windows（管理员 PowerShell）
```
winget install EclipseAdoptium.Temurin.17.JDK
winget install TheApacheSoftwareFoundation.Maven
mvn -v && java -version
```
- Ubuntu/Debian
```
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk maven
mvn -v && java -version
```
- 也可使用 SDKMAN!/Homebrew 等方式，或在 CI 中使用容器镜像（maven:3.9.9-eclipse-temurin-17）。

---

## 2. 快速开始：创建 Demo 项目
使用官方 archetype 快速生成骨架：
```
mvn -B archetype:generate \
  -DarchetypeGroupId=org.apache.maven.archetypes \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DarchetypeVersion=1.4 \
  -DgroupId=com.example \
  -DartifactId=demo \
  -Dversion=1.0-SNAPSHOT
```
目录结构（核心）：
```
demo/
  pom.xml
  src/main/java/com/example/App.java
  src/test/java/com/example/AppTest.java
```
常用命令：
```
cd demo
mvn clean            # 清理
mvn test             # 运行单元测试（Surefire）
mvn package          # 产出 jar（target/*.jar）
mvn install          # 安装到本地仓库 ~/.m2
mvn -T 1C -B package # 并行构建与批处理模式
```

---

## 3. POM 关键配置示例
最小可用的编译/测试配置：
```
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>1.0-SNAPSHOT</version>
  <properties>
    <maven.compiler.release>17</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <maven.surefire.plugin.version>3.2.5</maven.surefire.plugin.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.3</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>${maven.surefire.plugin.version}</version>
        <configuration>
          <useSystemClassLoader>false</useSystemClassLoader>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

### 常见加强：Jacoco 覆盖率与 Shade 打包
```
<build>
  <plugins>
    <plugin>
      <groupId>org.jacoco</groupId>
      <artifactId>jacoco-maven-plugin</artifactId>
      <version>0.8.11</version>
      <executions>
        <execution>
          <goals>
            <goal>prepare-agent</goal>
          </goals>
        </execution>
        <execution>
          <id>report</id>
          <phase>verify</phase>
          <goals>
            <goal>report</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-shade-plugin</artifactId>
      <version>3.5.3</version>
      <executions>
        <execution>
          <phase>package</phase>
          <goals><goal>shade</goal></goals>
          <configuration>
            <createDependencyReducedPom>true</createDependencyReducedPom>
            <transformers>
              <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                <mainClass>com.example.App</mainClass>
              </transformer>
            </transformers>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```
打包并运行（若使用 Shade）：
```
mvn -B -DskipTests package
java -jar target/demo-1.0-SNAPSHOT-shaded.jar
```

---

## 4. 与 Spring Boot 的最小整合
如需 Spring Boot：
```
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <version>3.3.5</version>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <version>3.3.5</version>
    <scope>test</scope>
  </dependency>
</dependencies>
<build>
  <plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
      <version>3.3.5</version>
    </plugin>
  </plugins>
</build>
```
运行：
```
mvn -B -DskipTests package
java -jar target/*.jar
```

---

## 5. 多模块（Monorepo）示例
结构：
```
root/
  pom.xml (packaging=pom)
  app/
    pom.xml
  lib/
    pom.xml
```
父 POM 关键：
```
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>root</artifactId>
  <version>1.0-SNAPSHOT</version>
  <packaging>pom</packaging>
  <modules>
    <module>lib</module>
    <module>app</module>
  </modules>
</project>
```
构建命令：
```
mvn -B -pl lib -am package   # 仅构建 lib（自动构建依赖）
mvn -B -pl app -amd package  # 构建 app（含其依赖）
```

---

## 6. CI 集成（与 Jenkins/GitLab CI）
- Jenkins：在容器 agent 中执行 `mvn -B clean test package`，产出 Surefire 报告与制品；之后 Docker 构建与推送。
- GitLab CI：使用 `image: maven:3.9.9-eclipse-temurin-17`，缓存 `~/.m2/repository` 提速。

GitLab 片段：
```
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths: [ .m2/repository ]
script:
  - mvn -B -DskipTests=false clean test
  - mvn -B -DskipTests=true package
```

---

## 7. 常见问题速查
- 测试未运行：Jupiter 依赖缺失或包名/类名不符合约定（以 *Test 结尾）。
- JDK 版本冲突：使用 `<maven.compiler.release>` 或在 CI 镜像中固定到 Temurin 17。
- 依赖下载慢：配置镜像仓库（如阿里云/华为云 Maven 镜像）。
- 打包体积大：使用 Shade 时合理排除；或改用 Spring Boot Plugin 的分层 jar。

---

## 8. 常用命令速查表
```
mvn -v                         # 版本
mvn clean                      # 清理
mvn test                       # 单元测试
mvn package                    # 构建制品
mvn verify                     # 含集成测试与验证
mvn install                    # 安装到本地仓库
mvn dependency:tree            # 依赖树
mvn help:effective-pom         # 最终生效 POM
mvn -T 1C -B package           # 并行+批处理
```

