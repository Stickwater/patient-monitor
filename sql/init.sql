-- 患者监护系统数据库初始化脚本
-- 数据库: rjgc

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `rjgc` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `rjgc`;

-- 表1：用户表（users）
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `user_id` VARCHAR(32) PRIMARY KEY COMMENT '用户编号',
    `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT '密码（BCrypt加密）',
    `role` ENUM('nurse','doctor','patient') NOT NULL COMMENT '角色',
    `real_name` VARCHAR(50) COMMENT '真实姓名',
    `phone` VARCHAR(20) COMMENT '手机号',
    `email` VARCHAR(100) COMMENT '邮箱',
    `department` VARCHAR(50) COMMENT '科室',
    `status` ENUM('active','locked') DEFAULT 'active' COMMENT '状态',
    `login_attempts` INT DEFAULT 0 COMMENT '连续登录失败次数',
    `lock_until` DATETIME NULL COMMENT '锁定截止时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`),
    INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 表2：患者表（patients）
DROP TABLE IF EXISTS `patients`;
CREATE TABLE `patients` (
    `patient_id` VARCHAR(32) PRIMARY KEY COMMENT '患者编号',
    `user_id` VARCHAR(32) NULL COMMENT '关联用户账号ID',
    `name` VARCHAR(50) NOT NULL COMMENT '姓名',
    `gender` ENUM('M','F') NOT NULL COMMENT '性别',
    `age` INT NOT NULL COMMENT '年龄',
    `bed_number` VARCHAR(20) NOT NULL COMMENT '床位号',
    `admission_date` DATETIME COMMENT '入院日期',
    `attending_doctor_id` VARCHAR(32) COMMENT '主治医生ID',
    `status` ENUM('admitted','discharged') DEFAULT 'admitted' COMMENT '状态',
    `medical_history` TEXT NULL COMMENT '病史',
    `allergy` VARCHAR(500) NULL COMMENT '过敏史',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`attending_doctor_id`) REFERENCES `users`(`user_id`),
    INDEX `idx_bed` (`bed_number`),
    INDEX `idx_doctor` (`attending_doctor_id`),
    INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='患者表';

