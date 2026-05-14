import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const binExt = process.platform === "win32" ? ".cmd" : "";
const binDir = path.join(root, "node_modules", ".bin");
const runNodeBin = (binName, args) =>
  run(process.execPath, [path.join(binDir, `${binName}${binExt}`), ...args]);

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? "test-anon-key",
        VITE_PUBLIC_POSTHOG_KEY: process.env.VITE_PUBLIC_POSTHOG_KEY ?? "",
        VITE_PUBLIC_POSTHOG_HOST: process.env.VITE_PUBLIC_POSTHOG_HOST ?? "",
        VITE_PORTKEY_API_KEY: process.env.VITE_PORTKEY_API_KEY ?? "test-portkey-key",
      },
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });

const args = process.argv.slice(2);
const skipBuild = process.env.SKIP_DESKTOP_BUILD === "1" || args.includes("--skip-build");
const playwrightArgs = args.filter((arg) => arg !== "--skip-build");

if (!skipBuild) {
  await runNodeBin("electron-forge", ["package"]);
}

await runNodeBin("playwright", [
  "test",
  "--config",
  "playwright.electron.config.ts",
  ...playwrightArgs,
]);
