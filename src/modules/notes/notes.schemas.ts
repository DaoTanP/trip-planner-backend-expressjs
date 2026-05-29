import { z } from 'zod';

export const noteTargetEntityTypes = [
  'TRIP',
  'ITINERARY_ITEM',
  'EXPENSE',
  'PLACE',
  'ROUTE_SEGMENT'
] as const;

const uuidParam = z.string().uuid();
const clientMutationIdSchema = z.string().trim().max(120).optional();
const deviceIdSchema = z.string().trim().max(128).optional();
const jsonArraySchema = z.array(z.record(z.unknown())).nullable().optional();
const jsonRecordSchema = z.record(z.unknown()).nullable().optional();

export const listNotesSchema = z.object({
  params: z.object({}),
  query: z.object({
    tripId: uuidParam.optional(),
    targetEntityType: z.enum(noteTargetEntityTypes).optional(),
    targetEntityId: uuidParam.optional(),
    parentNoteId: uuidParam.optional(),
    cursor: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50)
  })
});

export const createNoteSchema = z.object({
  params: z.object({}),
  body: z.object({
    tripId: uuidParam.optional(),
    targetEntityType: z.enum(noteTargetEntityTypes),
    targetEntityId: uuidParam,
    parentNoteId: uuidParam.optional(),
    body: z.string().trim().min(1).max(10000),
    mentions: jsonArraySchema,
    attachments: jsonArraySchema,
    metadata: jsonRecordSchema,
    clientMutationId: clientMutationIdSchema,
    deviceId: deviceIdSchema
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
    mentions: jsonArraySchema,
    attachments: jsonArraySchema,
    metadata: jsonRecordSchema,
    expectedVersion: z.number().int().positive().optional(),
    clientMutationId: clientMutationIdSchema,
    deviceId: deviceIdSchema
  })
});

export const deleteNoteSchema = z.object({
  params: z.object({
    noteId: uuidParam
  }),
  query: z.object({
    clientMutationId: clientMutationIdSchema,
    deviceId: deviceIdSchema
  })
});

export type ListNotesQuery = z.infer<typeof listNotesSchema>['query'];
export type CreateNoteInput = z.infer<typeof createNoteSchema>['body'];
export type NoteIdParams = z.infer<typeof noteIdSchema>['params'];
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>['body'];
export type DeleteNoteQuery = z.infer<typeof deleteNoteSchema>['query'];
export type NoteTargetEntityType = (typeof noteTargetEntityTypes)[number];
