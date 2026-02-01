const { Client, GatewayIntentBits } = require("discord.js");
const puppeteer = require("puppeteer");

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ROLE_ID = process.env.ROLE_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastMessage = "";
let seenDoubleGreen = false;

client.once("ready", () => {
  console.log("Bot logged in");
  startWatcher();
});

async function startWatcher() {

const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  headless: "new"
});

  const page = await browser.newPage();

  await page.goto("https://csgoroll.com/en/roulette", {
    waitUntil: "networkidle2"
  });

  console.log("Opened CSGORoll");

  setInterval(async () => {

    try {

      const newestMessage = await page.evaluate(() => {

        // THIS SELECTOR MAY NEED ADJUSTING
        const messages = document.querySelectorAll("div");

        const texts = [];

        messages.forEach(m => {
          const t = m.innerText;
          if (t && t.length < 80) {
            texts.push(t);
          }
        });

        return texts[texts.length - 1] || "";

      });

      if (!newestMessage) return;
      if (newestMessage === lastMessage) return;

      lastMessage = newestMessage;

      console.log("Chat:", newestMessage);

      if (newestMessage.includes("Double Green")) {
        seenDoubleGreen = true;
        console.log("Double green detected");
        return;
      }

      if (seenDoubleGreen && newestMessage.toLowerCase().includes("green")) {
        seenDoubleGreen = false;
        await sendPing();
      }

    } catch (err) {
      console.log("Watcher error:", err.message);
    }

  }, 3000);
}

async function sendPing() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  await channel.send(
    `<@&${ROLE_ID}> 🟢🟢🟢 **TRIPLE GREEN JACKPOT!**`
  );
}

client.login(TOKEN);
