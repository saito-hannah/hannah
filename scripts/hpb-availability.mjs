import { chromium } from "playwright";
import fs from "node:fs/promises";

const SALON_ID = "H000541642";
const COUPON_PAGE = "https://beauty.hotpepper.jp/slnH000541642/coupon/";
const OUT = "availability/latest.json";
const clean = (s = "") => s.replace(/\s+/g, " ").trim();

function score(text = "") {
  const t = clean(text);
  let n = 0;
  if (/料金が不安/.test(t)) n += 50;
  if (/ダイヤ/.test(t)) n += 25;
  if (/つけ放題/.test(t)) n += 25;
  if (/追加料金0/.test(t)) n += 10;
  if (/Ai担当不可/.test(t)) n += 8;
  if (/HANNAH NAGOYA|atsuki|ikki|Yukino|KANATA/.test(t)) n += 5;
  if (/美容学生|モデル|jr|Jr/.test(t)) n -= 30;
  if (/Ai指名/.test(t)) n -= 25;
  return n;
}

async function clickFirst(locator) {
  try {
    if (await locator.count() && await locator.first().isVisible()) {
      await locator.first().click({ timeout: 8000 });
      return true;
    }
  } catch {}
  return false;
}

async function findCoupon(page) {
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .filter(a => (a.textContent || "").includes("空席確認・予約"))
      .map((a, index) => {
        let node = a, best = "";
        for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
          const t = (node.innerText || "").replace(/\s+/g, " ").trim();
          if (t.length > best.length && t.length < 1800) best = t;
        }
        return { index, href: a.href || "", context: best };
      })
  );
  return rows.map(r => ({ ...r, score: score(r.context) }))
    .sort((a, b) => b.score - a.score)[0] || null;
}

async function advance(page) {
  for (let i = 0; i < 7; i++) {
    await page.waitForTimeout(1000);
    const body = clean(await page.locator("body").innerText().catch(() => ""));
    if (/日時.*選択|予約日時|空き状況|空席/.test(body) &&
        /\b(?:9|10|11|12|13|14|15|16|17|18|19|20)[:：][0-5]\d\b/.test(body)) return;

    if (await clickFirst(page.getByText(/指名なし|指名しない|指定なし|フリー/, { exact: true }))) continue;
    if (await clickFirst(page.getByRole("link", { name: /指名なし|指名しない|指定なし|フリー/ }))) continue;
    if (await clickFirst(page.getByRole("button", { name: /指名なし|指名しない|指定なし|フリー/ }))) continue;
    if (await clickFirst(page.getByRole("link", { name: /この内容で次へ|次へ|日時を選択|空席確認/ }))) continue;
    if (await clickFirst(page.getByRole("button", { name: /この内容で次へ|次へ|日時を選択|空席確認/ }))) continue;
    break;
  }
}

async function parseSlots(page) {
  return page.evaluate(() => {
    const c = (s = "") => s.replace(/\s+/g, " ").trim();
    const dateLike = s => /(?:\d{1,2}[\/月]\d{1,2}|\d{1,2}日|\d{1,2}\([月火水木金土日]\))/.test(s);
    const ok = cell => {
      const t = c(cell.innerText || "");
      if (/[×✕✖]/.test(t) || /^[-－—]$/.test(t) || /受付終了|TEL|電話/.test(t)) return false;
      if (/[○◯◎△]/.test(t)) return true;
      return !!cell.querySelector("a[href]") && !/不可|終了/.test(t);
    };
    const out = [];

    for (const table of document.querySelectorAll("table")) {
      const rows = [...table.querySelectorAll("tr")];
      const headers = {};
      for (const row of rows.slice(0, 6)) {
        [...row.querySelectorAll("th,td")].forEach((cell, i) => {
          const t = c(cell.innerText || "");
          if (dateLike(t)) headers[i] = t;
        });
      }
      for (const row of rows) {
        const cells = [...row.querySelectorAll("th,td")];
        if (!cells.length) continue;
        const first = c(cells[0].innerText || "");
        const timeRaw = first.match(/\b((?:[01]?\d|2[0-3])[:：][0-5]\d)\b/)?.[1];
        const time = timeRaw?.replace("：", ":");
        if (!time) continue;
        cells.slice(1).forEach((cell, j) => {
          if (!ok(cell)) return;
          const a = cell.querySelector("a[href]");
          out.push({
            dateLabel: headers[j + 1] || "",
            time,
            status: c(cell.innerText || ""),
            href: a?.href || ""
          });
        });
      }
    }
    return out;
  });
}

await fs.mkdir("availability", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
  viewport: { width: 1440, height: 1800 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141 Safari/537.36"
});
const page = await context.newPage();
let result;

try {
  await page.goto(COUPON_PAGE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const coupon = await findCoupon(page);
  if (!coupon) throw new Error("予約リンク付きクーポンが見つかりません");

  if (coupon.href) {
    await page.goto(coupon.href, { waitUntil: "domcontentloaded", timeout: 60000 });
  } else {
    await page.getByText(/空席確認・予約する/).nth(coupon.index).click({ timeout: 10000 });
  }

  await advance(page);
  await page.waitForTimeout(1500);
  const slots = await parseSlots(page);
  const body = clean(await page.locator("body").innerText().catch(() => ""));
  const grouped = {};
  for (const s of slots) {
    const d = s.dateLabel || "日付表示取得不可";
    grouped[d] ||= [];
    if (!grouped[d].includes(s.time)) grouped[d].push(s.time);
  }

  result = {
    salon: "HANNAH名古屋",
    salonId: SALON_ID,
    checkedAt: new Date().toISOString(),
    source: COUPON_PAGE,
    reservationPage: page.url(),
    coupon: { title: coupon.context.slice(0, 420), score: coupon.score, url: coupon.href || page.url() },
    status: slots.length ? "ok" : "partial",
    availableSlotCount: slots.length,
    dates: Object.entries(grouped).map(([dateLabel, times]) => ({ dateLabel, times: times.sort() })),
    slots,
    note: slots.length ? "HPB公開予約画面の○/◎/△を空席として取得" : "予約画面までは到達しましたが時間別の空席を抽出できませんでした",
    pageHint: body.slice(0, 1200)
  };
} catch (e) {
  result = {
    salon: "HANNAH名古屋",
    salonId: SALON_ID,
    checkedAt: new Date().toISOString(),
    source: COUPON_PAGE,
    reservationPage: page.url(),
    status: "error",
    availableSlotCount: 0,
    dates: [],
    slots: [],
    error: e instanceof Error ? e.message : String(e)
  };
}

await fs.writeFile(OUT, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
await browser.close();
