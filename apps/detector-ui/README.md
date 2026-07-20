# detector-ui（检测结果展示 MVP）

本地：

```bash
cd apps/detector-ui
npm install
npm run dev
```

打开 http://127.0.0.1:5174 — 与 BI（5173）端口错开。

当前为 mock JSON（`public/data/detect/`），对接黄崇发真实样例时只替换该目录，不硬编码算法输出路径。契约见飞书「22-前后端API契约」与文档 26。
