-- ============================================
-- AI写作平台 - 数据库初始化脚本
-- 请在现有 vmq 数据库中执行此脚本
-- ============================================

-- 站点配置表（欢迎语、公告、开关等所有可配置项）
CREATE TABLE IF NOT EXISTS site_config (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT,
    `type` VARCHAR(20) DEFAULT 'text' COMMENT 'text|textarea|json|image|richtext',
    `description` VARCHAR(255) DEFAULT '',
    `group` VARCHAR(50) DEFAULT 'general' COMMENT '配置分组',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认配置（基础设置）
INSERT IGNORE INTO site_config (`key`, `value`, `type`, `description`, `group`) VALUES
('welcome_message', '欢迎使用AI爆文生成器！', 'text', '首页欢迎语', 'general'),
('site_notice', '', 'textarea', '站点顶部公告', 'general'),
('site_keywords', '公众号爆文,AI写作,文章生成器', 'text', 'SEO关键词', 'seo'),
('site_description', '专业的AI文章生成工具', 'textarea', 'SEO描述', 'seo'),
('enable_ads', 'true', 'text', '是否启用广告', 'ads'),
('enable_payment', 'true', 'text', '是否启用付费', 'payment'),
('free_credits', '3', 'text', '免费使用次数(次)', 'payment'),
('generate_cooldown', '0', 'text', '生成冷却时间(秒)', 'general'),
('sidebar_ad_html', '', 'textarea', '侧边栏广告自定义HTML', 'ads');

-- 插入默认配置（前台页面内容 — 全部为 JSON 格式，可在后台 内容管理 中编辑）
INSERT IGNORE INTO site_config (`key`, `value`, `type`, `description`, `group`) VALUES
('header_config', '{"siteName":"公众号爆文生成器","navLinks":[{"label":"首页","href":"/"},{"label":"爆文题目生成","href":"/title-generator"},{"label":"爆文生成","href":"/generate"},{"label":"图片生成","href":"/image-generator"},{"label":"原创检测","href":"/originality-check"},{"label":"使用教程","href":"/tutorials"},{"label":"留言板","href":"/guestbook"},{"label":"更新日志","href":"/changelog"},{"label":"关于我们","href":"/about"}]}', 'json', 'Header导航栏', 'content'),
('footer_config', '{"email":"contact@你的域名.com","copyright":"公众号爆文生成器 | 本站使用AI大模型驱动，所有内容仅供参考。","links":[{"label":"关于我们","href":"/about"},{"label":"使用教程","href":"/tutorials"},{"label":"更新日志","href":"/changelog"},{"label":"留言板","href":"/guestbook"}]}', 'json', 'Footer底部信息', 'content'),
('home_hero_slides', '[{"title":"🎯 一键生成","highlight":"10W+","suffix":"爆款文章","description":"覆盖情感、职场、教育等30+领域，基于最新AI大模型，极速生成高质量爆文。","accent":"from-red-600 to-red-800","btnBorder":"border-red-700","highlightColor":"text-red-400","subColor":"text-red-400","btnText":"✍️ 立即开始创作","href":"/generate","subText":"AI 内容创作工具，助力公众号、自媒体打造高质量爆文"},{"title":"🏷️ AI","highlight":"爆款标题","suffix":"生成器","description":"输入核心关键词，AI 为您创作5个极具吸引力的爆款标题，引爆阅读量。","accent":"from-red-700 to-rose-900","btnBorder":"border-red-800","highlightColor":"text-red-300","subColor":"text-red-300","btnText":"🚀 生成黄金标题","href":"/title-generator"},{"title":"🖼️ AI","highlight":"智能配图","suffix":"","description":"输入文字描述，选择图片尺寸，即可生成高质量、无版权风险的公众号配图。","accent":"from-rose-800 to-red-950","btnBorder":"border-rose-800","highlightColor":"text-rose-300","subColor":"text-rose-300","btnText":"🎨 设计我的图片","href":"/image-generator"}]', 'json', '首页轮播图', 'content'),
('home_hero_links', '[{"emoji":"✍️","label":"爆文生成","href":"/generate"},{"emoji":"🏷️","label":"爆文标题生成","href":"/title-generator"},{"emoji":"🤖","label":"AI检测","href":"https://matrix.tencent.com/ai-detect/ai_gen_txt","external":true},{"emoji":"🛡️","label":"原创检测","href":"/originality-check"},{"emoji":"🖼️","label":"图片生成","href":"/image-generator"},{"emoji":"📚","label":"使用教程","href":"/tutorials"},{"emoji":"💬","label":"留言板","href":"/guestbook"}]', 'json', '首页侧边快捷入口', 'content'),
('home_features', '{"title":"核心功能 · 为爆文而生","subtitle":"我们不仅仅是内容生成，更是您的智能创作伙伴","items":[{"emoji":"🏷️","title":"爆款标题工坊","description":"输入关键词，AI从海量数据中提炼爆款标题公式，生成5个让用户忍不住点击的黄金标题。","href":"/title-generator"},{"emoji":"✍️","title":"全文智能生成","description":"选中一个标题，AI将自动围绕核心主题，构建文章框架、填充论据、优化文笔，一气呵成。","href":"/generate"},{"emoji":"📚","title":"多领域专家模型","description":"无论是科技、情感还是养生，我们为不同领域训练专属模型，确保内容深度与专业性。","href":"/generate"},{"emoji":"🛠️","title":"实用工具矩阵","description":"集成了AI内容检测、图片生成等辅助工具，覆盖从构思到发布的完整流程。","href":"/"}]}', 'json', '首页功能介绍卡片', 'content'),
('home_steps', '{"title":"📖 如何使用本工具？","items":[{"num":"1","label":"输入关键词 / 主题","desc":"输入您想要创作的内容主题或关键词"},{"num":"2","label":"选择内容风格","desc":"情感 / 职场 / 教育 / 娱乐 等多种风格可选"},{"num":"3","label":"点击生成爆文","desc":"AI 将快速生成高质量爆文内容"},{"num":"4","label":"质量检测优化","desc":"可进行原创检测与 AI 检测，提升内容质量"}],"ctaText":"🚀 立即开始创作","ctaHref":"/generate"}', 'json', '首页使用步骤', 'content'),
('home_testimonials', '{"title":"👥 用户好评","items":[{"quote":"原来写公众号这么简单，一键生成的文章比我写的还流畅！","author":"小王","role":"自媒体作者"},{"quote":"用它发的文章，阅读量明显提升了，标题和开头都非常抓人！","author":"阿静","role":"公众号运营者"},{"quote":"有了这个工具，我每天可以稳定产出3篇高质量文章，效率提升了10倍。","author":"老李","role":"内容创业者"},{"quote":"标题生成器太好用了！以前想标题想半天，现在几秒钟就有了。","author":"小美","role":"新手号主"}]}', 'json', '首页用户评价', 'content'),
('home_cta', '{"title":"🚀 准备好创作爆款了吗？","subtitle":"数千位自媒体人已在用，让AI帮你写爆文","buttonText":"免费开始创作","buttonHref":"/generate"}', 'json', '首页底部CTA', 'content'),
('home_templates', '{"title":"🔥 本周最受欢迎模板","items":[{"emoji":"💔","title":"情感爆文模板","desc":"爱而不得：如何写出让人心碎的爆款情感文？","href":"/templates/emotion"},{"emoji":"🧓","title":"养生爆文模板","desc":"60岁后如何科学养生，让身体年轻10岁？","href":"/templates/health"},{"emoji":"🌍","title":"热点话题模板","desc":"某地高考满分作文引发热议，你怎么看？","href":"/templates/trending"}],"moreText":"查看更多模板 →","moreHref":"/templates/emotion"}', 'json', '首页模板卡片', 'content'),
('tutorials_content', '[{"title":"1. 注册与开始使用","content":"首先访问我们的网站，无需注册即可免费体验。您可以直接在首页点击免费开始创作按钮，或通过导航栏进入爆文生成页面。\\n\\n**免费额度**：每位新用户可以获得3次免费的AI生成额度。"},{"title":"2. 如何生成一篇爆文","content":"进入爆文生成页面后：\\n\\n1. **输入文章主题/关键词**：越具体越好\\n2. **选择写作领域**：情感、职场、教育、科技、养生等\\n3. **选择内容风格**：深度专业、轻松幽默、情感共鸣、干货实用\\n4. **选择文章长度**：短文~800字、中篇~1500字、长文~2500字\\n5. **点击生成**：AI自动创作，完成后可一键复制"},{"title":"3. 爆款标题生成技巧","content":"好的标题是爆文的一半：\\n\\n1. 输入核心关键词，而不是完整的标题\\n2. 系统从不同角度生成5个标题\\n3. 选择最适合的标题\\n\\n**标题技巧**：使用数字、制造悬念、情感共鸣"},{"title":"4. 原创检测与优化","content":"生成文章后建议使用原创检测：\\n\\n1. 将文章粘贴到检测框中\\n2. 点击开始检测\\n3. 根据评分和建议优化\\n\\n**提升原创度方法**：加入个人观点、替换表达方式、补充独特案例"},{"title":"5. 充值付费说明","content":"免费额度用完后可购买套餐：\\n\\n- 体验套餐：\\u00a59.90 = 10次生成\\n- 标准套餐：\\u00a529.90 = 50次生成（推荐）\\n- 专业套餐：\\u00a559.90 = 150次生成\\n\\n支持微信支付和支付宝，支付成功后即时到账。"}]', 'json', '使用教程页内容', 'content'),
('template_pages', '{"emotion":{"title":"情感爆文模板","emoji":"💔","description":"情感类文章是公众号最受欢迎的类别之一。掌握情感文的写作技巧，轻松写出触动人心的文章。","tips":["用真实故事开头，迅速建立情感连接","描述细节：一个眼神、一句话、一个动作，越具体越动人","运用对比：曾经的美好 vs 现在的遗憾","金句收尾：一句话总结全文，让读者忍不住转发","标题技巧：使用【爱而不得】【最让人心疼】等情感词"]},"health":{"title":"养生爆文模板","emoji":"🧓","description":"养生类文章面向中老年群体，语言要通俗易懂，内容要有科学依据，同时要有实用价值。","tips":["用权威来源增加可信度：引用研究数据、医生建议","语言要接地气：避免专业术语，用大白话讲养生","提供可操作的方法：具体到每天怎么做、吃什么","善用数字：3个动作、5种食物、每天10分钟","结尾呼吁行动：从今天开始、为了健康转给家人"]},"trending":{"title":"热点话题模板","emoji":"🌍","description":"蹭热点是快速涨粉的有效方法。但热点文章需要快速出稿，同时要有独特的观点。","tips":["第一时间跟进：热点24小时内是黄金期","独特角度：不要只转述新闻，要有自己的观点","引发讨论：提一个开放性问题，鼓励留言互动","结合自身定位：把热点和你账号的主题结合","注意尺度：敏感话题要谨慎，遵守法律法规"]}}', 'json', '模板详情页内容', 'content'),
('about_content', '[{"title":"🎯 我们的使命","content":"在内容为王的时代，优质内容是公众号运营的核心竞争力。然而，持续产出高质量内容对于许多自媒体人来说是一项巨大的挑战。公众号爆文生成器致力于通过AI技术降低内容创作的门槛，让每一个有想法的人都能轻松创作出吸引人的文章。","list":[],"muted":false},{"title":"💡 我们能做什么","content":"","list":["<strong>智能文章生成</strong> — 输入关键词，AI在几十秒内生成一篇结构完整的文章","<strong>爆款标题创作</strong> — 基于数据分析，生成高点击率的标题","<strong>多领域覆盖</strong> — 情感、职场、教育、科技、养生等30+领域","<strong>内容质量检测</strong> — 原创度检测、AI痕迹检测"],"muted":false},{"title":"📧 联系我们","content":"如果您有任何建议、合作意向或使用问题，欢迎通过以下方式联系我们：\\n📧 邮箱：contact@你的域名.com\\n💬 也可以通过留言板给我们留言","list":[],"muted":false},{"title":"⚠️ 免责声明","content":"本站使用AI大模型驱动，所有生成内容仅供参考使用。用户应自行判断内容的准确性、适用性和原创性。使用本工具生成的内容产生的任何后果，本站不承担相关责任。请遵守相关法律法规和平台规范，不要将本工具用于生成违法、违规或有害内容。","list":[],"muted":true}]', 'json', '关于我们页面内容', 'content');

-- 留言板
CREATE TABLE IF NOT EXISTS guestbook (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_approved TINYINT(1) DEFAULT 0 COMMENT '审核状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(45)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 使用次数记录
CREATE TABLE IF NOT EXISTS credits_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_identifier VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    credits_used INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 付费套餐
CREATE TABLE IF NOT EXISTS pricing_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    credits INT NOT NULL,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO pricing_plans (id, name, price, credits, description, sort_order) VALUES
(1, '体验套餐', 9.90, 10, '10次生成额度', 1),
(2, '标准套餐', 29.90, 50, '50次生成额度，平均每次不到6毛', 2),
(3, '专业套餐', 59.90, 150, '150次生成额度，适合专业自媒体', 3);

-- AI Prompt 模板
CREATE TABLE IF NOT EXISTS prompt_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL COMMENT 'article|title',
    domain VARCHAR(50) COMMENT '情感|职场|教育|科技|养生|娱乐',
    system_prompt TEXT,
    user_prompt_template TEXT,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文章生成 Prompt（高质量升级版）
INSERT IGNORE INTO prompt_templates (id, name, type, domain, system_prompt, user_prompt_template, sort_order) VALUES
(1, '通用文章生成', 'article', '通用',
'你是一位资深公众号主编，拥有10年爆文写作经验，深谙微信公众号流量密码。

【写作原则】
1. 开头3秒抓人：用悬念、反常识、故事片段或灵魂拷问开场，让读者产生"然后呢？"的好奇心
2. 金句密度高：每300字至少埋一个"转发级金句"——简短有力、适合截图分享
3. 代入感强：用"你有没有发现…""你是不是也…"等句式建立共鸣，让读者觉得"这说的不就是我吗"
4. 信息增量大：不要写正确的废话，要给出具体的数据、案例、方法，让读者有"原来如此"的收获感
5. 情绪起伏：先共情痛点→放大焦虑→给出希望→号召行动，像坐过山车

【格式规范】
- 文章标题用一级标题 #
- 每个大段有一个抓人的小标题（用 **加粗**）
- 关键金句独占一行，前后留空行
- 善用短句。3-5字一句。制造节奏感。
- 适当使用emoji增加亲和力（每段不超过2个）
- 结尾加上互动引导，如"你怎么看？评论区聊聊👇"',

'请以「{keyword}」为主题，写一篇{style}风格的公众号爆文。

【写作领域】{domain}
【目标字数】{wordCount}字左右
【风格要求】{style}

请严格遵守以上系统指令中的写作原则和格式规范，输出一篇完整的、可直接发布的公众号文章。要求：
- 标题自拟，要有爆款潜质
- 开头必须用故事/悬念/反常识观点切入
- 全文至少有5个金句级别的亮点句子
- 段落之间逻辑递进，不能东拉西扯
- 结尾要有互动引导', 1),

(2, '通用标题生成', 'title', '通用',
'你是一位公众号爆款标题专家，服务过100+百万粉丝大号，深谙人性弱点和点击心理。

【爆款标题公式】
- 数字悬念型："{keyword}的3个真相，第2个让人后背发凉"
- 身份代入型："如果你是{keyword}的人，这篇文章一定要看"
- 反常识型："为什么{keyword}越努力越失败？"
- 恐惧焦虑型："{keyword}正在毁掉你的XX，而你却不知道"
- 利益诱惑型："搞懂{keyword}，让你的收入翻3倍"

【标题要求】
- 15-30字为最佳传播长度
- 至少使用一种爆款公式
- 避免标题党，标题要能对应真实内容
- 适合在朋友圈、微信群传播',

'请围绕「{keyword}」这个关键词，生成5个公众号爆款标题。

【写作领域】{domain}

要求：
1. 每个标题使用不同的爆款公式（不要5个标题都用同一种套路）
2. 标题长度控制在15-30字
3. 不夸张、不标题党，但要让人忍不住想点
4. 适合在朋友圈和微信群传播

请直接输出5个标题，每行一个，不要编号。', 2),

-- 情感领域专用 Prompt
(3, '情感文章生成', 'article', '情感',
'你是一位情感类公众号的金牌写手，擅长写触动人心的情感故事和人生感悟。你的读者主要是25-45岁的都市人群，他们渴望被理解、被治愈。

【写作特色】
1. 以真实感人的小故事开头，细节越具体越好（一个眼神、一句话、一个动作）
2. 善用对比：从前的甜蜜vs现在的疏离，理想的美好vs现实的残酷
3. 金句要有"扎心感"："成年人的崩溃，都是从一句没事开始的"
4. 语调温柔但有力，像一个懂你的朋友在深夜陪你聊天
5. 结尾给温暖、给力量，不让读者陷入负面情绪',

'请以「{keyword}」为主题，写一篇{style}风格的公众号情感文章。

【核心要求】
- {wordCount}字左右
- 从一个真实感人的小故事切入
- 文中要有让人鼻子一酸的金句（至少3处）
- 结尾温暖有力，给读者安慰或力量
- 全文要有"被理解"的共鸣感', 3),

-- 职场领域专用 Prompt
(4, '职场文章生成', 'article', '职场',
'你是一位职场领域的深度观察者，曾在顶尖咨询公司工作，采访过500+职场人。你的文章有数据支撑、有案例佐证、有可落地的方法论。

【写作特色】
1. 用具体案例或数据开篇，建立专业可信度
2. 提炼出清晰的方法论框架（"3个步骤""5条法则"）
3. 每个观点都有实际的场景说明，让读者对号入座
4. 语言干脆利落，不拖泥带水，像一位犀利的职场导师
5. 给出可操作的行动建议，读完就能用',

'请以「{keyword}」为主题，写一篇{style}风格的职场干货文章。

【核心要求】
- {wordCount}字左右
- 开篇用真实职场场景切入
- 提炼出清晰的方法论（3-5条）
- 每条建议配具体场景和可操作步骤
- 语言犀利有力，拒绝鸡汤', 4);

-- 广告位
CREATE TABLE IF NOT EXISTS ad_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NOT NULL COMMENT 'sidebar',
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    title VARCHAR(200),
    is_active TINYINT(1) DEFAULT 1,
    start_date DATETIME,
    end_date DATETIME,
    sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 更新日志
CREATE TABLE IF NOT EXISTS changelogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    changes TEXT NOT NULL COMMENT 'JSON array of change items',
    published_at DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO changelogs (id, version, changes, published_at) VALUES
(1, 'v1.0.0', '["🚀 公众号爆文生成器正式上线","✍️ AI智能文章生成","🎨 黑红极简设计","📱 移动端适配"]', '2025-05-01');

-- 生成历史
CREATE TABLE IF NOT EXISTS generate_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL COMMENT 'article|title',
    user_input TEXT,
    result LONGTEXT,
    domain VARCHAR(50),
    user_identifier VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI 模型配置（多模型管理）
CREATE TABLE IF NOT EXISTS ai_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '显示名称',
    provider VARCHAR(50) NOT NULL COMMENT 'deepseek|openai|claude|custom',
    api_key VARCHAR(500) NOT NULL DEFAULT '',
    base_url VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'API 地址，留空用 provider 默认',
    model VARCHAR(100) NOT NULL COMMENT '模型标识，如 deepseek-chat',
    max_tokens INT DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.70,
    is_active TINYINT(1) DEFAULT 1,
    keyword_triggers TEXT COMMENT '触发关键词 JSON 数组',
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO ai_models (id, name, provider, model, is_active, sort_order) VALUES
(1, '默认模型', 'deepseek', 'deepseek-chat', 1, 0);

-- 支付订单表（V免签支付追踪）
CREATE TABLE IF NOT EXISTS payment_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pay_id VARCHAR(100) NOT NULL UNIQUE COMMENT 'V免签返回的订单号',
    user_identifier VARCHAR(100) NOT NULL COMMENT '用户IP标识',
    plan_id INT COMMENT '关联套餐ID',
    price DECIMAL(10,2) COMMENT '支付金额',
    credits_to_add INT NOT NULL DEFAULT 0 COMMENT '购买额度',
    status ENUM('pending','paid','closed') DEFAULT 'pending',
    pay_type TINYINT COMMENT '1=微信 2=支付宝',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME COMMENT '支付到账时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 充值记录表（付费额度入账）
CREATE TABLE IF NOT EXISTS credits_recharge (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_identifier VARCHAR(100) NOT NULL COMMENT '用户IP标识',
    credits_added INT NOT NULL COMMENT '充值次数',
    price DECIMAL(10,2) COMMENT '支付金额',
    plan_id INT COMMENT '关联套餐ID',
    pay_id VARCHAR(100) COMMENT '关联支付订单号',
    source VARCHAR(50) DEFAULT 'vmq' COMMENT '充值来源 vmq|manual|admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户表（注册登录 + 邮箱验证）
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    email_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(64),
    verification_sent_at DATETIME,
    bio TEXT COMMENT '个人简介',
    favorite_keywords TEXT COMMENT '常用关键词 JSON数组',
    preferred_style VARCHAR(50) COMMENT '偏好文章风格',
    total_generations INT DEFAULT 0 COMMENT '总生成次数',
    total_exports INT DEFAULT 0 COMMENT '总导出次数',
    last_export_format VARCHAR(10) COMMENT '最近导出格式',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    INDEX idx_email (email),
    INDEX idx_verification_token (verification_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
