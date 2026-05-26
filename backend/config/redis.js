// Redis 连接配置
const Redis = require('ioredis');
require('dotenv').config();

let redis = null;

const createRedisClient = () => {
  if (redis) return redis;

  redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
      if (times > 10) {
        console.error('[Redis] 重连超过10次，放弃连接');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true
  });

  redis.on('connect', () => {
    console.log('[Redis] 连接成功');
  });

  redis.on('error', (err) => {
    console.error('[Redis] 连接错误:', err.message);
  });

  redis.on('close', () => {
    console.warn('[Redis] 连接关闭');
  });

  return redis;
};

const connectRedis = async () => {
  try {
    const client = createRedisClient();
    await client.connect();
    console.log('[Redis] 已连接到', process.env.REDIS_HOST || '127.0.0.1');
    return client;
  } catch (error) {
    console.error('[Redis] 连接失败，服务将以无缓存模式运行:', error.message);
    return null;
  }
};

const getRedis = () => redis;

module.exports = { createRedisClient, connectRedis, getRedis };
