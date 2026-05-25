-- 患者监护系统 v2 数据库迁移脚本 (MySQL兼容版)

-- 1. 患者表增加病史、过敏史字段（忽略已存在的列）
ALTER TABLE patients ADD COLUMN medical_history TEXT COMMENT '病史';
ALTER TABLE patients ADD COLUMN allergy VARCHAR(500) COMMENT '过敏史';

-- 2. 创建诊疗建议表
CREATE TABLE IF NOT EXISTS treatment_advice (
  advice_id VARCHAR(32) PRIMARY KEY,
  patient_id VARCHAR(32) NOT NULL,
  doctor_id VARCHAR(32) NOT NULL,
  type ENUM('treatment', 'diet', 'rehabilitation', 'health') DEFAULT 'treatment' COMMENT '建议类型',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (doctor_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='诊疗建议表';

-- 3. 更新测试数据
UPDATE patients SET medical_history='高血压病史3年', allergy='青霉素过敏' WHERE patient_id='P001';
UPDATE patients SET medical_history='二型糖尿病，病史5年', allergy='无' WHERE patient_id='P002';
