import { appendFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { LOGS_DIR } from "./config.mjs";

if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });

const logFile = resolve(LOGS_DIR, "rrss-bot.log");

function ts() {
  return new Date().toISOString();
}

function write(level, msg, data) {
  const line = `[${ts()}] [${level}] ${msg}${data !== undefined ? " " + JSON.stringify(data) : ""}`;
  try {
    appendFileSync(logFile, line + "\n");
  } catch (_) {}
  return line;
}

export default {
  info(msg, data) {
    const line = write("INFO", msg, data);
    console.log(line);
  },
  warn(msg, data) {
    const line = write("WARN", msg, data);
    console.warn(line);
  },
  error(msg, data) {
    const line = write("ERROR", msg, data);
    console.error(line);
  },
  debug(msg, data) {
    if (process.env.RRSS_DEBUG) {
      const line = write("DEBUG", msg, data);
      console.log(line);
    }
  },
  file() {
    return logFile;
  },
};
