const DEFAULT_BASE_URL = 'http://localhost:8080';

/** Error thrown for every failed request — network failures included. */
export class ApiError extends Error {
	readonly status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
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

/** Best-effort extraction of a server-supplied message from an error response. */
async function errorMessage(response: Response): Promise<string> {
	try {
		const text = await response.text();
		if (!text) return `Request failed with status ${response.status}.`;
		try {
			const parsed: unknown = JSON.parse(text);
			if (parsed && typeof parsed === 'object') {
				const record = parsed as Record<string, unknown>;
				const detail = record.message ?? record.error;
				if (typeof detail === 'string' && detail.length > 0) return detail;
			}
		} catch {
			// not JSON — fall through to the raw body
		}
		return text.slice(0, 300);
	} catch {
		return `Request failed with status ${response.status}.`;
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
		throw new ApiError(await errorMessage(response), response.status);
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
