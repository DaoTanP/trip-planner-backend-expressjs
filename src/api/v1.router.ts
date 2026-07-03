import { Router } from 'express';

import { authRouter } from '@/modules/auth/auth.routes.js';
import { budgetRouter } from '@/modules/budget/budget.routes.js';
import { expensesRouter } from '@/modules/expenses/expenses.routes.js';
import { itineraryRouter } from '@/modules/itinerary/itinerary.routes.js';
import { notesRouter } from '@/modules/notes/notes.routes.js';
import { notificationsRouter } from '@/modules/notifications/notifications.routes.js';
import { planningEngineRouter } from '@/modules/planning-engine/planning-engine.routes.js';
import { planningIntelligenceRouter } from '@/modules/planning-intelligence/planning-intelligence.routes.js';
import { placesRouter } from '@/modules/places/places.routes.js';
import { routePreferencesRouter } from '@/modules/route-preferences/route-preferences.routes.js';
import { syncRouter } from '@/modules/sync/sync.routes.js';
import { tripsRouter } from '@/modules/trips/trips.routes.js';
import { usersRouter } from '@/modules/users/users.routes.js';

export const apiV1Router = Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/users', usersRouter);
apiV1Router.use('/', itineraryRouter);
apiV1Router.use('/', routePreferencesRouter);
apiV1Router.use('/', notesRouter);
apiV1Router.use('/', budgetRouter);
apiV1Router.use('/', expensesRouter);
apiV1Router.use('/', syncRouter);
apiV1Router.use('/', planningEngineRouter);
apiV1Router.use('/', planningIntelligenceRouter);
apiV1Router.use('/trips', tripsRouter);
apiV1Router.use('/places', placesRouter);
apiV1Router.use('/notifications', notificationsRouter);
