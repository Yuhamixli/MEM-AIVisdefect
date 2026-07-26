# -*- coding: utf-8 -*-
"""Apply tracked revisions to the detail design docx (Word COM)."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import pythoncom
import win32com.client

SRC = Path(
    r"A:\Projects\MEM-AIVisdefect\docs\design"
    r"\03组_玻纤拉挤电芯压条_AI视觉检测_详细方案设计_编号目录整理版_算法软件修订.docx"
)

wdCollapseEnd = 0
wdReplaceAll = 2
wdFindContinue = 1
wdStory = 6
wdHeaderFooterPrimary = 1


def find_paragraph(doc, exact: str | None = None, startswith: str | None = None):
    for i in range(1, doc.Paragraphs.Count + 1):
        p = doc.Paragraphs(i)
        t = p.Range.Text.replace("\r", "").replace("\x07", "").strip()
        if exact is not None and t == exact:
            return p
        if startswith is not None and t.startswith(startswith):
            return p
    return None


def replace_all(doc, old: str, new: str) -> int:
    find = doc.Content.Find
    find.ClearFormatting()
    find.Replacement.ClearFormatting()
    find.Text = old
    find.Replacement.Text = new
    find.Forward = True
    find.Wrap = wdFindContinue
    find.Format = False
    find.MatchCase = True
    find.MatchWholeWord = False
    find.MatchWildcards = False
    # Execute returns True if found; Count via Replacement
    count = 0
    # Word doesn't return replace count reliably; loop once with ReplaceAll
    found = find.Execute(Replace=wdReplaceAll)
    return 1 if found else 0


def insert_after(para, lines: list[tuple[str, str]]):
    """Insert (style, text) paragraphs after `para`. style: Heading 1|Heading 2|Normal."""
    anchor = para
    for style_name, text in lines:
        anchor.Range.InsertParagraphAfter()
        new_p = anchor.Next()
        # Assign text without eating following content
        rng = new_p.Range
        rng.Text = text + "\r"
        new_p = anchor.Next()
        try:
            new_p.Style = style_name
        except Exception:
            try:
                if style_name.startswith("Heading"):
                    new_p.Style = doc_styles_fallback(style_name)
                else:
                    new_p.Style = "Normal"
            except Exception:
                pass
        anchor = new_p
    return anchor


def doc_styles_fallback(style_name: str):
    mapping = {
        "Heading 1": -2,
        "Heading 2": -3,
        "Normal": -1,
    }
    return mapping.get(style_name, -1)


def main() -> int:
    if not SRC.exists():
        print("ERR missing", SRC)
        return 1

    pythoncom.CoInitialize()
    word = None
    doc = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        word.UserName = "算法软件组"
        word.UserInitials = "AS"

        doc = word.Documents.Open(str(SRC), ReadOnly=False)
        doc.TrackRevisions = True
        doc.ShowRevisions = True

        # --- Rename titles / TOC strings (tracked) ---
        replacements = [
            ("8 离线检测模块与接口设计", "8 离线检测模块与软件接口"),
            ("9 测试情况与效率对比", "10 测试情况与效率对比"),
            ("9.1 测试情况", "10.1 测试情况"),
            ("9.2 效率对比", "10.2 效率对比"),
        ]
        for old, new in replacements:
            replace_all(doc, old, new)
            print("replace:", old, "->", new)

        # --- Ch3 overview (insert after heading) ---
        h3 = find_paragraph(doc, exact="3 总体方案设计")
        if not h3:
            raise RuntimeError("heading 3 not found")
        insert_after(
            h3,
            [
                ("Heading 2", "3.1 总体架构原则"),
                (
                    "Normal",
                    "验收主线尽量短：任务书P0指标由离线YOLO检测模块直接承担。"
                    "离线主检、近线精修与数据飞轮分开部署，禁止叠成一条串行唯一判决链。"
                    "受控成像先于算法：光源和拍摄规范经试验后冻结，成像不定则指标不可复现。",
                ),
                ("Heading 2", "3.2 软件能力边界总览"),
                (
                    "Normal",
                    "本期软件能力按数据流划分为四段："
                    "（1）成像与原始数据入库（第5、6章，非本章实现重点）；"
                    "（2）离线检测模块完成缺陷定位/分类并落盘结构化结果（第7、8章）；"
                    "（3）同步脚本将算法落盘结果转换为前端可消费的jobs数据；"
                    "（4）detector-ui承担检测结果展示与复核，管理BI承担进度/风险/M币/知识库/意见箱等管理信息展示（第9章）。"
                    "在线产线节拍闭环与PLC联动不作为本期硬交付。",
                ),
                (
                    "Normal",
                    "逻辑关系可概括为：原图入库→与训练一致的预处理→YOLO主检（可选并联EfficientAD异常摘要）"
                    "→result.json与overlay→sync转换→detector-ui/BI消费。"
                    "近线工具（开放词汇定位、难例分割、多模态预标注）仅服务难例精修与样本回灌，"
                    "不进入离线模块打包依赖，不承担实时放行承诺。",
                ),
            ],
        )
        print("inserted ch3 overview")

        # --- Enrich 7.1 after existing route paragraph ---
        p71 = find_paragraph(doc, startswith="YOLO类轻量监督检测器")
        if not p71:
            raise RuntimeError("7.1 body not found")
        insert_after(
            p71,
            [
                (
                    "Normal",
                    "补充口径（对齐《拉挤表面缺陷离线检测与近线精修实施方案》）："
                    "YOLO族有监督检测器为本期验收主检，承担已知缺陷定位与类别判定；"
                    "EfficientAD/PatchCore等异常筛查仅作可选并联，用于补漏与难例发现，"
                    "异常分支不得删除YOLO已检出结果，也不进入P0查全率分母的串行折算。"
                    "基线模型采用YOLO11-seg（可退化输出检测框，最终定版以选型关单为准）。",
                ),
                ("Heading 2", "7.3 近线精修与工具边界"),
                (
                    "Normal",
                    "近线精修用于复核、难例处理和数据生产，不挡P0验收。"
                    "开放词汇定位（如Grounding DINO）用于少样本探查与提示框生成；"
                    "SAM2按需提供不规则缺陷掩膜；VLM仅做预标注建议，入库前须人工确认（建议抽检不低于10%）。"
                    "禁则：不得以近线模型顶替离线模块作为第三方交付主程序；"
                    "不得宣称大模型异步分析可实时防止漏检；"
                    "未经人工确认的自动预标注不得直接计入金标准。",
                ),
            ],
        )
        print("enriched ch7")

        # --- Enrich ch8 after 8.1 heading / table caption area ---
        h81 = find_paragraph(doc, exact="8.1 功能模块")
        if not h81:
            raise RuntimeError("8.1 not found")
        # insert overview right after 8.1 heading (before table caption)
        insert_after(
            h81,
            [
                (
                    "Normal",
                    "离线检测模块是任务书“缺陷定义卡+检测模型+离线检测模块”的软件载体，"
                    "要求可独立运行、可无网演示；第三方按使用说明完成“放图→检测→查看结构化结果/叠加图”。"
                    "主路径输出缺陷类别、像素坐标框、可选掩膜、置信度、模型版本、推理耗时与初判结论。"
                    "判定初版：无缺陷为OK；检出已知类缺陷默认REVIEW；NG规则待允收标准共签后启用。"
                    "输出为目检初筛辅助，不替代最终放行。",
                ),
            ],
        )

        h82 = find_paragraph(doc, exact="8.2 结构化结果字段")
        if h82:
            insert_after(
                h82,
                [
                    (
                        "Normal",
                        "逐图输出result.json，建议字段包括：schema_version、status、piece_id、batch_id、surface、"
                        "image_path、image_size、model_version、pipeline、inference_time_ms、timestamp、"
                        "defects[]、summary，以及可选anomaly（EfficientAD启用时）。"
                        "defects[]含defect_id、class_slug、class_name、bbox{x,y,w,h}、confidence、可选mask；"
                        "summary含total_defects、by_class、overall_decision与review_status。"
                        "机器初判与人工复核分列，复核不得回写overall_decision，以便误报漏报分析与50件盲测。",
                    ),
                ],
            )

        h83 = find_paragraph(doc, exact="8.3 接口定义")
        if h83:
            insert_after(
                h83,
                [
                    (
                        "Normal",
                        "算法侧以CLI为主：detect --input --output --model [--conf] [--device] [--save-overlay] "
                        "[--config] [--timeout-ms] [--anomaly-model]。"
                        "配置文件与命令行参数对应，命令行优先。"
                        "退出码：0全部成功，1部分失败，2致命错误。"
                        "输出目录建议按{date}/{piece_id}/落盘image、result.json、overlay（及可选heatmap）。"
                        "字段级细则以仓库《离线检测模块接口设计方案》为准。",
                    ),
                ],
            )

        h84 = find_paragraph(doc, exact="8.4 部署与运行环境")
        if h84:
            insert_after(
                h84,
                [
                    (
                        "Normal",
                        "运行环境基线：Python 3.10、Ultralytics、PyTorch；默认CPU可跑为硬约束，GPU为加速可选项。"
                        "交付包含入口程序、默认配置、权重、样例图与接口说明。"
                        "离线模块不依赖在线API与云端推理。",
                    ),
                    ("Heading 2", "8.5 与前端的数据交接"),
                    (
                        "Normal",
                        "算法侧只写约定目录下的result.json、图像副本与叠加图；"
                        "由同步脚本（sync-results/sync-data）转换为detector-ui可读的"
                        "/data/detect/jobs/{piece_id}.json与jobs-index.json。"
                        "算法侧与前端侧均不得绕过转换私改对方格式。"
                        "字段映射要点：class_slug→slug，bbox对象→[x,y,w,h]，surface→faces[].face，"
                        "summary.review_status→件级review_status。契约见第9章与《22-前后端API契约》。",
                    ),
                ],
            )
        print("enriched ch8")

        # --- New chapter 9 before chapter 10 (former 9) ---
        h10 = find_paragraph(doc, exact="10 测试情况与效率对比")
        if not h10:
            # fallback if replace order left old title somehow
            h10 = find_paragraph(doc, exact="9 测试情况与效率对比")
        if not h10:
            raise RuntimeError("chapter 10 heading not found")

        # Insert BEFORE h10: create new paras by inserting before range
        rng = h10.Range
        rng.Collapse(1)  # start
        # Insert in reverse order using InsertBefore on a growing block is messy;
        # instead insert paragraph before and fill, repeating.
        ch9_blocks = [
            ("Heading 1", "9 检测软件与BI详细设计"),
            ("Heading 2", "9.1 检测结果展示（detector-ui）"),
            (
                "Normal",
                "detector-ui面向检测结果消费：样件/批次列表、单件多面图像与缺陷框叠加、"
                "缺陷列表回放、复核状态展示。"
                "数据以静态JSON文件直读为主，不提前架设重型后端。"
                "展示字段与FR-D4对齐：样件ID、批次ID、检测面、缺陷类别、位置框、置信度、"
                "检测时间、模型版本、复核状态。",
            ),
            ("Heading 2", "9.2 前后端数据交互与接口契约"),
            (
                "Normal",
                "交互原则：文件直读优先；复核回写确有需要时再开轻量API。"
                "只读数据路径建议：GET /data/detect/jobs-index.json（列表索引）；"
                "GET /data/detect/jobs/{piece_id}.json（单件明细，含faces[]与defects[]）。"
                "可选复核写入：POST /api/review（口令校验；action含confirm/reject/relabel；草稿态，是否本期实现按复核工作量关单）。"
                "统一错误码遵循前后端契约（400/401/404/422/502等）。"
                "算法落盘格式与前端jobs格式之间，sync脚本为唯一转换入口。",
            ),
            ("Heading 2", "9.3 统计分析"),
            (
                "Normal",
                "在结构化结果具备piece_id、batch_id、by_class、timestamp、model_version的前提下，"
                "支持按批次聚合缺陷数量与类别分布、按模型版本对比、按复核状态统计待审/已确认/驳回。"
                "效率对照试验应采用同批样件与同一缺陷标准，将搬运、观察、记录、复核与报告计入全流程时间，"
                "结果可服务第10章效率对比表。统计口径不得把异常筛查与YOLO主检召回串行相乘后当作P0指标。",
            ),
            ("Heading 2", "9.4 管理BI"),
            (
                "Normal",
                "管理BI与detector-ui同属展示层、不同用途：BI承载课题管理信息，包括里程碑/五节点进度、"
                "风险台账、M币预算与流水、团队工作流、知识库入口与意见箱。"
                "部署形态建议静态站点（如Cloudflare Pages）；公开管理信息与企业检测数据分离，"
                "企业检测明细默认不进入公网。"
                "BI与仓库结构化数据（如.project-spec）通过sync保持单事实源，避免双份维护。",
            ),
            ("Heading 2", "9.5 联调与第三方试操检查点"),
            (
                "Normal",
                "联调最小闭环：离线模块对样例图产出result.json与overlay→执行同步脚本生成jobs数据→"
                "detector-ui可打开列表与叠加框→（可选）完成一条复核回写。"
                "第三方试操检查点与使用说明对齐：无产线联机环境下完成放图、跑检测、查看结果；"
                "CPU路径可运行；字段与目录符合第8章约定。",
            ),
        ]

        # Insert before h10 by inserting paras at collapsed start repeatedly in reverse
        for style_name, text in reversed(ch9_blocks):
            rng = h10.Range
            rng.Collapse(1)
            rng.InsertParagraphBefore()
            # newly inserted paragraph is immediately before h10
            new_p = h10.Previous()
            new_p.Range.Text = text + "\r"
            new_p = h10.Previous()
            try:
                new_p.Style = style_name
            except Exception:
                try:
                    new_p.Style = doc_styles_fallback(style_name)
                except Exception:
                    pass
        print("inserted ch9")

        # --- TOC entries for new chapter (tracked inserts after TOC ch8 line) ---
        toc8 = find_paragraph(doc, startswith="8 离线检测模块与软件接口")
        # Also find toc-styled line; startswith may hit heading too — prefer style toc 1
        toc_anchor = None
        for i in range(1, min(doc.Paragraphs.Count, 60) + 1):
            p = doc.Paragraphs(i)
            t = p.Range.Text.replace("\r", "").strip()
            style = ""
            try:
                style = p.Style.NameLocal
            except Exception:
                pass
            if "toc" in style.lower() and t.startswith("8 离线检测模块与软件接口"):
                toc_anchor = p
                break
        if toc_anchor is None:
            # try old name if TOC replace failed on tabs
            for i in range(1, min(doc.Paragraphs.Count, 60) + 1):
                p = doc.Paragraphs(i)
                t = p.Range.Text.replace("\r", "").strip()
                style = ""
                try:
                    style = p.Style.NameLocal
                except Exception:
                    pass
                if "toc" in style.lower() and "8 离线检测模块" in t:
                    toc_anchor = p
                    break

        if toc_anchor is not None:
            toc_lines = [
                ("toc 1", "9 检测软件与BI详细设计"),
                ("toc 2", "9.1 检测结果展示（detector-ui）"),
                ("toc 2", "9.2 前后端数据交互与接口契约"),
                ("toc 2", "9.3 统计分析"),
                ("toc 2", "9.4 管理BI"),
                ("toc 2", "9.5 联调与第三方试操检查点"),
            ]
            # insert after toc_anchor; then 10 already renamed in TOC via replace_all
            anchor = toc_anchor
            for style_name, text in toc_lines:
                anchor.Range.InsertParagraphAfter()
                new_p = anchor.Next()
                new_p.Range.Text = text + "\t" + "\r"
                new_p = anchor.Next()
                try:
                    new_p.Style = style_name
                except Exception:
                    pass
                anchor = new_p
            print("inserted TOC entries for ch9")
        else:
            print("WARN: TOC anchor for ch8 not found; skip TOC insert")

        # --- Change record note (optional first empty row) ---
        # Skip table edits to avoid corrupting complex cover tables.

        doc.TrackRevisions = True
        doc.Save()
        print("saved:", SRC)
        return 0
    finally:
        if doc is not None:
            try:
                doc.Close(True)
            except Exception:
                pass
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass


if __name__ == "__main__":
    # kill orphan word if needed
    sys.exit(main())
