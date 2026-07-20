# 算法线包-环境SOP与实验计划

> 同步自飞书 · token=`MacNdC16PoDte0xItiPca0Lsnej` · type=docx · 2026-07-20
> 链接: https://bcndkrmo7f8n.feishu.cn/docx/MacNdC16PoDte0xItiPca0Lsnej

算法线包-环境SOP与实验计划
黄崇发算法线：环境SOP + 实验记录模板 + 三类达标实验计划


版本

日期

状态

Owner

关联未决ID

v0.1

2026-07-18

草稿/建议

黄崇发

OD-3.1（推理模型确定）、OD-3.2（无监督拓展）、先三类建议待确认
定位：算法线一站式工作包。第1节为可直接照做的环境配置SOP（润色版）；第2节为每次实验必填的记录模板（满足NFR-2可复现）；第3节为裂纹/气泡/划伤三类达标实验的分阶段计划（建议，待确认）。评价口径一律=准确度/效率/成本，不堆模型名词。

1. 环境配置SOP（润色版）
统一基线：Python=3.10.11，ultralytics=8.4.90，模型 yolo11s-seg；GPU/纯CPU两种硬件均可跑，后期可无缝切换分割头。以下以 Windows 为例。
步骤
安装 Anaconda：官网 https://anaconda.com/download 下载匹配安装包，默认流程安装，打开「Anaconda Prompt」。
创建虚拟环境：
conda create -n huaduo python=3.10.11
输入 y 确认（huaduo 为环境名，可自定义）。
激活环境：
conda activate huaduo
命令行前缀出现 (huaduo) 即成功。
配置清华镜像（解决官方源下载慢）：
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
安装 PyTorch：
pip install torch==2.4.1 torchvision==0.19.1
安装 YOLO 及推理/导出依赖：
pip install ultralytics==8.4.90 opencv-python numpy scipy onnx onnxruntime onnx-simplifier matplotlib tqdm pillow
GPU 自检（不出错即环境正常，返回值决定是否可用GPU加速）：
import torch
print(torch.__version__)            # 期望 2.4.1
print(torch.cuda.is_available())    # True=可用GPU；False=纯CPU
环境验证：用 yolo11s-seg 预训练权重对 test.jpeg 推理一次，权重自动下载、无报错即可用。参考表现：纯CPU单张推理约 156.8ms 属正常；有 NVIDIA 独显后速度大幅提升。
常见问题排查
镜像不生效：pip config list 确认 index-url 已指向清华源；公司网络有代理时先配代理再安装。
torch 装完 CUDA 不可用：先确认机器有无 NVIDIA 显卡；无显卡属正常（纯 CPU 可跑全流程，仅速度慢）；有显卡但 torch.cuda.is_available() 返回 False，多为驱动/CUDA 版本不匹配——CUDA 版本与 GPU 型号待补（在原档截图中），补齐后按对应 wheel 重装。
依赖版本冲突：严格按 SOP 版本号安装，不要顺手 pip install -U 升级；huaduo 环境只服务本课题，避免多项目混用导致版本漂移。
验证时权重下载失败：属网络问题，重跑即可；或手动下载 yolo11s-seg.pt 预训练权重放入工作目录后重试。
已知缺口（如实标注，待补）


项

状态

说明

CUDA 版本

待补

原档在截图中，未提取到文本

GPU 型号/显存

待补

同上；影响 batch 与卡时预算

训练超参（epochs/lr/imgsz/batch）

待补

同上；补齐前实验记录中相关栏填"默认"

2. 实验记录模板（每次实验必填）
目的：数据版本×超参×代码版本三者绑定，任何人拿到记录可复现结果（NFR-2）。一次实验一行主表+一张超参表，禁止只记结论不记条件。
主表


实验ID

日期

数据版本

代码/权重版本

结论

下一步

EXP-YYYYMMDD-NN



dataset-vX.Y（train/val/test 图数+缺陷框数）

commit哈希/权重文件名




超参表（按实际填写，默认项照抄也须写明"默认"）


模型

epochs

