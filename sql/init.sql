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
    `name` VARCHAR(50) NOT NULL COMMENT '姓名',
    `gender` ENUM('M','F') NOT NULL COMMENT '性别',
    `age` INT NOT NULL COMMENT '年龄',
    `bed_number` VARCHAR(20) NOT NULL COMMENT '床位号',
    `admission_date` DATETIME COMMENT '入院日期',
    `attending_doctor_id` VARCHAR(32) COMMENT '主治医生ID',
    `status` ENUM('admitted','discharged') DEFAULT 'admitted' COMMENT '状态',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`attending_doctor_id`) REFERENCES `users`(`user_id`),
    INDEX `idx_bed` (`bed_number`),
    INDEX `idx_doctor` (`attending_doctor_id`)
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

-- 插入测试数据
-- 管理员/医生用户（密码都是 123456，使用BCrypt加密）
INSERT INTO `users` (`user_id`, `username`, `password`, `role`, `real_name`, `phone`, `department`, `status`) VALUES
('U2024001', 'doctor001', '$2a$10$RnFm4ooMlqOcmw7bZUH0eu4AbEf1JAFAK5yk1DrKvIbxtXzRWEPRG', 'doctor', '张医生', '13800138001', '心内科', 'active'),
('U2024002', 'doctor002', '$2a$10$RnFm4ooMlqOcmw7bZUH0eu4AbEf1JAFAK5yk1DrKvIbxtXzRWEPRG', 'doctor', '李医生', '13800138002', '呼吸科', 'active'),
('U2024003', 'nurse001', '$2a$10$RnFm4ooMlqOcmw7bZUH0eu4AbEf1JAFAK5yk1DrKvIbxtXzRWEPRG', 'nurse', '王护士', '13800138003', '心内科', 'active'),
('U2024004', 'nurse002', '$2a$10$RnFm4ooMlqOcmw7bZUH0eu4AbEf1JAFAK5yk1DrKvIbxtXzRWEPRG', 'nurse', '赵护士', '13800138004', '呼吸科', 'active'),
('U2024005', 'patient001', '$2a$10$RnFm4ooMlqOcmw7bZUH0eu4AbEf1JAFAK5yk1DrKvIbxtXzRWEPRG', 'patient', '患者张三', '13800138005', NULL, 'active'),
('U2024006', 'patient002', '$2a$10$RnFm4ooMlqOcmw7bZUH0eu4AbEf1JAFAK5yk1DrKvIbxtXzRWEPRG', 'patient', '患者李四', '13800138006', NULL, 'active');

-- 插入患者数据
INSERT INTO `patients` (`patient_id`, `name`, `gender`, `age`, `bed_number`, `admission_date`, `attending_doctor_id`, `status`) VALUES
('P2024001', '张三', 'M', 55, 'A区-301床', '2026-05-15 10:00:00', 'U2024001', 'admitted'),
('P2024002', '李四', 'F', 42, 'A区-302床', '2026-05-18 09:00:00', 'U2024001', 'admitted'),
('P2024003', '王五', 'M', 68, 'B区-201床', '2026-05-10 14:00:00', 'U2024002', 'admitted'),
('P2024004', '赵六', 'F', 35, 'B区-202床', '2026-05-19 11:00:00', 'U2024002', 'admitted');

-- 插入阈值数据（默认阈值配置）
INSERT INTO `thresholds` (`threshold_id`, `patient_id`, `pulse_min`, `pulse_max`, `temperature_min`, `temperature_max`, `bp_systolic_min`, `bp_systolic_max`, `bp_diastolic_min`, `bp_diastolic_max`, `ecg_rules`, `effective_time`, `created_by`) VALUES
('T2024001', 'P2024001', 60, 100, 36.0, 37.3, 90, 140, 60, 90, '["心律不齐", "ST段异常", "T波倒置"]', '2026-05-15 10:00:00', 'U2024001'),
('T2024002', 'P2024002', 60, 100, 36.0, 37.3, 90, 140, 60, 90, '["心律不齐", "ST段异常"]', '2026-05-18 09:00:00', 'U2024001'),
('T2024003', 'P2024003', 55, 95, 35.5, 37.5, 85, 135, 55, 85, '["心律不齐"]', '2026-05-10 14:00:00', 'U2024002'),
('T2024004', 'P2024004', 60, 100, 36.0, 37.3, 90, 140, 60, 90, '[]', '2026-05-19 11:00:00', 'U2024002');

-- 插入测试生理信号数据
INSERT INTO `vital_signs` (`signal_id`, `patient_id`, `pulse`, `temperature`, `blood_pressure`, `ecg`, `collect_time`) VALUES
('S20240520001', 'P2024001', 72, 36.5, '120/80', '正常波形数据', '2026-05-20 08:00:00'),
('S20240520002', 'P2024001', 85, 36.8, '125/82', '正常波形数据', '2026-05-20 08:05:00'),
('S20240520003', 'P2024001', 95, 37.2, '130/85', '正常波形数据', '2026-05-20 08:10:00'),
('S20240520004', 'P2024002', 68, 36.3, '115/75', '正常波形数据', '2026-05-20 08:00:00'),
('S20240520005', 'P2024002', 70, 36.5, '118/78', '正常波形数据', '2026-05-20 08:05:00'),
('S20240520006', 'P2024003', 78, 36.6, '120/80', '正常波形数据', '2026-05-20 08:00:00');

-- 插入测试报警数据
INSERT INTO `alerts` (`alert_id`, `patient_id`, `alert_level`, `alert_content`, `indicator`, `actual_value`, `threshold_value`, `status`, `timestamp`) VALUES
('A20240520001', 'P2024001', '一般', '脉搏偏高：95次/分钟（阈值范围：60-100次/分钟）', 'pulse', '95', '60-100', '待处理', '2026-05-20 08:10:00'),
('A20240520002', 'P2024002', '严重', '体温偏高：38.5°C（阈值范围：36.0-37.3°C）', 'temperature', '38.5', '36.0-37.3', '待处理', '2026-05-20 09:00:00');

-- 插入测试报告数据
INSERT INTO `medical_reports` (`report_id`, `patient_id`, `title`, `content`, `trend_data`, `abnormal_events`, `start_time`, `end_time`, `version`) VALUES
('R20240520001', 'P2024001', '患者张三病情监测报告（2026-05-20）', '患者张三今日生命体征监测汇总...', '{"pulse": [72, 75, 78, 82, 85, 88, 92, 95], "temperature": [36.5, 36.6, 36.7, 36.8, 36.9, 37.0, 37.1, 37.2]}', '[{"time": "2026-05-20 08:10:00", "indicator": "pulse", "level": "一般"}]', '2026-05-20 00:00:00', '2026-05-20 23:59:59', '1.0');
