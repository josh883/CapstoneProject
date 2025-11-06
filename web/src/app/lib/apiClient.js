const stripTrailingSlash = (value) => {
  if (!value) return value;
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const PUBLIC_BASE = stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL);
const SERVER_BASE = stripTrailingSlash(process.env.API_BASE_URL);

export function getApiBaseUrl(options = {}) {
  if (PUBLIC_BASE) return PUBLIC_BASE;

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
    return `${protocol}//${hostname}:${port}`;
  }

  if (SERVER_BASE) return SERVER_BASE;

  const hostHeader = options.host;
  if (hostHeader) {
    try {
      const protocol = options.protocol || "http";
      const tempUrl = new URL(`${protocol}://${hostHeader}`);
      const port = options.port || process.env.API_PORT || process.env.NEXT_PUBLIC_API_PORT || "8000";
      return `${tempUrl.protocol}//${tempUrl.hostname}:${port}`;
    } catch (_) {
      // fall through to final fallback
    }
  }

  return "http://127.0.0.1:8000";
}

export function buildApiUrl(path, options = {}) {
  const base = getApiBaseUrl(options);
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return new URL(path, normalizedBase).toString();
}
