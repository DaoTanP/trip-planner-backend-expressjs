import { z } from 'zod';

export const noteTargetEntityTypes = [
  'TRIP',
  'ITINERARY_ITEM',
  'EXPENSE',
  'ROUTE_SEGMENT'
] as const;

const uuidParam = z.string().uuid();
const clientMutationIdSchema = z.string().trim().max(120).optional();

export const listNotesSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  query: z.object({
    cursor: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
    targetEntityType: z.enum(noteTargetEntityTypes).optional(),
    targetEntityId: uuidParam.optional()
  })
});

export const createNoteSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z.object({
    targetEntityType: z.enum(noteTargetEntityTypes).optional(),
    targetEntityId: uuidParam.optional(),
    body: z.string().trim().min(1).max(10000),
    metadata: z.record(z.unknown()).nullable().optional(),
    clientMutationId: clientMutationIdSchema
  })
});

export const noteIdSchema = z.object({
  params: z.object({
    noteId: uuidParam
  })
});

export const updateNoteSchema = z.object({
  params: z.object({
    noteId: uuidParam
  }),
  body: z.object({
    body: z.string().trim().min(1).max(10000).optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
    expectedVersion: z.number().int().positive().optional(),
    clientMutationId: clientMutationIdSchema
  })
});

export type ListNotesParams = z.infer<typeof listNotesSchema>['params'];
export type ListNotesQuery = z.infer<typeof listNotesSchema>['query'];
export type CreateNoteParams = z.infer<typeof createNoteSchema>['params'];
export type CreateNoteInput = z.infer<typeof createNoteSchema>['body'];
export type NoteIdParams = z.infer<typeof noteIdSchema>['params'];
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>['body'];
export type NoteTargetEntityType = (typeof noteTargetEntityTypes)[number];
