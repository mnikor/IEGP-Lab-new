const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_HOST = "api.openai.com";
const DEFAULT_OPENAI_WS_BASE_URL = "wss://api.openai.com/v1";

function isValidHttpUrl(url?: string): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidHost(host?: string): host is string {
  if (!host) return false;
  const trimmed = host.trim();
  if (!trimmed) return false;
  const hostPattern = /^[a-zA-Z0-9.-]+$/;
  return hostPattern.test(trimmed) && trimmed.includes(".");
}

const urlCandidates = [
  process.env.OPENAI_API_BASE_URL,
  process.env.OPENAI_BASE_URL
];

let baseURL = DEFAULT_OPENAI_BASE_URL;
for (const candidate of urlCandidates) {
  if (isValidHttpUrl(candidate)) {
    baseURL = candidate!;
    break;
  }
}

const hostCandidates = [
  process.env.OPENAI_API_HOST,
  process.env.OPENAI_HOST,
  (() => {
    try {
      return new URL(baseURL).host;
    } catch {
      return DEFAULT_OPENAI_HOST;
    }
  })()
];

let apiHost = DEFAULT_OPENAI_HOST;
for (const candidate of hostCandidates) {
  if (isValidHost(candidate)) {
    apiHost = candidate!;
    break;
  }
}

const wsCandidates = [
  process.env.OPENAI_WS_BASE_URL,
  process.env.OPENAI_REALTIME_BASE_URL
];

let wsBaseURL = DEFAULT_OPENAI_WS_BASE_URL;
for (const candidate of wsCandidates) {
  if (isValidHttpUrl(candidate)) {
    wsBaseURL = candidate!;
    break;
  }
}

if (!wsBaseURL || wsBaseURL === DEFAULT_OPENAI_WS_BASE_URL) {
  wsBaseURL = `wss://${apiHost}/v1`;
}

process.env.OPENAI_API_BASE_URL = baseURL;
process.env.OPENAI_BASE_URL = baseURL;
process.env.OPENAI_API_HOST = apiHost;
process.env.OPENAI_HOST = apiHost;
process.env.OPENAI_WS_BASE_URL = wsBaseURL;
process.env.OPENAI_REALTIME_BASE_URL = wsBaseURL;

console.log(`OpenAI environment configured. baseURL=${baseURL}, host=${apiHost}, wsBaseURL=${wsBaseURL}`);
