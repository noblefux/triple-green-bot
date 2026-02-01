const { Client, GatewayIntentBits } = require("discord.js");
const puppeteer = require("puppeteer");

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ROLE_ID = process.env.ROLE_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastAlertId = null;

client.once("ready", () => {
  console.log("Discord connected");
  startWatcher();
});

async function startWatcher() {

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.goto("https://www.csgoroll.com/roll", {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  console.log("Opened roll page");

  // check every 4 seconds
  setInterval(async () => {
    try {

      const result = await page.evaluate(() => {

        // select all roll items
        const items = document.querySelectorAll(".rolls a[href='/roll/history']");
        if (!items || items.length < 2) return null;

        const first = items[0];   // newest roll
        const second = items[1];  // previous roll

        // detect color from class
        const getColor = (el) => {
          const cls = el.className;
          if (cls.includes("bg-green")) return "green";
          if (cls.includes("bg-red")) return "red";
          if (cls.includes("bg-black")) return "black";
          return "unknown";
        };

        return {
          first: getColor(first),
          second: getColor(second),
          key: first.className + "|" + second.className // unique per double-green
        };
      });

      if (!result) return;

      // double green detected
      if (result.first === "green" && result.second === "green") {
        if (lastAlertId !== result.key) {
          lastAlertId = result.key;
          await sendPing();
        }
      }

    } catch (err) {
      console.log("Watcher error:", err.message);
    }
  }, 4000);
}

async function sendPing() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    await channel.send(`<@&${ROLE_ID}> 🟢🟢 **DOUBLE GREEN ON CSGOROLL!**`);
    console.log("Ping sent!");
  } catch (err) {
    console.log("Error sending ping:", err.message);
  }
}

// login Discord
client.login(TOKEN);
