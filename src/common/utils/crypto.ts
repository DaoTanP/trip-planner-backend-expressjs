import { createHash, randomUUID } from 'node:crypto';

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const createUuid = (): string => randomUUID();
