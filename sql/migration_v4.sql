-- ============================================
-- AI写作平台 v4 — 积分模型重构 + 配额管理
-- ============================================

-- 1. generate_history 加 status 列（用于未确认文章配额回收）
ALTER TABLE generate_history
  ADD COLUMN status VARCHAR(20) DEFAULT 'confirmed' COMMENT 'confirmed|unconfirmed|abandoned',
  ADD INDEX idx_status (status);

-- 2. 标记现有记录为 confirmed
UPDATE generate_history SET status = 'confirmed' WHERE status IS NULL;
