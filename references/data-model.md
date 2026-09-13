# 数据模型与可追溯性

所有 JSON 文件使用 UTF-8，`schema_version` 为 `1`。ID 使用稳定、可读、唯一的字符串，例如 `evidence.anker.rma.impact` 或 `rw.anker.rma.result`。

## Profile

文件：`profile.json` 或 run 内的 `analysis/profile.json`

```json
{
  "schema_version": 1,
  "status": "verified",
  "candidate": {
    "name": "姓名",
    "phone": "",
    "email": "",
    "location": "",
    "links": []
  },
  "target_language": "zh-CN",
  "headline": "",
  "skills": [],
  "experience": [],
  "projects": [],
  "education": [],
  "certifications": []
}
```

`experience`、`projects` 和 `education` 每项至少包含 `id`、`organization`、`title`、`start`、`end`、`facts`。空字段可以保留，不允许用推测值填充。

## EvidenceItem

文件：`evidence.json` 或 run 内的 `analysis/evidence.json`

```json
{
  "schema_version": 1,
  "items": [
    {
      "id": "evidence.anker.rma.impact",
      "type": "experience",
      "organization": "公司名",
      "title": "项目或经历名",
      "date_range": "2026-03 to 2026-06",
      "ownership": "participated",
      "statement": "参与 RMA 数据拆分和跨部门闭环。",
      "metrics": [
        {
          "name": "非质量 RMA 金额率",
          "before": "4.5%",
          "after": "3.2%",
          "period": "2026 Q2",
          "scope": "指定市场与渠道",
          "source": "用户确认"
        }
      ],
      "status": "verified",
      "source_refs": ["source/resume.txt#L42"],
      "prohibited_phrases": ["独立负责", "主导"]
    }
  ]
}
```

`ownership` 只允许：

- `led`：主导并承担最终责任。
- `owned`：独立负责约定范围。
- `participated`：参与执行或共同完成。
- `supported`：支持他人完成。
- `observed`：了解或协助，不承担交付责任。

`status` 只允许 `verified`、`unverified`、`conflicting`。只有 `verified` 证据可进入获批改写。

## JDRequirement

文件：run 内的 `requirements.json`

```json
{
  "schema_version": 1,
  "role_lens": "有多年招聘经验的 HR + 该岗位面试官",
  "company": "目标公司",
  "role": "目标岗位",
  "top_capabilities": [
    "客户问题分析",
    "跨团队推动",
    "数据跟踪"
  ],
  "keywords": ["客户反馈", "闭环", "数据分析"],
  "hr_risks": [
    "岗位要求的量化结果不够突出"
  ],
  "thirty_second_review": {
    "would_interview": true,
    "decision": "经历与岗位相关，但第一条经历需要更早出现岗位关键词。",
    "where_stuck": [],
    "improvements": ["将客户反馈闭环放到第一段经历开头"]
  },
  "requirements": [
    {
      "id": "req.001",
      "priority": "must",
      "requirement": "能够对客户问题做数据分析并推动闭环。",
      "keywords": ["数据分析", "闭环", "客户问题"],
      "evidence_ids": ["evidence.anker.rma.impact"],
      "coverage": "strong",
      "gap_note": ""
    }
  ]
}
```

`priority` 只允许 `must` 或 `preferred`。`coverage` 只允许 `strong`、`transferable` 或 `gap`。`gap` 不需要 `evidence_ids`，但必须有 `gap_note`。

`top_capabilities` 应控制在 3-5 项，优先使用 JD 原词。`keywords` 用于自然融入简历。`hr_risks` 记录招聘方可能跳过的原因。`thirty_second_review` 至少记录一次红队复核；`would_interview` 为 `false` 时，`where_stuck` 和 `improvements` 必须非空。

## ResumeRewrite

文件：run 内的 `rewrites.json`

```json
{
  "schema_version": 1,
  "rewrites": [
    {
      "id": "rw.001",
      "status": "proposed",
      "target": {
        "format": "html",
        "xpath": "//*[@data-resume-id='experience-anker-bullet-2']",
        "mode": "text"
      },
      "original": "帮助处理 RMA 问题。",
      "proposed": "参与 RMA 问题拆解并推动跨部门闭环。",
      "requirement_ids": ["req.001"],
      "evidence_ids": ["evidence.anker.rma.impact"],
      "rationale": "对应 JD 的数据分析与跨团队闭环要求。",
      "risk_flags": []
    }
  ]
}
```

`status` 只允许 `proposed`、`approved`、`rejected`。获批条目必须：

- 至少关联一条 `JDRequirement`。
- 至少关联一条 `verified` 证据。
- 至少有一条被引用的 JD 要求与改写证据相交，形成“要求 -> 证据 -> 改写”的完整链路。
- 不改变 `ownership` 边界。
- 不新增未确认数字。
- 不使用 `[待确认]`、`[TODO]` 等占位文本。
- 有唯一且可定位的 HTML XPath 或 DOCX 段落位置。

## Run 目录

```text
.resume-agent/
|-- profile.json
|-- evidence.json
|-- source/
`-- runs/
    `-- 20260913-example-role-ab12cd/
        |-- job.json
        |-- requirements.json
        |-- rewrites.json
        |-- change-log.md
        |-- delivery.json
        |-- inputs/
        |-- analysis/
        `-- output/
```

不要把事实库或 output 自动提交到公开仓库。
