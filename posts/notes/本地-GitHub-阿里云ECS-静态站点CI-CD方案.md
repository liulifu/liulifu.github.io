# 本地→GitHub→阿里云 ECS：静态站点 CI/CD 方案（liulifu.github.io）

本文整理本项目采用的发布技术路线：本地开发 → 推送到 GitHub → GitHub Actions 通过 SSH 将源码传到阿里云 ECS → 在 ECS 上构建并以 Docker 容器方式运行，最后完成自动健康检查与上线。

---

## 一、架构与流程

开发者本地改动 → git push → GitHub Actions 触发 → 打包源码并通过 SSH 上传至 ECS → 远端解压与 docker build → 重启容器（-p 80:80、--restart=always）→ 健康检查 → 对外生效。

```
[Local Dev] --push--> [GitHub Repo]
      |               (Actions Runner)
      |                   |
      |                   v
      |            package & upload (SSH/SCP)
      |                   |
      |                   v
      |           [Aliyun ECS /root/deploy]
      |                 docker build/run
      |                   |
      +----(verify) <-----+
```

---

## 二、仓库结构（关键文件）

```
liulifu.github.io/
├─ .github/workflows/deploy.yml      # 部署工作流
├─ Dockerfile                        # Nginx 静态站镜像
├─ index.html / index.js / *.css     # 站点入口与前端逻辑
└─ posts/
   ├─ index.json                     # 文章索引
   └─ notes/...                      # Notes 栏目文章
```

---

## 三、前置条件

- 一台阿里云 ECS（Ubuntu 22.04+），已安装 Docker，允许 80 端口对外访问（安全组放行 TCP/80）。
- GitHub 仓库：liulifu/liulifu.github.io。
- 只使用公钥登录（推荐）：ECS 上 /root/.ssh/authorized_keys 已配置部署公钥。

---

## 四、生成“部署密钥”（本地，仅供 CI/CD 使用）

- PowerShell（推荐）：
```
ssh-keygen -t ed25519 -f "$HOME/.ssh/github-actions-aliyun-ecs" -N "" -C "github-actions@liulifu"
```
- CMD：
```
ssh-keygen -t ed25519 -f "%USERPROFILE%\.ssh\github-actions-aliyun-ecs" -N "" -C "github-actions@liulifu"
```
得到：
- 私钥：github-actions-aliyun-ecs（粘贴到 GitHub Secret）
- 公钥：github-actions-aliyun-ecs.pub（追加到 ECS 的 /root/.ssh/authorized_keys）

ECS 上添加公钥示例（已完成一次）：
```
mkdir -p /root/.ssh && chmod 700 /root/.ssh
cat >> /root/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIALYHpQnpVokjF+zpw3jsSSk+u9UZOTBlIhGqn0nX04q github-actions@liulifu
EOF
chmod 600 /root/.ssh/authorized_keys
```

---

## 五、GitHub Secrets（仓库 → Settings → Secrets and variables → Actions）

- ECS_HOST = 121.199.56.99
- ECS_USER = root
- ECS_SSH_PRIVATE_KEY = 部署私钥全文（包含 BEGIN/END 行与所有换行）

---

## 六、工作流 deploy.yml（核心逻辑）

要点：使用 git archive 打包仓库内容，避免 tar 在打包过程中读到自身输出文件导致的报错；通过 SSH 把压缩包传到 ECS 并在远端构建与运行容器。

