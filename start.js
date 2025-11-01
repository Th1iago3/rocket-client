const { spawn } = require("child_process");

function startBot() {
  const bot = spawn("node", ["--max-old-space-size=2048", "index.js"], { stdio: "inherit" });
  bot.on("exit", (code, signal) => {
    startBot();
  });
}

startBot();