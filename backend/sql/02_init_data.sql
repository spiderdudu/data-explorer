-- XSyphon Ontology — 系统内置初始化数据
-- 执行顺序：先建表（02-metadata-design.md），再执行本脚本

-- ============================================================
-- 1. 系统内置 ont_type
-- ============================================================

INSERT INTO meta.ont_type (name, display_name, description, is_system) VALUES
-- 基础类型
('Dataset',     'Dataset',     '数据集，对应一张业务表',           true),
('Domain',      'Domain',      '业务领域，如 Trading、Market',     true),
('Container',   'Container',   '容器，如实例 LD、SG',              true),
('Action',      'Action',      '操作，如生成报告、下单、预警推送',  true),
-- 业务类型
('MarketEvent', 'Market Event','市场事件，如战争、加息、非农',      false),
('Quote',       'Quote',       '行情品种，如 EUR/USD、XAU/USD',    false),
('Client',      'Client',      '客户',                            false),
('Account',     'Account',     '交易账户',                        false),
('Position',    'Position',    '持仓',                            false),
('Strategy',    'Strategy',    '交易策略',                        false);

-- ============================================================
-- 2. 系统内置 Domain 实体
-- ============================================================

INSERT INTO meta.ont_entity (type_id, urn, name, display_name, platform, env, is_system)
SELECT
    t.id,
    'urn:xs:Domain:(xsyphon,' || v.name || ',prod)',
    v.name,
    v.display_name,
    'xsyphon',
    'prod',
    true
FROM meta.ont_type t
CROSS JOIN (VALUES
    ('Trading', '交易域'),
    ('Market',  '行情域'),
    ('Risk',    '风控域'),
    ('System',  '系统域')
) AS v(name, display_name)
WHERE t.name = 'Domain';

-- ============================================================
-- 3. 系统内置 Container 实体（交易实例）
-- ============================================================

INSERT INTO meta.ont_entity (type_id, urn, name, display_name, platform, env, is_system)
SELECT
    t.id,
    'urn:xs:Container:(xsyphon,' || v.name || ',prod)',
    v.name,
    v.display_name,
    'xsyphon',
    'prod',
    true
FROM meta.ont_type t
CROSS JOIN (VALUES
    ('LD', 'London'),
    ('SG', 'Singapore'),
    ('JT', 'Jakarta'),
    ('SP', 'ServicePlatform')
) AS v(name, display_name)
WHERE t.name = 'Container';

-- ============================================================
-- 4. Dataset 类型的系统内置 Aspect
-- ============================================================

-- 4.1 schemaMetadata — 业务表映射
INSERT INTO meta.ont_aspect (type_id, name, display_name, description, is_system, sort_order)
SELECT id, 'schemaMetadata', 'Schema Metadata', '业务表映射信息', true, 0
FROM meta.ont_type WHERE name = 'Dataset';

-- schemaMetadata 的属性
INSERT INTO meta.ont_property (aspect_id, type_id, name, display_name, data_type, is_system, sort_order)
SELECT a.id, t.id, v.name, v.display_name, 'string', true, v.sort_order
FROM meta.ont_aspect a
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('schema', 'Schema', 1),
    ('table',  'Table',  2),
    ('pk',     'PK',     3)
) AS v(name, display_name, sort_order)
WHERE t.name = 'Dataset' AND a.name = 'schemaMetadata';

-- 4.2 datasetProperties — 数据集基本属性
INSERT INTO meta.ont_aspect (type_id, name, display_name, description, is_system, sort_order)
SELECT id, 'datasetProperties', 'Dataset Properties', '数据集基本属性', true, 1
FROM meta.ont_type WHERE name = 'Dataset';

INSERT INTO meta.ont_property (aspect_id, type_id, name, display_name, data_type, is_required, is_system, sort_order)
SELECT a.id, t.id, v.name, v.display_name, v.data_type, v.is_required, true, v.sort_order
FROM meta.ont_aspect a
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('description', 'Description', 'string', false, 1),
    ('tags',        'Tags',        'string', false, 2)
) AS v(name, display_name, data_type, is_required, sort_order)
WHERE t.name = 'Dataset' AND a.name = 'datasetProperties';

