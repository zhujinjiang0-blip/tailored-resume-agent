import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error("Usage: node export_pdf.mjs <input.html> <output.pdf>");
  process.exit(2);
}

const input = path.resolve(inputPath);
const output = path.resolve(outputPath);
if (!fs.existsSync(input)) {
  console.error(`Input HTML not found: ${input}`);
  process.exit(2);
}

fs.mkdirSync(path.dirname(output), { recursive: true });

const executablePath = process.env.CHROME_PATH || undefined;
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--disable-dev-shm-usage"],
  });
} catch (error) {
  console.error(`Unable to launch Chromium: ${error.message}`);
  process.exit(3);
}

try {
  const page = await browser.newPage({
    viewport: { width: 1240, height: 1754 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(input).href, {
    waitUntil: "load",
    timeout: 60_000,
  });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(async () => {
    if (!document.fonts) return;
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });
  await page.waitForTimeout(100);

  const metrics = await page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (element.closest(".no-print")) return false;
      return true;
    };
    const resumePages = [...document.querySelectorAll(".resume-page")].filter(visible);
    const target = resumePages[0] || document.body;
    const targetRect = target.getBoundingClientRect();
    const elements = [...document.body.querySelectorAll("*")].filter(visible);
    let maxBottom = 0;
    let maxRight = 0;
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      maxBottom = Math.max(maxBottom, rect.bottom);
      maxRight = Math.max(maxRight, rect.right);
    }
    const a4 = {
      widthPx: (210 / 25.4) * 96,
      heightPx: (297 / 25.4) * 96,
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientHeight: document.body.clientHeight,
      bodyScrollHeight: document.body.scrollHeight,
      targetTag: target.tagName,
      targetClass: target.className || "",
      targetRect: {
        top: Math.round(targetRect.top * 100) / 100,
        right: Math.round(targetRect.right * 100) / 100,
        bottom: Math.round(targetRect.bottom * 100) / 100,
        left: Math.round(targetRect.left * 100) / 100,
        width: Math.round(targetRect.width * 100) / 100,
        height: Math.round(targetRect.height * 100) / 100,
      },
      targetClientHeight: target.clientHeight,
      targetScrollHeight: target.scrollHeight,
      maxVisibleBottom: Math.round(maxBottom * 100) / 100,
      maxVisibleRight: Math.round(maxRight * 100) / 100,
      horizontal_overflow: document.body.scrollWidth > document.body.clientWidth + 1,
      exceeds_a4_height:
        resumePages.length === 1 && target.scrollHeight > a4.heightPx + 4,
      resume_page_count: resumePages.length,
      a4,
      text_length: (document.body.innerText || "").trim().length,
    };
  });

  await page.pdf({
    path: output,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  console.log(JSON.stringify(metrics));
} finally {
  await browser.close();
}
