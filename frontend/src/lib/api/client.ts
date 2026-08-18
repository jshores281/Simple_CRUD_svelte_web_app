const DEFAULT_BASE_URL = 'http://localhost:8080';

/** Error thrown for every failed request — network failures included. */
export class ApiError extends Error {
	readonly status?: number;
	/** Machine-readable code from the backend envelope, e.g. 'not_found', 'email_conflict'. */
	readonly code?: string;

	constructor(message: string, status?: number, code?: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

let warnedAboutMissingBaseUrl = false;

function baseUrl(): string {
	const configured = import.meta.env.VITE_API_BASE_URL;
	if (typeof configured === 'string' && configured.length > 0) {
		return configured.replace(/\/+$/, '');
	}
	if (!warnedAboutMissingBaseUrl) {
		warnedAboutMissingBaseUrl = true;
		console.warn(`VITE_API_BASE_URL is not set — falling back to ${DEFAULT_BASE_URL}`);
	}
	return DEFAULT_BASE_URL;
}

interface RequestOptions {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE';
	path: string;
	body?: unknown;
}

/** The envelope every failed backend response uses: { error: { message, status, code } }. */
interface ErrorEnvelope {
	message: string;
	status?: number;
	code?: string;
}

/** Best-effort extraction of the server's error envelope; falls back to the HTTP status. */
async function errorDetail(response: Response): Promise<ErrorEnvelope> {
	const fallback: ErrorEnvelope = {
		message: `Request failed with status ${response.status}${
			response.statusText ? ` (${response.statusText})` : ''
		}.`,
		status: response.status
	};

	try {
		const text = await response.text();
		if (!text) return fallback;

		try {
			const parsed: unknown = JSON.parse(text);
			if (parsed && typeof parsed === 'object') {
				const envelope = (parsed as Record<string, unknown>).error;
				if (envelope && typeof envelope === 'object') {
					const record = envelope as Record<string, unknown>;
					if (typeof record.message === 'string' && record.message.length > 0) {
						return {
							message: record.message,
							status: typeof record.status === 'number' ? record.status : response.status,
							code: typeof record.code === 'string' ? record.code : undefined
						};
					}
				}
				// A plain { message } / { detail } body from anything that isn't our backend.
				const detail = (parsed as Record<string, unknown>).message ?? (parsed as Record<string, unknown>).detail;
				if (typeof detail === 'string' && detail.length > 0) {
					return { message: detail, status: response.status };
				}
			}
		} catch {
			// not JSON — fall through to the raw body
		}

		return { message: text.slice(0, 300), status: response.status };
	} catch {
		return fallback;
	}
}

async function request<T>({ method, path, body }: RequestOptions): Promise<T> {
	const url = `${baseUrl()}${path}`;
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (body !== undefined) headers['Content-Type'] = 'application/json';

	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	} catch {
		throw new ApiError(
			`Could not reach the API at ${url}. Check that the backend is running and that VITE_API_BASE_URL is correct.`
		);
	}

	if (!response.ok) {
		const detail = await errorDetail(response);
		throw new ApiError(detail.message, detail.status ?? response.status, detail.code);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	try {
		return (await response.json()) as T;
	} catch {
		throw new ApiError('The API returned a response that is not valid JSON.', response.status);
	}
}

export const api = {
	get: <T>(path: string): Promise<T> => request<T>({ method: 'GET', path }),
	post: <T>(path: string, body: unknown): Promise<T> => request<T>({ method: 'POST', path, body }),
	put: <T>(path: string, body: unknown): Promise<T> => request<T>({ method: 'PUT', path, body }),
	delete: (path: string): Promise<void> => request<void>({ method: 'DELETE', path })
};