-- 4.3 ownership — 所有者信息
INSERT INTO meta.ont_aspect (type_id, name, display_name, description, is_system, sort_order)
SELECT id, 'ownership', 'Ownership', '数据集所有者信息', true, 2
FROM meta.ont_type WHERE name = 'Dataset';

INSERT INTO meta.ont_property (aspect_id, type_id, name, display_name, data_type, is_required, is_system, sort_order)
SELECT a.id, t.id, v.name, v.display_name, v.data_type, v.is_required, true, v.sort_order
FROM meta.ont_aspect a
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('owner',   'Owner',   'string', true,  1),
    ('team',    'Team',    'string', false, 2),
    ('steward', 'Steward', 'string', false, 3)
) AS v(name, display_name, data_type, is_required, sort_order)
WHERE t.name = 'Dataset' AND a.name = 'ownership';

-- ============================================================
-- 5. MarketEvent 类型的系统内置 Aspect
-- ============================================================

-- 5.1 eventInfo — 事件核心业务属性
INSERT INTO meta.ont_aspect (type_id, name, display_name, description, is_system, sort_order)
SELECT id, 'eventInfo', 'Event Info', '事件核心业务属性', true, 0
FROM meta.ont_type WHERE name = 'MarketEvent';

INSERT INTO meta.ont_property (aspect_id, type_id, name, display_name, data_type, is_required, is_system, sort_order)
SELECT a.id, t.id, v.name, v.display_name, v.data_type, v.is_required, true, v.sort_order
FROM meta.ont_aspect a
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('event_type',   'Event Type',   'enum',     true,  1),
    ('impact_level', 'Impact Level', 'enum',     true,  2),
    ('event_time',   'Event Time',   'datetime', true,  3),
    ('window_start', 'Window Start', 'datetime', true,  4),
    ('window_end',   'Window End',   'datetime', true,  5)
) AS v(name, display_name, data_type, is_required, sort_order)
WHERE t.name = 'MarketEvent' AND a.name = 'eventInfo';

-- event_type 枚举值
INSERT INTO meta.ont_property_enum (property_id, value, display_name, sort_order)
SELECT p.id, v.value, v.display_name, v.sort_order
FROM meta.ont_property p
JOIN meta.ont_aspect a ON p.aspect_id = a.id
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('WAR',             '战争/地缘冲突', 1),
    ('NFP',             '非农数据',      2),
    ('RATE_DECISION',   '利率决议',      3),
    ('SANCTION',        '制裁',          4),
    ('NATURAL_DISASTER','自然灾害',      5),
    ('OTHER',           '其他',          6)
) AS v(value, display_name, sort_order)
WHERE t.name = 'MarketEvent' AND p.name = 'event_type';

-- impact_level 枚举值
INSERT INTO meta.ont_property_enum (property_id, value, display_name, sort_order)
SELECT p.id, v.value, v.display_name, v.sort_order
FROM meta.ont_property p
JOIN meta.ont_aspect a ON p.aspect_id = a.id
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('HIGH',   'High',   1),
    ('MEDIUM', 'Medium', 2),
    ('LOW',    'Low',    3)
) AS v(value, display_name, sort_order)
WHERE t.name = 'MarketEvent' AND p.name = 'impact_level';

-- 5.2 eventSource — 爬虫来源信息
INSERT INTO meta.ont_aspect (type_id, name, display_name, description, is_system, sort_order)
SELECT id, 'eventSource', 'Event Source', '事件来源信息', true, 1
FROM meta.ont_type WHERE name = 'MarketEvent';

INSERT INTO meta.ont_property (aspect_id, type_id, name, display_name, data_type, is_required, is_system, sort_order)
SELECT a.id, t.id, v.name, v.display_name, v.data_type, v.is_required, true, v.sort_order
FROM meta.ont_aspect a
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('title',       'Title',       'string', false, 1),
    ('source',      'Source',      'string', false, 2),
    ('source_url',  'Source URL',  'string', false, 3),
    ('raw_content', 'Raw Content', 'string', false, 4)
) AS v(name, display_name, data_type, is_required, sort_order)
WHERE t.name = 'MarketEvent' AND a.name = 'eventSource';

