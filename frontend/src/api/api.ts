import { API_URL } from "@/constants/constants";

// The one place the application talks to the network.
//
// Every service in src/services calls through here. Nothing else in the app uses fetch
// directly, so the base address, the auth header and the error shape are decided once.
//
// We use the native fetch rather than Axios. Nothing here needs a library.

/** The shape our API returns for every failure. */
type ApiErrorBody = {
  error: { code: string; message: string };
};

/**
 * An error thrown by our own API, carrying the code so a page can react to a specific
 * one rather than matching on the message text.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** A Clerk session token. Leave it out for requests that work logged out. */
  token?: string | null;
  /** Query string values. Anything undefined is left off. */
  query?: Record<string, string | number | undefined>;
  /** Next.js caching. "no-store" means always fresh, which the feed needs. */
  cache?: RequestCache;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Calls our API and gives back the parsed body.
 *
 * Throws an ApiError when the API says no, and a plain Error when the request never
 * arrived at all. Callers only ever have to handle those two cases.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, query, cache = "no-store" } = options;

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      cache,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        // The token is how the API knows who is asking. Without it every request is
        // treated as a logged out visitor, which is correct for the public feed.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // fetch only rejects when the request never got there: the server is down, or the
    // machine is offline. A 404 or a 500 is a successful request with a sad answer.
    throw new Error("Could not reach the server. Is the API running on port 4000?");
  }

  if (!response.ok) {
    let code = "INTERNAL_ERROR";
    let message = "Something went wrong.";

    try {
      const parsed = (await response.json()) as ApiErrorBody;
      code = parsed.error?.code ?? code;
      message = parsed.error?.message ?? message;
    } catch {
      // The body was not our error shape, so keep the defaults.
    }

    throw new ApiError(response.status, code, message);
  }

  return (await response.json()) as T;
}
