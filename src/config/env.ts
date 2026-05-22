import 'dotenv/config';
import { z } from 'zod';

const stringToArray = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}, z.boolean());

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('trip-planner-api'),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),

  AUTH_TOKEN_TRANSPORT: z.enum(['cookie', 'body', 'both']).default('cookie'),
  AUTH_ACCESS_COOKIE_NAME: z.string().default('tp_access_token'),
  AUTH_REFRESH_COOKIE_NAME: z.string().default('tp_refresh_token'),
  AUTH_CSRF_COOKIE_NAME: z.string().default('tp_csrf_token'),
  AUTH_COOKIE_DOMAIN: optionalString,
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  AUTH_COOKIE_SECURE: booleanFromEnv.optional(),

  GOOGLE_OAUTH_CLIENT_ID: optionalString,

  PLACES_PROVIDER: z.enum(['internal', 'google', 'mapbox', 'osm']).default('internal'),
  GOOGLE_PLACES_API_KEY: optionalString,
  MAPBOX_ACCESS_TOKEN: optionalString,
  OSM_GEOCODING_ENDPOINT: z.string().url().default('https://nominatim.openstreetmap.org/search'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:3000')
    .transform(stringToArray),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: booleanFromEnv.default(true),

  MAIL_HOST: z.string().default('localhost'),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().email().default('no-reply@trip-planner.local'),

  LOG_LEVEL: z.string().default('info')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = {
  ...parsedEnv.data,
  AUTH_COOKIE_SECURE: parsedEnv.data.AUTH_COOKIE_SECURE ?? parsedEnv.data.NODE_ENV === 'production',
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isTest: parsedEnv.data.NODE_ENV === 'test'
};

export type Env = typeof env;
