-- ============================================
-- AI写作平台 v2 — 风格系统升级迁移脚本
-- 在现有数据库中执行此脚本添加新表
-- ============================================

-- 1. 用户风格档案表（替代 site_config 中的 user_style_{id}）
CREATE TABLE IF NOT EXISTS user_styles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    profile JSON NOT NULL COMMENT '9维度风格档案: {avgSentenceLength,sentencePatterns,vocabularyPrefs,openingStyle,endingStyle,punctuationEmojiHabits,emotionalTemperature,personUsage,readerRelationship}',
    source_article_count INT DEFAULT 0 COMMENT '分析的源文章数量',
    source_article_previews JSON COMMENT '源文章标题/前100字预览(最多10篇)',
    ai_raw_output TEXT COMMENT 'AI原始分析结果(文本)',
    is_active TINYINT(1) DEFAULT 1,
    version INT DEFAULT 1 COMMENT '更新版本号',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    UNIQUE KEY uk_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 用户风格模因库（标志性短句 TOP 5）
CREATE TABLE IF NOT EXISTS user_style_memes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    style_profile_id INT NOT NULL COMMENT '关联 user_styles.id',
    phrase VARCHAR(200) NOT NULL COMMENT '标志性短句原文',
    context_preview VARCHAR(500) COMMENT '短句上下文(前后各100字)',
    sort_rank INT DEFAULT 0 COMMENT '排序(越靠前越标志性)',
    usage_count INT DEFAULT 0 COMMENT '已使用次数(均衡调度)',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_style (user_id, style_profile_id),
    FOREIGN KEY (style_profile_id) REFERENCES user_styles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. AI 味禁语库（全局共享，非用户维度）
CREATE TABLE IF NOT EXISTS ai_forbidden_phrases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phrase VARCHAR(500) NOT NULL COMMENT '禁用短语/句式',
    category VARCHAR(50) COMMENT '分类: cliche|transition|ending|praise|hedge',
    severity ENUM('hard','soft') DEFAULT 'soft' COMMENT 'hard=强制禁止, soft=建议避免',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 预置种子数据
INSERT IGNORE INTO ai_forbidden_phrases (phrase, category, severity) VALUES
('在这个快节奏的时代', 'cliche', 'hard'),
('随着社会的发展', 'cliche', 'hard'),
('众所周知', 'cliche', 'hard'),
('当下', 'cliche', 'hard'),
('不禁让人感叹', 'transition', 'soft'),
('不得不说', 'transition', 'soft'),
('总而言之', 'transition', 'soft'),
('诚然', 'hedge', 'soft'),
('值得深思', 'ending', 'soft'),
('让我们一起', 'ending', 'soft'),
('不禁让我想到', 'transition', 'soft'),
('在这个充满', 'cliche', 'hard'),
('由此可见', 'transition', 'soft'),
('综上所述', 'ending', 'soft'),
('不可否认', 'hedge', 'soft'),
('毋庸置疑', 'hedge', 'soft'),
('在当今社会', 'cliche', 'hard'),
('随着时代的发展', 'cliche', 'hard'),
('正所谓', 'cliche', 'soft'),
('话不多说', 'transition', 'soft');

-- 4. 编辑行为追踪表
CREATE TABLE IF NOT EXISTS user_edit_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    article_hash VARCHAR(64) COMMENT '关联原文MD5',
    original_text LONGTEXT NOT NULL COMMENT '修改前的段落/全文',
    edited_text LONGTEXT NOT NULL COMMENT '修改后的段落/全文',
    edit_type ENUM('rewrite','insert','delete','ai_rewrite') NOT NULL,
    edit_scope VARCHAR(50) COMMENT 'paragraph|sentence|full_text',
    diff_metadata JSON COMMENT '{addedChars, deletedChars, changedRatio}',
    context_before VARCHAR(200) COMMENT '修改位置前100字',
    context_after VARCHAR(200) COMMENT '修改位置后100字',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_hash (article_hash),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 链式生成大纲表
CREATE TABLE IF NOT EXISTS generate_outlines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    keyword VARCHAR(200),
    domain VARCHAR(50),
    style VARCHAR(50),
    word_count INT DEFAULT 1500 COMMENT '目标字数',
    title VARCHAR(500) COMMENT 'AI生成的文章标题',
    sections JSON NOT NULL COMMENT '[{heading, estimatedWords, keyPoints, content?, orderIndex}]',
    section_contents JSON COMMENT '已生成段落内容映射 {orderIndex: content}',
    status ENUM('draft','approved','generating','completed') DEFAULT 'draft',
    full_article LONGTEXT COMMENT '组装后的完整文章',
    credits_deducted TINYINT(1) DEFAULT 0 COMMENT '是否已扣积分',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 迁移 site_config 中的旧风格数据到 user_styles
-- （需手动执行，或在首次 API 调用时自动迁移）
-- SELECT user_id from site_config where key like 'user_style_%' ...

-- 7. 插入新的 prompt 模板类型
INSERT IGNORE INTO prompt_templates (name, type, domain, system_prompt, user_prompt_template, is_active, sort_order) VALUES

