import type { Service } from './service.type';

export type RequestOptions = { params?: Record<string, string | number | boolean | undefined> };

type EnvelopePromise<TResponse> = Promise<TResponse | Service.ExceptionResponse>;

const buildUrl = (route: string, params: RequestOptions['params']): string => {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value !== undefined)
            query.set(key, String(value));
    });
    const queryString = query.toString();
    const base = `${import.meta.env.VITE_API_URL}${route}`;
    return queryString === '' ? base : `${base}?${queryString}`;
};

const toException = (msg: string, name: string, code: string): Service.ExceptionResponse => ({
    success: false,
    msg,
    error: { name, code },
});

const readEnvelope = async <TResponse>(response: Response): EnvelopePromise<TResponse> => {
    const body: unknown = await response.json().catch(() => undefined);
    const hasEnvelope = typeof body === 'object' && body !== null && 'success' in body;
    return hasEnvelope
        ? (body as TResponse | Service.ExceptionResponse)
        : toException(`HTTP ${response.status}`, 'HttpError', String(response.status));
};

type HttpMethod = 'GET' | 'DELETE' | 'POST' | 'PUT' | 'PATCH';

const request = <TResponse>(
    method: HttpMethod,
    route: string,
    body?: unknown,
    options?: RequestOptions,
): EnvelopePromise<TResponse> =>
    fetch(buildUrl(route, options?.params), {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    })
        .then((response) => readEnvelope<TResponse>(response))
        .catch((error: unknown) => toException(error instanceof Error ? error.message : String(error), 'NetworkError', 'network_error'));

export const backendRequest = {
    get: <TResponse>(route: string, options?: RequestOptions): EnvelopePromise<TResponse> =>
        request<TResponse>('GET', route, undefined, options),
    delete: <TResponse>(route: string, options?: RequestOptions): EnvelopePromise<TResponse> =>
        request<TResponse>('DELETE', route, undefined, options),
    post: <TResponse>(route: string, body?: unknown, options?: RequestOptions): EnvelopePromise<TResponse> =>
        request<TResponse>('POST', route, body, options),
    put: <TResponse>(route: string, body?: unknown, options?: RequestOptions): EnvelopePromise<TResponse> =>
        request<TResponse>('PUT', route, body, options),
    patch: <TResponse>(route: string, body?: unknown, options?: RequestOptions): EnvelopePromise<TResponse> =>
        request<TResponse>('PATCH', route, body, options),
};