-- 表3：生理信号表（vital_signs）
DROP TABLE IF EXISTS `vital_signs`;
CREATE TABLE `vital_signs` (
    `signal_id` VARCHAR(32) PRIMARY KEY COMMENT '信号编号',
    `patient_id` VARCHAR(32) NOT NULL COMMENT '患者编号',
    `pulse` INT COMMENT '脉搏',
    `temperature` DECIMAL(4,1) COMMENT '体温',
    `blood_pressure` VARCHAR(20) COMMENT '血压',
    `ecg` TEXT COMMENT '心电图数据',
    `collect_time` DATETIME NOT NULL COMMENT '采集时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`patient_id`),
    INDEX `idx_patient_time` (`patient_id`, `collect_time`),
    INDEX `idx_collect_time` (`collect_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生理信号表';

-- 表4：标准阈值表（thresholds）
DROP TABLE IF EXISTS `thresholds`;
CREATE TABLE `thresholds` (
    `threshold_id` VARCHAR(32) PRIMARY KEY COMMENT '阈值编号',
    `patient_id` VARCHAR(32) NOT NULL COMMENT '患者编号',
    `pulse_min` INT COMMENT '脉搏最小值',
    `pulse_max` INT COMMENT '脉搏最大值',
    `temperature_min` DECIMAL(4,1) COMMENT '体温最小值',
    `temperature_max` DECIMAL(4,1) COMMENT '体温最大值',
    `bp_systolic_min` INT COMMENT '收缩压最小值',
    `bp_systolic_max` INT COMMENT '收缩压最大值',
    `bp_diastolic_min` INT COMMENT '舒张压最小值',
    `bp_diastolic_max` INT COMMENT '舒张压最大值',
    `ecg_rules` JSON COMMENT '心电图规则',
    `effective_time` DATETIME COMMENT '生效时间',
    `created_by` VARCHAR(32) COMMENT '创建医生ID',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`patient_id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`),
    INDEX `idx_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准阈值表';

-- 表5：报警记录表（alerts）
DROP TABLE IF EXISTS `alerts`;
CREATE TABLE `alerts` (
    `alert_id` VARCHAR(32) PRIMARY KEY COMMENT '报警编号',
    `patient_id` VARCHAR(32) NOT NULL COMMENT '患者编号',
    `alert_level` ENUM('一般','严重','危急') NOT NULL COMMENT '等级',
    `alert_content` VARCHAR(500) NOT NULL COMMENT '内容',
    `indicator` VARCHAR(50) COMMENT '指标名称',
    `actual_value` VARCHAR(50) COMMENT '实际值',
    `threshold_value` VARCHAR(50) COMMENT '阈值',
    `status` ENUM('待处理','已确认','已解除','已升级') DEFAULT '待处理' COMMENT '状态',
    `handled_by` VARCHAR(32) COMMENT '处理人',
    `handled_time` DATETIME COMMENT '处理时间',
    `timestamp` DATETIME NOT NULL COMMENT '报警时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`patient_id`),
    FOREIGN KEY (`handled_by`) REFERENCES `users`(`user_id`),
    INDEX `idx_patient_status` (`patient_id`, `status`),
    INDEX `idx_status_time` (`status`, `timestamp`),
    INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报警记录表';

-- 表6：病人日志表（patient_logs）
DROP TABLE IF EXISTS `patient_logs`;
CREATE TABLE `patient_logs` (
    `log_id` VARCHAR(32) PRIMARY KEY COMMENT '日志编号',
    `patient_id` VARCHAR(32) NOT NULL COMMENT '患者编号',
    `title` VARCHAR(100) NOT NULL COMMENT '标题',
    `format` VARCHAR(20) COMMENT '格式',
    `content` TEXT COMMENT '内容',
    `log_time` DATETIME NOT NULL COMMENT '日志时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`patient_id`),
    INDEX `idx_patient_time` (`patient_id`, `log_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='病人日志表';

-- 表7：病情报告表（medical_reports）
DROP TABLE IF EXISTS `medical_reports`;
CREATE TABLE `medical_reports` (
    `report_id` VARCHAR(32) PRIMARY KEY COMMENT '报告编号',
    `patient_id` VARCHAR(32) NOT NULL COMMENT '患者编号',
    `title` VARCHAR(100) NOT NULL COMMENT '标题',
    `content` TEXT COMMENT '内容',
    `trend_data` JSON COMMENT '趋势数据',
    `abnormal_events` JSON COMMENT '异常事件列表',
    `start_time` DATETIME COMMENT '开始时间',
    `end_time` DATETIME COMMENT '结束时间',
    `version` VARCHAR(10) DEFAULT '1.0' COMMENT '版本',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`patient_id`),
    INDEX `idx_patient_time` (`patient_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='病情报告表';

-- 表8：比对结果表（compare_results）
DROP TABLE IF EXISTS `compare_results`;
CREATE TABLE `compare_results` (
    `result_id` VARCHAR(32) PRIMARY KEY COMMENT '结果编号',
    `patient_id` VARCHAR(32) NOT NULL COMMENT '患者编号',
    `signal_id` VARCHAR(32) NOT NULL COMMENT '信号编号',
    `indicator` VARCHAR(50) NOT NULL COMMENT '指标名称',
    `actual_value` VARCHAR(50) COMMENT '实际值',
    `threshold_min` VARCHAR(50) COMMENT '阈值下限',
    `threshold_max` VARCHAR(50) COMMENT '阈值上限',
    `is_normal` BOOLEAN NOT NULL COMMENT '是否正常',
    `abnormal_level` VARCHAR(20) COMMENT '异常等级',
    `timestamp` DATETIME NOT NULL COMMENT '比对时间',
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`patient_id`),
    FOREIGN KEY (`signal_id`) REFERENCES `vital_signs`(`signal_id`),
    INDEX `idx_patient_time` (`patient_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='比对结果表';

-- 表9：诊疗建议表（treatment_advice）
DROP TABLE IF EXISTS `treatment_advice`;
CREATE TABLE `treatment_advice` (
    `advice_id` VARCHAR(32) PRIMARY KEY COMMENT '建议编号',
    `patient_id` VARCHAR(32) NOT NULL COMMENT '患者编号',
    `doctor_id` VARCHAR(32) NOT NULL COMMENT '医生ID',
    `type` ENUM('treatment','diet','rehabilitation','health') DEFAULT 'treatment' COMMENT '建议类型',
    `title` VARCHAR(200) NOT NULL COMMENT '标题',
    `content` TEXT NOT NULL COMMENT '内容',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否有效',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`patient_id`),
    FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`),
    INDEX `idx_patient` (`patient_id`),
    INDEX `idx_doctor` (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='诊疗建议表';

-- 插入测试数据（密码占位符，由 initDb.js 运行时替换为正确的 BCrypt 哈希）

-- 14名患者（覆盖心内科5人、呼吸科3人、神经内科3人、骨科3人，含不同病情、年龄、特殊病史）
INSERT INTO `patients` (`patient_id`, `user_id`, `name`, `gender`, `age`, `bed_number`, `admission_date`, `attending_doctor_id`, `status`, `medical_history`, `allergy`) VALUES
-- === 心内科（张医生 U2024001）===
('P2024001', 'U2024201', '张三', 'M', 55, 'A区-301床', '2026-05-15 10:00:00', 'U2024001', 'admitted',
 '冠心病史8年，高血压病史10年，2019年行冠脉支架植入术', '青霉素'),
('P2024002', 'U2024202', '李四', 'F', 42, 'A区-302床', '2026-05-18 09:00:00', 'U2024001', 'admitted',
 '阵发性房颤3年，甲亢病史2年', NULL),
('P2024007', NULL, '吴九', 'M', 45, 'A区-303床', '2026-05-12 14:00:00', 'U2024001', 'admitted',
 '急性心肌梗死恢复期，高血压病史5年，吸烟史20年', NULL),
('P2024011', NULL, '陈十三', 'M', 75, 'A区-304床', '2026-04-28 10:00:00', 'U2024001', 'admitted',
 '慢性心力衰竭5年，2型糖尿病15年，肾功能不全', '碘造影剂'),
('P2024014', NULL, '卫十五', 'M', 66, 'A区-305床', '2026-05-08 16:00:00', 'U2024001', 'admitted',
 '扩张型心肌病3年，完全性左束支传导阻滞', NULL),

-- === 呼吸科（李医生 U2024002）===
('P2024003', 'U2024203', '王五', 'M', 68, 'B区-201床', '2026-05-10 14:00:00', 'U2024002', 'admitted',
 '慢性阻塞性肺疾病(COPD)10年，吸烟史40年，肺气肿', '磺胺类药物'),
('P2024004', 'U2024204', '赵六', 'F', 35, 'B区-202床', '2026-05-19 11:00:00', 'U2024002', 'admitted',
 '社区获得性肺炎，发热咳嗽5天', NULL),
('P2024009', NULL, '钱十一', 'M', 50, 'B区-203床', '2026-05-14 08:00:00', 'U2024002', 'admitted',
 '支气管哮喘20年，过敏性鼻炎', '花粉、尘螨'),

-- === 神经内科（刘医生 U2024003）===
('P2024005', NULL, '孙七', 'M', 72, 'C区-101床', '2026-05-05 10:00:00', 'U2024003', 'admitted',
 '脑梗死后遗症，高血压病史20年，左侧肢体偏瘫', '阿司匹林'),
('P2024008', NULL, '郑十', 'F', 60, 'C区-102床', '2026-04-20 09:00:00', 'U2024003', 'admitted',
 '帕金森病8年，高血压10年，骨质疏松', '青霉素'),
('P2024013', NULL, '褚十四', 'M', 78, 'C区-103床', '2026-05-01 14:00:00', 'U2024003', 'admitted',
 '阿尔茨海默病5年，脑萎缩，吞咽困难', NULL),

-- === 骨科（陈医生 U2024004）===
('P2024006', NULL, '周八', 'F', 28, 'D区-401床', '2026-05-18 16:00:00', 'U2024004', 'admitted',
 '右胫腓骨开放性骨折术后3天', NULL),
('P2024010', NULL, '冯十二', 'F', 38, 'D区-402床', '2026-05-16 11:00:00', 'U2024004', 'admitted',
 '腰椎间盘突出症(L4-L5)，已行椎间孔镜手术', NULL),
('P2024012', NULL, '蒋十六', 'F', 48, 'D区-403床', '2026-05-20 08:00:00', 'U2024004', 'admitted',
 '左膝关节骨性关节炎，全膝关节置换术后1天', '头孢类');

-- 阈值数据（每个患者独立阈值，体现不同病情）
INSERT INTO `thresholds` (`threshold_id`, `patient_id`, `pulse_min`, `pulse_max`, `temperature_min`, `temperature_max`, `bp_systolic_min`, `bp_systolic_max`, `bp_diastolic_min`, `bp_diastolic_max`, `ecg_rules`, `effective_time`, `created_by`) VALUES
-- 心内科患者阈值较严格
('T2024001', 'P2024001', 55, 90, 36.0, 37.2, 100, 145, 60, 95, '["窦性心律不齐","ST段改变","T波异常","室性早搏"]', '2026-05-15 10:00:00', 'U2024001'),
('T2024002', 'P2024002', 55, 100, 36.0, 37.3, 90, 140, 60, 90, '["心房颤动","ST段改变"]', '2026-05-18 09:00:00', 'U2024001'),
('T2024007', 'P2024007', 50, 85, 36.0, 37.2, 95, 140, 60, 90, '["ST段抬高","病理性Q波","室性早搏"]', '2026-05-12 14:00:00', 'U2024001'),
('T2024011', 'P2024011', 50, 80, 35.8, 37.0, 90, 130, 55, 85, '["房颤","ST-T改变","室内传导阻滞"]', '2026-04-28 10:00:00', 'U2024001'),
('T2024014', 'P2024014', 45, 75, 36.0, 37.0, 85, 125, 50, 80, '["完全性左束支传导阻滞","室性心动过速"]', '2026-05-08 16:00:00', 'U2024001'),
-- 呼吸科患者关注血氧和体温
('T2024003', 'P2024003', 60, 110, 35.5, 37.5, 85, 145, 55, 95, '["窦性心动过速","肺性P波"]', '2026-05-10 14:00:00', 'U2024002'),
('T2024004', 'P2024004', 60, 105, 36.0, 38.0, 90, 140, 60, 90, '["窦性心动过速"]', '2026-05-19 11:00:00', 'U2024002'),
('T2024009', 'P2024009', 55, 100, 36.0, 37.3, 90, 140, 60, 90, '["窦性心律不齐"]', '2026-05-14 08:00:00', 'U2024002'),
-- 神经内科患者关注血压和心率变异
('T2024005', 'P2024005', 50, 90, 35.5, 37.5, 85, 150, 55, 95, '["心房颤动","ST-T改变"]', '2026-05-05 10:00:00', 'U2024003'),
('T2024008', 'P2024008', 55, 95, 35.5, 37.5, 85, 140, 55, 90, '["窦性心律不齐"]', '2026-04-20 09:00:00', 'U2024003'),
('T2024013', 'P2024013', 50, 90, 35.5, 37.5, 85, 145, 55, 90, '["心房颤动"]', '2026-05-01 14:00:00', 'U2024003'),
-- 骨科患者相对稳定
('T2024006', 'P2024006', 55, 100, 36.0, 37.5, 95, 145, 60, 95, '["正常"]', '2026-05-18 16:00:00', 'U2024004'),
('T2024010', 'P2024010', 60, 100, 36.0, 37.3, 95, 140, 60, 90, '["正常"]', '2026-05-16 11:00:00', 'U2024004'),
('T2024012', 'P2024012', 60, 105, 36.0, 37.8, 95, 145, 60, 95, '["正常"]', '2026-05-20 08:00:00', 'U2024004');
