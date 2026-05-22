import { Router } from 'express';

import { authRouter } from '@/modules/auth/auth.routes.js';
import { itineraryRouter } from '@/modules/itinerary/itinerary.routes.js';
import { notificationsRouter } from '@/modules/notifications/notifications.routes.js';
import { placesRouter } from '@/modules/places/places.routes.js';
import { tripNotesRouter } from '@/modules/trips/trip-notes.routes.js';
import { tripsRouter } from '@/modules/trips/trips.routes.js';
import { usersRouter } from '@/modules/users/users.routes.js';

export const apiV1Router = Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/users', usersRouter);
apiV1Router.use('/', itineraryRouter);
apiV1Router.use('/trips', tripsRouter);
apiV1Router.use('/trip-notes', tripNotesRouter);
apiV1Router.use('/itinerary', itineraryRouter);
apiV1Router.use('/places', placesRouter);
apiV1Router.use('/notifications', notificationsRouter);
