# 患者监护系统

基于 Node.js + Express + MySQL + Redis + Vue 3 的医院内网患者实时监护系统。

## 系统架构

四层分层架构，层间单向依赖：

| 层级 | 职责 | 实现 |
|------|------|------|
| 表示层 | 用户界面 | Vue 3 + Element Plus + ECharts（`frontend/src/views/`） |
| 业务逻辑层 | 核心业务处理 | Service 层（`backend/services/`） |
| 数据访问层 | 数据库操作封装 | DAO 层（`backend/dao/`） |
| 数据存储层 | 持久化 + 缓存 | MySQL 8.0 + Redis |

## 项目结构

```
patient-monitor/
├── setup.bat                        # Windows 一键部署脚本
├── README.md
│
├── sql/
│   └── init.sql                     # 数据库初始化（DDL + 基础数据）
│
├── scripts/                         # 辅助脚本
│   ├── initDb.js                    # 数据库初始化（Node.js 版）
│   ├── seed_mock_data.js            # 填充72小时模拟体征数据
│   ├── seed_alerts.js               # 根据体征+阈值生成报警
│   ├── seed_threshold_history.js    # 阈值历史数据填充
│   ├── checkUser.js                 # 用户信息检查
│   ├── fixUsers.js                  # 用户数据修复
│   ├── migrate_v2.sql / migrate_v2_fixed.sql  # 数据库迁移
│   └── verify_migrate.js            # 迁移验证
│
├── backend/                         # 后端 API 服务
│   ├── app.js                       # Express 入口，加载所有模块
│   ├── .env                         # 环境变量（DB/JWT/Redis）
│   ├── package.json
│   │
│   ├── config/                      # 配置
│   │   ├── database.js              # Sequelize + MySQL 连接
│   │   ├── jwt.js                   # JWT 密钥与过期策略
│   │   └── redis.js                 # Redis 连接（失败自动降级）
│   │
│   ├── models/                      # Sequelize 数据模型
│   │   ├── User.js                  # 用户
│   │   ├── Patient.js               # 患者
│   │   ├── VitalSign.js             # 体征数据
│   │   ├── Alert.js                 # 报警记录
│   │   ├── Threshold.js             # 阈值配置
│   │   ├── MedicalReport.js         # 医疗报告
│   │   ├── TreatmentAdvice.js       # 诊疗建议
│   │   ├── CompareResult.js         # 比对结果
│   │   └── PatientLog.js            # 患者日志
│   │
│   ├── dao/                         # 数据访问层
│   │   ├── UserDAO.js / PatientDAO.js / VitalSignDAO.js
│   │   ├── AlertDAO.js / ThresholdDAO.js
│   │   ├── MedicalReportDAO.js / TreatmentAdviceDAO.js
│   │   └── CompareResultDAO.js / PatientLogDAO.js
│   │
│   ├── services/                    # 业务逻辑层
│   │   ├── AuthService.js           # 认证（登录/登出/限流/会话）
│   │   ├── VitalSignService.js      # 体征采集与查询
│   │   ├── AlertService.js          # 报警判定/处理/统计
│   │   ├── ReportService.js         # 报告生成与导出
│   │   ├── PatientService.js        # 患者管理
│   │   ├── ThresholdService.js      # 阈值配置
│   │   ├── TreatmentAdviceService.js # 诊疗建议
│   │   └── CacheService.js          # Redis 缓存（旁路模式）
│   │
│   ├── controllers/                 # 控制器
│   │   ├── AuthController.js / PatientController.js
│   │   ├── VitalSignController.js / AlertController.js
│   │   ├── ReportController.js / ThresholdController.js
│   │   └── TreatmentAdviceController.js
│   │
│   ├── routes/                      # 路由定义
│   ├── middleware/                   # 中间件
│   │   ├── auth.js                  # JWT 鉴权 + Token 黑名单
│   │   └── errorHandler.js          # 全局错误处理
│   │
│   ├── websocket/
│   │   └── server.js                # WebSocket 实时推送
│   │
│   ├── task/
│   │   └── scheduledTasks.js        # 定时任务（报警超时/日报生成）
│   │
│   └── scripts/
│       └── updateDb.js              # 数据库更新脚本
│
├── frontend/                        # 前端 SPA
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.js / App.vue
│   │   ├── router/index.js          # 路由（含角色权限）
│   │   ├── stores/app.js / user.js  # Pinia 状态管理
│   │   ├── api/                     # Axios 接口封装
│   │   ├── utils/request.js         # 请求拦截器
│   │   ├── utils/websocket.js       # WebSocket 客户端
│   │   ├── styles/common.css        # 全局样式
│   │   └── views/                   # 页面
│   │       ├── login/               # 登录
│   │       ├── layout/              # 布局框架
│   │       ├── monitor/             # 监护面板
│   │       ├── patient/             # 患者管理/详情
│   │       ├── patient-vital/       # 患者端（体征/报告/建议）
│   │       ├── alert/               # 报警管理
│   │       ├── report/              # 报告管理
│   │       └── threshold/           # 阈值配置
│   └── dist/                        # Vite 构建产物
└── package.json                     # 根项目配置
```

## 快速开始

### 环境要求

- Node.js >= 16
- MySQL >= 8.0
- Redis（可选，未安装时自动降级为无缓存模式）

