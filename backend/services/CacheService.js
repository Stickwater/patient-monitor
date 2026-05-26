// 缓存服务 - 统一管理 Redis 会话缓存与热点数据缓存
const { getRedis } = require('../config/redis');

const CACHE_PREFIX = {
  SESSION: 'session:',     // 用户会话 / token 黑名单
  RATE_LIMIT: 'rate:',     // 登录频率限制
  VITAL_LATEST: 'vital:latest:',    // 患者最新体征
  VITAL_HISTORY: 'vital:history:',  // 患者体征历史
  ALERT_ACTIVE: 'alert:active:',    // 活跃报警列表
  ALERT_STATS: 'alert:stats:',      // 报警统计
  PATIENT_LIST: 'patient:list:',    // 患者列表
  PATIENT_DETAIL: 'patient:detail:',// 患者详情
  THRESHOLD: 'threshold:',          // 阈值配置
  REPORT: 'report:',                // 报告缓存
  DASHBOARD: 'dashboard:',          // 监护面板聚合数据
};

const TTL = {
  SESSION: 7 * 24 * 3600,    // 7天
  RATE_LIMIT: 1800,           // 30分钟
  VITAL_LATEST: 10,           // 10秒（实时数据）
  VITAL_HISTORY: 60,          // 1分钟
  ALERT_ACTIVE: 10,           // 10秒
  ALERT_STATS: 30,            // 30秒
  PATIENT_LIST: 60,           // 1分钟
  PATIENT_DETAIL: 120,        // 2分钟
  THRESHOLD: 600,             // 10分钟
  REPORT: 300,                // 5分钟
  DASHBOARD: 15,              // 15秒
};

const getClient = () => {
  const redis = getRedis();
  if (!redis || redis.status !== 'ready') return null;
  return redis;
};

// ========== 通用缓存方法 ==========

