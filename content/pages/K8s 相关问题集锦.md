# K8s 相关问题集锦（三）

### 6. **安全性类**：

- **Kubernetes 中如何管理访问控制？**
  - 通过 RBAC（Role-Based Access Control）管理用户和服务账户的权限，描述 Role、ClusterRole、RoleBinding、ClusterRoleBinding 的作用。
- **PodSecurityPolicy 是什么？**
  - PodSecurityPolicy 用于定义和控制 Pod 的安全策略，比如是否允许特权容器、挂载卷的类型等。
- **如何为 Kubernetes 集群启用 HTTPS？**
  - 讨论使用证书管理工具（如 cert-manager）和配置 API Server 的安全连接。

### 7. **运维与故障排查类**：

- **如何查看 Kubernetes 集群的健康状态？**
  - 使用 `kubectl get nodes` 查看节点状态，使用 `kubectl describe node` 了解节点详细信息。
- **如何调试一个无法访问的 Service？**
  - 可能需要检查 Service、Endpoint、Pod 状态，验证网络策略，使用 `kubectl exec` 进入容器进行网络测试。
- **如何备份和恢复 etcd 数据？**
  - 使用 `etcdctl` 工具进行备份和恢复，确保数据安全。
- **集群中的节点资源紧张时应该怎么做？**
  - 考虑节点扩展、Pod 资源配额管理（如 requests 和 limits 的设置），或者使用 Node Affinity 和 Taints/Tolerations 调整调度策略。

### 8. **实际场景类问题**：

- **如果一个 Pod 需要访问另一个 Pod，应该怎么做？**
  - 使用 Kubernetes Service 创建稳定的访问入口，或者配置 Ingress 规则。
- **如何在生产环境中保证 Kubernetes 应用的高可用性和稳定性？**
  - 讨论滚动更新策略、健康检查（Liveness 和 Readiness Probe）、日志监控和自动扩展。
- **如何处理集群中某个节点频繁重启的问题？**
  - 需要检查节点日志、分析 kubelet 和 kube-proxy 的运行状态，可能需要诊断操作系统和硬件问题。

这些问题涵盖了 Kubernetes 的核心概念、实战操作和运维管理，帮助面试者了解候选人是否具备使用 Kubernetes 进行生产环境运维的能力。在准备面试时，除了理解理论知识，也可以在本地环境或云上实际部署 Kubernetes 进行操作实践，以更好地应对面试中可能出现的实操问题。
