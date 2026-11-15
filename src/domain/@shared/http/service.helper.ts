import type { Service } from './service.type';

export class ServiceError extends Error {
    readonly response: Service.ExceptionResponse;

    constructor(response: Service.ExceptionResponse) {
        super(response.msg ?? 'Unexpected service error');
        this.name = 'ServiceError';
        this.response = response;
    }
}

export const hasServiceError = (response: { success: boolean }): response is Service.ExceptionResponse =>
    response.success === false;

// Must stay a `function` declaration: assertion signatures need an explicitly typed callee (TS2775).
export function throwIfServiceError<TResponse extends { success: boolean }>(
    response: TResponse,
): asserts response is Exclude<TResponse, Service.ExceptionResponse> {
    if (hasServiceError(response))
        throw new ServiceError(response);
}
