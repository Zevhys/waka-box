require("dotenv").config();
const { WakaTimeClient, RANGE } = require("wakatime-client");
const { Octokit } = require("@octokit/rest");

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  WAKATIME_API_KEY: wakatimeApiKey
} = process.env;

const wakatime = new WakaTimeClient(wakatimeApiKey);
const octokit = new Octokit({ auth: `token ${githubToken}` });

async function main() {
  const stats = await wakatime.getMyStats({ range: RANGE.LAST_30_DAYS });

  console.log("=== DEBUG: WakaTime Data ===");
  // console.log("stats:", JSON.stringify(stats, null, 2), "\n");
  console.log("stats.data.languages:", JSON.stringify(stats.data.languages, null, 2), "\n", "-".repeat(20));
  // console.log("stats.data.languages:", JSON.stringify(stats.data.languages, null, 2), "\n");
  console.log("stats.languages:", JSON.stringify(stats.languages, null, 2), "\n");

  if (stats.data && stats.data.languages) {
    console.log("Languages found:");
    stats.data.languages.forEach((lang, index) => {
      console.log(`${index + 1}. ${lang.name} - ${lang.percent}% - ${lang.text}`);
    });
  }

  await updateGist(stats);
}

function trimRightStr(str, len) {
  return str.length > len ? str.substring(0, len - 3) + "..." : str;
}

async function updateGist(stats) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
    return;
  }

  const emotes = {
    JavaScript: "✨",
    TypeScript: "🔷",
    HTML: "🌐",
    CSS: "🎨",
    SCSS: "🎨",
    SASS: "🎨",

    Python: "🐍",
    Java: "☕",
    "C++": "⚡",
    "C#": "💜",
    C: "⚡",
    Go: "🐹",
    Rust: "🦀",
    Swift: "🍎",
    Kotlin: "🟠",
    Dart: "🎯",
    Ruby: "💎",
    PHP: "🐘",
    Scala: "🔴",

    React: "⚛️",
    Vue: "💚",
    Angular: "🅰️",
    Svelte: "🧡",

    "Node.js": "🟢",
    NodeJS: "🟢",
    Django: "🐍",
    Flask: "🐍",
    Laravel: "🟥",

    Flutter: "🎯",
    "React Native": "📱",
    Android: "🤖",

    MySQL: "🗃️",
    PostgreSQL: "🐘",
    MongoDB: "🍃",
    Redis: "🔴",
    SQL: "🗃️",

    Docker: "🐳",
    Kubernetes: "☸️",

    Bash: "📟",
    Shell: "🐚",
    PowerShell: "💙",

    JSON: "📋",
    YAML: "📄",
    XML: "📰",
    Markdown: "📝",

    Other: "🔧"
  };

  console.log("=== DEBUG: Processing Languages ===");

  if (!stats.data || !stats.data.languages) {
    console.log("ERROR: No language data found in stats");
    return;
  }

  const lines = [];
  for (let i = 0; i < Math.min(stats.data.languages.length, 5); i++) {
    const data = stats.data.languages[i];
    const { name, percent, text: time } = data;
    const emote = emotes[name] || "🔸";

    console.log(`Processing: ${name} -> Emote: ${emote}`);

    const line = [
      emote + " " + trimRightStr(name, 10).padEnd(10),
      time.padEnd(14),
      generateBarChart(percent, 21),
      String(percent.toFixed(1)).padStart(5) + "%"
    ];
    lines.push(line.join(" "));

    console.log(`Generated line: "${line.join(" ")}"`);
  }

  if (lines.length === 0) {
    console.log("ERROR: No lines generated");
    return;
  }

  console.log("=== DEBUG: Final Gist Content ===");
  console.log(lines.join("\n"));

  try {
    const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `📊 Weekly development breakdown`,
          content: lines.join("\n")
        }
      }
    });

    console.log('✅ Success to update the gist 🎉');

  } catch (error) {
    console.error(`❌ Unable to update gist\n${error}`);
  }
}

function generateBarChart(percent, size) {
  const syms = "░▏▎▍▌▋▊▉█";
  const frac = Math.floor((size * 8 * percent) / 100);
  const barsFull = Math.floor(frac / 8);
  if (barsFull >= size) {
    return syms.substring(8, 9).repeat(size);
  }
  const semi = frac % 8;
  return [syms.substring(8, 9).repeat(barsFull), syms.substring(semi, semi + 1)]
    .join("")
    .padEnd(size, syms.substring(0, 1));
}

(async () => {
  await main();
})();