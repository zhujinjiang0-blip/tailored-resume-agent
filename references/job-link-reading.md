# 投递链接读取

当用户只提供岗位链接时，使用 `prepare --jd <url>`。脚本通过本地 Playwright 浏览器打开页面，不调用第三方抓取服务。

## 提取内容

优先按以下顺序读取：

1. `JobPosting` JSON-LD 中的职位名称、公司和职责描述。
2. 常见职位详情区域，例如 `job-description`、`job-detail`、`PositionDetail`、`job-info-container`。
3. `main` 或 `article` 正文。
4. 页面正文作为最后回退。

`inputs/jd-source.json` 保存最终 URL、页面标题、自动识别的公司、岗位名称、所在地、岗位正文、文本长度、来源区域和是否需要登录。

## 公开链接

直接运行：

```bash
python3 scripts/resume_agent.py prepare \
  --store .resume-agent \
  --jd "https://example.com/jobs/123" \
  --template /path/to/resume.html
```

省略 `--company` 和 `--role` 时，脚本会尝试从结构化数据、职位标题和页面标题自动识别。自动结果必须由 Agent 在分析阶段复核并写回 `job.json` 与 `requirements.json`。

## 需要登录或验证码

使用可见浏览器和持久化 profile：

```bash
python3 scripts/resume_agent.py prepare \
  --store .resume-agent \
  --jd "https://example.com/jobs/123" \
  --template /path/to/resume.html \
  --headed \
  --wait-ms 60000
```

浏览器 profile 保存在 `.resume-agent/browser-profile/`。用户完成登录后无需再操作，脚本会在等待时间结束后提取页面。

## 失败处理

出现以下情况时不能猜测 JD 内容：

- 页面需要登录、验证码或安全验证。
- 页面只显示岗位标题，正文需要点击后在弹窗中加载。
- 页面由客户端持续加载，等待后仍没有正文。
- 页面要求 App、小程序或特定地区访问。
- 提取文本过短或明显来自导航、登录页。

失败后让用户选择：

1. 粘贴完整 JD 和岗位要求。
2. 保存页面为 PDF、HTML、DOCX 或文本文件后上传。
3. 使用 `--headed --wait-ms 60000` 重新尝试登录访问。

不得根据公司名、岗位名或公开印象补造岗位要求。