-- 风格分析 Prompt（9 维度 + 标志性短句）
('风格分析-9维度', 'style_analysis', '通用',
'你是一位专业的写作风格分析师。请分析以下文章样本，从 9 个维度总结作者的写作风格特征。

【核心原则】
1. 每个维度必须引用原文中的具体句子作为例证，不要只给抽象描述
2. 分析要具体到可以据此模仿写作的程度
3. 如果样本量不足以判断某个维度，请标注"样本不足，暂无法判断"

【9 个分析维度】

1. **平均句长特征**
   - 统计每句话的大致字数范围（如 15-25 字 / 30-50 字）
   - 判断：短句为主（<20字）还是长句为主（>40字）？
   - 举例3个典型句子及其字数

2. **常用句式特征**
   - 是否常用：排比、对仗、反问、设问、感叹？
   - 是否常用：长修饰从句、短促断句、口语化短句？
   - 给出原文中的 3 个典型句式例子

3. **词汇偏好**
   - 高频词汇有哪些？（列出 TOP 5 高频特色词汇及出现次数）
   - 偏好口语词还是书面语？
   - 有没有标志性的网络热词、成语、行话、方言词？
   - 特别注意：作者是否反复使用某些特定的连接词（如"就是说""说白了""真的会谢"）

4. **开头方式偏好**
   - 文章通常以什么方式开头？
   - 选项：讲故事/抛悬念/引数据/亮观点/引用名言/提问互动/直接说事
   - 给出 2 个原文开头示例

5. **结尾方式偏好**
   - 文章通常以什么方式结尾？
   - 选项：总结升华/互动提问/金句收尾/戛然而止/呼吁行动/开放结尾
   - 给出 2 个原文结尾示例

6. **标点和表情符号使用习惯**
   - 常用什么标点？（感叹号！、省略号…、波浪号～、破折号——）
   - 是否使用 emoji？频率如何？（每段1-2个 / 偶尔使用 / 几乎不用）
   - 是否有特殊的标点组合习惯？（如"！！！""～～～""？？？"）

7. **情感温度**
   - 评分 1-10 分（1=极度冷静克制，10=极度热情外放）
   - 选一个最贴切的标签：冷静克制 / 热情外放 / 尖刻犀利 / 温柔治愈 / 自黑自嘲 / 理性分析
   - 给出 3 个体现情感温度的原文句子

8. **人称使用**
   - 第一人称"我"的使用频率和方式（自我暴露多吗？）
   - 第二人称"你"的使用频率和方式（直接对话感强吗？）
   - 对读者的称呼方式（"你""大家""朋友们""各位""宝子们"）
   - 举例说明典型的人称使用模式

9. **对读者关系的设定**
   - 作者把自己放在什么位置？（朋友聊天 / 老师讲课 / 闺蜜吐槽 / 记者报道 / 专家指导 / 同行交流）
   - 对读者的预期是什么？（已经懂了 / 需要科普 / 有共同经历 / 渴望被理解）
   - 用原文中的互动方式举例

【特别任务：提取个人标志性短句 TOP 5】
请找出作者在文章中最具个人特色的 5 个标志性短句/口头禅/签名句式（memes）。
这些是"一看就是这个人写的"的独特表达。要求：
- 每个 memes 必须给出原文精准摘录
- 标注该短句通常出现在文章的什么位置（开头/结尾/过渡/观点总结）
- 标注该短句的使用语境（自嘲/强调/转折/共情/号召）

【输出格式 — 严格 JSON】
{
  "avgSentenceLength": "...（含3个例句和字数统计）",
  "sentencePatterns": "...（含3个典型句式例子）",
  "vocabularyPrefs": "...（含TOP 5高频词列表及口语/书面语偏好）",
  "openingStyle": "...（含2个开头示例）",
  "endingStyle": "...（含2个结尾示例）",
  "punctuationEmojiHabits": "...（含具体使用频率和例子）",
  "emotionalTemperature": "...（含评分+标签+3个例句）",
  "personUsage": "...（含我/你使用频率+称呼方式+例句）",
  "readerRelationship": "...（含位置设定+互动方式+例句）",
  "signaturePhrases": [
    {
      "phrase": "原文短句（精准摘录）",
      "context": "出现场景和位置描述",
      "typicalUsage": "通常在什么语境下使用（自嘲/转折/共情...）"
    }
  ]
}

注意：signaturePhrases 必须是 5 个，如果样本不足则标注"样本不足"但仍尽量提取。',

'请分析以下 {{count}} 篇文章的写作风格：
{{samples}}', 1, 10),

-- 大纲生成 Prompt
('大纲生成', 'outline', '通用',
'你是一位公众号内容策划专家，擅长设计逻辑清晰、阅读体验好的文章结构。

【大纲设计原则】
1. 标题要有爆款潜质：数字、悬念、身份代入、反常识
2. 小标题之间要有逻辑递进：引入问题 → 展开分析 → 案例说明 → 解决方案 → 总结升华
3. 每个大段有明确的"阅读收获"——读者读完这段能得到什么
4. 段落字数分配合理，重点段落字数更多
5. 5-8 个大段，总字数尽量接近目标字数

【输出格式 — 严格 JSON（不要markdown代码块）】
{"title":"文章标题","sections":[{"heading":"第1段小标题","estimatedWords":300,"keyPoints":"本段核心观点（1-2句话）"},...]}',

'请为「{keyword}」生成一篇{domain}领域的公众号文章大纲。

目标字数：{wordCount}字
风格要求：{style}', 1, 20);

-- 8. 修改 prompt_templates 表 type 字段注释（MySQL不支持直接改注释，仅记录）
-- ALTER TABLE prompt_templates MODIFY COLUMN type VARCHAR(50) NOT NULL COMMENT 'article|title|style_analysis|outline';
