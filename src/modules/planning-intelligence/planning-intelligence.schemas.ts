import { z } from 'zod';

const uuidParam = z.string().uuid();

export const planningTravelModeSchema = z.enum([
  'driving',
  'walking',
  'bicycling',
  'transit',
  'mixed'
]);
export const planningOptimizationStrategySchema = z.enum([
  'SHORTEST_DISTANCE',
  'SHORTEST_TIME',
  'WALKING',
  'DRIVING',
  'PUBLIC_TRANSPORT',
  'MIXED'
]);

export const tripPlanningIntelligenceSchema = z.object({
  params: z.object({
    tripId: uuidParam
  })
});

export const getTripOptimizationSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  query: z.object({
    strategy: planningOptimizationStrategySchema.optional(),
    travelMode: planningTravelModeSchema.optional()
  })
});

export const optimizeTripSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z.object({
    strategy: planningOptimizationStrategySchema.default('SHORTEST_TIME'),
    travelMode: planningTravelModeSchema.optional(),
    fixedStartItemId: uuidParam.nullish(),
    fixedEndItemId: uuidParam.nullish()
  })
});

export type TripPlanningIntelligenceParams = z.infer<
  typeof tripPlanningIntelligenceSchema
>['params'];
export type GetTripOptimizationQuery = z.infer<typeof getTripOptimizationSchema>['query'];
export type OptimizeTripInput = z.infer<typeof optimizeTripSchema>['body'];
