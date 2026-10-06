import { chromium } from "playwright";
import fs from "node:fs/promises";

const SALON_ID = "H000541642";
const COUPON_PAGE = "https://beauty.hotpepper.jp/slnH000541642/coupon/";
const OUT = "availability/latest.json";
const clean = (s = "") => s.replace(/\s+/g, " ").trim();

const CATEGORIES = [
  {
    key: "model",
    label: "モデル施術",
    score(text) {
      const t = clean(text);
      let n = 0;
      if (/モデル価格|施術モデル|モデル施術/.test(t)) n += 120;
      if (/SUZUKA\s*Jr|RICO\s*Jr/i.test(t)) n += 80;
      if (/先着10名|SNS撮影/.test(t)) n += 20;
      if (/ダイヤ.*スーパーロング|MIXつけ放題/.test(t)) n += 15;
      if (/Ai担当不可/.test(t)) n -= 30;
      return n;
    }
  },
  {
    key: "ai",
    label: "Ai指名",
    score(text) {
      const t = clean(text);
      let n = 0;
      if (/対象スタイリスト[:：]?\s*Ai(?:\s|$)/.test(t)) n += 140;
      if (/Ai指名/.test(t)) n += 100;
      if (/史上最安値.*ダイヤモンドつけ放題|ダイヤモンドつけ放題.*追加料金0/.test(t)) n += 35;
      if (/10時.*16時/.test(t)) n += 10;
      if (/Ai担当不可/.test(t)) n -= 200;
      if (/モデル価格|Jr/.test(t)) n -= 100;
      return n;
    }
  },
  {
    key: "other",
    label: "他スタイリスト",
    score(text) {
      const t = clean(text);
      let n = 0;
      if (/Ai担当不可/.test(t)) n += 140;
      if (/HANNAH NAGOYA|atsuki|ikki|Yukino|KANATA/.test(t)) n += 45;
      if (/料金が不安/.test(t)) n += 50;
      if (/ダイヤつけ放題/.test(t)) n += 25;
      if (/33,000|33000/.test(t)) n += 10;
      if (/モデル価格|Jr/.test(t)) n -= 120;
      if (/対象スタイリスト[:：]?\s*Ai(?:\s|$)/.test(t)) n -= 200;
      return n;
    }
  }
];

async function clickFirst(locator) {
  try {
    if (await locator.count() && await locator.first().isVisible()) {
      await locator.first().click({ timeout: 8000 });
      return true;
    }
  } catch {}
  return false;
}

async function getCouponCandidates(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .filter(a => (a.textContent || "").includes("空席確認・予約"))
      .map((a, index) => {
        let node = a;
        let best = "";
        for (let i = 0; i < 9 && node; i++, node = node.parentElement) {
          const t = (node.innerText || "").replace(/\s+/g, " ").trim();
          const looksLikeCoupon =
            /対象スタイリスト|来店日条件|その他条件/.test(t) &&
            /空席確認・予約/.test(t);
          if (looksLikeCoupon && t.length > best.length && t.length < 1700) best = t;
        }
        if (!best) {
          node = a;
          for (let i = 0; i < 7 && node; i++, node = node.parentElement) {
            const t = (node.innerText || "").replace(/\s+/g, " ").trim();
            if (t.length > best.length && t.length < 1100) best = t;
          }
        }
        return { index, href: a.href || "", context: best };
      })
  );
}

function pickCoupon(candidates, category) {
  return candidates
    .map(c => ({ ...c, score: category.score(c.context) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)[0] || null;
}

async function advance(page) {
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(900);
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
          const href = a?.href || "";
          let dateLabel = headers[j + 1] || "";
          let slotTime = time;
          try {
            const u = href ? new URL(href) : null;
            const d = u?.searchParams.get("rsvRequestDate1");
            const t = u?.searchParams.get("rsvRequestTime1");
            if (d && /^\d{8}$/.test(d)) {
              dateLabel = d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8);
            }
            if (t && /^\d{4}$/.test(t)) {
              slotTime = t.slice(0, 2) + ":" + t.slice(2, 4);
            }
          } catch {}
          out.push({
            dateLabel,
            time: slotTime,
            status: c(cell.innerText || ""),
            href
          });
        });
      }
    }
    return out;
  });
}

