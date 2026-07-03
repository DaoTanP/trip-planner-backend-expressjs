import { z } from 'zod';

const uuidParam = z.string().uuid();

export const planningEngineTravelModeSchema = z.enum([
  'driving',
  'walking',
  'bicycling',
  'transit',
  'mixed'
]);

export const tripPlanningEngineSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  query: z.object({
    travelMode: planningEngineTravelModeSchema.optional()
  })
});

export type TripPlanningEngineParams = z.infer<typeof tripPlanningEngineSchema>['params'];
export type TripPlanningEngineQuery = z.infer<typeof tripPlanningEngineSchema>['query'];