-- ============================================================
-- 6. 系统内置 ont_link_type
-- ============================================================

INSERT INTO meta.ont_link_type (name, display_name, source_type_id, target_type_id, cardinality, is_directed, qualifier_values, is_system)
SELECT
    v.name,
    v.display_name,
    s.id,
    tgt.id,
    v.cardinality,
    true,
    v.qualifier_values,
    true
FROM (VALUES
    ('belongs_to_domain',          '归属领域',       'Dataset',     'Domain',    'MANY_TO_ONE',  NULL),
    ('belongs_to_container',       '归属容器',       'Dataset',     'Container', 'MANY_TO_ONE',  NULL),
    ('event_affects_quote',        '影响品种',       'MarketEvent', 'Quote',     'MANY_TO_MANY', 'BEARISH,BULLISH,NEUTRAL'),
    ('quote_exposes_position',     '品种暴露持仓',   'Quote',       'Position',  'MANY_TO_MANY', NULL),
    ('position_belongs_to_account','持仓属于账户',   'Position',    'Account',   'MANY_TO_ONE',  NULL),
    ('account_belongs_to_client',  '账户属于客户',   'Account',     'Client',    'MANY_TO_ONE',  NULL),
    ('strategy_applied_to_account','策略应用于账户', 'Strategy',    'Account',   'MANY_TO_MANY', 'ACTIVE,SUSPENDED,TESTING'),
    ('action_applies_to_type',     'Action 挂载类型','Action',      'Dataset',   'MANY_TO_MANY', NULL)
) AS v(name, display_name, source_type_name, target_type_name, cardinality, qualifier_values)
JOIN meta.ont_type s   ON s.name = v.source_type_name
JOIN meta.ont_type tgt ON tgt.name = v.target_type_name;

-- ============================================================
-- 7. Action 类型的系统内置 Aspect：actionInfo + actionConfig
-- ============================================================

-- 7.1 actionInfo — 业务属性
INSERT INTO meta.ont_aspect (type_id, name, display_name, description, is_system, sort_order)
SELECT id, 'actionInfo', 'Action Info', 'Action 业务属性', true, 0
FROM meta.ont_type WHERE name = 'Action';

INSERT INTO meta.ont_property (aspect_id, type_id, name, display_name, data_type, is_required, is_system, sort_order)
SELECT a.id, t.id, v.name, v.display_name, v.data_type, v.is_required, true, v.sort_order
FROM meta.ont_aspect a
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('action_type',  'Action Type',  'enum',   true,  1),
    ('description',  'Description',  'string', false, 2)
) AS v(name, display_name, data_type, is_required, sort_order)
WHERE t.name = 'Action' AND a.name = 'actionInfo';

-- action_type 枚举值
INSERT INTO meta.ont_property_enum (property_id, value, display_name, sort_order)
SELECT p.id, v.value, v.display_name, v.sort_order
FROM meta.ont_property p
JOIN meta.ont_aspect a ON p.aspect_id = a.id
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('analysis',     '分析计算', 1),
    ('report',       '生成报告', 2),
    ('notification', '通知预警', 3),
    ('order',        '下单交易', 4),
    ('mutation',     '修改数据', 5),
    ('query',        '查询数据', 6)
) AS v(value, display_name, sort_order)
WHERE t.name = 'Action' AND p.name = 'action_type';

-- 7.2 actionConfig — 技术属性
INSERT INTO meta.ont_aspect (type_id, name, display_name, description, is_system, sort_order)
SELECT id, 'actionConfig', 'Action Config', 'Action 技术执行配置', true, 1
FROM meta.ont_type WHERE name = 'Action';

INSERT INTO meta.ont_property (aspect_id, type_id, name, display_name, data_type, is_required, is_system, sort_order)
SELECT a.id, t.id, v.name, v.display_name, v.data_type, v.is_required, true, v.sort_order
FROM meta.ont_aspect a
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('handler_type', 'Handler Type', 'enum',    true,  1),
    ('host',         'Host',         'string',  false, 2),
    ('port',         'Port',         'integer', false, 3),
    ('handler',      'Handler',      'string',  true,  4),
    ('timeout',      'Timeout',      'integer', false, 5)
) AS v(name, display_name, data_type, is_required, sort_order)
WHERE t.name = 'Action' AND a.name = 'actionConfig';

