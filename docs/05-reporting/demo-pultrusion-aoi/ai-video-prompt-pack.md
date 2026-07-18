# AI 视频生成包（约 10 秒 Demo）

面向：**图生视频（Image-to-Video）**，用本目录已有关键帧当首帧/参考图。

---

## 1. 软件怎么选（2026）

| 优先级 | 工具 | 适合你的理由 | 入口 |
|--------|------|--------------|------|
| **首选** | **Kling 3.0**（可灵） | 图生视频稳、运动/物理好、10–15s 够用、国内易用、性价比高 | [klingai.com](https://klingai.com) / 可灵 App |
| 画质天花板 | **Google Veo 3.1** | 电影感、听指令准、可带原生音效；适合最终成片 | Gemini / Google AI Pro / Vertex |
| 精修可控 | **Runway Gen-4.5** | 相机运动、参考图一致性、剪辑一体；适合多轮改镜头 | [runwayml.com](https://runwayml.com) |
| 快速试错 | **Luma Dream Machine (Ray)** | 图生视频快、关键帧控制友好 | [lumalabs.ai](https://lumalabs.ai) |
| 备选便宜 | **MiniMax Hailuo** | 短片成本低，工业静物也够用 | 海螺 AI |

**对本 Demo 的建议**：先用 **Kling 图生视频**打 2–3 条候选；满意再上 **Veo** 出最终版。不要一上来用纯文生视频——工业设备容易糊成“假工厂”。

---

## 2. 10 秒叙事（只拍一条连续镜头）

**采集硬件设定（写进 Prompt 的硬约束）**：

- **环形镜头 / 环形成像工位**：多相机（或环形相机阵列）围成 360° 环形隧道，型材从环心穿过
- **密栅光源**（dense grid / dense grille LED illuminator）：高密度栅格状工业光源，全周均匀照明，突出表面微缺陷；**不是**环形灯、条形灯或柔光箱
- 型材轴向连续通过环心；外机位可轻微环绕/侧视展示「穿环」动作

目标故事（约 10s）：

> 拉挤型材穿入 360° 环形检测隧道 → 环心全周成像，屏幕出缺陷框与 NG → 气动推杆剔入不合格料道。

**推荐上传图**：

| 流程 | 首帧 | 尾帧（若工具支持） | 说明 |
|------|------|--------------------|------|
| A 一条成片 | `demo-03-camera.png` | `demo-05-reject.png` | 采集→剔废（图若仍是顶装相机，靠 Prompt 纠成环形） |
| B 强调识别 | `demo-04-detect.png` | `demo-05-reject.png` | UI + 推杆 |

片头 / 片尾字卡用静帧 `demo-01` / `demo-06` 后期贴，勿用 AI 生成文字。

---

## 3. 可复制 Prompt（英文优先，模型更稳）

### 主 Prompt（流程 A，推荐 · 环形 360°）

```text
Industrial factory, photorealistic, 16:9. A dark carbon-fiber composite pultruded profile travels axially through the center of a circular 360-degree annular vision inspection tunnel: multiple industrial cameras arranged in a full ring around the bar. Lighting is dense grid illuminators (密栅光源): high-density grille-pattern industrial LED lights around the circumference for uniform, high-contrast surface inspection (NOT ring light, NOT softbox, NOT simple bar light, NOT a single overhead camera). The profile passes through the ring aperture while surround cameras capture all-around surface imagery under dense grid lighting. A nearby monitor briefly shows multi-view detection overlays: red bounding boxes for crack, bubble, scratch, and a red NG status. Then a pneumatic pusher kicks the NG piece into a red reject chute, OK lane continues. External camera: slight orbital move around the ring station, documentary industrial style, realistic metal, no cartoon, no purple neon, no fantasy. About 10 seconds.
```

### 中文版（可灵也可用）

```text
真实工厂纪录片风格，16:9。深色碳纤维拉挤型材沿轴向穿过一座圆形的 360 度环形视觉检测隧道：多台工业相机围成完整环形阵列。照明使用密栅光源——高密度栅格状工业 LED，全周均匀高对比打光，突出表面微缺陷（不是环形灯、不是柔光箱、不是普通条形灯、不是单台顶部相机）。型材从环心孔径穿过，环向相机在密栅光照下同时采集全周表面。旁边显示器短暂出现多视角检测框：裂纹、气泡、划伤，状态 NG 不合格。随后气动推杆将 NG 件拨入红色不合格料道，合格件继续向前。外机位围绕环形工位轻微环绕移动。金属质感真实，不要卡通、不要紫色霓虹、不要科幻。约 10 秒。
```

### 负向提示（Negative，有则填）

```text
ring light, coaxial ring lamp, softbox, diffuse dome light only, single overhead camera only, top-down only, simple flat bar light only, cartoon, anime, purple glow, neon UI, text gibberish, warped hands, morphing product, shaky cam, low resolution, watermark, logo spam, people talking to camera, fisheye distortion mess, sci-fi hologram
```

### 运动参数建议

| 参数 | 建议 |
|------|------|
| 时长 | **10s**（或 5s×2 再拼接） |
| 运动幅度 | Low / 小（环阵工位固定，型材穿心移动） |
| 外机位 | 轻微 **orbit / 环绕环形隧道**；忌大幅抖动 |
| 分辨率 | 1080p 横屏 |

---

## 4. 若拆成 2 段再拼（更稳）

**Clip 1（5s）** — 首帧 `demo-03-camera.png`

```text
Photoreal industrial: pultruded composite bar passes through the center of a 360-degree annular multi-camera ring tunnel lit by dense grid illuminators (密栅光源, high-density grille LED panels), NOT ring lights. Surround cameras inspect full circumference. Monitor shows red detection boxes and NG. Slight orbital camera move around the ring station, 5 seconds.
```

**中文 Clip 1**

```text
真实工业场景：拉挤型材穿过 360 度环形多相机检测隧道中心，密栅光源（高密度栅格工业 LED）全周照明，不是环形灯。环向相机采集全周表面。显示器显示红色检测框与 NG。外机位绕环形工位轻微环绕，5 秒。
```

**Clip 2（5s）** — 首帧 `demo-05-reject.png`

```text
Photoreal industrial: after annular 360-degree inspection, pneumatic pusher kicks the NG composite bar into red reject chute; OK lane continues. Short sharp motion then settle, ring station visible in background, 5 seconds.
```

**中文 Clip 2**

```text
真实工业场景：环形 360 度检测完成后，气动推杆将 NG 拉挤件拨入红色不合格料道，合格件继续前行。动作短促后静止，背景可见环形检测工位，5 秒。
```

用剪映 / CapCut 硬切或 0.3s 叠化，片头片尾各加 1s 静帧字卡 → 总长仍约 10–12s。

---

## 5. 操作清单（可灵为例）

1. 打开 Kling → **图生视频 / Image to Video**
2. 上传 `demo-03-camera.png`（可选尾帧 `demo-05-reject.png`）
3. 粘贴上方主 Prompt + Negative
4. 时长 10s，运动强度调低，生成 2–3 条挑最好
5. 导出后在剪映加：片头 `demo-01`（1s）+ 成片 + 片尾 `demo-06`（1s）+ 旁白一句即可

旁白一句（约 8s 念完）：

> 「拉挤型材穿入环形 360 度镜头，密栅光源全周打光检测：识别裂纹、气泡、划伤，不合格自动剔废。」

---

## 6. 本目录素材索引

| 文件 | 用途 |
|------|------|
| `demo-01-title.png` | 片头静帧 |
| `demo-02-process.png` | 工艺科普（可选） |
| `demo-03-camera.png` | **主首帧**（已更新：环形 360° + 密栅光源） |
| `demo-04-detect.png` | 识别特写首帧（已更新） |
| `demo-05-reject.png` | **主尾帧 / Clip2**（已更新，背景含环阵工位） |
| `demo-06-end.png` | 片尾静帧 |
| `pultrusion-aoi-demo.mp4` | 旧版 27s 静帧幻灯（可忽略） |
