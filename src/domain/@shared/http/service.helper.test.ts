import { describe, expect, it } from 'vitest';

import { hasServiceError, ServiceError, throwIfServiceError } from './service.helper';

describe('service helper', () => {
    it('throws a ServiceError carrying the backend message', () => {
        const response = { success: false, msg: 'Nope' } as const;

        const act = () => throwIfServiceError(response);

        expect(act).toThrow(ServiceError);
        expect(act).toThrow('Nope');
        expect(act).toThrow(expect.objectContaining({ response }));
    });

    it('uses a fallback message when the backend sends none', () => {
        expect(() => throwIfServiceError({ success: false })).toThrow('Unexpected service error');
    });

    it('lets a success response through', () => {
        expect(() => throwIfServiceError({ success: true, data: 1 })).not.toThrow();
    });

    it('tells an exception from a success', () => {
        expect(hasServiceError({ success: false })).toBe(true);
        expect(hasServiceError({ success: true })).toBe(false);
    });
});
