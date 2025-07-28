// server.js
const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post("/scrape-posts", async (req, res) => {
  const { profileUrl } = req.body;

  if (!profileUrl) {
    return res.status(400).json({ error: "Missing profileUrl" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto("https://www.linkedin.com/login");

    console.log("👉 Waiting 60s for manual login...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // manual login

    await page.goto(`${profileUrl}/detail/recent-activity/shares/`);
    await autoScroll(page);

    const posts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("div.feed-shared-update-v2")).map(post => {
        const contentNode = post.querySelector("div.update-components-text span[dir='ltr']");
        const dateNode = post.querySelector("span.visually-hidden");

        const content = contentNode ? contentNode.innerText.trim() : "";
        const date = dateNode ? dateNode.innerText.trim() : "";

        return { content, date };
      }).filter(post => post.content);
    });

    await browser.close();
    return res.json({ posts });

  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ error: "Failed to scrape posts." });
  }
});

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 200;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
