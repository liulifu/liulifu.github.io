# Apache SkyWalking 使用方案与运维经验

本文覆盖：架构原理、Docker 快速部署、Java 应用接入、采样与 TTL 策略、常见问题与运维经验。

---

## 1. 概览与架构
- 组件：OAP Server（核心后端）+ UI（可视化）+ 存储（Elasticsearch/BanyanDB/H2 Demo）+ Agent（Java/Node/Go 等）
- 数据流：Agent → OAP（分析/聚合/度量/追踪）→ 存储 → UI 查询
- 典型用途：分布式追踪、指标（Metrics）、日志（Logging）、告警（Alerting）

---

## 2. Docker Compose 快速部署
下面给出基于 Elasticsearch 的生产就绪示例（最常见）；如仅快速体验，可将 ES 改为单机 H2（不推荐生产）。

docker-compose.yml：
```
version: '3.8'
services:
  elasticsearch:
    image: docker.io/library/elasticsearch:8.15.3
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
    ulimits: { memlock: { soft: -1, hard: -1 } }
    volumes:
      - es-data:/usr/share/elasticsearch/data
    ports: ["9200:9200"]

  oap:
    image: apache/skywalking-oap-server:10.1.0
    depends_on: [ elasticsearch ]
    environment:
      SW_STORAGE: elasticsearch
      SW_STORAGE_ES_HTTP_SERVERS: http://elasticsearch:9200
      JAVA_OPTS: "-Xms1g -Xmx1g"
    ports:
      - "12800:12800" # gRPC
      - "11800:11800" # HTTP

  ui:
    image: apache/skywalking-ui:10.1.0
    depends_on: [ oap ]
    environment:
      SW_OAP_ADDRESS: http://oap:12800
    ports:
      - "8080:8080"

volumes:
  es-data:
```
启动与验证：
```
docker compose up -d
# 等待 ES/OAP/UI 就绪后
open http://localhost:8080
```

（仅演示）H2 模式：
```
docker run -d --name oap -p 12800:12800 -p 11800:11800 \
  -e SW_STORAGE=h2 \
  apache/skywalking-oap-server:10.1.0

docker run -d --name ui -p 8080:8080 \
  -e SW_OAP_ADDRESS=http://host.docker.internal:12800 \
  apache/skywalking-ui:10.1.0
```

---

## 3. Java 应用接入（Agent）
下载 agent 包并通过 JVM 选项注入：
```
wget https://archive.apache.org/dist/skywalking/java-agent/9.2.0/apache-skywalking-java-agent-9.2.0.tgz
mkdir -p /opt/skywalking && tar -xf apache-skywalking-java-agent-*.tgz -C /opt/skywalking
```
启动参数（示例 Spring Boot）：
```
JAVA_AGENT_HOME=/opt/skywalking/skywalking-agent
java \
  -javaagent:${JAVA_AGENT_HOME}/skywalking-agent.jar \
  -Dskywalking.agent.service_name=demo-api \
  -Dskywalking.collector.backend_service=127.0.0.1:11800 \
  -jar app.jar
```
Dockerfile 方式：
```
FROM eclipse-temurin:17-jre
ENV JAVA_AGENT_HOME=/opt/skywalking/skywalking-agent
RUN mkdir -p /opt/skywalking \
 && curl -fsSL https://archive.apache.org/dist/skywalking/java-agent/9.2.0/apache-skywalking-java-agent-9.2.0.tgz \
 | tar -xz -C /opt/skywalking
WORKDIR /app
COPY target/demo-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-javaagent:/opt/skywalking/skywalking-agent/skywalking-agent.jar","-Dskywalking.agent.service_name=demo-api","-Dskywalking.collector.backend_service=oap:11800","-jar","/app/app.jar"]
```

常用插件（自动探针）：Spring MVC、WebFlux、JDBC、MyBatis、Kafka、Jedis、OKHttp、Feign、Dubbo 等，默认按规则生效。

---

## 4. 指标/追踪配置要点
- 采样（Sampling）
  - 默认按概率采样；高并发场景建议 5‰～5% 区间试点，兼顾成本与可观测性。
  - 可使用动态配置中心热更新采样率。
- 数据 TTL
  - 指标/追踪/日志保留期按业务需求分层（如 3/7/30 天）。
  - Elasticsearch 建议开启 ILM/分区索引，避免单索引过大。
- 标签（Tag）与基数
  - 避免在 Span Tag 中放入高基数字段（如用户 ID、订单号原值）；必要时做 hash/分桶。
- 告警
  - 使用 OAL/告警规则定义 SLO（如 95th 延迟、错误率），联动企业微信/飞书/邮件。

---

## 5. 生产运维经验
- 架构与容量
  - OAP 可横向扩展；ES 建议最少 3 节点生产集群，冷热分层与副本策略按容量设计。
  - OAP JVM：Xms/Xmx 与 GC（G1/ZGC）按吞吐量压测后固化；启用容器内存限制感知。
- 稳定性
  - 时间同步：所有节点启用 NTP，避免 Trace 时间线错乱。
  - 网络：OAP 与应用间保持稳定内网链路；跨机房需专线或边界代理。
  - 限流：对入口网关/核心服务开启限流与熔断，避免雪崩时监控系统被放大打爆。
- 存储治理
  - ILM/分区：按天/小时分区；旧数据降冷热存储或下线；定期清理。
  - 索引模板：合理的分片/副本数；避免过大分片（>50GB）。
- 安全与隔离
  - UI 只读角色、OAP 鉴权、TLS；生产 UI 不暴露公网或做 VPN/零信任。
- 升级与变更
  - 先灰度 OAP/UI，再灰度 Agent；关注 Breaking Changes 与探针兼容矩阵。

---

## 6. 故障排查速查
- UI 无数据：检查 OAP 11800/12800 端口连通；确认 agent -javaagent 参数生效（启动日志）。
- Trace 丢失：采样率过低/流量过大；OAP/ES 压力过高；查看 OAP 日志和 ES 写入队列。
- ES 负载高：热数据与冷数据分层；写入批量尺寸；刷新间隔；分片与副本优化。
- 指标不准：时间未同步；自定义 Span/Tag 过多；聚合窗口与粒度不匹配。

---

## 7. 与 CI/CD 与容器平台集成
- Kubernetes：使用 Operator 或 Helm Chart 部署 OAP/UI/ES；以 Sidecar/Init 容器注入 Agent 或在镜像中预置。
- CI/CD：在流水线中将应用镜像带上 agent 层（见 Dockerfile 示例），部署时通过环境变量配置 service_name 与 backend_service。

---

## 8. 参考链接
- 官方文档：https://skywalking.apache.org/
- Docker 镜像：https://hub.docker.com/u/apache
- GitHub 仓库：https://github.com/apache/skywalking

