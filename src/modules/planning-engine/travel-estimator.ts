import type { PlanningTravelModeDto } from '@/api/contracts/index.js';
import {
  estimateDurationMinutes,
  getItemCoordinate,
  getStoredTravelMode,
  haversineDistanceMeters
} from './planning-engine.utils.js';
import type { PlannerSnapshot, RouteModel } from './planning-engine.types.js';

const walkingFeasibleMeters = 1_500;
const longTransferMeters = 25_000;

export class TravelEstimator {
  estimateRoute(trip: PlannerSnapshot, travelMode: PlanningTravelModeDto = 'mixed'): RouteModel {
    const segments: RouteModel['segments'] = [];

    for (let index = 0; index < trip.itineraryItems.length - 1; index += 1) {
      const from = trip.itineraryItems[index];
      const to = trip.itineraryItems[index + 1];
      if (!from || !to) continue;

      const effectiveMode = getStoredTravelMode(trip, from.id, to.id, travelMode);
      const fromCoordinate = getItemCoordinate(from);
      const toCoordinate = getItemCoordinate(to);
      const warnings: string[] = [];

      if (!fromCoordinate || !toCoordinate) {
        warnings.push('missingCoordinates');
        segments.push({
          id: `route:${from.id}:${to.id}`,
          fromItemId: from.id,
          toItemId: to.id,
          travelMode: effectiveMode,
          distanceMeters: null,
          durationMinutes: null,
          walkingFeasible: null,
          longTransfer: false,
          unreachable: true,
          estimatedBy: 'HAVERSINE',
          warnings
        });
        continue;
      }

      const distanceMeters = haversineDistanceMeters(fromCoordinate, toCoordinate);
      const durationMinutes = estimateDurationMinutes(distanceMeters, effectiveMode);
      const walkingFeasible = distanceMeters <= walkingFeasibleMeters;
      const longTransfer = distanceMeters >= longTransferMeters;

      if (longTransfer) warnings.push('longTransfer');
      if (effectiveMode === 'walking' && !walkingFeasible) warnings.push('walkingNotFeasible');

      segments.push({
        id: `route:${from.id}:${to.id}`,
        fromItemId: from.id,
        toItemId: to.id,
        travelMode: effectiveMode,
        distanceMeters: Math.round(distanceMeters),
        durationMinutes: Math.round(durationMinutes),
        walkingFeasible,
        longTransfer,
        unreachable: false,
        estimatedBy: 'HAVERSINE',
        warnings
      });
    }

    return {
      travelMode,
      segments,
      totalDistanceMeters: segments.reduce(
        (total, segment) => total + (segment.distanceMeters ?? 0),
        0
      ),
      totalDurationMinutes: segments.reduce(
        (total, segment) => total + (segment.durationMinutes ?? 0),
        0
      ),
      longTransferCount: segments.filter((segment) => segment.longTransfer).length,
      unreachableSegmentCount: segments.filter((segment) => segment.unreachable).length
    };
  }
}

export const travelEstimator = new TravelEstimator();
