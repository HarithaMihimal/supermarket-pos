import { z } from 'zod';

const reportDateSchema = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(value => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, 'Date must be a valid calendar date');

export const reportQuerySchema = z.object({
    from: reportDateSchema,
    to: reportDateSchema,
    group_by: z.enum(['day', 'month']).default('day'),
}).strict().refine(query => query.from <= query.to, {
    message: 'The start date must be on or before the end date',
    path: ['from'],
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;