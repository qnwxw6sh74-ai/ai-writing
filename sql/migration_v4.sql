-- ============================================
-- AI写作平台 v4 — 积分模型重构 + 配额管理
-- ============================================

-- 1. generate_history 加 status 列（用于未确认文章配额回收）
ALTER TABLE generate_history
  ADD COLUMN status VARCHAR(20) DEFAULT 'confirmed' COMMENT 'confirmed|unconfirmed|abandoned',
  ADD INDEX idx_status (status);

-- 2. 标记现有记录为 confirmed
UPDATE generate_history SET status = 'confirmed' WHERE status IS NULL;

-- 3. generate_outlines 加 section_versions 列（段落版本历史，用于回滚）
ALTER TABLE generate_outlines
  ADD COLUMN section_versions JSON COMMENT '段落版本历史 {sectionIndex: [{content, createdAt}]}';

-- 4. 更新体验套餐为 ¥2
UPDATE pricing_plans SET price = 2.00, name = '体验套餐', credits = 10, description = '10次生成额度，快速体验AI写作' WHERE id = 1;
UPDATE pricing_plans SET is_active = 1 WHERE id = 1;
