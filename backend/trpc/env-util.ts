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
  const envFile = findEnvFile(process.cwd()) || findEnvFile(__dirname);

  if (envFile) {
    try {
      const content = fs.readFileSync(envFile, 'utf8');

      // Better multi-line parser that handles complex values
      const lines = content.split(/\r?\n/);
      let currentKey: string | null = null;
      let currentValue: string = "";

      const saveKey = (key: string, val: string) => {
        let finalVal = val.trim();
        // Handle surrounding quotes
        if ((finalVal.startsWith('"') && finalVal.endsWith('"')) ||
            (finalVal.startsWith("'") && finalVal.endsWith("'"))) {
          finalVal = finalVal.substring(1, finalVal.length - 1);
        }
        // Unescape \n
        finalVal = finalVal.replace(/\\n/g, '\n');

        if (!process.env[key] || process.env[key] === 'undefined' || process.env[key] === '') {
          process.env[key] = finalVal;
        }
      };

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#')) continue;

        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
        if (match) {
          if (currentKey) saveKey(currentKey, currentValue);
          currentKey = match[1];
          currentValue = match[2] || '';
        } else if (currentKey) {
          currentValue += '\n' + line;
        }
      }
      if (currentKey) saveKey(currentKey, currentValue);

      // Also call dotenv config to be sure
      config({ path: envFile });

      // Diagnostics (without logging secrets)
      if (process.env.GOOGLE_PRIVATE_KEY) {
          console.log(`[Env] GOOGLE_PRIVATE_KEY loaded, length: ${process.env.GOOGLE_PRIVATE_KEY.length}, contains newlines: ${process.env.GOOGLE_PRIVATE_KEY.includes('\n')}`);
      }
    } catch (e) {
      console.error("[Env] Initialization error:", e);
    }
  }
}
