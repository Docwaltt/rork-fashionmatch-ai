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
        // Handle surrounding quotes more robustly
        if (finalVal.startsWith('"') && finalVal.endsWith('"')) {
          finalVal = finalVal.substring(1, finalVal.length - 1);
          // If it was a JSON-escaped string (common in some env setups)
          try {
              if (finalVal.includes('\\')) {
                  const parsed = JSON.parse('"' + finalVal + '"');
                  if (typeof parsed === 'string') finalVal = parsed;
              }
          } catch (e) {
              // Fallback to simple unescape if JSON.parse fails
              finalVal = finalVal.replace(/\\n/g, '\n').replace(/\\"/g, '"');
          }
        } else if (finalVal.startsWith("'") && finalVal.endsWith("'")) {
          finalVal = finalVal.substring(1, finalVal.length - 1);
          finalVal = finalVal.replace(/\\n/g, '\n');
        } else {
          finalVal = finalVal.replace(/\\n/g, '\n');
        }

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
