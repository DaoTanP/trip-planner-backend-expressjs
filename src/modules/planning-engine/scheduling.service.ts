import {
  getItemCoordinate,
  getItemDurationMinutes,
  getItemEndDate,
  groupBy,
  millisecondsPerMinute
} from './planning-engine.utils.js';
import type {
  PlannerSnapshot,
  TimelineModel,
  TimelineSegmentModel
} from './planning-engine.types.js';

export class SchedulingService {
  buildTimeline(trip: PlannerSnapshot): TimelineModel {
    const duplicatePlaces = groupBy(trip.itineraryItems, (item) => item.placeId);
    const duplicatePlaceIds = new Set(
      Array.from(duplicatePlaces.entries())
        .filter(([, items]) => items.length > 1)
        .map(([placeId]) => placeId)
    );
    const timezones = new Set<string>();

    const segments: TimelineSegmentModel[] = trip.itineraryItems.map((item, index) => {
      const startsAtDate = item.startsAt ? new Date(item.startsAt) : null;
      const endsAtDate = getItemEndDate(item);
      const previous = index > 0 ? trip.itineraryItems[index - 1] : undefined;
      const previousEnd = previous ? getItemEndDate(previous) : null;
      const idleGapBeforeMinutes =
        startsAtDate && previousEnd
          ? Math.max(
              0,
              Math.round((startsAtDate.getTime() - previousEnd.getTime()) / millisecondsPerMinute)
            )
          : null;
      const overlapPreviousMinutes =
        startsAtDate && previousEnd && previousEnd.getTime() > startsAtDate.getTime()
          ? Math.round((previousEnd.getTime() - startsAtDate.getTime()) / millisecondsPerMinute)
          : null;
      const timezoneMismatch =
        item.timezone !== trip.timezone ||
        (item.place.timezone !== null && item.place.timezone !== item.timezone);
      const lateNightArrival =
        startsAtDate !== null &&
        (startsAtDate.getUTCHours() >= 22 || startsAtDate.getUTCHours() <= 4);

      timezones.add(item.timezone);

      return {
        itemId: item.id,
        placeId: item.placeId,
        sequence: index + 1,
        sortOrder: item.sortOrder,
        startsAt: startsAtDate?.toISOString() ?? null,
        endsAt: endsAtDate?.toISOString() ?? null,
        startsAtDate,
        endsAtDate,
        timezone: item.timezone,
        durationMinutes: getItemDurationMinutes(item),
        status: item.status,
        types: item.types,
        scheduled: startsAtDate !== null,
        timezoneMismatch,
        lateNightArrival,
        duplicateVisit: duplicatePlaceIds.has(item.placeId),
        idleGapBeforeMinutes,
        overlapPreviousMinutes,
        coordinate: getItemCoordinate(item),
        item
      };
    });

    const timeline: TimelineModel = {
      segments,
      scheduledItemCount: segments.filter((segment) => segment.scheduled).length,
      unscheduledItemCount: segments.filter((segment) => !segment.scheduled).length,
      timezoneCount: timezones.size,
      duplicatePlaceCount: duplicatePlaceIds.size
    };

    return timeline;
  }
}

export const schedulingService = new SchedulingService();
