@echo off
chcp 65001 >nul
echo ========================================
echo   患者监护系统 - 服务器一键部署
echo ========================================
echo.

cd /d %~dp0

echo [1/4] 设置生产环境 .env ...
cd backend
if not exist .env (
    echo PORT=80 > .env
    echo NODE_ENV=production >> .env
    echo DB_HOST=localhost >> .env
    echo DB_PORT=3306 >> .env
    echo DB_NAME=rjgc >> .env
    echo DB_USER=root >> .env
    echo DB_PASSWORD=123456 >> .env
    echo JWT_SECRET=patient_monitor_secret_key_2026 >> .env
    echo JWT_EXPIRES_IN=7d >> .env
    echo JWT_REMEMBER_EXPIRES_IN=30d >> .env
    echo ALERT_TIMEOUT_MINUTES=5 >> .env
    echo MAX_LOGIN_ATTEMPTS=5 >> .env
    echo LOCK_DURATION_MINUTES=30 >> .env
    echo .env 已创建
) else (
    echo .env 已存在，跳过
    REM 确保生产模式
    powershell -Command "(Get-Content .env) -replace '^NODE_ENV=.*', 'NODE_ENV=production' | Set-Content .env"
)

echo.
echo [2/4] 安装依赖 ...
call npm install

echo.
echo [3/4] 初始化数据库 ...
call node ..\scripts\initDb.js
if %errorlevel% neq 0 (
    echo 数据库初始化失败，请检查 MySQL 服务是否启动！
    pause
    exit /b 1
)

echo.
echo [4/6] 生成模拟体征数据 ...
call node ..\scripts\seed_mock_data.js

echo.
echo [5/6] 生成报警记录 ...
call node ..\scripts\seed_alerts.js

echo.
echo [6/6] 构建前端并重启服务 ...
cd ..\frontend
call npm install
call npm run build
cd ..\backend
call pm2 delete patient-monitor 2>nul
call pm2 start app.js --name patient-monitor
call pm2 save

echo.
echo ========================================
echo   部署完成！
echo   访问: http://123.57.54.30
echo   测试账号: doctor01 / 123456
echo ========================================
pause
