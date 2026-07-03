import type { Request, Response } from 'express';

import { AuthError } from '@/common/errors/auth-error.js';
import { planningEngineService, type PlanningEngineService } from './planning-engine.service.js';
import type {
  TripPlanningEngineParams,
  TripPlanningEngineQuery
} from './planning-engine.schemas.js';

type PlanningRequest = Request<TripPlanningEngineParams, unknown, unknown, TripPlanningEngineQuery>;

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class PlanningEngineController {
  constructor(private readonly service: PlanningEngineService = planningEngineService) {}

  getPlanning = async (req: PlanningRequest, res: Response) => {
    const planning = await this.service.getPlanning(
      requireUserId(req),
      req.params.tripId,
      req.query
    );
    res.json({ success: true, data: { planning } });
  };

  getIssues = async (req: PlanningRequest, res: Response) => {
    const issues = await this.service.getIssues(requireUserId(req), req.params.tripId, req.query);
    res.json({ success: true, data: { issues } });
  };

  getMetrics = async (req: PlanningRequest, res: Response) => {
    const metrics = await this.service.getMetrics(requireUserId(req), req.params.tripId, req.query);
    res.json({ success: true, data: { metrics } });
  };

  getSuggestions = async (req: PlanningRequest, res: Response) => {
    const suggestions = await this.service.getSuggestions(
      requireUserId(req),
      req.params.tripId,
      req.query
    );
    res.json({ success: true, data: { suggestions } });
  };

  getTimeline = async (req: PlanningRequest, res: Response) => {
    const timeline = await this.service.getTimeline(
      requireUserId(req),
      req.params.tripId,
      req.query
    );
    res.json({ success: true, data: { timeline } });
  };
}

export const planningEngineController = new PlanningEngineController();