function groupSlots(slots) {
  const grouped = {};
  for (const s of slots) {
    const d = s.dateLabel || "日付表示取得不可";
    grouped[d] ||= [];
    if (!grouped[d].includes(s.time)) grouped[d].push(s.time);
  }
  return Object.entries(grouped)
    .map(([dateLabel, times]) => ({ dateLabel, times: times.sort() }))
    .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
}

async function fetchCategory(browser, category, candidates) {
  const context = await browser.newContext({
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    viewport: { width: 1440, height: 1800 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141 Safari/537.36"
  });
  const page = await context.newPage();
  const coupon = pickCoupon(candidates, category);

  if (!coupon) {
    await context.close();
    return {
      key: category.key,
      label: category.label,
      status: "coupon_not_found",
      availableSlotCount: 0,
      dates: [],
      slots: [],
      error: "対象クーポンを自動判別できませんでした"
    };
  }

  try {
    if (coupon.href) {
      await page.goto(coupon.href, { waitUntil: "domcontentloaded", timeout: 60000 });
    } else {
      await page.goto(COUPON_PAGE, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.getByText(/空席確認・予約する/).nth(coupon.index).click({ timeout: 10000 });
    }

    await advance(page);
    await page.waitForTimeout(1200);
    const slots = await parseSlots(page);
    const body = clean(await page.locator("body").innerText().catch(() => ""));

    return {
      key: category.key,
      label: category.label,
      status: slots.length ? "ok" : "partial",
      reservationPage: page.url(),
      coupon: {
        title: coupon.context.slice(0, 520),
        score: coupon.score,
        url: coupon.href || page.url()
      },
      availableSlotCount: slots.length,
      dates: groupSlots(slots),
      slots,
      note: slots.length
        ? "HPB公開予約画面の○/◎/△を空席として取得"
        : "予約画面までは到達しましたが時間別の空席を抽出できませんでした",
      pageHint: body.slice(0, 800)
    };
  } catch (e) {
    return {
      key: category.key,
      label: category.label,
      status: "error",
      reservationPage: page.url(),
      coupon: {
        title: coupon.context.slice(0, 520),
        score: coupon.score,
        url: coupon.href || page.url()
      },
      availableSlotCount: 0,
      dates: [],
      slots: [],
      error: e instanceof Error ? e.message : String(e)
    };
  } finally {
    await context.close();
  }
}

await fs.mkdir("availability", { recursive: true });
const browser = await chromium.launch({ headless: true });
let result;

try {
  const indexContext = await browser.newContext({
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    viewport: { width: 1440, height: 1800 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141 Safari/537.36"
  });
  const indexPage = await indexContext.newPage();
  await indexPage.goto(COUPON_PAGE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await indexPage.waitForTimeout(2200);
  const candidates = await getCouponCandidates(indexPage);
  await indexContext.close();

  const categoryResults = {};
  for (const category of CATEGORIES) {
    categoryResults[category.key] = await fetchCategory(browser, category, candidates);
  }

  const values = Object.values(categoryResults);
  const allOk = values.every(v => v.status === "ok");
  const anyOk = values.some(v => v.status === "ok");

  result = {
    salon: "HANNAH名古屋",
    salonId: SALON_ID,
    checkedAt: new Date().toISOString(),
    source: COUPON_PAGE,
    status: allOk ? "ok" : anyOk ? "partial" : "error",
    categories: categoryResults
  };
} catch (e) {
  result = {
    salon: "HANNAH名古屋",
    salonId: SALON_ID,
    checkedAt: new Date().toISOString(),
    source: COUPON_PAGE,
    status: "error",
    categories: {},
    error: e instanceof Error ? e.message : String(e)
  };
}

await fs.writeFile(OUT, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
await browser.close();
