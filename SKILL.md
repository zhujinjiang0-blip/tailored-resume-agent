---
name: tailored-resume-agent
description: Tailor a resume to a job description while preserving verified facts, applying approved rewrite diffs, and exporting HTML, PDF, and a change log. Use when the user asks to customize, rewrite, match, or export a resume for a specific job. Do not use for cover letters, interview-story coaching, or automatic job applications.
---

# 简历定制 Agent

把一个已有简历和一份 JD 变成可追溯、可恢复、可直出的岗位定制简历。核心不是自由生成，而是用已验证事实做匹配、改写、检查和交付。

第一性原理：**简历不是个人编年史，而是为招聘方提供的低风险、高匹配决策证据**。

```text
简历价值 = 匹配度 × 证据强度 × 可读性 ÷ 对方决策成本
```

## 开始时必须公布完整步骤

每次新建任务后的第一条实质回复，先用一句话说明本次总步骤数，再列出全部步骤和当前所处步骤。不要一边执行一边反复输出“继续”“处理中”等状态词。

首次使用：

```text
本次首次定制共 6 步：
1. 读取简历、投递链接或 JD、模板
2. 建立并核对事实库
3. 诊断岗位，提炼能力和关键词，补问关键事实
4. 确认定制策略
5. 审核逐条改写并执行 30 秒 HR 复核
6. 确认后导出 HTML、A4 PDF 和修改记录

当前：第 1 步。其中第 3 步和第 6 步需要你确认。
```

复投使用：

```text
本次复投定制共 5 步：
1. 读取投递链接或 JD、模板
2. 复用事实库，完成岗位诊断
3. 核对新岗位所需事实与缺口
4. 审核逐条改写并执行 30 秒 HR 复核
5. 确认后导出 HTML、A4 PDF 和修改记录

当前：第 1 步。其中第 3 步和第 5 步需要你确认。
```

用户随时问“到哪一步了”时，只回答总步骤数、当前步骤和下一步，不复述内部八节点。

## 不可违反的规则

- 不编造公司、岗位、时间、职责、数字、项目结果或工具使用经历。
- `参与`、`支持`、`协助` 不得改写成 `主导`、`统筹`、`带领` 或 `独立负责`。
- 始终以“有多年招聘经验的 HR + 该岗位面试官”视角审阅，不把自己降级成单纯的语言润色器。
- 先诊断、后改写。先说明岗位最看重的能力和关键词、哪些内容该删、为什么可能被 HR 跳过，再提出改写。
- 每个获批改写必须关联至少一条 `status = verified` 的 `EvidenceItem`。
- 每个获批改写必须关联目标 JD 要求；与岗位无关的内容即使亮眼也应压缩或删除。
- 用数字、规模、频率、范围、排名或对比替代空泛形容词。
- 每条经历回答“解决了什么问题、带来了什么变化、为什么可信”；不只罗列职责。
- 未确认事实、冲突事实和待补数字不能进入最终稿。
- 用户确认事实之前不生成改写；用户确认改写之前不导出 PDF。
- 默认只处理本地文件，不把简历、JD 或事实库发送到外部服务。
- 支持读取公开或已登录的投递链接，但必须先把岗位正文、公司、岗位名称和要求提取到本地 run，再进行分析。

## 两个人工确认 Gate

### Gate 1：事实确认

解析简历后，最多提出 6 个只影响岗位匹配或事实边界的问题。将答案写回运行目录中的 `analysis/profile.json` 和 `analysis/evidence.json`，把 `job.json` 中的 `confirmations.facts_confirmed` 改为 `true`，再运行 `promote` 同步到长期事实库。未确认前停止。

### Gate 2：改写确认

先执行一次内部红队复核：

```text
假设你是该岗位 HR，只看这份简历 30 秒，你会不会让候选人进入面试？
如果不会，最可能卡在哪？
```

如果问题来自表达、排序或关键词，先修改并再次复核。如果是真实证据缺口，标记为 `gap`，不得编造，交给用户决定。

展示逐条差异：

`原文 -> 新描述 | 证据 | 修改理由 | 风险`

用户可以将每条改写标记为 `approved` 或 `rejected`。把最终状态写回 `rewrites.json`，再把 `job.json` 中的 `confirmations.rewrites_confirmed` 改为 `true`。存在 `proposed` 项或未确认时停止，不导出 PDF。

## 内部八节点

1. **资料解析**：读取简历、JD 和模板；保留原文件，不覆盖输入。
2. **事实归一化**：将经历拆成 `Profile` 与可追溯的 `EvidenceItem`。
3. **JD 需求提取**：提取硬性要求、偏好要求、关键词和优先级。
4. **匹配诊断**：以 JD 为靶心反推简历，标记 `strong`、`transferable`、`gap`，并引用证据 ID。
5. **缺口补问**：只询问会改变结论的关键事实。
6. **定制策略**：按“匹配度 × 证据强度 × 可读性 ÷ 决策成本”决定模块顺序、保留范围、删除范围、关键词和篇幅预算。
7. **简历改写**：按“动词 + 对象 + 方法 + 结果”生成结构化 `ResumeRewrite`，保留原文、JD 要求、依据和理由。
8. **HR 红队复核与导出**：模拟 30 秒筛选，修复表达问题，校验事实链、A4 单页、文字可选和文件完整性，再输出 HTML、PDF 和修改记录。

