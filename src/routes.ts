import { Router } from 'express';

import { authRouter } from '@/modules/auth/auth.routes.js';
import { itineraryRouter } from '@/modules/itinerary/itinerary.routes.js';
import { notificationsRouter } from '@/modules/notifications/notifications.routes.js';
import { placesRouter } from '@/modules/places/places.routes.js';
import { tripsRouter } from '@/modules/trips/trips.routes.js';
import { usersRouter } from '@/modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/trips', tripsRouter);
apiRouter.use('/itinerary', itineraryRouter);
apiRouter.use('/places', placesRouter);
apiRouter.use('/notifications', notificationsRouter);
