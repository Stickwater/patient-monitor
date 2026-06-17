/**
 * Redis 缓存数据种子脚本 —— 用于截图演示
 * 本地运行：cd backend && node seed_redis.js
 * 服务器运行：cd /root/patient-monitor/backend && node seed_redis.js
 * 所有 TTL 设为 7 天，确保截图时数据不会过期
 */
const Redis = require('ioredis');

const client = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
});

const SEVEN_DAYS = 7 * 24 * 3600;

async function seed() {
  console.log('Redis 连接中...');

  // 先清空旧缓存键（只删 5 组前缀）
  for (const prefix of [
    'vital:latest:*', 'alerts:stats:*', 'patients:list:*',
    'threshold:*', 'blacklist:token:*'
  ]) {
    const keys = await client.keys(prefix);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`  清除 ${keys.length} 个 ${prefix} 键`);
    }
  }

  // 1. vital:latest:{patientId} — 患者最新体征
  const patients = [
    { id: 'P2024001', pulse: 78, temp: 36.5, bp: '120/80', time: '2026-06-17T08:15:00Z' },
    { id: 'P2024002', pulse: 92, temp: 37.1, bp: '135/88', time: '2026-06-17T08:14:00Z' },
    { id: 'P2024003', pulse: 65, temp: 36.8, bp: '110/70', time: '2026-06-17T08:13:00Z' },
    { id: 'P2024004', pulse: 110, temp: 38.2, bp: '150/95', time: '2026-06-17T08:12:00Z' },
    { id: 'P2024005', pulse: 55, temp: 36.3, bp: '85/55', time: '2026-06-17T08:11:00Z' },
  ];
  for (const p of patients) {
    const key = `vital:latest:${p.id}`;
    const val = JSON.stringify({
      signal_id: `S${Date.now()}${p.id.slice(-3)}`,
      patient_id: p.id,
      pulse: p.pulse,
      temperature: p.temp,
      blood_pressure: p.bp,
      collect_time: p.time,
    });
    await client.set(key, val, 'EX', SEVEN_DAYS);
    console.log(`  写入 ${key}`);
  }

  // 2. alerts:stats — 报警统计
  await client.set('alerts:stats:summary', JSON.stringify({
    total: 61, pending: 45, confirmed: 12, resolved: 4,
    byLevel: { '严重': 15, '一般': 30, '危急': 16 },
    updateTime: '2026-06-17T08:15:00Z',
  }), 'EX', SEVEN_DAYS);
  console.log('  写入 alerts:stats:summary');

  // 3. patients:list:* — 患者列表
  await client.set('patients:list:all', JSON.stringify({
    total: 12, page: 1, size: 20,
    updateTime: '2026-06-17T08:10:00Z',
  }), 'EX', SEVEN_DAYS);
  console.log('  写入 patients:list:all');

  await client.set('patients:list:floor_3', JSON.stringify({
    total: 5, floor: 3,
    updateTime: '2026-06-17T08:10:00Z',
  }), 'EX', SEVEN_DAYS);
  console.log('  写入 patients:list:floor_3');

  // 4. threshold:{patientId} — 阈值配置
  const thresholds = [
    { id: 'P2024001', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.3,
      bpSysMin: 90, bpSysMax: 140, bpDiaMin: 60, bpDiaMax: 90,
      ecgRules: [
        { name: '窦性心动过速', condition: 'heartRate > 100', severity: 'warning' },
        { name: '窦性心动过缓', condition: 'heartRate < 60', severity: 'warning' },
      ] },
    { id: 'P2024002', pulseMin: 60, pulseMax: 100, tempMin: 36.0, tempMax: 37.5,
      bpSysMin: 90, bpSysMax: 150, bpDiaMin: 60, bpDiaMax: 95, ecgRules: [] },
    { id: 'P2024004', pulseMin: 55, pulseMax: 110, tempMin: 36.0, tempMax: 38.5,
      bpSysMin: 80, bpSysMax: 160, bpDiaMin: 50, bpDiaMax: 100,
      ecgRules: [{ name: '室性早搏', condition: 'PVC > 6/min', severity: 'critical' }] },
  ];
  for (const t of thresholds) {
    const key = `threshold:${t.id}`;
    const val = JSON.stringify({ ...t, effective_time: '2026-06-17T00:00:00Z' });
    await client.set(key, val, 'EX', SEVEN_DAYS);
    console.log(`  写入 ${key}`);
  }

  // 5. blacklist:token:{hash} — JWT 黑名单
  await client.set('blacklist:token:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    JSON.stringify({ userId: 'U2024203', time: Date.now() }), 'EX', SEVEN_DAYS);
  console.log('  写入 blacklist:token:a1b2...');

  await client.set('blacklist:token:f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1',
    JSON.stringify({ userId: 'U2024201', time: Date.now() }), 'EX', SEVEN_DAYS);
  console.log('  写入 blacklist:token:f6e5d4...');

  // 验证
  console.log('\n===== 验证缓存键 =====');
  const allKeys = await client.keys('*');
  for (const k of allKeys.sort()) {
    const ttl = await client.ttl(k);
    console.log(`  ${k}  TTL=${ttl}s`);
  }
  console.log(`\n共 ${allKeys.length} 个缓存键，覆盖 5 组前缀`);

  client.disconnect();
  console.log('种子脚本执行完成！');
}

seed().catch(err => {
  console.error('种子脚本执行失败:', err.message);
  client.disconnect();
  process.exit(1);
});