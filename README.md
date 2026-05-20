# 患者监护系统

基于 Node.js + Express + MySQL + Vue 3 的患者监护系统。

## 项目结构

```
patient-monitor/
|-- sql/
|   |-- init.sql                    # 数据库初始化脚本
|-- backend/                        # 后端API服务
|   |-- app.js                      # 应用入口
|   |-- config/                     # 配置文件
|   |-- controllers/                # 控制器
|   |-- models/                     # 数据模型
|   |-- routes/                     # 路由
|   |-- middleware/                 # 中间件
|   |-- services/                   # 服务层
|   |-- websocket/                  # WebSocket服务
|   |-- task/                       # 定时任务
|-- frontend/                       # 前端
|   |-- src/
|   |   |-- views/                  # 页面组件
|   |   |-- api/                    # API封装
|   |   |-- stores/                 # 状态管理
|   |   |-- router/                # 路由配置
|   |   |-- utils/                  # 工具函数
|-- scripts/                       # 脚本
|-- README.md
```

## 快速开始

### 1. 环境要求

- Node.js >= 16
- MySQL >= 8.0
- npm 或 yarn

### 2. 数据库初始化

```bash
# 方法1: 命令行执行
mysql -u root -p < sql/init.sql

# 方法2: 使用脚本
cd backend
npm install
node scripts/initDb.js
```

### 3. 后端启动

```bash
cd backend
npm install
npm run dev
```

服务地址: http://localhost:3000

### 4. 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端地址: http://localhost:8080

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| doctor001 | 123456 | 医生 |
| nurse001 | 123456 | 护士 |
| patient001 | 123456 | 患者 |

## 核心功能

### 1. 实时监护
- 多床位卡片展示，实时刷新
- 异常床位红色高亮报警
- 体征趋势图（ECharts）

### 2. 报警管理
- 报警分级：一般、严重、危急
- 多渠道推送：WebSocket实时推送
- 处理流程：确认 → 解除 / 升级
- 超时自动升级（5分钟）

### 3. 病情报告
- 自动生成病情报告
- 趋势数据可视化
- 异常事件统计
- 支持打印

### 4. 阈值设置
- 个性化阈值配置
- 实时校验逻辑正确性
- 医学标准参考

## API接口

### 认证
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/forgot-password` - 找回密码
- `GET /api/v1/auth/current` - 当前用户

### 患者
- `GET /api/v1/patients` - 患者列表
- `GET /api/v1/patients/:id` - 患者详情
- `POST /api/v1/patients` - 创建患者

### 生理信号
- `POST /api/v1/vitals/upload` - 上传生理信号
- `GET /api/v1/vitals/realtime/:patientId` - 实时数据
- `GET /api/v1/vitals/history/:patientId` - 历史数据
- `GET /api/v1/vitals/trend/:patientId` - 趋势数据

### 报警
- `GET /api/v1/alerts` - 报警列表
- `POST /api/v1/alerts/:id/confirm` - 确认报警
- `POST /api/v1/alerts/:id/resolve` - 解除报警

### 阈值
- `GET /api/v1/thresholds/:patientId` - 获取阈值
- `POST /api/v1/thresholds/:patientId` - 设置阈值

### 报告
- `POST /api/v1/reports/generate` - 生成报告
- `GET /api/v1/reports` - 报告列表
- `GET /api/v1/reports/:id` - 报告详情

## WebSocket

连接地址: `ws://localhost:3000/ws/vitals?token={JWT_TOKEN}`

推送消息:
- `VITAL_UPDATE` - 生理数据更新
- `ALERT` - 新报警
- `ALERT_ESCALATED` - 报警升级

## 数据库配置

编辑 `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rjgc
DB_USER=root
DB_PASSWORD=123456
```

## 技术栈

### 后端
- Node.js + Express
- Sequelize ORM
- MySQL
- JWT认证
- WebSocket
- node-cron定时任务

### 前端
- Vue 3
- Vue Router
- Pinia
- Element Plus
- ECharts
- Axios
