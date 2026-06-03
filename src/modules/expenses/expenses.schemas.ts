import { z } from 'zod';

const uuidParam = z.string().uuid();
const dateTimeSchema = z.string().datetime();
const clientMutationIdSchema = z.string().trim().max(120).optional();
const deviceIdSchema = z.string().trim().max(128).optional();
const revisionStringSchema = z.string().trim().regex(/^\d+$/).optional();
const jsonArraySchema = z.array(z.record(z.unknown())).nullable().optional();
const jsonRecordSchema = z.record(z.unknown()).nullable().optional();

const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const expensePayloadShape = {
  categoryId: uuidParam.nullable().optional(),
  itineraryItemId: uuidParam.nullable().optional(),
  title: z.string().trim().min(1).max(180).optional(),
  amount: z.number().nonnegative().optional(),
  currency: currencySchema.optional(),
  paidByUserId: uuidParam.nullable().optional(),
  spentAt: dateTimeSchema.nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  attachments: jsonArraySchema,
  metadata: jsonRecordSchema,
  expectedVersion: z.number().int().positive().optional(),
  expectedRevision: revisionStringSchema,
  clientMutationId: clientMutationIdSchema,
  deviceId: deviceIdSchema
} as const;

export const listTripExpensesSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  query: z.object({
    cursor: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
    categoryId: uuidParam.optional(),
    itineraryItemId: uuidParam.optional(),
    paidByUserId: uuidParam.optional()
  })
});

export const createExpenseSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z.object({
    categoryId: uuidParam.nullable().optional(),
    itineraryItemId: uuidParam.nullable().optional(),
    title: z.string().trim().min(1).max(180),
    amount: z.number().nonnegative(),
    currency: currencySchema,
    paidByUserId: uuidParam.nullable().optional(),
    spentAt: dateTimeSchema.nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    attachments: jsonArraySchema,
    metadata: jsonRecordSchema,
    expectedRevision: revisionStringSchema,
    clientMutationId: clientMutationIdSchema,
    deviceId: deviceIdSchema
  })
});

export const updateExpenseSchema = z.object({
  params: z.object({
    expenseId: uuidParam
  }),
  body: z.object(expensePayloadShape)
});

export const deleteExpenseSchema = z.object({
  params: z.object({
    expenseId: uuidParam
  }),
  query: z.object({
    expectedRevision: revisionStringSchema,
    clientMutationId: clientMutationIdSchema,
    deviceId: deviceIdSchema
  })
});

export type ListTripExpensesParams = z.infer<typeof listTripExpensesSchema>['params'];
export type ListTripExpensesQuery = z.infer<typeof listTripExpensesSchema>['query'];
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>['body'];
export type ExpenseIdParams = z.infer<typeof updateExpenseSchema>['params'];
export type DeleteExpenseQuery = z.infer<typeof deleteExpenseSchema>['query'];