首次使用包含“建立事实库”，共 6 个用户步骤；之后复投为 5 个用户步骤。不要为了提高自动化程度删掉两个人工确认 Gate。

## 标准工作流

所有命令默认从当前 workspace 运行，用 `--store` 指定事实库目录。优先使用当前 Codex 环境提供的 Python 运行时；若系统 Python 缺少 `python-docx`、`pypdf` 或 `pdfplumber`，改用 workspace dependency 中的 Python。

首次使用时，如果用户已经能提供简历、JD 和模板，按以下顺序执行：

```text
init -> prepare -> JD 诊断 -> 针对性补问事实 -> promote -> 改写 -> 30 秒复核 -> finalize
```

不要在不知道 JD 重点时先做一轮泛化事实盘问。先建立 run，再根据岗位能力和关键词决定最多 6 个关键问题。

### 1. 首次建立事实库

```bash
python3 <skill>/scripts/resume_agent.py init \
  --store .resume-agent \
  --resume <resume.pdf|resume.docx|resume.html> \
  --candidate-name "<name>"
```

脚本会提取文本到 `source/resume.txt`，并创建空的 `profile.json` 与 `evidence.json`。如果 JD 和模板已经提供，立即进入下一步 `prepare`，不要先做泛化提问。

### 2. 准备一次投递

`--company` 和 `--role` 可以省略；当 `--jd` 是链接时，优先尝试从结构化数据、职位标题和页面元数据自动提取。

```bash
python3 <skill>/scripts/resume_agent.py prepare \
  --store .resume-agent \
  --jd <https://job-url|jd.txt|jd.pdf|jd.docx> \
  --template <resume.html|resume.docx> \
  --filename "<company>-<role>-resume"
```

`prepare` 会创建独立 run 目录，复制输入和事实快照，并生成 `requirements.json`、`rewrites.json` 和 `job.json`。随后先完成招聘方视角诊断，再根据诊断结果提出最多 6 个关键事实问题。后续只编辑该 run 目录内的文件，不改事实库原始文件。

如果页面要求登录或验证码：

```bash
python3 <skill>/scripts/resume_agent.py prepare \
  --store .resume-agent \
  --jd "<job-url>" \
  --template <resume.html|resume.docx> \
  --headed \
  --wait-ms 60000
```

浏览器使用事实库下的持久化 profile。完成登录后，脚本会提取页面文本；无法提取时必须停止并要求用户粘贴 JD，不得根据链接猜测岗位内容。

### 3. 确认事实并同步事实库

事实确认后执行：

```bash
python3 <skill>/scripts/resume_agent.py promote --run <run-dir>
```

该命令只会在 run 结构校验通过后，把 `analysis/profile.json` 和 `analysis/evidence.json` 写回长期事实库。后续投递应直接复用这些已验证事实。

### 4. 完成分析和改写

按 [references/data-model.md](references/data-model.md) 填写四个核心对象。按 [references/ai-collaboration.md](references/ai-collaboration.md) 完成招聘方视角诊断和 30 秒红队复核。按 [references/writing-rules.md](references/writing-rules.md) 完成逐条改写。按 [references/template-adaptation.md](references/template-adaptation.md) 设置 HTML XPath 或 DOCX 定位信息。

完整交互顺序和停止条件见 [references/workflow.md](references/workflow.md)。

### 5. 校验

```bash
python3 <skill>/scripts/resume_agent.py validate --run <run-dir>
python3 <skill>/scripts/resume_agent.py validate --run <run-dir> --strict-confirmations
```

第一条用于开发过程中的结构检查；第二条用于导出前的最终门禁。

### 6. 导出

```bash
python3 <skill>/scripts/resume_agent.py finalize --run <run-dir>
```

最终目录必须包含：

- `<filename>.html`：可编辑 HTML。
- `<filename>.pdf`：通过一页 A4 与文本可选中检查的 PDF。
- `change-log.md`：原文、改写、依据、理由和批准状态。
- `delivery.json`：文件哈希、渲染指标和校验结果。

DOCX 模板会保留 DOCX 中间稿，并转换为 HTML 和 PDF 交付。PDF 不能作为可编辑模板；只有 PDF 时，先要求用户提供 HTML 或 DOCX。

## 必须停止并询问的情况

- 简历、JD 或模板缺失、损坏或无法读取。
- 投递链接需要登录、验证码或反爬验证，且可见浏览器仍无法取得岗位正文。
- 简历事实之间存在冲突。
- 岗位要求需要用户未提供的成果、工具或职责。
- 逻辑无法在不改变事实边界的情况下改写。
- 模板缺少稳定定位点，且无法通过添加 `data-resume-id` 解决。
- 校验失败，尤其是证据链、角色夸张、未确认数字或 PDF 超过一页。

## 参考文件

- [references/workflow.md](references/workflow.md)：六步用户流程、八节点执行顺序和 Gate 操作。
- [references/job-link-reading.md](references/job-link-reading.md)：投递链接、登录验证、公司岗位识别和失败回退规则。
- [references/ai-collaboration.md](references/ai-collaboration.md)：HR/面试官视角、六步诊断顺序和 30 秒红队复核。
- [references/data-model.md](references/data-model.md)：四个核心对象、必填字段和示例。
- [references/writing-rules.md](references/writing-rules.md)：事实边界、指标和岗位关键词规则。
- [references/template-adaptation.md](references/template-adaptation.md)：HTML、DOCX、XPath、段落索引和 A4 导出规则。