-- handler_type 枚举值
INSERT INTO meta.ont_property_enum (property_id, value, display_name, sort_order)
SELECT p.id, v.value, v.display_name, v.sort_order
FROM meta.ont_property p
JOIN meta.ont_aspect a ON p.aspect_id = a.id
JOIN meta.ont_type t ON a.type_id = t.id
CROSS JOIN (VALUES
    ('grpc',     'gRPC',     1),
    ('sql',      'SQL',      2),
    ('airflow',  'Airflow',  3),
    ('internal', 'Internal', 4)
) AS v(value, display_name, sort_order)
WHERE t.name = 'Action' AND p.name = 'handler_type';

-- ============================================================
-- 8. 系统内置 Action 实例
-- ============================================================

INSERT INTO meta.ont_entity (type_id, urn, name, display_name, platform, env, is_system)
SELECT
    t.id,
    'urn:xs:Action:(xsyphon,' || v.name || ',prod)',
    v.name,
    v.display_name,
    'xsyphon',
    'prod',
    true
FROM meta.ont_type t
CROSS JOIN (VALUES
    ('generate_impact_report', '生成影响分析报告'),
    ('send_alert',             '发送风控预警'),
    ('get_position_exposure',  '查询持仓暴露'),
    ('place_order',            '下单')
) AS v(name, display_name)
WHERE t.name = 'Action';

-- Action 实例的 actionInfo 属性值
INSERT INTO meta.ont_entity_property_value (entity_id, aspect_id, property_id, data_type, value, start_version)
SELECT
    e.id,
    a.id,
    p.id,
    p.data_type,
    v.value,
    1
FROM meta.ont_entity e
JOIN meta.ont_type t ON e.type_id = t.id
JOIN meta.ont_aspect a ON a.type_id = t.id AND a.name = 'actionInfo'
JOIN meta.ont_property p ON p.aspect_id = a.id
JOIN (VALUES
    ('generate_impact_report', 'action_type',  'analysis'),
    ('generate_impact_report', 'description',  '分析市场事件对持仓的影响，生成影响报告'),
    ('send_alert',             'action_type',  'notification'),
    ('send_alert',             'description',  '向 Dealer 发送风控预警通知'),
    ('get_position_exposure',  'action_type',  'query'),
    ('get_position_exposure',  'description',  '查询受影响品种的持仓暴露'),
    ('place_order',            'action_type',  'order'),
    ('place_order',            'description',  '在交易系统下单')
) AS v(entity_name, prop_name, value)
    ON e.name = v.entity_name AND p.name = v.prop_name
WHERE t.name = 'Action';

-- Action 实例的 actionConfig 属性值
INSERT INTO meta.ont_entity_property_value (entity_id, aspect_id, property_id, data_type, value, start_version)
SELECT
    e.id,
    a.id,
    p.id,
    p.data_type,
    v.value,
    1
FROM meta.ont_entity e
JOIN meta.ont_type t ON e.type_id = t.id
JOIN meta.ont_aspect a ON a.type_id = t.id AND a.name = 'actionConfig'
JOIN meta.ont_property p ON p.aspect_id = a.id
JOIN (VALUES
    ('generate_impact_report', 'handler_type', 'internal'),
    ('generate_impact_report', 'handler',      'generate_impact_report'),
    ('send_alert',             'handler_type', 'internal'),
    ('send_alert',             'handler',      'send_alert'),
    ('get_position_exposure',  'handler_type', 'grpc'),
    ('get_position_exposure',  'handler',      'xsyphon.trade.Trader/GetPositions'),
    ('place_order',            'handler_type', 'grpc'),
    ('place_order',            'handler',      'xsyphon.trade.Trader/PlaceOrder')
) AS v(entity_name, prop_name, value)
    ON e.name = v.entity_name AND p.name = v.prop_name
WHERE t.name = 'Action';
