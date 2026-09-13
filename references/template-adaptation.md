# 模板适配与导出

## 支持的输入

- HTML：优先方案，可以稳定定位、更新和导出 A4 PDF。
- DOCX：保留原文档段落样式，使用 `python-docx` 改写，再用 LibreOffice 转换 HTML 和 PDF。
- PDF：只能作为内容提取或视觉参考，不能作为可编辑模板。必须要求用户提供 HTML 或 DOCX。

## HTML 定位

优先给目标元素增加稳定属性：

```html
<p data-resume-id="experience-anker-bullet-2">原描述</p>
```

改写目标使用 XPath：

```json
{
  "format": "html",
  "xpath": "//*[@data-resume-id='experience-anker-bullet-2']",
  "mode": "text"
}
```

规则：

- XPath 必须只匹配一个元素。
- 默认 `mode = text`，替换纯文本。
- 只有需要保留 `<strong>`、`<br>` 等结构时使用 `mode = html`。
- 不替换页眉、照片、按钮、脚本、样式和 `no-print` 区域。
- 更新内容前先备份模板；输出文件不得覆盖输入模板。

## DOCX 定位

普通段落：

```json
{
  "format": "docx",
  "paragraph_index": 24,
  "run_index": 0
}
```

表格单元格：

```json
{
  "format": "docx",
  "table_index": 0,
  "row_index": 2,
  "cell_index": 1,
  "paragraph_index": 0,
  "run_index": 0
}
```

规则：

- `paragraph_index` 从 0 开始。
- 未指定 `run_index` 时，保留首个 run 的样式，替换整个段落文本。
- 不删除段落、表格、图片或页眉页脚。
- 导出时统一设置 A4 纸张，同时保留原模板的横竖方向和页边距。
- 更新后再次检查 DOCX 的拼写、字体和换行。
- 交付 PDF 前必须用渲染结果检查页数，不能只依赖 Word 可能不同的分页。

## 一页 A4 验收

必须同时满足：

- PDF 恰好 1 页。
- MediaBox 为 A4，允许 3pt 误差。
- 页面文字可提取，不能只是一张图片。
- 没有内容被裁切、覆盖或超出纸张边缘。
- HTML 与 DOCX 模板的照片、联系方式、图标和背景正常。
- 中英文混排、日期和标点没有明显错位。

`finalize` 会自动检查页数、纸张大小和文本可提取性。内容拥挤时，按以下顺序处理：

1. 删除低相关 bullet。
2. 合并重复职责。
3. 精简措辞。
4. 调整模板留白。
5. 最后才考虑字号，且不得低于可招聘阅读的合理尺寸。

## 输出命名

`--filename` 只允许文件名主干，允许中文、字母、数字、点和连字符，不允许路径分隔符。输出：

```text
output/<filename>.html
output/<filename>.pdf
change-log.md
delivery.json
```

DOCX 模板额外保留：

```text
output/<filename>.docx
```
