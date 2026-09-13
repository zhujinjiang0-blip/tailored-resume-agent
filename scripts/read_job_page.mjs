import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const url = getArg("--url");
const profileDir = getArg("--profile-dir", path.join(os.tmpdir(), "resume-agent-browser"));
const waitMs = Number.parseInt(getArg("--wait-ms", "5000"), 10);
const headless = !process.argv.includes("--headed");

if (!url) {
  console.error("Usage: node read_job_page.mjs --url <url> [--profile-dir <dir>] [--wait-ms <ms>] [--headed]");
  process.exit(2);
}

fs.mkdirSync(profileDir, { recursive: true });

const executablePath = process.env.CHROME_PATH || undefined;
let context;
try {
  context = await chromium.launchPersistentContext(profileDir, {
    headless,
    executablePath,
    viewport: { width: 1440, height: 1100 },
    args: ["--disable-dev-shm-usage"],
  });
} catch (error) {
  console.error(`Unable to launch Chromium: ${error.message}`);
  process.exit(3);
}

try {
  const pages = context.pages();
  const page = pages[0] || (await context.newPage());
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(Math.max(0, Number.isFinite(waitMs) ? waitMs : 5000));

  await page.evaluate(() => {
    const expandPattern = /展开|查看完整|查看更多|更多详情|继续阅读/;
    const buttons = [...document.querySelectorAll("button, a, [role='button']")];
    for (const button of buttons.slice(0, 200)) {
      const text = (button.innerText || button.textContent || "").trim();
      const style = window.getComputedStyle(button);
      if (
        text.length <= 20 &&
        expandPattern.test(text) &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      ) {
        try {
          button.click();
        } catch (_) {
          // Ignore buttons that disappear or reject programmatic clicks.
        }
      }
    }
  });
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const clean = (value) =>
      String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const visible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        element.getBoundingClientRect().height > 0
      );
    };

    const htmlToText = (html) => {
      const container = document.createElement("div");
      container.innerHTML = String(html || "");
      container.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
      container.querySelectorAll("p, div, section, li").forEach((node) => {
        node.append("\n");
      });
      container.querySelectorAll("li").forEach((node) => {
        node.prepend("• ");
      });
      return clean(container.innerText || container.textContent || "");
    };

    const readLdJson = () => {
      const postings = [];
      const visit = (value) => {
        if (!value) return;
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        if (typeof value !== "object") return;
        const type = value["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((item) => String(item).toLowerCase() === "jobposting")) {
          postings.push(value);
        }
        if (value["@graph"]) visit(value["@graph"]);
      };
      for (const script of document.querySelectorAll("script[type='application/ld+json']")) {
        try {
          visit(JSON.parse(script.textContent || "null"));
        } catch (_) {
          // Ignore malformed structured data.
        }
      }
      return postings;
    };

    const postings = readLdJson();
    const posting = postings[0] || {};
    const structuredDescription = htmlToText(posting.description || "");
    const structuredCompany =
      typeof posting.hiringOrganization === "string"
        ? posting.hiringOrganization
        : posting.hiringOrganization?.name || "";
    const structuredTitle = posting.title || "";

    const selectors = [
      "[class*='job-sec-text']",
      "[class*='job-description']",
      "[class*='job-detail']",
      "[class*='job-desc']",
      "[class*='PositionDetail']",
      "[class*='position-detail']",
      "[class*='position-desc']",
      "[class*='CampusPosition']",
      "[class*='detail-content']",
      "[class*='detailContent']",
      "[class*='job-intro']",
      "[class*='job-info-container']",
      "[class*='job-info']",
      "[class*='body-container']",
      "[class*='description']",
      "[data-testid*='job-description']",
      "[data-testid*='job-detail']",
      "main article",
      "article",
      "main",
    ];
    const scoreSignals = [
      "岗位职责",
      "职位描述",
      "工作内容",
      "任职要求",
      "职位要求",
      "岗位要求",
      "我们希望你",
      "加分项",
      "Responsibilities",
      "Requirements",
      "Qualifications",
    ];
    const candidates = [];
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        if (!visible(element)) continue;
        const text = clean(element.innerText || element.textContent || "");
        if (text.length < 80) continue;
        const signalHits = scoreSignals.reduce(
          (count, signal) => count + (text.includes(signal) ? 1 : 0),
          0,
        );
        const navigationPenalty = /cookie|登录|扫码|隐私政策|下载APP/i.test(text) ? 500 : 0;
        const specificity =
          selector === "body"
            ? 0
            : /PositionDetail|CampusPosition|job-info-container|job-detail|position-detail/i.test(
                  selector,
                )
              ? 1500
              : 500;
        candidates.push({
          selector,
          text,
          score:
            Math.min(text.length, 10000) / 10 +
            signalHits * 1500 +
            specificity -
            navigationPenalty,
        });
      }
    }
    candidates.sort((left, right) => right.score - left.score);
    const bestCandidate = candidates[0] || null;

    const ogTitle = document.querySelector("meta[property='og:title']")?.content || "";
    const siteName = document.querySelector("meta[property='og:site_name']")?.content || "";
    const sectionTitles = new Set([
      "职位描述",
      "岗位职责",
      "工作内容",
      "任职要求",
      "职位要求",
      "岗位要求",
      "基础信息",
      "在招业务",
      "职位解读",
    ]);
    const roleSelectors = [
      "[class*='PositionDetail--name']",
      "[class*='position-name']",
      "[class*='positionName']",
      "[class*='position-title']",
      "[class*='positionTitle']",
      "[class*='job-name']",
      "[class*='jobName']",
      "[class*='job-title']",
      "[class*='jobTitle']",
      "[class~='title']",
      "h1",
    ];
    let inferredRole = "";
    for (const selector of roleSelectors) {
      const node = [...document.querySelectorAll(selector)].find((element) => {
        const text = clean(element.innerText || element.textContent || "");
        return visible(element) && text.length >= 2 && text.length <= 80 && !sectionTitles.has(text);
      });
      if (node) {
        inferredRole = clean(node.innerText || node.textContent || "");
        break;
      }
    }

    const pageTitle = clean(document.title);
    const titleBrand = clean(pageTitle.split(/[-_|｜]/)[0]).replace(
      /校园招聘|校园|校招|招聘|官网|职位|岗位/g,
      "",
    );
    const companyCandidates = [
      structuredCompany,
      document.querySelector("[class*='company-name']")?.textContent,
      document.querySelector("[class*='companyName']")?.textContent,
      document.querySelector("[class*='company-title']")?.textContent,
      titleBrand,
      siteName,
    ]
      .map(clean)
      .filter(Boolean);
    const locationCandidate = [
      "[class*='position-location']",
      "[class*='job-location']",
      "[class*='position-city']",
      "[class*='job-city']",
      "[class*='location']",
      "[class*='address']",
    ]
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find(visible);

    const bodyText = clean(document.body?.innerText || document.body?.textContent || "");
    let text = bestCandidate?.text || bodyText;
    if (structuredDescription.length > 120) {
      text = [structuredTitle, structuredCompany, structuredDescription].filter(Boolean).join("\n\n");
    }

    const loginPattern = /扫码登录|请先登录|登录后查看|安全验证|验证码|Sign in|Log in/i;
    const resolvedRole = clean(structuredTitle || inferredRole || pageTitle);
    return {
      ok: text.length >= 120,
      needs_login: text.length < 800 && loginPattern.test(bodyText),
      title: resolvedRole,
      inferred_role: resolvedRole,
      inferred_company: companyCandidates[0] || "",
      location:
        clean(
          posting.jobLocation?.address?.addressLocality ||
            posting.jobLocation?.address?.addressRegion ||
            "",
        ) || clean(locationCandidate?.innerText || locationCandidate?.textContent || ""),
      text,
      text_length: text.length,
      source_selector: structuredDescription.length > 120 ? "json-ld" : bestCandidate?.selector || "body",
      final_url: location.href,
      page_title: pageTitle || clean(ogTitle),
    };
  });

  if (!result.ok && result.needs_login) {
    result.error = "页面要求登录或安全验证。使用 --headed 打开浏览器，登录后重试。";
  } else if (!result.ok) {
    result.error = "页面未提取到足够的岗位文本，可能需要登录、展开详情或手工粘贴 JD。";
  }

  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 4);
} finally {
  await context.close();
}