const get = async (key) => {
  try {
    const client = getClient();
    if (!client) return null;
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const set = async (key, value, ttl = 60) => {
  try {
    const client = getClient();
    if (!client) return;
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  } catch { /* 缓存写入失败不影响业务 */ }
};

const del = async (key) => {
  try {
    const client = getClient();
    if (!client) return;
    await client.del(key);
  } catch {}
};

const delPattern = async (pattern) => {
  try {
    const client = getClient();
    if (!client) return;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {}
};

// 缓存或读取（cache-aside 模式）
const cacheOrFetch = async (key, fetchFn, ttl = 60) => {
  const cached = await get(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  if (data !== null && data !== undefined) {
    await set(key, data, ttl);
  }
  return data;
};

// ========== 会话管理 ==========

// 将 token 加入黑名单（登出）
const blacklistToken = async (token, userId) => {
  // 使用 token 的 hash 作为 key，存储过期时间
  const tokenHash = require('crypto').createHash('md5').update(token).digest('hex');
  await set(`${CACHE_PREFIX.SESSION}blacklist:${tokenHash}`, { userId, time: Date.now() }, TTL.SESSION);
};

// 检查 token 是否在黑名单
const isTokenBlacklisted = async (token) => {
  const tokenHash = require('crypto').createHash('md5').update(token).digest('hex');
  const cached = await get(`${CACHE_PREFIX.SESSION}blacklist:${tokenHash}`);
  return cached !== null;
};

// 记录活跃会话
const setActiveSession = async (userId, info) => {
  await set(`${CACHE_PREFIX.SESSION}active:${userId}`, info, TTL.SESSION);
};

const getActiveSession = async (userId) => {
  return await get(`${CACHE_PREFIX.SESSION}active:${userId}`);
};

const removeActiveSession = async (userId) => {
  await del(`${CACHE_PREFIX.SESSION}active:${userId}`);
};

// ========== 登录限流 ==========

const checkLoginRateLimit = async (identifier) => {
  const key = `${CACHE_PREFIX.RATE_LIMIT}login:${identifier}`;
  const cached = await get(key);
  const now = Date.now();

  if (cached) {
    const count = cached.count || 1;
    if (count >= 5) {
      return { allowed: false, waitSeconds: Math.ceil((cached.lockUntil - now) / 1000) };
    }
    await set(key, { count: count + 1, lockUntil: cached.lockUntil }, TTL.RATE_LIMIT);
  } else {
    await set(key, { count: 1, lockUntil: now + TTL.RATE_LIMIT * 1000 }, TTL.RATE_LIMIT);
  }
  return { allowed: true };
};

const resetLoginRateLimit = async (identifier) => {
  await del(`${CACHE_PREFIX.RATE_LIMIT}login:${identifier}`);
};

// ========== 体征数据缓存 ==========

const cacheLatestVital = async (patientId, data) => {
  await set(`${CACHE_PREFIX.VITAL_LATEST}${patientId}`, data, TTL.VITAL_LATEST);
};

const getCachedLatestVital = async (patientId) => {
  return await get(`${CACHE_PREFIX.VITAL_LATEST}${patientId}`);
};

const invalidateVitalCache = async (patientId) => {
  await del(`${CACHE_PREFIX.VITAL_LATEST}${patientId}`);
  await delPattern(`${CACHE_PREFIX.VITAL_HISTORY}${patientId}:*`);
};

// ========== 报警缓存 ==========

const cacheActiveAlerts = async (patientId, data) => {
  await set(`${CACHE_PREFIX.ALERT_ACTIVE}${patientId || 'all'}`, data, TTL.ALERT_ACTIVE);
};

const getCachedActiveAlerts = async (patientId) => {
  return await get(`${CACHE_PREFIX.ALERT_ACTIVE}${patientId || 'all'}`);
};

const cacheAlertStats = async (data) => {
  await set(`${CACHE_PREFIX.ALERT_STATS}summary`, data, TTL.ALERT_STATS);
};

const getCachedAlertStats = async () => {
  return await get(`${CACHE_PREFIX.ALERT_STATS}summary`);
};

const invalidateAlertCache = async () => {
  await delPattern(`${CACHE_PREFIX.ALERT_ACTIVE}*`);
  await del(`${CACHE_PREFIX.ALERT_STATS}summary`);
};

// ========== 患者列表缓存 ==========

const cachePatientList = async (queryKey, data) => {
  await set(`${CACHE_PREFIX.PATIENT_LIST}${queryKey}`, data, TTL.PATIENT_LIST);
};

const getCachedPatientList = async (queryKey) => {
  return await get(`${CACHE_PREFIX.PATIENT_LIST}${queryKey}`);
};

const invalidatePatientListCache = async () => {
  await delPattern(`${CACHE_PREFIX.PATIENT_LIST}*`);
};

const cachePatientDetail = async (patientId, data) => {
  await set(`${CACHE_PREFIX.PATIENT_DETAIL}${patientId}`, data, TTL.PATIENT_DETAIL);
};

const getCachedPatientDetail = async (patientId) => {
  return await get(`${CACHE_PREFIX.PATIENT_DETAIL}${patientId}`);
};

const invalidatePatientCache = async (patientId) => {
  await del(`${CACHE_PREFIX.PATIENT_DETAIL}${patientId}`);
  await delPattern(`${CACHE_PREFIX.PATIENT_LIST}*`);
};

// ========== 阈值缓存 ==========

const cacheThreshold = async (patientId, data) => {
  await set(`${CACHE_PREFIX.THRESHOLD}${patientId}`, data, TTL.THRESHOLD);
};

const getCachedThreshold = async (patientId) => {
  return await get(`${CACHE_PREFIX.THRESHOLD}${patientId}`);
};

const invalidateThresholdCache = async (patientId) => {
  await del(`${CACHE_PREFIX.THRESHOLD}${patientId}`);
};

// ========== 监护面板聚合缓存 ==========

const cacheDashboard = async (data) => {
  await set(`${CACHE_PREFIX.DASHBOARD}summary`, data, TTL.DASHBOARD);
};

const getCachedDashboard = async () => {
  return await get(`${CACHE_PREFIX.DASHBOARD}summary`);
};

const invalidateDashboardCache = async () => {
  await del(`${CACHE_PREFIX.DASHBOARD}summary`);
};

module.exports = {
  CACHE_PREFIX,
  TTL,
  // 通用
  get,
  set,
  del,
  delPattern,
  cacheOrFetch,
  // 会话
  blacklistToken,
  isTokenBlacklisted,
  setActiveSession,
  getActiveSession,
  removeActiveSession,
  // 限流
  checkLoginRateLimit,
  resetLoginRateLimit,
  // 体征
  cacheLatestVital,
  getCachedLatestVital,
  invalidateVitalCache,
  // 报警
  cacheActiveAlerts,
  getCachedActiveAlerts,
  cacheAlertStats,
  getCachedAlertStats,
  invalidateAlertCache,
  // 患者
  cachePatientList,
  getCachedPatientList,
  invalidatePatientListCache,
  cachePatientDetail,
  getCachedPatientDetail,
  invalidatePatientCache,
  // 阈值
  cacheThreshold,
  getCachedThreshold,
  invalidateThresholdCache,
  // 面板
  cacheDashboard,
  getCachedDashboard,
  invalidateDashboardCache,
};