### 一键部署（Windows）

```bash
setup.bat
```

自动执行：安装依赖 → 创建数据库 → 填充模拟数据 → 生成报警 → 构建前端 → 启动服务。

### 手动部署

**1. 数据库初始化**

```bash
mysql -u root -p < sql/init.sql
```

**2. 后端启动**

```bash
cd backend
npm install
# 编辑 .env 配置数据库连接
npm run dev       # 开发（nodemon 热重载）
# 或
npm start         # 生产
```

服务地址：`http://localhost:3000`

**3. 前端开发**

```bash
cd frontend
npm install
npm run dev
```

前端地址：`http://localhost:8080`

**4. 构建生产版本**

```bash
cd frontend
npm run build     # 产物输出到 frontend/dist/
```

生产模式下后端自动托管前端静态文件，访问 `http://localhost:3000` 即可。

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| doctor001 | 123456 | 医生 |
| nurse001 | 123456 | 护士 |
| patient001 | 123456 | 患者 |

## 核心模块

### 用户权限模块
- JWT 身份认证 + Token 黑名单（Redis）
- 登录失败限流（30分钟/5次）
- 三级角色：医生、护士、患者

### 实时监护模块
- 多床位卡片展示，WebSocket 实时推送
- 异常床位红色高亮 + 声音报警
- 体征趋势图（ECharts，心率/血压/血氧/体温/呼吸）

### 报警管理模块
- 三级报警：一般 → 严重 → 危急
- 超时自动升级（5分钟无响应自动升一级）
- 处理流程：确认 → 解除 / 升级
- 报警统计与状态跟踪

### 阈值配置模块
- 每个患者独立阈值方案
- 医学标准参考值可视化
- 逻辑校验（min < max）

### 病情报告模块
- 自动生成病情报告（含趋势图和异常事件统计）
- 报告列表查询与详情查看
- 支持浏览器打印

## API 接口

| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 认证 | POST | `/api/v1/auth/login` | 登录 |
| 认证 | POST | `/api/v1/auth/logout` | 登出 |
| 认证 | GET | `/api/v1/auth/current` | 当前用户信息 |
| 认证 | GET | `/api/v1/auth/doctors` | 医生列表 |
| 患者 | GET | `/api/v1/patients` | 患者列表（分页） |
| 患者 | GET | `/api/v1/patients/:id` | 患者详情 |
| 患者 | POST | `/api/v1/patients` | 创建患者 |
| 体征 | POST | `/api/v1/vitals/upload` | 上传体征数据 |
| 体征 | GET | `/api/v1/vitals/realtime/:patientId` | 实时体征 |
| 体征 | GET | `/api/v1/vitals/history/:patientId` | 历史体征 |
| 体征 | GET | `/api/v1/vitals/trend/:patientId` | 趋势数据 |
| 报警 | GET | `/api/v1/alerts` | 报警列表（分页/筛选） |
| 报警 | POST | `/api/v1/alerts/:id/confirm` | 确认报警 |
| 报警 | POST | `/api/v1/alerts/:id/resolve` | 解除报警 |
| 报警 | POST | `/api/v1/alerts/:id/escalate` | 升级报警 |
| 阈值 | GET | `/api/v1/thresholds/:patientId` | 获取阈值 |
| 阈值 | POST | `/api/v1/thresholds/:patientId` | 设置阈值 |
| 报告 | GET | `/api/v1/reports` | 报告列表 |
| 报告 | GET | `/api/v1/reports/:id` | 报告详情 |
| 报告 | POST | `/api/v1/reports/generate` | 生成报告 |
| 建议 | GET | `/api/v1/patient/:patientId/advices` | 诊疗建议 |

## WebSocket

```
ws://localhost:3000/ws/vitals?token={JWT_TOKEN}
```

推送事件：
- `VITAL_UPDATE` — 体征数据更新
- `ALERT` — 新报警
- `ALERT_ESCALATED` — 报警升级

## 缓存策略

| 缓存项 | Key 格式 | TTL |
|--------|----------|-----|
| 最新体征 | `vital:realtime:{patientId}` | 10s |
| 体征趋势 | `vital:trend:{patientId}:{hours}` | 60s |
| 报警统计 | `alert:stats:summary` | 30s |
| 患者列表 | `patient:list:{page}:{size}:...` | 60s |
| 患者详情 | `patient:detail:{patientId}` | 120s |
| 阈值配置 | `threshold:{patientId}` | 600s |

Redis 不可用时自动降级，不阻断服务。

## 服务器部署

```bash
# 初次部署
cd backend
npm install --omit=dev
cp .env.example .env    # 编辑数据库连接
npm run init-db
pm2 start app.js --name patient-monitor
pm2 save

# 日常更新
git pull origin main
cd backend && npm install --omit=dev
pm2 restart patient-monitor
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | Node.js + Express |
| ORM | Sequelize |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis（ioredis） |
| 认证 | JWT（jsonwebtoken + bcryptjs） |
| 实时通信 | WebSocket（ws） |
| 定时任务 | node-cron |
| 前端框架 | Vue 3（Composition API） |
| 构建工具 | Vite |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia |
| 图表库 | ECharts |
| HTTP 客户端 | Axios |
