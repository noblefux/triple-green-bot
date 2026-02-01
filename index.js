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

  setInterval(async () => {
    try {

      const result = await page.evaluate(() => {

        /*
          You must inspect ONE roll tile and replace this selector.
          Example only:
          const items = document.querySelectorAll(".roll-history-item");
        */

        const items = document.querySelectorAll(".roll-history-item");

        if (!items || items.length < 2) return null;

        const first = items[0];
        const second = items[1];

        const getColor = (el) => {
          if (el.className.includes("green")) return "green";
          if (el.className.includes("red")) return "red";
          if (el.className.includes("black")) return "black";
          return "unknown";
        };

        return {
          first: getColor(first),
          second: getColor(second),

          // simple fingerprint so we only alert once
          key: first.innerText + "|" + second.innerText
        };

      });

      if (!result) return;

      if (
        result.first === "green" &&
        result.second === "green"
      ) {

        if (lastAlertId !== result.key) {
          lastAlertId = result.key;
          await sendPing();
        }

      }

    } catch (e) {
      console.log("Watcher error:", e.message);
    }

  }, 4000);
}

async function sendPing() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  await channel.send(
    `<@&${ROLE_ID}> 🟢🟢 **DOUBLE GREEN ON CSGOROLL!**`
  );
}

client.login(TOKEN);
