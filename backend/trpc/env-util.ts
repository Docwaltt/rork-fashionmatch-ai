import { config } from "dotenv";
import fs from "fs";
import path from "path";

function findEnvFile(startDir: string, limit = 10): string | null {
  let currentDir = startDir;
  for (let i = 0; i < limit; i++) {
    const envPath = path.join(currentDir, ".env");
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  return null;
}

export function initializeEnv() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.EXPO_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    return;
  }

  const envFile = findEnvFile(process.cwd()) || findEnvFile(__dirname);
  if (envFile) {
    try {
      const content = fs.readFileSync(envFile, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
          if (!process.env[key] || process.env[key] === 'undefined') process.env[key] = value;
        }
      }
      config({ path: envFile });
    } catch (e) {
      console.error("[Env] Initialization error:", e);
    }
  }
}
