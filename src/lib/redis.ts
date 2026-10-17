import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export function createRedisClient(): Redis {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 200,
    commandTimeout: 200,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 1) {
        return null; // Stop retrying if Redis is not available locally
      }
      return 200;
    },
  });

  client.on("connect", () => {
    console.log("[Redis] Connected to Redis successfully");
  });

  client.on("error", () => {
    // Avoid unhandled crash during local dev if Redis server is not running
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
