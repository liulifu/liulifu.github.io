# Prometheus + Grafana 监控体系（结合 Ansible 的企业落地）

本文在“Ansible 企业实战”同一虚拟企业场景下，构建一套通用的指标监控与告警体系：Prometheus + Alertmanager + Grafana，并通过 Ansible 自动化完成安装与配置，覆盖 Exporter 部署、采集与规则、仪表板与告警联动。

---

## 1. 目标与范围

- 目标：统一采集系统指标、服务可用性与业务探活，集中展示并告警
- 组件：
  - Node Exporter（主机指标）
  - Blackbox Exporter（HTTP/TCP/ICMP 探测）
  - Prometheus Server（抓取与规则/记录/告警）
  - Alertmanager（路由与通知）
  - Grafana（可视化与看板）
- 原则：以 Ansible 角色批量部署，幂等、自描述、可回滚

---

## 2. Ansible 角色结构（示例）
```
roles/
├─ exporters_node/
│  └─ tasks/main.yml  # 安装 Node Exporter
├─ exporters_blackbox/
│  └─ tasks/main.yml  # 安装 Blackbox Exporter
├─ prometheus_server/
│  ├─ tasks/main.yml
│  └─ templates/{prometheus.yml.j2, rules.yml.j2}
├─ alertmanager/
│  ├─ tasks/main.yml
│  └─ templates/alertmanager.yml.j2
└─ grafana/
   └─ tasks/main.yml
```

---

## 3. Exporter 部署（片段）

Node Exporter（roles/exporters_node/tasks/main.yml）：
```
- name: 安装 node_exporter
  ansible.builtin.unarchive:
    src: https://github.com/prometheus/node_exporter/releases/download/v1.8.1/node_exporter-1.8.1.linux-amd64.tar.gz
    dest: /opt/
    remote_src: yes
- name: systemd unit
  ansible.builtin.copy:
    dest: /etc/systemd/system/node_exporter.service
    content: |
      [Unit]
      Description=Node Exporter
      [Service]
      ExecStart=/opt/node_exporter-1.8.1.linux-amd64/node_exporter
      [Install]
      WantedBy=multi-user.target
- ansible.builtin.systemd:
    name: node_exporter
    state: started
    enabled: true
```

Blackbox Exporter（roles/exporters_blackbox/tasks/main.yml）：
```
- name: 安装 blackbox_exporter
  ansible.builtin.unarchive:
    src: https://github.com/prometheus/blackbox_exporter/releases/download/v0.25.0/blackbox_exporter-0.25.0.linux-amd64.tar.gz
    dest: /opt/
    remote_src: yes
- name: systemd
  ansible.builtin.copy:
    dest: /etc/systemd/system/blackbox_exporter.service
    content: |
      [Unit]
      Description=Blackbox Exporter
      [Service]
      ExecStart=/opt/blackbox_exporter-0.25.0.linux-amd64/blackbox_exporter --config.file=/opt/blackbox.yml
      [Install]
      WantedBy=multi-user.target
- name: 配置黑盒模块
  ansible.builtin.copy:
    dest: /opt/blackbox.yml
    content: |
      modules:
        http_2xx:
          prober: http
          timeout: 5s
- ansible.builtin.systemd:
    name: blackbox_exporter
    state: started
    enabled: true
```

---

## 4. Prometheus Server 与规则

roles/prometheus_server/templates/prometheus.yml.j2：
```
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'nodes'
    static_configs:
      - targets: {{ groups['all'] | map('extract', hostvars, ['ansible_host']) | list | to_nice_json }}
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets: ['https://www.example.com','http://10.10.10.11']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: 127.0.0.1:9115
```

rules.yml.j2（记录与告警片段）：
```
groups:
- name: host.rules
  rules:
  - record: node:cpu_util:avg5m
    expr: avg by(instance) (rate(node_cpu_seconds_total{mode!="idle"}[5m]))
  - alert: HostHighCPU
    expr: node:cpu_util:avg5m > 0.8
    for: 10m
    labels: {severity: warning}
    annotations:
      summary: "高 CPU 占用 {{ $labels.instance }}"
```

roles/prometheus_server/tasks/main.yml：
```
- name: 创建目录
  ansible.builtin.file: { path: /etc/prometheus, state: directory }
- name: 部署配置
  ansible.builtin.template: { src: prometheus.yml.j2, dest: /etc/prometheus/prometheus.yml }
- name: 部署规则
  ansible.builtin.template: { src: rules.yml.j2, dest: /etc/prometheus/rules.yml }
- name: 部署二进制（略：同 exporter 下载解压）
- name: systemd unit
  ansible.builtin.copy:
    dest: /etc/systemd/system/prometheus.service
    content: |
      [Unit]
      Description=Prometheus
      [Service]
      ExecStart=/opt/prometheus/prometheus --config.file=/etc/prometheus/prometheus.yml --web.enable-lifecycle
      [Install]
      WantedBy=multi-user.target
- ansible.builtin.systemd: { name: prometheus, state: started, enabled: true }
```

---

## 5. Alertmanager 与通知

roles/alertmanager/templates/alertmanager.yml.j2：
```
route:
  receiver: default
receivers:
- name: default
  email_configs:
  - to: ops@example.com
    from: monitor@example.com
    smarthost: smtp.example.com:25
```
roles/alertmanager/tasks/main.yml：
```
- name: 安装并配置 alertmanager（同 prometheus 略）
- name: systemd 启动
  ansible.builtin.systemd: { name: alertmanager, state: started, enabled: true }
```

---

## 6. Grafana 部署

简易法（Docker）：
```
docker run -d --name=grafana -p 3000:3000 grafana/grafana:10.4.1
```
或使用包管理器：
```
# Debian/Ubuntu 示例
sudo apt-get install -y adduser libfontconfig1
wget https://dl.grafana.com/oss/release/grafana_10.4.1_amd64.deb
sudo dpkg -i grafana_10.4.1_amd64.deb
sudo systemctl enable --now grafana-server
```
数据源配置（Grafana UI 或 Provisioning）：
```
apiVersion: 1
datasources:
- name: Prometheus
  type: prometheus
  url: http://prometheus:9090
  access: proxy
  isDefault: true
```
导入常用看板：Node Exporter Full（ID: 1860）等。

---

## 7. 校验与运维

```
# Prometheus 配置热加载
curl -X POST http://localhost:9090/-/reload
# 规则检查
promtool check rules /etc/prometheus/rules.yml
# Exporter/指标探查
curl -s localhost:9100/metrics | head
curl -s "localhost:9115/probe?module=http_2xx&target=http://10.10.10.11" | head
```

---

## 8. 与 Ansible 的一致性

- 使用同一 inventory 与分组；将业务主机自动纳入抓取目标
- 以角色方式管理配置，支持多环境（prod/dev）与幂等
- 结合变更窗口与 --limit/--tags 做逐步发布与回滚
- 将监控作为发布流水线的验收步骤之一（可自动化探测与告警抑制）

