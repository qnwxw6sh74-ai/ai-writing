-- migration_v5.sql: 性能优化索引 + health check 路由初始化
-- 执行: mysql -u root -p vmq < sql/migration_v5.sql

-- 1. credits_log: 加速 checkCredits / deductCredits 的 IP 和用户查询
ALTER TABLE credits_log ADD INDEX idx_user_action_time (user_identifier, action, created_at);

-- 2. generate_history: 加速 confirm 查询 (user_identifier + status 过滤)
ALTER TABLE generate_history ADD INDEX idx_user_status_time (user_identifier, status, created_at);

-- 3. generate_outlines: 加速 outline 查询
ALTER TABLE generate_outlines ADD INDEX idx_user_status (user_id, status, updated_at);
