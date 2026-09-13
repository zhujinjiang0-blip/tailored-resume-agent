# Tailored Resume Agent

A Codex Skill for tailoring a resume to a specific job description without inventing experience, roles, metrics, or outcomes.

The workflow uses two human confirmation gates:

1. Confirm facts and missing evidence.
2. Confirm rewrite diffs before export.

It also applies a 30-second HR red-team review before final delivery.

## Capabilities

- Parse resumes and job descriptions from HTML, DOCX, PDF, text, or Markdown.
- Maintain a reusable local evidence library.
- Map each JD requirement to verified evidence.
- Reject role inflation, unsupported numbers, vague claims, and broken evidence chains.
- Edit HTML or DOCX resume templates through structured rewrite diffs.
- Export editable HTML, a one-page A4 PDF, and a change log.

## Install

Clone this repository into your Codex skills directory:

```bash
git clone <repository-url> ~/.codex/skills/tailored-resume-agent
```

Then invoke it explicitly:

```text
Use $tailored-resume-agent with my resume, target JD, and template. First diagnose the fit as the hiring HR and interviewer, then complete fact confirmation, targeted rewriting, a 30-second HR review, and A4 PDF export.
```

## Runtime Dependencies

- Python with `python-docx`, `pypdf`, and `pdfplumber`
- Node.js with Playwright
- Chrome or Chromium for HTML-to-PDF export
- LibreOffice/`soffice` for DOCX-to-HTML/PDF export

The scripts prefer executables and packages supplied by the Codex workspace dependency runtime when system tools are unavailable.

## Privacy

Resume data and generated artifacts are stored locally under `.resume-agent/`, which is excluded from Git. Do not commit a user's resume, evidence library, or exported PDFs to a public repository.
