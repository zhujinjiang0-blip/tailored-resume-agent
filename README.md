# Tailored Resume Agent

A Codex Skill for tailoring a resume to a specific job description without inventing experience, roles, metrics, or outcomes.

The workflow uses two human confirmation gates:

1. Confirm facts and missing evidence.
2. Confirm rewrite diffs before export.

It also applies a 30-second HR red-team review before final delivery.

At the start of each task, the agent lists the complete step count and the two confirmation points once, rather than sending repeated progress messages.

## Capabilities

- Parse resumes and job descriptions from HTML, DOCX, PDF, text, or Markdown.
- Read a job posting directly from a public or authenticated URL.
- Maintain a reusable local evidence library.
- Map each JD requirement to verified evidence.
- Reject role inflation, unsupported numbers, vague claims, and broken evidence chains.
- Edit HTML or DOCX resume templates through structured rewrite diffs.
- Export editable HTML, a one-page A4 PDF, and a change log.

## Install

Clone this repository into your Codex skills directory:

```bash
git clone https://github.com/zhujinjiang0-blip/tailored-resume-agent.git \
  ~/.codex/skills/tailored-resume-agent
```

Then invoke it explicitly:

```text
Use $tailored-resume-agent with my resume, target JD, and template. First diagnose the fit as the hiring HR and interviewer, then complete fact confirmation, targeted rewriting, a 30-second HR review, and A4 PDF export.
```

For a job link:

```bash
python3 scripts/resume_agent.py prepare \
  --store .resume-agent \
  --jd "https://example.com/jobs/123" \
  --template /path/to/resume.html
```

If the page requires login or verification, rerun with `--headed --wait-ms 60000` and finish the login in the browser window.

## Runtime Dependencies

- Python with `python-docx`, `pypdf`, and `pdfplumber`
- Node.js with Playwright
- Chrome or Chromium for HTML-to-PDF export
- LibreOffice/`soffice` for DOCX-to-HTML/PDF export

The scripts prefer executables and packages supplied by the Codex workspace dependency runtime when system tools are unavailable.

## Privacy

Resume data and generated artifacts are stored locally under `.resume-agent/`, which is excluded from Git. Do not commit a user's resume, evidence library, or exported PDFs to a public repository.
