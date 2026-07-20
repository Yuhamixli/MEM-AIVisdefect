# 专业课笔记-YOLO-PatchCore-标注

> 同步自飞书 · token=`AbT1dYso1oKzvdxRzPHcT15InPc` · type=docx · 2026-07-20
> 链接: https://bcndkrmo7f8n.feishu.cn/docx/AbT1dYso1oKzvdxRzPHcT15InPc

专业课笔记-YOLO-PatchCore-标注
专业课笔记：YOLO速成 / PatchCore概念 / 标注实操


版本

日期

状态

Owner

关联未决ID

v0.1

2026-07-18

草稿/建议

黄崇发（①②）/ 标注组（③）

OD-3.1、先三类建议待确认
定位：对应百度网盘课程资料的对内速成笔记，供团队快速对齐最小必要知识。非对外文档；深入细节以课程视频与官方文档为准。

① YOLO 速成（单阶段检测一页通）
原理一句话
YOLO 把检测当成一次回归：整张图过一次网络，直接输出"哪里有缺陷、是什么、多确定"，因此快——适合产线节拍。
四个核心概念
网格（grid）：把图划成 S×S 网格，缺陷中心落在哪个格子，哪个格子负责预测它。
anchor/先验框：每个格子按若干预置形状的框做微调预测（新版本中多为 anchor-free，思路相同：预测框相对参考位置的偏移）。
置信度（confidence）：框内有目标的概率 × 类别概率，输出前用来排序筛选。
NMS（非极大抑制）：同一缺陷会被多个框重复命中，NMS 只保留置信度最高的框、去掉重叠冗余框。
yolo11s-seg 在本课题的位置
主检测器：承担任务书验收（三类缺陷、件级查全率≥80%/准确率≥85%）的检测输出（D-02/0711 共识：主检测以 YOLO 为准）。
可选分割头：-seg 版本在检测框外再给出缺陷像素级掩膜，用于缺陷尺寸测量与展示；不是验收必需，算力紧张时可退回纯检测版。
与 PatchCore（L1 筛查）并联补漏，不串行（串行召回相乘，对 80% 门槛无余量）。
数据准备与训练命令示例
目录：dataset/images/{train,val,test} + dataset/labels/{train,val,test}，按 7:2:1 划分；按 physical_piece_id 拆分，同一件的图不得跨集合。
训练命令示例（huaduo 环境内）：
yolo segment train data=dataset.yaml model=yolo11s-seg.pt epochs=100 imgsz=640
（epochs/imgsz 等为示例默认值，正式超参以实验记录为准，当前待补。）
dataset.yaml 最小示例：
path: ./dataset
train: images/train
val: images/val
test: images/test
names: [crack, bubble, scratch]
配套命令：验证 yolo segment val model=best.pt data=dataset.yaml split=test；推理 yolo segment predict model=best.pt source=图片目录；部署导出 yolo export model=best.pt format=onnx（ONNX 依赖已在环境 SOP 中装齐）。
常用指标：mAP@0.5（IoU=0.5 时的平均精度均值，过程诊断主指标）、P（查准：报出的缺陷里多少是真的）、R（查全：真缺陷里多少被找出来）。补充：IoU=预测框与真值框的交并比；逐类画 P-R 曲线、曲线下面积即该类 AP，mAP@0.5 为各类 AP 均值。验收另算件级：一件上任一真缺陷被检出=该件命中，逐件汇总出查全率/准确率——框级指标只做诊断，不进验收结论。

② PatchCore 概念（冷启动异常检测）
是什么
只用良品图片训练的异常检测器：把正常图像的局部特征存进一个"记忆库"（coreset），来图时比对每个局部与记忆库中最相似的正常样本的距离——距离大=异常，并给出热力图定位异常区域。
为什么适合本课题冷启动（L1）
项目初期缺陷样本极少、良品多，有监督检测器训不动；PatchCore 零缺陷样本即可起步。
符合 D-02 四层栈定位：L1 在线轻量异常筛查，异常帧落盘反哺标注与难例挖掘。
生态：可用 anomalib（英特尔开源库，含 PatchCore 及多种异常检测算法，训练/评测/导出一体）快速搭建基线。
上手路径（anomalib）：pip install anomalib → 按 MVTec 目录格式摆放良品图（train/good 下全是良品）→ 训练 PatchCore → 在含已知缺陷的验证集上调阈值（以良品误报率为约束）→ 导出 ONNX 进 L1 管线。调阈原则与 D-03 一致：粗检阶段宁错杀（宁误报、不漏报），误报帧进人工复核并回流难例集。
局限（必须如实告知）
不给缺陷类型：只答"异常与否+位置"，裂纹/气泡/划伤分类仍需有监督模型。
光照漂移敏感：光源/曝光变化会被学成"异常"，误报随成像波动上升——所以必须先做受控成像与 DOE，再谈阈值稳定。
参考量级：PatchCore 在 MVTec 公开 benchmark 上 AUROC 约 99.6%（公开数据口径，不代表本课题现场水平）。

③ 标注实操（LabelImg → X-AnyLabeling）
环境与启动（huaduo 环境内）
conda activate huaduo
pip install labelimg
labelimg        # 启动图形界面
启动后指定两个目录：图片目录（dataset/images/train 等）与标注保存目录（对应 labels/），格式选 YOLO。
操作要点
快捷键：W=开始标注（鼠标拖拽框选缺陷范围）、D=下一张。
课程示例三类：毛刺、裂开、气泡；本课题建议先三类=裂纹、气泡、划伤（建议，待确认），类别名以缺陷定义卡 slug 为准（crack/bubble/scratch）。
目录比例：images 与 labels 一一对应，train:val:test = 7:2:1，先分好图再标注，labels 初始为空、标注后自动生成。
质量控制
易混淆对处理：以缺陷定义卡"边界样本/易混淆规则"为准（如低对比白线 vs 划伤、纱头 vs 裂纹）；拿不准的图存"待仲裁"清单，不猜标。
10% 抽检：每批标注完成后由第二人抽检 10%，错框/错类返工并记录错误类型。
常见标注错误：框过大（把正常纹理框进缺陷）、框过小（漏掉缺陷边缘）、类别张冠李戴、漏标小目标（本课题缺陷 8~10mm，相对整图很小，须放大检查）；保存前确认格式为 YOLO（每行：类号 中心x 中心y 宽 高，坐标归一化到 0~1）。
标注进度与质量进实验记录的数据版本栏（图数+框数），与超参绑定可复现。
升级建议：X-AnyLabeling
LabelImg 够用但全手工。建议升级到 X-AnyLabeling：支持 AI 预标注（模型先标、人工改框），契合 L4"预标注→人工确认→训练集升级"飞轮，标注效率显著提升；迁移成本低（同为 YOLO 格式）。建议项，待标注组确认后排期。

收尾：三则笔记与项目节奏的对应
①YOLO 速成 → 服务阶段B（有监督收敛）：数据到量即按此训练、按此口径看指标。
②PatchCore 概念 → 服务阶段A（冷启动）：标注量产前先跑通异常筛查与异常帧落盘。
③标注实操 → 贯穿 A→B：标注规范决定训练数据质量，是 mAP 能否收敛的前置条件。
三则合读约 30 分钟，建议算法组与标注组全员过一遍，疑点各自登记后统一澄清。
