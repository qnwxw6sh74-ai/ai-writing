-- ============================================
-- AI写作平台 v3 — 段落级编辑追踪升级
-- 给 user_edit_history 加段落级字段
-- ============================================

-- 添加段落级追踪字段
ALTER TABLE user_edit_history
  ADD COLUMN section_index INT DEFAULT NULL COMMENT '段落序号(0-based)，NULL=全文级',
  ADD COLUMN outline_id INT DEFAULT NULL COMMENT '关联 generate_outlines.id，NULL=非链式生成',
  ADD COLUMN action_type ENUM('confirm','rewrite','edit','ai_generate') DEFAULT NULL COMMENT '操作类型',
  ADD INDEX idx_outline_section (outline_id, section_index);
