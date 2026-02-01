const { Client, GatewayIntentBits } = require("discord.js");
const { JSDOM } = require("jsdom");

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
  console.log("Starting CSGORoll scan...");

  setInterval(async () => {
    try {
      // Node.js 22+ has global fetch
      const res = await fetch("https://www.csgoroll.com/roll");
      const html = await res.text();

      const dom = new JSDOM(html);
      const document = dom.window.document;

      const items = [...document.querySelectorAll(".rolls a[href='/roll/history']")];
      if (items.length < 2) return;

      const getColor = el => {
        const cls = el.className;
        if (cls.includes("bg-green")) return "green";
        if (cls.includes("bg-red")) return "red";
        if (cls.includes("bg-black")) return "black";
        return "unknown";
      };

      const first = getColor(items[0]);
      const second = getColor(items[1]);
      const key = items[0].className + "|" + items[1].className;

      if (first === "green" && second === "green") {
        if (lastAlertId !== key) {
          lastAlertId = key;
          await sendPing();
        }
      }

    } catch (err) {
      console.log("Error scanning CSGORoll:", err.message);
    }
  }, 4000); // check every 4 seconds
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

client.login(TOKEN);
