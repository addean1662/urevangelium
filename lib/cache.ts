import fs from 'fs';
import path from 'path';
import type { Gospel, VerseData } from '@/lib/types';
import { VerseDataSchema } from '@/lib/validate';

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const CACHE_KEY_PREFIX = 'urevangelium:verse';

function cacheKey(gospel: Gospel, chapter: number, verse: number): string {
  return `${CACHE_KEY_PREFIX}:${gospel}:${chapter}:${verse}`;
}

function diskCachePath(gospel: Gospel, chapter: number, verse: number): string {
  return path.join(process.cwd(), 'data', 'cache', gospel, String(chapter), `${verse}.json`);
}

// Lazy-load Redis client only when env vars are present
let redisClient: import('@upstash/redis').Redis | null | 'pending' = 'pending';

async function getRedis(): Promise<import('@upstash/redis').Redis | null> {
  if (redisClient !== 'pending') return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return null;
  }

  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({ url, token });
  } catch {
    redisClient = null;
  }
  return redisClient;
}

export async function getCachedVerse(
  gospel: Gospel,
  chapter: number,
  verse: number,
): Promise<VerseData | null> {
  const key = cacheKey(gospel, chapter, verse);

  // Try Redis first
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get<unknown>(key);
      if (raw) {
        const result = VerseDataSchema.safeParse(raw);
        if (result.success) return result.data as VerseData;
      }
    } catch {
      // Redis error — fall through to disk
    }
  }

  // Try disk cache
  const diskPath = diskCachePath(gospel, chapter, verse);
  try {
    const json = fs.readFileSync(diskPath, 'utf8');
    const result = VerseDataSchema.safeParse(JSON.parse(json));
    if (result.success) return result.data as VerseData;
  } catch {
    // Not cached on disk
  }

  return null;
}

export async function cacheVerse(
  gospel: Gospel,
  chapter: number,
  verse: number,
  data: VerseData,
): Promise<void> {
  const key = cacheKey(gospel, chapter, verse);
  const json = JSON.stringify(data, null, 2);

  // Write to Redis
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(key, data, { ex: CACHE_TTL_SECONDS });
    } catch {
      // Non-fatal
    }
  }

  // Write to disk (dev + prod fallback)
  const diskPath = diskCachePath(gospel, chapter, verse);
  try {
    fs.mkdirSync(path.dirname(diskPath), { recursive: true });
    fs.writeFileSync(diskPath, json);
  } catch {
    // Non-fatal
  }
}

export async function clearCachedVerse(
  gospel: Gospel,
  chapter: number,
  verse: number,
): Promise<void> {
  const key = cacheKey(gospel, chapter, verse);

  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // Non-fatal
    }
  }

  const diskPath = diskCachePath(gospel, chapter, verse);
  try {
    fs.unlinkSync(diskPath);
  } catch {
    // Not cached
  }
}
