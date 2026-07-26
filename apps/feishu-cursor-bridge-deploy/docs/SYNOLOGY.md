# 群晖 NAS 部署 feishu-cursor-bridge

用 **Container Manager（容器管理）** 跑 Docker，NAS 24h 在线，桥就不容易因电脑休眠断线。

## 准备

1. 群晖已安装 **Container Manager**（旧名 Docker）
2. NAS 能访问公网（飞书 / Cursor API）
3. 电脑上准备好 `.env`（含 `CURSOR_API_KEY`、`FEISHU_APP_ID`、`FEISHU_APP_SECRET`）

> 只能跑 **`CURSOR_RUNTIME=cloud`**（Cloud Agent）。NAS 上不要用 local。

## 步骤（Container Manager）

### A. 把项目拷到 NAS

任选其一：

- File Station：上传整个 `apps/feishu-cursor-bridge` 到例如  
  `/docker/feishu-cursor-bridge`
- 或在 NAS 上 `git clone` 本仓库，进入  
  `MEM-AIVisdefect/apps/feishu-cursor-bridge`

在该目录放好 `.env`（可从电脑复制；**不要**把 `.env` 提交到 Git）。

### B. 用 Compose 建项目

1. 打开 **Container Manager** → **项目** → **新增**
2. 路径选上面的 `feishu-cursor-bridge` 目录（里面有 `docker-compose.yml`）
3. 项目名：`feishu-cursor-bridge`
4. 来源：选现有 `docker-compose.yml`
5. 构建并启动（首次会 `docker build`，需几分钟）

### C. 确认健康

浏览器或 SSH：

```text
http://<NAS局域网IP>:8787/health
```

应看到 `"ok": true, "wsReady": true`。

群里再 `@MEM-AIVisdefect-Agent 你好` 测一次。

### D. 开机自启

Compose 里已写 `restart: unless-stopped`。  
Container Manager 里确认该容器 **自动重启** 已开。

## 本机临时用法（没上 NAS 前）

电脑上用看门狗（崩溃 / 健康检查失败 / 每 6 小时软重启）：

```bash
cd apps/feishu-cursor-bridge
npm run watchdog
```

不要同时在电脑和 NAS 上各跑一个桥（飞书长连接集群模式只会随机打到其中一个）。

## 常见问题

| 现象 | 处理 |
|------|------|
| build 失败 | DSM 开「允许使用 SSH」后看日志；或换有 Node 的 build 主机推镜像 |
| health 不通 | 防火墙放行 8787；确认端口映射 `8787:8787` |
| @ 仍无响应 | 飞书后台仍是「长连接」；同一时间只保留一个桥实例 |
| Cursor 401 | `.env` 里 `CURSOR_API_KEY` 是否拷对 |

## 与看门狗的关系

容器内默认 `CMD = npm run watchdog`：

- 子进程挂了 → 自动拉起  
- `/health` 连续失败 → 重启  
- 运行满约 6 小时 → 软重启刷新飞书 WS  

群晖侧再加 `restart: unless-stopped`，整容器挂了也会再起来。
