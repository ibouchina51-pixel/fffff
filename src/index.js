const puppeteer = require("puppeteer");

// ===== إعدادات عامة =====
const TARGET = "https://cryptozone.free.nf/?page_id=14"; // ← ضع رابطك هنا
const VISIT_EVERY_MS = 60_000;        // زيارة كل 60 ثانية
const MAX_INTERNAL_STEPS = 3;         // أقصى عدد تنقّلات داخلية

// قائمة User-Agents (مختصرة)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16 Mobile/15E148 Safari/604.1"
];

// مراجع افتراضية (اختياري)
const REFERRERS = [
  "https://www.google.com/",
  "https://www.bing.com/",
  "https://duckduckgo.com/",
  "https://news.ycombinator.com/",
  "https://twitter.com/"
];

// دالة انتظار عشوائي
const waitRand = (minMs, maxMs) =>
  new Promise(r => setTimeout(r, Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs));

// حركة ماوس ناعمة
async function smoothMouseMove(page, x1, y1, x2, y2, steps = 20) {
  await page.mouse.move(x1, y1);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * t); // ease-in-out
    const x = x1 + (x2 - x1) * ease;
    const y = y1 + (y2 - y1) * ease;
    await page.mouse.move(x, y);
    await waitRand(5, 20);
  }
}

// التقاط روابط ظاهرة
async function getVisibleLinks(page) {
  return await page.$$eval("a[href]", anchors =>
    anchors
      .filter(a => {
        const rect = a.getBoundingClientRect();
        const href = a.getAttribute("href") || "";
        return rect.width > 20 && rect.height > 10 && !href.startsWith("#") && !href.startsWith("javascript:");
      })
      .slice(0, 50)
      .map(a => a.href)
  );
}

async function singleVisit() {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const referer = REFERRERS[Math.floor(Math.random() * REFERRERS.length)];
  const width = Math.floor(Math.random() * 400) + 1024; // 1024–1424
  const height = Math.floor(Math.random() * 300) + 700; // 700–1000

  const browser = await puppeteer.launch({
    headless: "new", // ← الإضافة المطلوبة
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      `--window-size=${width},${height}`
    ]
  });

  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();

  await page.setUserAgent(ua);
  await page.setViewport({ width, height });
  await page.setExtraHTTPHeaders({ referer });

  console.log(`🔗 زيارة: ${TARGET}`);
  console.log(`🧭 UA: ${ua}`);
  console.log(`↪️ Referer: ${referer}`);
  console.log(`🖥 Viewport: ${width}x${height}`);

  try {
    await page.goto(TARGET, { waitUntil: "networkidle2", timeout: 60_000 });

    // انتظار كأنه يقرأ
    await waitRand(2000, 5000);

    // تمرير
    for (let i = 0; i < 3; i++) {
      const scrollBy = Math.floor(Math.random() * 500) + 300;
      await page.mouse.wheel({ deltaY: scrollBy });
      console.log(`📜 تمرير ${scrollBy}px`);
      await waitRand(800, 2000);
    }

    // حركة ماوس ونقر
    const x1 = Math.floor(Math.random() * (width - 100)) + 50;
    const y1 = Math.floor(Math.random() * (height - 120)) + 60;
    const x2 = Math.floor(Math.random() * (width - 100)) + 50;
    const y2 = Math.floor(Math.random() * (height - 120)) + 60;
    await smoothMouseMove(page, x1, y1, x2, y2, 25);
    await page.mouse.click(x2, y2, { delay: Math.floor(Math.random() * 120) + 40 });
    console.log(`🖱 نقر في (${x2}, ${y2})`);
    await waitRand(1000, 2000);

    // تنقّل داخلي 0..MAX_INTERNAL_STEPS
    let links = await getVisibleLinks(page);
    links = links.filter(href => href.startsWith(TARGET) || href.includes(new URL(TARGET).hostname));

    const steps = Math.floor(Math.random() * (MAX_INTERNAL_STEPS + 1));
    for (let i = 0; i < steps && links.length; i++) {
      const link = links[Math.floor(Math.random() * links.length)];
      console.log(`🔗 انتقال داخلي (${i + 1}/${steps}): ${link}`);
      await page.goto(link, { waitUntil: "networkidle2", timeout: 60_000 });
      await waitRand(1500, 3500);

      const scrollBy = Math.floor(Math.random() * 400) + 200;
      await page.mouse.wheel({ deltaY: scrollBy });
      console.log(`📜 تمرير داخلي ${scrollBy}px`);
      await waitRand(1000, 2500);

      links = await getVisibleLinks(page);
      links = links.filter(href => href.includes(new URL(TARGET).hostname));
    }

    console.log("✅ الزيارة انتهت");
  } catch (err) {
    console.error("❌ خطأ أثناء الزيارة:", err.message);
  } finally {
    await browser.close();
  }
}

// حلقة تشغيل
(async function loop() {
  while (true) {
    await singleVisit();
    console.log(`⏳ انتظار ${(VISIT_EVERY_MS / 1000).toFixed(0)} ثانية...\n`);
    await waitRand(VISIT_EVERY_MS * 0.9, VISIT_EVERY_MS * 1.2);
  }
})();