batch

imgsz

lr0

optimizer

增广

备注
指标表（验收口径=件级；框级指标用于过程诊断）


指标

数值

口径说明

mAP@0.5



框级，val/test

按类 P / R（crack / bubble / scratch）



逐类必填，不看总平均

件级查全率



按 physical_piece_id 统计

件级准确率



同上

单张推理耗时 ms（CPU/GPU分别）



效率口径
填写示例（虚拟演示，非真实数据）：EXP-20260725-01｜2026-07-25｜dataset-v0.3（train 700 / val 200 / test 100 图，缺陷框 412）｜commit a1b2c3 + yolo11s-seg.pt｜结论：气泡类 R 偏低｜下一步：补标气泡 50 图后 EXP-20260725-02 复训。示例仅示范"条件-结论-下一步"闭环写法，正式记录中任何数字都必须来自真实实验。
记录纪律：实验未达预期也要记录（负结果同样有价值，防止重复踩坑）；改一个变量就建新实验 ID，不在旧记录上覆盖；每周算法例会过一遍记录表，同步进双周报素材。

3. 三类达标实验计划（裂纹/气泡/划伤——建议，待确认）
门禁来自任务书：50件、≥3类、件级查全率≥80%、准确率≥85%。按四层能力栈（D-02）：PatchCore 走 L1 冷启动，yolo11s-seg 承担验收主检测，禁止多层串成主路径。
阶段A：冷启动基线（无标注/少标注期）
做什么：只用良品图训练 PatchCore 记忆库，输出异常分数与热力图；异常帧自动落盘，作为后续标注与难例挖掘的种子集。
成功标准：异常检出管线跑通；对现场已见缺陷形态（黑色块状/线状夹杂/纱头/低对比白线）有可见响应；产出首批待标注异常帧清单。
输入/交付物：输入=良品图 ≥200 张（现场连续采集、覆盖正常波动）；交付物=PatchCore 基线模型、异常帧清单 v0、阈值建议（约束良品误报率，宁误报不漏报）。
预算口径（M币）：以推理为主 5M/卡时；试训按 8M/卡时，预计 ≤10 卡时。
阶段B：有监督收敛（标注量产后）
做什么：按 7:2:1 备数，yolo11s-seg 训练→按类P/R诊断→补标弱类→迭代。
成功标准：test 集 mAP@0.5 ≥0.7（达标线），冲 0.9（内部软指标）；三类逐类 R 无短板（任一类的件级漏检须在C阶段前清零可解释）。
输入/交付物：输入=三类标注数据（建议每类缺陷框 ≥200 起步，随诊断迭代增补）、冻结的数据划分；交付物=最优权重、逐类指标表、难例清单（回流标注）。
预算口径（M币）：训练 8M/卡时；按每轮训练+评测约 2~4 卡时、预留 5~8 轮估算，精标另计 2M/图。
阶段C：达标评测（结题证据）
做什么：抽 50 件盲测，按 physical_piece_id 拆分（同件图片不得跨 train/test），冻结模型与数据后一次跑完；报逐类指标 + Wilson 95% 置信区间。
成功标准（任务书门禁）：件级查全率≥80%、件级准确率≥85%；同时如实报告区间宽度（40/50 的 95% Wilson 区间约 67%~88.8%，过线不等于证量产，结论中不夸大）。
输入/交付物：输入=50 件盲测样件（现场抽样，标注组与算法组不参与挑选）、冻结的模型与数据版本；交付物=评测报告（逐类指标+Wilson 区间）、误检/漏检案例分析、结题证据包。
预算口径（M币）：推理 5M/卡时；盲测+复核预计 ≤4 卡时。
衔接与风险
先三类冻结前不扩类；缺纱/异物/发白/脏污作为扩展项进 OD-3.2 决策。
光源未定型（待DOE）是阶段B指标波动的最大风险，成像方案未冻结前不承诺 mAP 收敛时间。
所有实验记录进 Git 仓库 docs/experiments/，权重与数据版本只记哈希/路径，不上传大文件。
