const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE = "https://www.ihchina.cn";

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getProjectPage(page) {
  const res = await axios.get(`${BASE}/getProject.html`, {
    params: {
      province: "",
      rx_time: "",
      type: "",
      cate: "",
      keywords: "剪纸",
      category_id: "16",
      limit: "10",
      p: page
    },
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": `${BASE}/project#target1`
    }
  });
  return res.data;
}

function cleanText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function getIntro(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": `${BASE}/project#target1`
      }
    });

    const $ = cheerio.load(res.data, { decodeEntities: false });

    let intro = $(".inherit_xx1 .text .p")
      .first()
      .html() || "";

    intro = intro
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "");

    return cleanText(intro);
  } catch (e) {
    console.log("详情抓取失败：", url);
    return "";
  }
}

async function main() {
  const all = [];

  for (let page = 1; page <= 6; page++) {
    console.log("抓列表第 " + page + " 页");

    const data = await getProjectPage(page);

    if (!data.list || data.list.length === 0) break;

    data.list.forEach((d, index) => {
      all.push({
        serial: String((page - 1) * 10 + index + 1),
        projectNo: d.auto_id || "",
        code: d.num || "",
        name: d.title || "",
        category: d.type || "",
        batch: d.rx_time || "",
        type: d.cate || "",
        region: d.province || "",
        unit: d.protect_unit || "",
        sourceUrl: `${BASE}/project_details/${d.id}.html`,
        intro: ""
      });
    });

    await sleep(300);
  }

  console.log("列表共抓到：" + all.length + " 条");

  for (const item of all) {
    console.log("抓详情：" + item.name);
    item.intro = await getIntro(item.sourceUrl);
    await sleep(300);
  }

  fs.writeFileSync(
    "papercutting_56.json",
    JSON.stringify(all, null, 2),
    "utf-8"
  );

  console.log("完成：papercutting_56.json");
}

main();