```yaml
name: Deploy liulifu.github.io to Aliyun ECS

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

concurrency:
  group: deploy-ecs
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create package (repo root)
        run: git archive --format=tar.gz -o site.tgz HEAD

      - name: Setup SSH
        env:
          ECS_SSH_PRIVATE_KEY: ${{ secrets.ECS_SSH_PRIVATE_KEY }}
        run: |
          mkdir -p ~/.ssh && chmod 700 ~/.ssh
          echo "$ECS_SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H "${{ secrets.ECS_HOST }}" >> ~/.ssh/known_hosts

      - name: Upload package to ECS
        run: scp -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=yes site.tgz "${{ secrets.ECS_USER }}@${{ secrets.ECS_HOST }}:/root/deploy/site.tgz"

      - name: Remote build and deploy on ECS
        run: |
          ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=yes "${{ secrets.ECS_USER }}@${{ secrets.ECS_HOST }}" bash -s <<'EOF'
          set -euo pipefail
          cd /root/deploy
          rm -rf site && mkdir site
          tar -xzf site.tgz -C site
          docker rm -f liulifu-githubio >/dev/null 2>&1 || true
          docker rm -f augment-nginx >/dev/null 2>&1 || true
          docker build -t liulifu-githubio:latest site
          docker run -d --name liulifu-githubio --restart=always -p 80:80 liulifu-githubio:latest
          docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' | sed -n '1,2p'
          (curl -sS --max-time 10 http://127.0.0.1/ || wget -q -O- http://127.0.0.1/) | head -n 2 || true
          EOF
```

---

## 七、Dockerfile（静态站容器）

```dockerfile
FROM nginx:alpine
LABEL maintainer="augment-agent" org.opencontainers.image.title="liulifu.github.io"
COPY . /usr/share/nginx/html
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
```

---

## 八、发布流程（本地→GitHub→ECS）

1) 在本地仓库 liulifu.github.io 修改任意内容（例如新增一篇 Notes 文章或修订 index.json）。
2) 提交并推送：
```
git add -A
git commit -m "docs: update notes"
git push origin main
```
3) 打开 GitHub → Actions → 选择 “Deploy liulifu.github.io to Aliyun ECS”，查看运行日志（约 1–3 分钟）。
4) 成功后访问 http://121.199.56.99/ 或 `curl -I http://121.199.56.99/` 验证返回 200。

可选：也可以在 Actions 页面使用 “Run workflow”（workflow_dispatch）手动触发一次部署。

---

## 九、回滚与重跑

- 回滚到上一个版本：
  - Git 上将 HEAD 回退到某个稳定提交：`git revert <commit>` 或 `git reset --hard <commit> && git push -f`（谨慎使用）
  - 推送后 Actions 会自动按该历史版本重新构建并上线。
- 重跑本次：在失败的工作流运行详情页点击 “Re-run jobs”。

---

## 十、常见问题与排查

- tar: file changed as we read it：
  - 解决：使用 `git archive` 打包（本方案已采用）。
- 无法访问 80 端口：
  - 检查阿里云安全组、ECS 上 `docker ps` 映射是否有 `0.0.0.0:80->80/tcp`。
- SSH 连接失败：
  - 确认 Secrets 中私钥完整且权限在步骤中已 600；ECS authorized_keys 正确，且只允许 publickey 登录。
- 构建超时：
  - 查看 Dockerfile 构建输出；必要时启用镜像加速或在 ECS 上预拉取基础镜像。
- CRLF 警告：
  - Windows 环境正常现象，不影响部署；可在仓库层面统一 `* text=auto`。

---

## 十一、安全与维护建议

- 部署密钥与人工登录密钥分离（已完成）。
- 仅允许公钥认证；必要时创建受限 deploy 用户，限制 sudo、限制可执行命令。
- 添加 .dockerignore 减少上下文（示例）：
```
.git
.github
node_modules
*.log
site.tgz
```
- 并发控制：`concurrency` 已启用，避免并发部署互相覆盖。
- 健康检查：Dockerfile 已添加；线上自检失败时容器会被重启。

---

## 十二、验证与运维快捷命令（ECS）

```
# 查看容器与健康状态
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' | head -n 2

# 查看最近日志
docker logs --tail=100 liulifu-githubio

# 重启容器（如需）
docker restart liulifu-githubio
```

---

以上即为“本地 — GitHub — 阿里云 ECS”静态站点的 CI/CD 方案在本仓库的完整配置与操作指引。
