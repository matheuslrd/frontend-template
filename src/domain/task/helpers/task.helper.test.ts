import { describe, expect, it } from 'vitest';

import { formatTaskCreatedAt } from './task.helper';

describe('task helper', () => {
    it('formats the creation date as day/month/year', () => {
        expect(formatTaskCreatedAt('2026-03-05T12:00:00.000Z')).toBe('05/03/2026');
    });
});
