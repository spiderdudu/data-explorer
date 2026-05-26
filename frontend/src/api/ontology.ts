import type {
  DatasetEntity,
  DomainTreeNode,
  ContainerTreeNode,
  LineageGraph,
  OntAspect,
  OntDimension,
  OntDimensionType,
  OntEntity,
  OntEntityExtra,
  OntEntityLink,
  OntProperty,
  OntType,
  PageResult,
  SearchParams,
  SearchResult,
} from '@/types/ontology'

// ── Mock 数据 ─────────────────────────────────────────────────────────────────
// 后端 API 就绪后替换为真实请求

const MOCK_DIMENSION_TYPES: OntDimensionType[] = [
  { id: 1, name: 'platform',      displayName: '数据平台',   description: '数据实体的物理来源，决定适用的平台专属 Aspect' },
  { id: 2, name: 'strategy_type', displayName: '策略类型',   description: '交易策略的算法分类，决定适用的策略专属 Aspect' },
  { id: 3, name: 'action_type',   displayName: 'Action 类型', description: '操作的功能分类，决定适用的入参/出参 Aspect' },
]

const MOCK_DIMENSIONS: OntDimension[] = [
  // platform
  { id: 1,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'postgresql',  displayName: 'PostgreSQL',      category: 'database', description: '业务配置数据库，存储 meta schema、config schema 等结构化业务数据',                    isSystem: true,  status: 1 },
  { id: 2,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'timescaledb', displayName: 'TimescaleDB',     category: 'database', description: '时序数据库，存储 ladder、account_position、spread_metrics 等高频时序数据',             isSystem: true,  status: 1 },
  { id: 3,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'redis',       displayName: 'Redis',           category: 'database', description: '缓存数据库，存储实时状态和热点数据，如 EodPriceCache、session 状态',                   isSystem: true,  status: 1 },
  { id: 4,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 's3',          displayName: 'Amazon S3',       category: 'file',     description: '对象存储，存储报告文件、归档数据、批量导入文件（Excel/CSV/Parquet）',                   isSystem: true,  status: 1 },
  { id: 5,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'file',        displayName: 'Local File',      category: 'file',     description: '本地文件系统，用于开发环境或运营手动导入的 Excel / CSV 文件',                          isSystem: true,  status: 1 },
  { id: 6,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'mq',   displayName: 'MQ', category: 'stream',   description: 'MQ 消息流，实时写入，包含 LP tick、OMS 成交回报、配置快照等',             isSystem: true,  status: 1 },
  { id: 7,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'reuters',     displayName: 'Reuters Eikon',   category: 'api',      description: 'Reuters Eikon API，提供外汇即期汇率、新闻事件等实时数据',                              isSystem: false, status: 1 },
  { id: 8,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'bloomberg',   displayName: 'Bloomberg',       category: 'api',      description: 'Bloomberg API，提供宏观经济日历（NFP、CPI、利率决议）和市场数据',                      isSystem: false, status: 1 },
  { id: 20, dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'grpc',        displayName: 'gRPC',            category: 'internal',      description: '内部 gRPC 服务查询，如 Configurator/All、Trader/GetPositions，返回结构化数据',          isSystem: true,  status: 1 },
  { id: 9,  dimensionTypeId: 1, dimensionTypeName: 'platform', name: 'kafka',       displayName: 'Kafka',           category: 'stream',   description: 'Kafka 消息队列，用于跨系统事件传递（预留，暂未接入）',                                 isSystem: false, status: 0 },
  // strategy_type
  { id: 10, dimensionTypeId: 2, dimensionTypeName: 'strategy_type', name: 'TrendFollowing', displayName: '趋势跟踪', category: 'signal',  description: '基于均线、动量或突破信号判断趋势方向，顺势建仓，追踪止损出场。适合单边行情', isSystem: false, status: 1 },
  { id: 11, dimensionTypeId: 2, dimensionTypeName: 'strategy_type', name: 'MeanReversion',  displayName: '均值回归', category: 'signal',  description: '价格偏离统计均值后反向建仓，等待回归获利。包含网格、布林带、RSI 超买超卖等变体', isSystem: false, status: 1 },
  { id: 12, dimensionTypeId: 2, dimensionTypeName: 'strategy_type', name: 'Arbitrage',      displayName: '套利',     category: 'spread',  description: '利用相关品种间的价差偏离（跨品种、三角套利）同时建仓，价差回归后平仓', isSystem: false, status: 1 },
  { id: 13, dimensionTypeId: 2, dimensionTypeName: 'strategy_type', name: 'MarketMaking',   displayName: '做市',     category: 'quoting', description: '持续挂出双边报价赚取买卖价差，核心是库存风险管理和动态调整报价', isSystem: false, status: 1 },
  { id: 14, dimensionTypeId: 2, dimensionTypeName: 'strategy_type', name: 'EventDriven',    displayName: '事件驱动', category: 'event',   description: '基于宏观经济事件（NFP、CPI、利率决议、地缘冲突）触发交易，结合 MarketEvent 体系', isSystem: false, status: 1 },
  { id: 15, dimensionTypeId: 2, dimensionTypeName: 'strategy_type', name: 'Execution',      displayName: '执行算法', category: 'algo',    description: '不预测方向，专注优化大单执行：TWAP / VWAP / Iceberg / POV，降低市场冲击成本', isSystem: false, status: 1 },
  // action_type
  { id: 16, dimensionTypeId: 3, dimensionTypeName: 'action_type', name: 'action_grpc',    displayName: 'gRPC',    category: 'internal',      description: '调用内部 gRPC 服务执行写操作，如下单、撤单、修改配置、调整风控参数', isSystem: true, status: 1 },
  { id: 17, dimensionTypeId: 3, dimensionTypeName: 'action_type', name: 'action_airflow', displayName: 'Airflow', category: 'workflow',       description: '触发 Airflow DAG，执行批量任务，如生成报告、数据导出',             isSystem: true, status: 1 },
  { id: 18, dimensionTypeId: 3, dimensionTypeName: 'action_type', name: 'action_alert',   displayName: 'Alert',   category: 'notification',   description: '向指定渠道推送预警通知，如 Slack、邮件、SMS',                       isSystem: true, status: 1 },
]

// 便捷查找
const dimByName = (name: string) => MOCK_DIMENSIONS.find(d => d.name === name)!

const MOCK_TYPES: OntType[] = [
  { id: 1,  name: 'Dataset',     displayName: 'Dataset',      description: '结构化数据集，涵盖数据库表、视图、文件（Excel/CSV）、消息流、API 响应等任何按行展开的结构化数据',  isSystem: true,  status: 1 },
  { id: 2,  name: 'Domain',      displayName: 'Domain',       description: '业务域，用于对数据集进行逻辑分组，如 Trading / Market / Risk，可嵌套子域',                    isSystem: true,  status: 1 },
  { id: 3,  name: 'Container',   displayName: 'Container',    description: '实例内的物理分组，对应数据库 schema 或消息队列前缀，如 public / meta / LD',                    isSystem: true,  status: 1 },
  { id: 4,  name: 'Action',      displayName: 'Action',       description: '可触发的操作，如生成报告、发送预警、调用 gRPC 接口',                                           isSystem: true,  status: 1 },
  { id: 5,  name: 'MarketEvent', displayName: 'Market Event', description: '市场事件，如地缘冲突、央行利率决议、非农数据发布，驱动影响分析流程',                            isSystem: false, status: 1 },
  { id: 7,  name: 'Client',      displayName: 'Client',       description: '客户，FX 交易平台的终端用户，有独立身份和生命周期，关联账户、策略、偏好等业务属性',              isSystem: false, status: 1 },
  { id: 10, name: 'Strategy',    displayName: 'Strategy',     description: '自动交易策略，关联账户和品种，参数结构由策略类型决定',                                          isSystem: false, status: 1 },
  { id: 11, name: 'Instance',    displayName: 'Instance',     description: '平台的一个具体部署实例，承载 host/port/region 等运维信息，如 platform-rds-prod / LD-queue',    isSystem: true,  status: 1 },
]

// ── Aspect 样例数据 ────────────────────────────────────────────────────────────

const MOCK_ASPECTS: OntAspect[] = [
  // Dataset — 通用（所有平台）
  { id: 1,  typeId: 1, name: 'schemaMetadata',    displayName: 'Schema 元数据',  description: '数据源的通用元数据（refresh_mode 等）',                         sortOrder: 1 },
  { id: 2,  typeId: 1, name: 'datasetProperties', displayName: '数据集属性',     description: '标签、描述等业务属性',                                          sortOrder: 2 },
  { id: 3,  typeId: 1, name: 'ownership',         displayName: '所有权',         description: 'Owner / Team / Steward 归属信息',                               sortOrder: 3 },
  // Dataset — 平台专属
  { id: 4,  typeId: 1, dimensionId: dimByName('postgresql').id,  dimensionName: 'postgresql',  name: 'dbTableMetadata',  displayName: 'DB Table 元数据',      description: 'PostgreSQL 表/视图的物理位置（schema / table / pk）',              sortOrder: 4 },
  { id: 5,  typeId: 1, dimensionId: dimByName('timescaledb').id, dimensionName: 'timescaledb', name: 'dbTableMetadata',  displayName: 'DB Table 元数据',      description: 'TimescaleDB 表的物理位置（schema / table / pk / hypertable）',    sortOrder: 4 },
  { id: 6,  typeId: 1, dimensionId: dimByName('redis').id,       dimensionName: 'redis',       name: 'redisMetadata',    displayName: 'Redis 元数据',         description: 'Redis key 模式、数据结构类型（string/hash/zset 等）',             sortOrder: 4 },
  { id: 7,  typeId: 1, dimensionId: dimByName('s3').id,          dimensionName: 's3',          name: 'fileMetadata',     displayName: 'S3 文件元数据',        description: 'S3 路径、文件格式、分隔符',                                       sortOrder: 4 },
  { id: 8,  typeId: 1, dimensionId: dimByName('file').id,        dimensionName: 'file',        name: 'fileMetadata',     displayName: '本地文件元数据',       description: '本地文件路径、文件格式、分隔符',                                   sortOrder: 4 },
  { id: 9,  typeId: 1, dimensionId: dimByName('mq').id,   dimensionName: 'mq',   name: 'streamMetadata',   displayName: 'MQ 元数据',     description: 'MQ 名称、消息类型（DTO class）',                    sortOrder: 4 },
  { id: 10, typeId: 1, dimensionId: dimByName('reuters').id,     dimensionName: 'reuters',     name: 'apiMetadata',      displayName: 'Reuters API 元数据',   description: 'Reuters API endpoint、认证方式',                                 sortOrder: 4 },
  { id: 11, typeId: 1, dimensionId: dimByName('bloomberg').id,   dimensionName: 'bloomberg',   name: 'apiMetadata',      displayName: 'Bloomberg API 元数据', description: 'Bloomberg API endpoint、认证方式',                               sortOrder: 4 },
  { id: 54, typeId: 1, dimensionId: dimByName('grpc').id,        dimensionName: 'grpc',        name: 'grpcMetadata',     displayName: 'gRPC 元数据',          description: 'gRPC service、method、请求 payload',                             sortOrder: 4 },  // MarketEvent
  { id: 12, typeId: 5, name: 'eventInfo',      displayName: '事件信息',   description: '事件类型、标题、发生时间、严重程度、相关品种',          sortOrder: 1 },
  { id: 44, typeId: 5, name: 'eventSource',    displayName: '事件来源',   description: '数据来源、原始链接、爬虫抓取内容',                      sortOrder: 2 },
  { id: 13, typeId: 5, name: 'impactAnalysis', displayName: '影响分析',   description: 'LLM 推断的受影响品种、方向、置信度和摘要',              sortOrder: 3 },
  // Client
  { id: 15, typeId: 7, name: 'clientProfile',    displayName: '客户档案',   description: '客户身份信息、KYC 状态、风险等级、客户类型',            sortOrder: 1 },
  { id: 16, typeId: 7, name: 'clientPreference', displayName: '交易偏好',   description: '偏好品种、交易时段、杠杆偏好',                          sortOrder: 2 },
  // Strategy — 通用 aspect
  { id: 19, typeId: 10, name: 'strategyCore',   displayName: '策略核心',   description: '所有策略通用：品种、策略类型、账户、状态',                    sortOrder: 1 },
  { id: 36, typeId: 10, name: 'positionConfig', displayName: '仓位配置',   description: '所有策略通用：手数、杠杆上限、最大持仓',                      sortOrder: 2 },
  { id: 37, typeId: 10, name: 'riskControl',    displayName: '风控配置',   description: '所有策略通用：最大回撤、日亏损上限、止损点数',                sortOrder: 3 },
  // Strategy — 策略类型专属 aspect
  { id: 31, typeId: 10, dimensionId: dimByName('TrendFollowing').id, dimensionName: 'TrendFollowing', name: 'entrySignal',      displayName: '入场信号',   description: '趋势跟踪：触发建仓的技术指标和条件',           sortOrder: 4 },
  { id: 38, typeId: 10, dimensionId: dimByName('TrendFollowing').id, dimensionName: 'TrendFollowing', name: 'exitCondition',    displayName: '出场条件',   description: '趋势跟踪：止盈目标、追踪止损、信号反转出场',   sortOrder: 5 },
  { id: 32, typeId: 10, dimensionId: dimByName('MeanReversion').id,  dimensionName: 'MeanReversion',  name: 'reversionSetup',   displayName: '回归设置',   description: '均值回归：统计窗口、偏离阈值、网格参数',       sortOrder: 4 },
  { id: 39, typeId: 10, dimensionId: dimByName('MeanReversion').id,  dimensionName: 'MeanReversion',  name: 'exitCondition',    displayName: '出场条件',   description: '均值回归：回归目标价、最大持仓时间',           sortOrder: 5 },
  { id: 33, typeId: 10, dimensionId: dimByName('Arbitrage').id,      dimensionName: 'Arbitrage',      name: 'arbitrageSetup',   displayName: '套利设置',   description: '套利：对冲品种、价差统计窗口、建仓阈值',       sortOrder: 4 },
  { id: 40, typeId: 10, dimensionId: dimByName('Arbitrage').id,      dimensionName: 'Arbitrage',      name: 'exitCondition',    displayName: '出场条件',   description: '套利：价差回归目标、最大持仓时间、强平阈值',   sortOrder: 5 },
  { id: 34, typeId: 10, dimensionId: dimByName('MarketMaking').id,   dimensionName: 'MarketMaking',   name: 'quotingConfig',    displayName: '报价配置',   description: '做市：买卖价差、报价量、库存上限',             sortOrder: 4 },
  { id: 41, typeId: 10, dimensionId: dimByName('MarketMaking').id,   dimensionName: 'MarketMaking',   name: 'inventoryControl', displayName: '库存管理',   description: '做市：库存偏斜调整、对冲触发条件',             sortOrder: 5 },
  { id: 35, typeId: 10, dimensionId: dimByName('EventDriven').id,    dimensionName: 'EventDriven',    name: 'eventFilter',      displayName: '事件过滤',   description: '事件驱动：关注的事件类型、品种、影响方向',     sortOrder: 4 },
  { id: 42, typeId: 10, dimensionId: dimByName('EventDriven').id,    dimensionName: 'EventDriven',    name: 'tradeRule',        displayName: '交易规则',   description: '事件驱动：触发条件、建仓方向、持仓时长',       sortOrder: 5 },
  { id: 43, typeId: 10, dimensionId: dimByName('Execution').id,      dimensionName: 'Execution',      name: 'executionParams',  displayName: '执行参数',   description: '执行算法：算法类型、时间窗口、切片数量',       sortOrder: 4 },
  // Action — 通用
  { id: 20, typeId: 4,  name: 'actionInfo',       displayName: 'Action 信息',  description: '操作名称、触发条件、超时配置',                                  sortOrder: 1 },
  // Action — 专属（按 action_type 维度：grpc / airflow / alert）
  { id: 46, typeId: 4,  dimensionId: dimByName('action_grpc').id,    dimensionName: 'action_grpc',    name: 'grpcActionInfo',     displayName: 'gRPC 连接',     description: 'gRPC host / port / service / method',          sortOrder: 2 },
  { id: 47, typeId: 4,  dimensionId: dimByName('action_grpc').id,    dimensionName: 'action_grpc',    name: 'grpcActionInput',    displayName: 'gRPC 入参',     description: '业务入参，因具体操作而异',                     sortOrder: 3 },
  { id: 48, typeId: 4,  dimensionId: dimByName('action_grpc').id,    dimensionName: 'action_grpc',    name: 'grpcActionOutput',   displayName: 'gRPC 出参',     description: '业务出参，因具体操作而异',                     sortOrder: 4 },
  { id: 49, typeId: 4,  dimensionId: dimByName('action_airflow').id, dimensionName: 'action_airflow', name: 'airflowActionInfo',  displayName: 'Airflow 连接',  description: 'Airflow host / port / dag_id',                 sortOrder: 2 },
  { id: 52, typeId: 4,  dimensionId: dimByName('action_airflow').id, dimensionName: 'action_airflow', name: 'airflowActionInput', displayName: 'Airflow 入参',  description: 'DAG 触发参数，如报告类型、品种过滤、输出格式', sortOrder: 3 },
  { id: 53, typeId: 4,  dimensionId: dimByName('action_airflow').id, dimensionName: 'action_airflow', name: 'airflowActionOutput',displayName: 'Airflow 出参',  description: 'DAG 执行结果，如报告 URL、run_id',             sortOrder: 4 },
  { id: 55, typeId: 4,  dimensionId: dimByName('action_alert').id,   dimensionName: 'action_alert',   name: 'alertActionInfo',    displayName: 'Alert 连接',    description: 'Alert host / port / webhook_path',             sortOrder: 2 },
  { id: 56, typeId: 4,  dimensionId: dimByName('action_alert').id,   dimensionName: 'action_alert',   name: 'alertActionInput',   displayName: 'Alert 入参',    description: '消息内容、推送渠道、严重程度',                 sortOrder: 3 },
  { id: 60, typeId: 4,  dimensionId: dimByName('action_alert').id,   dimensionName: 'action_alert',   name: 'alertActionOutput',  displayName: 'Alert 出参',    description: '成功推送数、失败渠道列表',                     sortOrder: 4 },
  // Domain
  { id: 21, typeId: 2,  name: 'domainInfo',       displayName: '域信息',         description: '域的 owner 和描述',                                              sortOrder: 1 },
  // Container
  { id: 22, typeId: 3,  name: 'containerInfo',    displayName: '容器信息',       description: '实例内物理分组的描述',                                          sortOrder: 1 },
  // Instance — 通用
  { id: 23, typeId: 11, name: 'instanceInfo',     displayName: '实例信息',       description: '所有 Instance 通用的基础信息',                                  sortOrder: 1 },
  // Instance — 平台专属
  { id: 24, typeId: 11, dimensionId: dimByName('postgresql').id,  dimensionName: 'postgresql',  name: 'postgresqlInstanceInfo',  displayName: 'PostgreSQL 连接信息',   description: 'host / port / database_name / ssl_mode',        sortOrder: 2 },
  { id: 25, typeId: 11, dimensionId: dimByName('timescaledb').id, dimensionName: 'timescaledb', name: 'timescaledbInstanceInfo', displayName: 'TimescaleDB 连接信息',  description: 'host / port / database_name / retention_policy', sortOrder: 2 },
  { id: 26, typeId: 11, dimensionId: dimByName('redis').id,       dimensionName: 'redis',       name: 'redisInstanceInfo',       displayName: 'Redis 连接信息',        description: 'host / port / db_index / max_memory',           sortOrder: 2 },
  { id: 27, typeId: 11, dimensionId: dimByName('mq').id,   dimensionName: 'mq',   name: 'mqInstanceInfo',   displayName: 'MQ 实例信息',    description: 'instance_key / base_path / queue_dir',          sortOrder: 2 },
  { id: 28, typeId: 11, dimensionId: dimByName('s3').id,          dimensionName: 's3',          name: 's3InstanceInfo',          displayName: 'S3 存储桶信息',         description: 'bucket / region / endpoint',                    sortOrder: 2 },
  { id: 29, typeId: 11, dimensionId: dimByName('reuters').id,     dimensionName: 'reuters',     name: 'reutersInstanceInfo',     displayName: 'Reuters API 信息',      description: 'endpoint / api_key',                            sortOrder: 2 },
  { id: 30, typeId: 11, dimensionId: dimByName('bloomberg').id,   dimensionName: 'bloomberg',   name: 'bloombergInstanceInfo',   displayName: 'Bloomberg API 信息',    description: 'endpoint / api_key',                            sortOrder: 2 },
  { id: 61, typeId: 11, dimensionId: dimByName('grpc').id,        dimensionName: 'grpc',        name: 'grpcInstanceInfo',        displayName: 'gRPC 连接信息',         description: 'host / port / tls / services',                  sortOrder: 2 },
]

// ── Property 样例数据 ──────────────────────────────────────────────────────────

const MOCK_PROPERTIES: OntProperty[] = [
  // Dataset — schemaMetadata 通用 (aspectId=1)
  { id: 1,  aspectId: 1,  typeId: 1, name: 'freshness', displayName: '数据时效',       dataType: 'enum',    isRequired: false, isMulti: false, isSystem: true,  sortOrder: 1, description: 'realtime / minute / daily / request' },
  { id: 156,aspectId: 1,  typeId: 1, name: 'frequency',      displayName: '更新频率',       dataType: 'enum',    isRequired: false, isMulti: false, isSystem: true,  sortOrder: 2, description: '100ms / 500ms / 1s / 1min / 5min / 1h / 1d / realtime / n/a' },
  { id: 157,aspectId: 1,  typeId: 1, name: 'row_count',      displayName: '记录数',       dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '数据集当前估算行数，帮助消费方了解数据规模' },
  { id: 159,aspectId: 1,  typeId: 1, name: 'size_bytes',     displayName: '数据大小',       dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 5, description: '数据集当前估算大小（字节），展示时换算为 MB/GB' },
  { id: 158,aspectId: 1,  typeId: 1, name: 'retention',      displayName: '保留期',         dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 4, description: '如：90d、1y、永久' },
  // Dataset — datasetProperties 通用 (aspectId=2)
  { id: 2,  aspectId: 2,  typeId: 1, name: 'tags',            displayName: '标签',           dataType: 'string',  isRequired: false, isMulti: true,  isSystem: false, sortOrder: 1 },
  { id: 3,  aspectId: 2,  typeId: 1, name: 'description',     displayName: '描述',           dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 2 },
  // Dataset — ownership 通用 (aspectId=3)
  { id: 4,  aspectId: 3,  typeId: 1, name: 'owner',           displayName: 'Owner',          dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 5,  aspectId: 3,  typeId: 1, name: 'team',            displayName: 'Team',           dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 2 },
  { id: 6,  aspectId: 3,  typeId: 1, name: 'steward',         displayName: 'Steward',        dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 3 },
  // Dataset — dbTableMetadata PostgreSQL (aspectId=4)
  { id: 7,  aspectId: 4,  typeId: 1, name: 'schema',          displayName: 'Schema',         dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 8,  aspectId: 4,  typeId: 1, name: 'table',           displayName: 'Table',          dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  { id: 9,  aspectId: 4,  typeId: 1, name: 'pk',              displayName: 'Primary Key',    dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3 },
  // Dataset — dbTableMetadata TimescaleDB (aspectId=5)
  { id: 10, aspectId: 5,  typeId: 1, name: 'schema',          displayName: 'Schema',         dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 11, aspectId: 5,  typeId: 1, name: 'table',           displayName: 'Table',          dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  { id: 12, aspectId: 5,  typeId: 1, name: 'pk',              displayName: 'Primary Key',    dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3 },
  { id: 13, aspectId: 5,  typeId: 1, name: 'is_hypertable',   displayName: 'Hypertable',     dataType: 'boolean', isRequired: false, isMulti: false, isSystem: true,  sortOrder: 4, description: '是否为 TimescaleDB hypertable（时序分区表）' },
  { id: 14, aspectId: 5,  typeId: 1, name: 'time_column',     displayName: '时间列',         dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 5, description: 'hypertable 的时间分区列，如 created_at' },
  // Dataset — redisMetadata (aspectId=6)
  { id: 15, aspectId: 6,  typeId: 1, name: 'key_pattern',     displayName: 'Key 模式',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1, description: '如 eod_price:{symbol} 或 session:{account_id}' },
  { id: 16, aspectId: 6,  typeId: 1, name: 'data_structure',  displayName: '数据结构',       dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2, description: 'string / hash / list / set / zset' },
  { id: 17, aspectId: 6,  typeId: 1, name: 'ttl_seconds',     displayName: 'TTL（秒）',      dataType: 'integer', isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3, description: '过期时间，0=永不过期' },
  // Dataset — fileMetadata S3 (aspectId=7)
  { id: 18, aspectId: 7,  typeId: 1, name: 'bucket',          displayName: 'Bucket',         dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 19, aspectId: 7,  typeId: 1, name: 'path',            displayName: '路径',           dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2, description: '如 reports/pnl/daily_{date}.csv' },
  { id: 20, aspectId: 7,  typeId: 1, name: 'file_format',     displayName: '文件格式',       dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 3, description: 'csv / excel / parquet / json' },
  // Dataset — fileMetadata Local (aspectId=8)
  { id: 21, aspectId: 8,  typeId: 1, name: 'file_path',       displayName: '文件路径',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 22, aspectId: 8,  typeId: 1, name: 'file_format',     displayName: '文件格式',       dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2, description: 'csv / excel / json' },
  { id: 23, aspectId: 8,  typeId: 1, name: 'delimiter',       displayName: '分隔符',         dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3, description: 'CSV 分隔符，默认逗号' },
  // Dataset — streamMetadata MQ (aspectId=9)
  { id: 24, aspectId: 9,  typeId: 1, name: 'queue_name',      displayName: 'Queue 名称',     dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1, description: '如 config-output-LD、oms-output-LD' },
  { id: 25, aspectId: 9,  typeId: 1, name: 'message_type',    displayName: '消息类型',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2, description: 'DTO 类名，如 TieredLadder、ExecutionReport' },
  // Dataset — apiMetadata Reuters (aspectId=10)
  { id: 26, aspectId: 10, typeId: 1, name: 'endpoint',        displayName: 'Endpoint',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 27, aspectId: 10, typeId: 1, name: 'auth_type',       displayName: '认证方式',       dataType: 'enum',    isRequired: false, isMulti: false, isSystem: true,  sortOrder: 2, description: 'api_key / oauth2 / none' },
  // Dataset — apiMetadata Bloomberg (aspectId=11)
  { id: 28, aspectId: 11, typeId: 1, name: 'endpoint',        displayName: 'Endpoint',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 29, aspectId: 11, typeId: 1, name: 'auth_type',       displayName: '认证方式',       dataType: 'enum',    isRequired: false, isMulti: false, isSystem: true,  sortOrder: 2, description: 'api_key / oauth2 / none' },
  // Dataset — grpcMetadata (aspectId=54)
  { id: 153,aspectId: 54, typeId: 1, name: 'service',         displayName: 'gRPC Service',   dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1, description: '如 acme.config.ConfigService' },
  { id: 154,aspectId: 54, typeId: 1, name: 'method',          displayName: 'gRPC Method',    dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2, description: '如 All / GetSymbolConfig / GetPositions' },
  { id: 155,aspectId: 54, typeId: 1, name: 'request_payload', displayName: '请求 Payload',   dataType: 'json',    isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3, description: '固定请求参数，如 {"instance_key":{"instance_id":"SGP"}}' },
  { id: 30, aspectId: 12, typeId: 5, name: 'event_type',    displayName: '事件类型',   dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: 'WAR / RATE_DECISION / NFP / CPI / GEOPOLITICAL / EARNINGS / OTHER' },
  { id: 31, aspectId: 12, typeId: 5, name: 'title',         displayName: '标题',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: false, sortOrder: 2, description: '事件简短标题，如 "Fed raises rates by 25bps"' },
  { id: 32, aspectId: 12, typeId: 5, name: 'occurred_at',   displayName: '发生时间',   dataType: 'datetime',isRequired: true,  isMulti: false, isSystem: false, sortOrder: 3 },
  { id: 33, aspectId: 12, typeId: 5, name: 'severity',      displayName: '严重程度',   dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 4, description: 'HIGH / MEDIUM / LOW' },
  { id: 60, aspectId: 12, typeId: 5, name: 'symbols',       displayName: '相关品种',   dataType: 'string',  isRequired: false, isMulti: true,  isSystem: false, sortOrder: 5, description: '直接相关的品种，如 EURUSD / XAUUSD' },
  // MarketEvent — eventSource (aspectId=44)
  { id: 61, aspectId: 44, typeId: 5, name: 'source',        displayName: '来源',       dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: 'reuters / bloomberg / manual / other' },
  { id: 62, aspectId: 44, typeId: 5, name: 'source_url',    displayName: '原始链接',   dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 2 },
  { id: 63, aspectId: 44, typeId: 5, name: 'raw_content',   displayName: '原始内容',   dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '爬虫抓取的原始文本，供 LLM 解析' },
  // MarketEvent — impactAnalysis (aspectId=13)
  { id: 34, aspectId: 13, typeId: 5, name: 'affected_symbols', displayName: '受影响品种', dataType: 'string',  isRequired: false, isMulti: true,  isSystem: false, sortOrder: 1, description: 'LLM 推断的受影响品种，如 EURUSD,XAUUSD' },
  { id: 35, aspectId: 13, typeId: 5, name: 'impact_direction', displayName: '影响方向',   dataType: 'enum',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: 'BULLISH / BEARISH / NEUTRAL' },
  { id: 36, aspectId: 13, typeId: 5, name: 'confidence',       displayName: '置信度',     dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: 'LLM 推断置信度 0.00~1.00' },
  { id: 64, aspectId: 13, typeId: 5, name: 'summary',          displayName: '影响摘要',   dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 4, description: 'LLM 生成的影响分析摘要' },
  // Client — clientProfile (aspectId=15)
  { id: 41, aspectId: 15, typeId: 7, name: 'full_name',         displayName: '姓名',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 65, aspectId: 15, typeId: 7, name: 'email',             displayName: '邮箱',       dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 2 },
  { id: 66, aspectId: 15, typeId: 7, name: 'country',           displayName: '注册国家',   dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 3 },
  { id: 42, aspectId: 15, typeId: 7, name: 'client_type',       displayName: '客户类型',   dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 4, description: 'RETAIL / PROFESSIONAL / INSTITUTIONAL' },
  { id: 43, aspectId: 15, typeId: 7, name: 'kyc_status',        displayName: 'KYC 状态',   dataType: 'enum',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 5, description: 'PENDING / APPROVED / REJECTED' },
  { id: 67, aspectId: 15, typeId: 7, name: 'risk_level',        displayName: '风险等级',   dataType: 'enum',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 6, description: 'LOW / MEDIUM / HIGH' },
  // Client — clientPreference (aspectId=16)
  { id: 44, aspectId: 16, typeId: 7, name: 'symbols',           displayName: '偏好品种',   dataType: 'string',  isRequired: false, isMulti: true,  isSystem: false, sortOrder: 1 },
  { id: 45, aspectId: 16, typeId: 7, name: 'session',           displayName: '交易时段',   dataType: 'enum',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: 'LONDON / NEW_YORK / ASIA / ALL' },
  { id: 68, aspectId: 16, typeId: 7, name: 'leverage_preference', displayName: '偏好杠杆', dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '客户偏好的杠杆倍数，如 50 / 100 / 200' },
  // Strategy — strategyCore 通用 (aspectId=19)
  { id: 54, aspectId: 19, typeId: 10, name: 'symbol',         displayName: '品种',           dataType: 'string',  isRequired: true,  isMulti: true,  isSystem: false, sortOrder: 1, description: '适用品种，如 EURUSD / XAUUSD，多选' },
  { id: 55, aspectId: 19, typeId: 10, name: 'strategy_type',  displayName: '策略类型',       dataType: 'ref',     isRequired: true,  isMulti: false, isSystem: false, sortOrder: 2, description: '关联 ont_dimension（strategy_type）', refTypeId: 10 },
  { id: 56, aspectId: 19, typeId: 10, name: 'account_id',     displayName: '账户',           dataType: 'string',  isRequired: true,  isMulti: false, isSystem: false, sortOrder: 3, description: '关联账户标识' },
  { id: 57, aspectId: 19, typeId: 10, name: 'status',         displayName: '状态',           dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 4, description: 'ACTIVE / PAUSED / STOPPED' },
  // Strategy — positionConfig 通用 (aspectId=36)
  { id: 85, aspectId: 36, typeId: 10, name: 'lot_size',         displayName: '基础手数',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: '每次开仓的基础手数' },
  { id: 86, aspectId: 36, typeId: 10, name: 'max_position',     displayName: '最大持仓',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 2, description: '单品种最大持仓手数' },
  { id: 87, aspectId: 36, typeId: 10, name: 'leverage_limit',   displayName: '杠杆上限',       dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '最大允许杠杆倍数' },
  // Strategy — riskControl 通用 (aspectId=37)
  { id: 88, aspectId: 37, typeId: 10, name: 'max_drawdown',     displayName: '最大回撤',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: '触发暂停的最大回撤比例，如 0.05 = 5%' },
  { id: 89, aspectId: 37, typeId: 10, name: 'daily_loss_limit', displayName: '日亏损上限',     dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: '单日最大亏损金额，超出后停止交易' },
  { id: 90, aspectId: 37, typeId: 10, name: 'stop_loss_pips',   displayName: '止损点数',       dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '单笔交易止损点数（pips）' },
  // TrendFollowing — entrySignal (aspectId=31)
  { id: 91, aspectId: 31, typeId: 10, name: 'indicator',        displayName: '技术指标',       dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: 'MA_CROSS / MACD / MOMENTUM / BREAKOUT' },
  { id: 92, aspectId: 31, typeId: 10, name: 'fast_period',      displayName: '快线周期',       dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: '短期均线或快速信号周期，如 20' },
  { id: 93, aspectId: 31, typeId: 10, name: 'slow_period',      displayName: '慢线周期',       dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '长期均线或慢速信号周期，如 50' },
  { id: 94, aspectId: 31, typeId: 10, name: 'signal_direction', displayName: '信号方向',       dataType: 'enum',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 4, description: 'LONG_ONLY / SHORT_ONLY / BOTH' },
  // TrendFollowing — exitCondition (aspectId=38)
  { id: 95, aspectId: 38, typeId: 10, name: 'take_profit_pips', displayName: '止盈点数',       dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 1, description: '固定止盈点数，0 = 不设固定止盈' },
  { id: 96, aspectId: 38, typeId: 10, name: 'trailing_stop',    displayName: '追踪止损',       dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: '追踪止损比例，如 0.02 = 2%' },
  { id: 97, aspectId: 38, typeId: 10, name: 'signal_exit',      displayName: '信号反转出场',   dataType: 'boolean', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '信号反转时是否立即平仓' },
  // MeanReversion — reversionSetup (aspectId=32)
  { id: 98, aspectId: 32, typeId: 10, name: 'reversion_type',   displayName: '回归类型',       dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: 'BOLLINGER / RSI / GRID / STAT_ARB' },
  { id: 99, aspectId: 32, typeId: 10, name: 'lookback_period',  displayName: '统计窗口',       dataType: 'integer', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 2, description: '计算均值/标准差的历史周期（K线数）' },
  { id: 100,aspectId: 32, typeId: 10, name: 'entry_zscore',     displayName: '入场 Z-score',   dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 3, description: '偏离均值几个标准差时触发入场，如 2.0' },
  { id: 101,aspectId: 32, typeId: 10, name: 'grid_levels',      displayName: '网格层数',       dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 4, description: '网格变体：价格区间内的挂单层数' },
  // MeanReversion — exitCondition (aspectId=39)
  { id: 102,aspectId: 39, typeId: 10, name: 'exit_zscore',      displayName: '出场 Z-score',   dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: '价格回归到均值附近时出场，如 0.5' },
  { id: 103,aspectId: 39, typeId: 10, name: 'max_hold_hours',   displayName: '最大持仓时长',   dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: '超时强制平仓（小时）' },
  // Arbitrage — arbitrageSetup (aspectId=33)
  { id: 104,aspectId: 33, typeId: 10, name: 'arb_type',         displayName: '套利类型',       dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: 'CROSS_PAIR / TRIANGULAR / STAT_ARB' },
  { id: 105,aspectId: 33, typeId: 10, name: 'hedge_symbol',     displayName: '对冲品种',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: false, sortOrder: 2, description: '与主品种配对的对冲品种，如 GBPUSD' },
  { id: 106,aspectId: 33, typeId: 10, name: 'spread_window',    displayName: '价差统计窗口',   dataType: 'integer', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 3, description: '计算价差均值/标准差的历史周期' },
  { id: 107,aspectId: 33, typeId: 10, name: 'entry_threshold',  displayName: '入场阈值',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 4, description: '价差偏离均值的标准差倍数，触发建仓' },
  { id: 108,aspectId: 33, typeId: 10, name: 'hedge_ratio',      displayName: '对冲比例',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 5, description: '两腿仓位比例，如 1.0 = 1:1' },
  // Arbitrage — exitCondition (aspectId=40)
  { id: 109,aspectId: 40, typeId: 10, name: 'exit_threshold',   displayName: '出场阈值',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: '价差回归到均值附近时出场，如 0.3 个标准差' },
  { id: 110,aspectId: 40, typeId: 10, name: 'max_hold_hours',   displayName: '最大持仓时长',   dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: '超时强制平仓（小时）' },
  { id: 111,aspectId: 40, typeId: 10, name: 'force_exit_zscore',displayName: '强平阈值',       dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '价差继续扩大到此阈值时强制止损' },
  // MarketMaking — quotingConfig (aspectId=34)
  { id: 112,aspectId: 34, typeId: 10, name: 'bid_spread',       displayName: 'Bid 价差',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: '买方报价偏离中间价的 pips' },
  { id: 113,aspectId: 34, typeId: 10, name: 'ask_spread',       displayName: 'Ask 价差',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 2, description: '卖方报价偏离中间价的 pips' },
  { id: 114,aspectId: 34, typeId: 10, name: 'quote_size',       displayName: '报价量（手）',   dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 3 },
  { id: 115,aspectId: 34, typeId: 10, name: 'quote_levels',     displayName: '报价档位',       dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 4, description: '挂单档位数，如 3 = 三档双边报价' },
  // MarketMaking — inventoryControl (aspectId=41)
  { id: 116,aspectId: 41, typeId: 10, name: 'max_inventory',    displayName: '最大库存',       dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: '单边最大持仓手数，超出后停止该方向报价' },
  { id: 117,aspectId: 41, typeId: 10, name: 'skew_factor',      displayName: '价格偏斜系数',   dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: '库存偏多时压低 bid，偏空时抬高 ask，如 0.1' },
  { id: 118,aspectId: 41, typeId: 10, name: 'hedge_trigger',    displayName: '对冲触发阈值',   dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '库存超过此值时触发对冲平衡' },
  // EventDriven — eventFilter (aspectId=35)
  { id: 119,aspectId: 35, typeId: 10, name: 'event_types',      displayName: '关注事件类型',   dataType: 'enum',    isRequired: true,  isMulti: true,  isSystem: false, sortOrder: 1, description: 'RATE_DECISION / NFP / CPI / GEOPOLITICAL / WAR' },
  { id: 120,aspectId: 35, typeId: 10, name: 'impact_direction', displayName: '预期影响方向',   dataType: 'enum',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: 'BULLISH / BEARISH / NEUTRAL，与 MarketEvent 影响分析联动' },
  { id: 121,aspectId: 35, typeId: 10, name: 'min_confidence',   displayName: '最低置信度',     dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: 'LLM 影响分析置信度阈值，低于此值不触发' },
  // EventDriven — tradeRule (aspectId=42)
  { id: 122,aspectId: 42, typeId: 10, name: 'entry_delay_secs', displayName: '入场延迟（秒）', dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 1, description: '事件发生后延迟入场，等待初始波动平息' },
  { id: 123,aspectId: 42, typeId: 10, name: 'hold_minutes',     displayName: '持仓时长（分钟）',dataType: 'integer', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 2, description: '事件交易的预设持仓时长，到期平仓' },
  { id: 124,aspectId: 42, typeId: 10, name: 'position_scale',   displayName: '仓位倍数',       dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: '基于置信度动态调整仓位，如 1.0~2.0' },
  // Execution — executionParams (aspectId=43)
  { id: 125,aspectId: 43, typeId: 10, name: 'algo_type',        displayName: '算法类型',       dataType: 'enum',    isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1, description: 'TWAP / VWAP / ICEBERG / POV' },
  { id: 126,aspectId: 43, typeId: 10, name: 'total_quantity',   displayName: '总量（手）',     dataType: 'decimal', isRequired: true,  isMulti: false, isSystem: false, sortOrder: 2, description: '需要执行的总手数' },
  { id: 127,aspectId: 43, typeId: 10, name: 'duration_minutes', displayName: '执行时长（分钟）',dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: 'TWAP/VWAP 的执行时间窗口' },
  { id: 128,aspectId: 43, typeId: 10, name: 'slice_count',      displayName: '切片数量',       dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 4, description: '拆单数量，均匀分配到时间窗口内' },
  { id: 129,aspectId: 43, typeId: 10, name: 'participation_rate',displayName: '参与率',        dataType: 'decimal', isRequired: false, isMulti: false, isSystem: false, sortOrder: 5, description: 'POV 专用：占市场成交量的比例，如 0.1 = 10%' },
  // Action — actionInfo 通用 (aspectId=20)
  { id: 130,aspectId: 20, typeId: 4,  name: 'trigger_condition', displayName: '触发条件',   dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 1, description: '描述何时触发此操作，如"事件 severity=HIGH 时"' },
  { id: 131,aspectId: 20, typeId: 4,  name: 'timeout_seconds',   displayName: '超时（秒）', dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: '操作执行超时时间，超时后标记为 failed' },
  // Action — grpcActionInfo 连接信息 (aspectId=46)
  { id: 132,aspectId: 46, typeId: 4,  name: 'host',    displayName: 'Host',           dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 133,aspectId: 46, typeId: 4,  name: 'port',    displayName: 'Port',           dataType: 'integer', isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  { id: 134,aspectId: 46, typeId: 4,  name: 'service', displayName: 'gRPC Service',   dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 3, description: '如 acme.config.ConfigService / acme.trade.TradeService' },
  { id: 135,aspectId: 46, typeId: 4,  name: 'method',  displayName: 'gRPC Method',    dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 4, description: '如 UpdateSymbolConfig / PlaceOrder / CancelOrder' },
  { id: 136,aspectId: 46, typeId: 4,  name: 'tls',     displayName: 'TLS',            dataType: 'boolean', isRequired: false, isMulti: false, isSystem: true,  sortOrder: 5, description: '是否启用 TLS，生产环境建议开启' },
  // Action — grpcActionInput 入参 (aspectId=47)
  { id: 137,aspectId: 47, typeId: 4,  name: 'payload', displayName: 'Request Payload',dataType: 'json',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 1, description: '业务入参 JSON，结构因 method 而异' },
  // Action — grpcActionOutput 出参 (aspectId=48)
  { id: 138,aspectId: 48, typeId: 4,  name: 'status_code', displayName: 'Status Code',dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 139,aspectId: 48, typeId: 4,  name: 'response',    displayName: 'Response',   dataType: 'json',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: '业务出参 JSON，结构因 method 而异' },
  // Action — airflowActionInfo 连接信息 (aspectId=49)
  { id: 140,aspectId: 49, typeId: 4,  name: 'host',    displayName: 'Host',           dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 141,aspectId: 49, typeId: 4,  name: 'port',    displayName: 'Port',           dataType: 'integer', isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  { id: 142,aspectId: 49, typeId: 4,  name: 'dag_id',  displayName: 'DAG ID',         dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 3, description: '如 generate_impact_report / generate_pnl_report' },
  { id: 143,aspectId: 49, typeId: 4,  name: 'auth_token', displayName: 'Auth Token',  dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 4, description: 'Airflow API token，建议从 SSM 读取' },
  // Action — airflowActionInput 入参 (aspectId=52)
  { id: 144,aspectId: 52, typeId: 4,  name: 'conf',    displayName: 'DAG Conf',       dataType: 'json',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 1, description: 'DAG run 触发参数，如 {"report_type":"PNL","symbol":"EURUSD"}' },
  // Action — airflowActionOutput 出参 (aspectId=53)
  { id: 145,aspectId: 53, typeId: 4,  name: 'run_id',     displayName: 'Run ID',      dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 146,aspectId: 53, typeId: 4,  name: 'result_url', displayName: '结果 URL',    dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 2, description: 'S3 或内部文件服务的下载链接' },
  // Action — alertActionInfo 连接信息 (aspectId=55)
  { id: 147,aspectId: 55, typeId: 4,  name: 'host',         displayName: 'Host',       dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 148,aspectId: 55, typeId: 4,  name: 'port',         displayName: 'Port',       dataType: 'integer', isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  { id: 149,aspectId: 55, typeId: 4,  name: 'webhook_path', displayName: 'Webhook',    dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3, description: '如 /api/v1/alerts 或 Slack incoming webhook URL' },
  // Action — alertActionInput 入参 (aspectId=56)
  { id: 150,aspectId: 56, typeId: 4,  name: 'message',   displayName: '消息内容',     dataType: 'string',  isRequired: true,  isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 151,aspectId: 56, typeId: 4,  name: 'channels',  displayName: '推送渠道',     dataType: 'enum',    isRequired: true,  isMulti: true,  isSystem: false, sortOrder: 2, description: 'EMAIL / SLACK / SMS' },
  { id: 152,aspectId: 56, typeId: 4,  name: 'severity',  displayName: '严重程度',     dataType: 'enum',    isRequired: false, isMulti: false, isSystem: false, sortOrder: 3, description: 'HIGH / MEDIUM / LOW' },
  // Action — alertActionOutput 出参 (aspectId=60)
  { id: 153,aspectId: 60, typeId: 4,  name: 'sent_count',      displayName: '成功推送数', dataType: 'integer', isRequired: false, isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 154,aspectId: 60, typeId: 4,  name: 'failed_channels', displayName: '失败渠道',   dataType: 'string',  isRequired: false, isMulti: true,  isSystem: false, sortOrder: 2 },
  // Domain — domainInfo (aspectId=21)
  { id: 59, aspectId: 21, typeId: 2,  name: 'owner',        displayName: 'Owner',          dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 60, aspectId: 21, typeId: 2,  name: 'description',  displayName: '描述',           dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 2 },
  // Container — containerInfo 通用 (aspectId=22)
  { id: 61, aspectId: 22, typeId: 3,  name: 'description',     displayName: '描述',             dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 176,aspectId: 22, typeId: 3,  name: 'port',            displayName: 'Port',             dataType: 'integer', isRequired: false, isMulti: false, isSystem: true,  sortOrder: 2, description: '服务端口，仅 gRPC Container 有效，如 50053 / 50054 / 50056' },
  // Instance — instanceInfo 通用 (aspectId=23)
  { id: 61, aspectId: 23, typeId: 11, name: 'description',     displayName: '描述',             dataType: 'string',  isRequired: false, isMulti: false, isSystem: false, sortOrder: 1 },
  { id: 62, aspectId: 23, typeId: 11, name: 'status',          displayName: '状态',             dataType: 'enum',    isRequired: false, isMulti: false, isSystem: true,  sortOrder: 2, description: 'active / maintenance / deprecated' },
  // Instance — postgresqlInstanceInfo (aspectId=24)
  { id: 63, aspectId: 24, typeId: 11, name: 'host',            displayName: 'Host',             dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 64, aspectId: 24, typeId: 11, name: 'port',            displayName: 'Port',             dataType: 'integer', isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  { id: 65, aspectId: 24, typeId: 11, name: 'database_name',   displayName: 'Database',         dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 3 },
  { id: 66, aspectId: 24, typeId: 11, name: 'ssl_mode',        displayName: 'SSL Mode',         dataType: 'enum',    isRequired: false, isMulti: false, isSystem: true,  sortOrder: 4, description: 'disable / require / verify-full' },
  // Instance — timescaledbInstanceInfo (aspectId=25)
  { id: 67, aspectId: 25, typeId: 11, name: 'host',            displayName: 'Host',             dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 68, aspectId: 25, typeId: 11, name: 'port',            displayName: 'Port',             dataType: 'integer', isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  { id: 69, aspectId: 25, typeId: 11, name: 'database_name',   displayName: 'Database',         dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 3 },
  { id: 70, aspectId: 25, typeId: 11, name: 'retention_policy',displayName: 'Retention Policy', dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 4, description: '数据保留策略，如 90 days' },
  // Instance — redisInstanceInfo (aspectId=26)
  { id: 71, aspectId: 26, typeId: 11, name: 'host',            displayName: 'Host',             dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 72, aspectId: 26, typeId: 11, name: 'port',            displayName: 'Port',             dataType: 'integer', isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  { id: 73, aspectId: 26, typeId: 11, name: 'db_index',        displayName: 'DB Index',         dataType: 'integer', isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3, description: '默认 0' },
  { id: 74, aspectId: 26, typeId: 11, name: 'max_memory',      displayName: 'Max Memory',       dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 4, description: '如 512mb / 2gb' },
  // Instance — mqInstanceInfo (aspectId=27)
  { id: 75, aspectId: 27, typeId: 11, name: 'instance_key',    displayName: 'Instance Key',     dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1, description: '如 LD / SG / JT' },
  { id: 76, aspectId: 27, typeId: 11, name: 'base_path',       displayName: 'Base Path',        dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 2, description: '如 /poin/queues/LD' },
  { id: 77, aspectId: 27, typeId: 11, name: 'queue_dir',       displayName: 'Queue Dir',        dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3 },
  // Instance — s3InstanceInfo (aspectId=28)
  { id: 78, aspectId: 28, typeId: 11, name: 'bucket',          displayName: 'Bucket',           dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 79, aspectId: 28, typeId: 11, name: 'region',          displayName: 'Region',           dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2, description: '如 ap-southeast-1 / eu-west-2' },
  { id: 80, aspectId: 28, typeId: 11, name: 'endpoint',        displayName: 'Endpoint',         dataType: 'string',  isRequired: false, isMulti: false, isSystem: true,  sortOrder: 3, description: '自定义 endpoint，默认 AWS S3' },
  // Instance — reutersInstanceInfo (aspectId=29)
  { id: 81, aspectId: 29, typeId: 11, name: 'endpoint',        displayName: 'Endpoint',         dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 82, aspectId: 29, typeId: 11, name: 'api_key',         displayName: 'API Key',          dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  // Instance — bloombergInstanceInfo (aspectId=30)
  { id: 83, aspectId: 30, typeId: 11, name: 'endpoint',        displayName: 'Endpoint',         dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1 },
  { id: 84, aspectId: 30, typeId: 11, name: 'api_key',         displayName: 'API Key',          dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 2 },
  // Instance — grpcInstanceInfo (aspectId=61)
  { id: 172,aspectId: 61, typeId: 11, name: 'host',     displayName: 'Host',     dataType: 'string',  isRequired: true,  isMulti: false, isSystem: true,  sortOrder: 1, description: '如 dataservice.internal 或 ECS service DNS' },
  { id: 174,aspectId: 61, typeId: 11, name: 'tls',      displayName: 'TLS',      dataType: 'boolean', isRequired: false, isMulti: false, isSystem: true,  sortOrder: 2, description: '是否启用 TLS，生产环境建议开启' },
  { id: 175,aspectId: 61, typeId: 11, name: 'services', displayName: '提供的服务', dataType: 'string',  isRequired: false, isMulti: true,  isSystem: false, sortOrder: 3, description: '该实例提供的 gRPC service 列表，如 Configurator / Trader / StrategyService' },
]

// ── ont_entity_property_value — tags 属性值 ───────────────────────────────────
// property_id=2 对应 datasetProperties Aspect 的 tags 属性（is_multi=true，逗号分隔）
// 后端接入后从此表读取，前端 DatasetEntity.tags 由此派生

const MOCK_ENTITY_PROPERTY_VALUES: Array<{ entityId: number; propertyId: number; value: string }> = [
  // Dataset 1 — account_position
  { entityId: 1,  propertyId: 2, value: 'position,trading' },
  // Dataset 2 — spread_metrics
  { entityId: 2,  propertyId: 2, value: 'spread,market,metrics' },
  // Dataset 3 — ladder
  { entityId: 3,  propertyId: 2, value: 'ladder,quote,lp,market' },
  // Dataset 4 — account_balance
  { entityId: 4,  propertyId: 2, value: 'balance,account,trading' },
  // Dataset 5 — execution_ladder
  { entityId: 5,  propertyId: 2, value: 'ladder,execution,markup' },
  // Dataset 6 — client_ladder
  { entityId: 6,  propertyId: 2, value: 'ladder,client,trading' },
  // Dataset 7 — raw_ladder
  { entityId: 7,  propertyId: 2, value: 'tick,lp' },
  // Dataset 8 — execution_report
  { entityId: 8,  propertyId: 2, value: 'oms,execution' },
  // Dataset 9 — client_onboarding_2025q1
  { entityId: 9,  propertyId: 2, value: 'client,onboarding,excel,kyc' },
  // Dataset 10 — daily_pnl_report
  { entityId: 10, propertyId: 2, value: 'pnl,report,csv,batch' },
  // Dataset 11 — fx_spot_rates
  { entityId: 11, propertyId: 2, value: 'fx,spot,realtime' },
  // Dataset 12 — economic_calendar
  { entityId: 12, propertyId: 2, value: 'macro,calendar,nfp,cpi' },
  // Dataset 13 — configurator_all
  { entityId: 13, propertyId: 2, value: 'config,snapshot' },
  // Dataset 14 — trader_get_positions
  { entityId: 14, propertyId: 2, value: 'position,trading' },
  // Dataset 15 — strategy_list_trades
  { entityId: 15, propertyId: 2, value: 'strategy,trades,attribution' },
  // Dataset 16 — analytics_pnl_summary
  { entityId: 16, propertyId: 2, value: 'pnl,analytics,report' },
  // Dataset 17 — ladder_archive
  { entityId: 17, propertyId: 2, value: 'ladder,archive,parquet' },
]

// 从 rowCount 派生数据量级
function deriveScale(rowCount?: number): DatasetEntity['scale'] | undefined {
  if (rowCount == null) return undefined
  if (rowCount < 1_000)        return '<1K'
  if (rowCount < 100_000)      return '~10K'
  if (rowCount < 1_000_000)    return '~100K'
  if (rowCount < 10_000_000)   return '~1M'
  if (rowCount < 100_000_000)  return '~10M'
  return '>100M'
}

// 从属性值派生 tags（模拟后端 JOIN 查询）
function getEntityTags(entityId: number): string[] {
  const row = MOCK_ENTITY_PROPERTY_VALUES.find(
    v => v.entityId === entityId && v.propertyId === 2
  )
  return row ? row.value.split(',').filter(Boolean) : []
}

const MOCK_DATASETS: DatasetEntity[] = [
  {
    id: 1, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(timescaledb,account_position,prod)',
    name: 'account_position', displayName: 'Account Position',
    platform: 'timescaledb', env: 'prod', status: 1, isSystem: false,
    currentVersion: 3, createdBy: 'tom',
    createdAt: '2025-01-10T08:00:00Z', updatedAt: '2025-04-20T10:30:00Z',
    schema: 'public', table: 'account_position', pk: 'id',
    freshness: 'realtime', frequency: 'realtime', rowCount: 12000, sizeBytes: 52428800, retention: '永久',
    description: '账户持仓快照，记录各账户在各品种上的实时持仓量和盈亏',
    owner: 'tom', team: 'Trading', steward: 'tom',
    tags: ['position'],
    domainName: 'Trading', containerName: 'public', instanceName: 'ladder-db-prod-ld',
  },
  {
    id: 2, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(timescaledb,spread_metrics,prod)',
    name: 'spread_metrics', displayName: 'Spread Metrics',
    platform: 'timescaledb', env: 'prod', status: 1, isSystem: false,
    currentVersion: 2, createdBy: 'tom',
    createdAt: '2025-01-10T08:00:00Z', updatedAt: '2025-05-01T09:00:00Z',
    schema: 'public', table: 'spread_metrics', pk: 'id',
    freshness: 'minute', frequency: '500ms', rowCount: 5000000, sizeBytes: 2147483648, retention: '90d',
    description: '点差指标，记录各品种的 bid/ask 点差统计',
    owner: 'alice', team: 'Market', steward: 'alice',
    tags: ['spread', 'market'],
    domainName: 'Market', containerName: 'public', instanceName: 'ladder-db-prod-ld',
  },
  {
    id: 3, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(timescaledb,ladder,prod)',
    name: 'ladder', displayName: 'Ladder',
    platform: 'timescaledb', env: 'prod', status: 1, isSystem: false,
    currentVersion: 5, createdBy: 'tom',
    createdAt: '2025-01-10T08:00:00Z', updatedAt: '2025-05-10T14:00:00Z',
    schema: 'public', table: 'ladder', pk: 'id',
    freshness: 'realtime', frequency: '100ms', rowCount: 80000000, sizeBytes: 21474836480, retention: '30d',
    description: '报价阶梯，存储各 LP 的分层报价数据',
    owner: 'alice', team: 'Market', steward: 'alice',
    tags: ['ladder', 'quote', 'lp'],
    domainName: 'Market', containerName: 'public', instanceName: 'ladder-db-prod-ld',
  },
  {
    id: 4, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(timescaledb,account_balance,prod)',
    name: 'account_balance', displayName: 'Account Balance',
    platform: 'timescaledb', env: 'prod', status: 1, isSystem: false,
    currentVersion: 2, createdBy: 'tom',
    createdAt: '2025-01-15T08:00:00Z', updatedAt: '2025-04-28T11:00:00Z',
    schema: 'public', table: 'account_balance', pk: 'id',
    freshness: 'realtime', frequency: 'realtime', rowCount: 3000, sizeBytes: 10485760, retention: '永久',
    description: '账户余额快照',
    owner: 'tom', team: 'Trading', steward: 'tom',
    tags: ['balance', 'account'],
    domainName: 'Trading', containerName: 'public', instanceName: 'ladder-db-prod-ld',
  },
  {
    id: 5, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(timescaledb,execution_ladder,prod)',
    name: 'execution_ladder', displayName: 'Execution Ladder',
    platform: 'timescaledb', env: 'prod', status: 1, isSystem: false,
    currentVersion: 3, createdBy: 'tom',
    createdAt: '2025-02-01T08:00:00Z', updatedAt: '2025-05-15T16:00:00Z',
    schema: 'public', table: 'execution_ladder', pk: 'id',
    freshness: 'realtime', frequency: '100ms', rowCount: 60000000, sizeBytes: 16106127360, retention: '30d',
    description: '执行阶梯，经过 markup 处理后的最终报价',
    owner: 'alice', team: 'Market', steward: 'alice',
    tags: ['ladder', 'execution'],
    domainName: 'Market', containerName: 'public', instanceName: 'ladder-db-prod-ld',
  },
  {
    id: 6, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(timescaledb,client_ladder,prod)',
    name: 'client_ladder', displayName: 'Client Ladder',
    platform: 'timescaledb', env: 'prod', status: 1, isSystem: false,
    currentVersion: 4, createdBy: 'tom',
    createdAt: '2025-02-01T08:00:00Z', updatedAt: '2025-05-18T10:00:00Z',
    schema: 'public', table: 'client_ladder', pk: 'id',
    freshness: 'realtime', frequency: '100ms', rowCount: 40000000, sizeBytes: 10737418240, retention: '30d',
    description: '客户报价阶梯，按客户分组的最终报价',
    owner: 'tom', team: 'Trading', steward: 'tom',
    tags: ['ladder', 'client'],
    domainName: 'Trading', containerName: 'public', instanceName: 'ladder-db-prod-ld',
  },
  // ── stream: MQ ──────────────────────────────────────────────────
  {
    id: 7, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(mq,raw_ladder,prod)',
    name: 'raw_ladder', displayName: 'Raw Ladder',
    platform: 'mq', env: 'prod', status: 1, isSystem: false,
    currentVersion: 1, createdBy: 'tom',
    createdAt: '2025-01-10T08:00:00Z', updatedAt: '2025-05-20T08:00:00Z',
    topic: 'config-output-LD',
    freshness: 'realtime', frequency: '100ms', sizeBytes: 5368709120, retention: '7d',
    description: 'LP 原始报价阶梯，来自各 LP 的 bid/ask 原始报价，未经 markup 处理',
    owner: 'alice', team: 'Market', steward: 'alice',
    tags: ['raw', 'lp', 'ladder'],
    domainName: 'Market', containerName: 'internal-fix-initiator-price-output', instanceName: 'mq-prod-ld',
  },
  {
    id: 8, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(mq,execution_report,prod)',
    name: 'execution_report', displayName: 'Execution Report',
    platform: 'mq', env: 'prod', status: 1, isSystem: false,
    currentVersion: 2, createdBy: 'tom',
    createdAt: '2025-02-01T08:00:00Z', updatedAt: '2025-05-18T12:00:00Z',
    topic: 'oms-output-LD',
    freshness: 'realtime', frequency: 'realtime', sizeBytes: 536870912, retention: '90d',
    description: '订单成交回报，包含成交价格、数量、手续费等执行明细',
    owner: 'tom', team: 'Trading', steward: 'tom',
    tags: ['oms', 'execution'],
    domainName: 'Trading', containerName: 'oms-output', instanceName: 'mq-prod-ld',
  },
  // ── file: Excel / CSV ────────────────────────────────────────────────────────
  {
    id: 9, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(s3,client_onboarding_2025q1,prod)',
    name: 'client_onboarding_2025q1', displayName: 'Client Onboarding 2025 Q1',
    platform: 's3', env: 'prod', status: 1, isSystem: false,
    currentVersion: 1, createdBy: 'ops_team',
    createdAt: '2025-04-01T08:00:00Z', updatedAt: '2025-04-01T08:00:00Z',
    filePath: 's3://acme-ops/onboarding/client_onboarding_2025q1.xlsx',
    freshness: 'request', frequency: 'n/a', rowCount: 48, sizeBytes: 2097152, retention: '永久',
    description: '2025 Q1 新客户开户申请表，Excel 格式，包含 KYC 信息和账户配置',
    owner: 'ops_team', team: 'Operations', steward: 'tom',
    tags: ['client', 'onboarding', 'excel', 'kyc'],
    domainName: 'Trading', containerName: 'onboarding', instanceName: 'dev-acme-platform-backup',
  },
  {
    id: 10, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(s3,daily_pnl_report_20250521,prod)',
    name: 'daily_pnl_report_20250521', displayName: 'Daily PnL Report 2025-05-21',
    platform: 's3', env: 'prod', status: 1, isSystem: false,
    currentVersion: 1, createdBy: 'tom',
    createdAt: '2025-05-21T18:00:00Z', updatedAt: '2025-05-21T18:00:00Z',
    filePath: 's3://acme-reports/pnl/daily_pnl_20250521.csv',
    freshness: 'daily', frequency: '1d', rowCount: 320, sizeBytes: 1048576, retention: '1y',
    description: '每日盈亏汇总报告，CSV 格式，由 Airflow DAG 每日 EOD 生成',
    owner: 'tom', team: 'Trading', steward: 'tom',
    tags: ['pnl', 'report', 'csv', 'batch'],
    domainName: 'Trading', containerName: 'statement', instanceName: 'dev-acme-platform-backup',
  },
  // ── lake: 数据湖归档 ─────────────────────────────────────────────────────────
  {
    id: 17, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(s3,ladder_archive,prod)',
    name: 'ladder_archive', displayName: 'Ladder Archive',
    platform: 's3', env: 'prod', status: 1, isSystem: false,
    currentVersion: 1, createdBy: 'tom',
    createdAt: '2025-03-01T08:00:00Z', updatedAt: '2025-05-01T00:00:00Z',
    filePath: 's3://dev-acme-platform-lake/warehouse/ladder/',
    freshness: 'daily', frequency: '1d', rowCount: 500000000, sizeBytes: 107374182400, retention: '永久',
    description: 'Ladder 历史归档数据，Parquet 格式，按日期分区，由 Spark 作业每日从 TimescaleDB 导出',
    owner: 'alice', team: 'Market', steward: 'alice',
    tags: ['ladder', 'archive', 'parquet'],
    domainName: 'Market', containerName: 'warehouse/ladder', instanceName: 'dev-acme-platform-lake',
  },
  // ── api: gRPC 查询数据集 ─────────────────────────────────────────────────────
  {
    id: 13, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(grpc,configurator_all,prod)',
    name: 'configurator_all', displayName: 'Configurator / All',
    platform: 'grpc', env: 'prod', status: 1, isSystem: true,
    currentVersion: 1, createdBy: 'tom',
    createdAt: '2025-01-10T08:00:00Z', updatedAt: '2025-05-01T00:00:00Z',
    freshness: 'request', frequency: 'n/a', sizeBytes: 10485760,
    description: '查询全量配置快照，返回 symbol_config、lp_config、markup_config 等所有配置项',
    owner: 'bob', team: 'System', steward: 'bob',
    tags: ['config', 'snapshot'],
    domainName: 'System', containerName: 'Configurator', instanceName: 'DataService',
    grpcService: 'acme.config.ConfigService', grpcMethod: 'All', grpcPayload: '{}',
  },
  {
    id: 14, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(grpc,trader_get_positions,prod)',
    name: 'trader_get_positions', displayName: 'Trader / GetPositions',
    platform: 'grpc', env: 'prod', status: 1, isSystem: true,
    currentVersion: 2, createdBy: 'tom',
    createdAt: '2025-01-10T08:00:00Z', updatedAt: '2025-05-10T00:00:00Z',
    freshness: 'request', frequency: 'n/a', sizeBytes: 10485760,
    description: '查询指定账户的实时持仓，返回各品种净头寸、浮动盈亏、平均成本',
    owner: 'tom', team: 'Trading', steward: 'tom',
    tags: ['position', 'trading'],
    domainName: 'Trading', containerName: 'Trader', instanceName: 'DataService',
    grpcService: 'acme.trade.TradeService', grpcMethod: 'GetPositions', grpcPayload: '{"account_id":""}',
  },
  {
    id: 15, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(grpc,strategy_list_trades,prod)',
    name: 'strategy_list_trades', displayName: 'StrategyService / ListStrategyTrades',
    platform: 'grpc', env: 'prod', status: 1, isSystem: false,
    currentVersion: 1, createdBy: 'tom',
    createdAt: '2025-03-01T08:00:00Z', updatedAt: '2025-05-15T00:00:00Z',
    freshness: 'request', frequency: 'n/a', sizeBytes: 10485760,
    description: '查询策略历史成交记录，支持按策略 ID 和时间范围过滤，用于归因分析',
    owner: 'tom', team: 'Trading', steward: 'tom',
    tags: ['strategy', 'trades', 'attribution'],
    domainName: 'Trading', containerName: 'StrategyService', instanceName: 'DataService',
    grpcService: 'acme.strategy.StrategyService', grpcMethod: 'ListStrategyTrades', grpcPayload: '{"strategy_id":"","from":"","to":""}',
  },
  {
    id: 16, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(grpc,analytics_pnl_summary,prod)',
    name: 'analytics_pnl_summary', displayName: 'ReportService / GetPnlSummary',
    platform: 'grpc', env: 'prod', status: 1, isSystem: false,
    currentVersion: 1, createdBy: 'tom',
    createdAt: '2025-06-01T08:00:00Z', updatedAt: '2025-06-01T08:00:00Z',
    freshness: 'request', frequency: 'n/a', sizeBytes: 5242880,
    description: '查询账户或策略的 PnL 汇总，由 Analytics Service 聚合计算，支持日/周/月粒度',
    owner: 'tom', team: 'Trading', steward: 'tom',
    tags: ['pnl', 'analytics', 'report'],
    domainName: 'Trading', containerName: 'default', instanceName: 'Analytics',
    grpcService: 'acme.analytics.ReportService', grpcMethod: 'GetPnlSummary', grpcPayload: '{"account_id":"","granularity":"DAILY","from":"","to":""}',
  },
  // ── api: 外部数据源 ──────────────────────────────────────────────────────────
  {
    id: 11, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(reuters,fx_spot_rates,prod)',
    name: 'fx_spot_rates', displayName: 'FX Spot Rates',
    platform: 'reuters', env: 'prod', status: 1, isSystem: false,
    currentVersion: 3, createdBy: 'tom',
    createdAt: '2025-01-10T08:00:00Z', updatedAt: '2025-05-22T00:00:00Z',
    freshness: 'realtime', frequency: 'realtime', sizeBytes: 104857600, retention: '不缓存',
    description: 'Reuters Eikon API 提供的外汇即期汇率，覆盖主要货币对，实时推送',
    owner: 'alice', team: 'Market', steward: 'alice',
    tags: ['fx', 'spot', 'realtime'],
    domainName: 'Market', instanceName: 'reuters-eikon-prod',
  },
  {
    id: 12, typeId: 1, typeName: 'Dataset',
    urn: 'urn:xs:Dataset:(bloomberg,economic_calendar,prod)',
    name: 'economic_calendar', displayName: 'Economic Calendar',
    platform: 'bloomberg', env: 'prod', status: 1, isSystem: false,
    currentVersion: 2, createdBy: 'tom',
    createdAt: '2025-01-10T08:00:00Z', updatedAt: '2025-05-21T06:00:00Z',
    freshness: 'daily', frequency: '1d', rowCount: 2400, sizeBytes: 524288, retention: '永久',
    description: 'Bloomberg 经济日历，包含 NFP、CPI、利率决议等重要宏观事件的预期值和实际值',
    owner: 'alice', team: 'Market', steward: 'alice',
    tags: ['macro', 'calendar', 'nfp', 'cpi'],
    domainName: 'Market', instanceName: 'bloomberg-api-prod',
  },
]

const MOCK_DOMAINS: OntEntity[] = [
  { id: 10, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,Trading,prod)',  name: 'Trading', displayName: '交易域', platform: 'internal', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '交易相关数据，包含账户、持仓、成交、客户报价等', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 11, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,Market,prod)',   name: 'Market',  displayName: '行情域', platform: 'internal', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '行情相关数据，包含报价阶梯、点差指标、LP 原始报价等', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 12, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,Risk,prod)',     name: 'Risk',    displayName: '风控域', platform: 'internal', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '风控相关数据，包含持仓暴露、保证金、风险指标等', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 13, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,System,prod)',   name: 'System',  displayName: '系统域', platform: 'internal', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '系统基础数据，包含配置、审计日志、元数据等', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // Trading 子域
  { id: 14, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,Spot,prod)',     name: 'Spot',    displayName: '即期交易', platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: '即期外汇交易，T+2 交割', createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
  { id: 15, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,Forward,prod)',  name: 'Forward', displayName: '远期交易', platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: '远期外汇合约，锁定未来汇率', createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
  // Market 子域
  { id: 16, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,FX,prod)',       name: 'FX',      displayName: '外汇行情', platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: '外汇货币对行情数据', createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
  { id: 17, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,Metals,prod)',   name: 'Metals',  displayName: '贵金属行情', platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: '黄金、白银等贵金属行情数据', createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
  // Risk 子域
  { id: 18, typeId: 2, typeName: 'Domain', urn: 'urn:xs:Domain:(internal,Exposure,prod)', name: 'Exposure',displayName: '敞口管理', platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: '净敞口、方向性风险暴露', createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
]

// Domain 父子关联（BELONGS_TO link）
// sourceId → targetId 表示 source 属于 target
const DOMAIN_LINKS: Array<{ sourceId: number; targetId: number }> = [
  { sourceId: 14, targetId: 10 }, // Spot → Trading
  { sourceId: 15, targetId: 10 }, // Forward → Trading
  { sourceId: 16, targetId: 11 }, // FX → Market
  { sourceId: 17, targetId: 11 }, // Metals → Market
  { sourceId: 18, targetId: 12 }, // Exposure → Risk
]

// ── Instance 实例数据 ─────────────────────────────────────────────────────────
// ── Strategy 实体数据 ─────────────────────────────────────────────────────────
// ── MarketEvent 实体数据 ──────────────────────────────────────────────────────
interface MarketEventEntity extends OntEntity {
  eventType: string
  title: string
  occurredAt: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  symbols: string[]
  source: string
  impactDirection?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  affectedSymbols?: string[]
  confidence?: number
  summary?: string
}

const MOCK_EVENTS: MarketEventEntity[] = [
  {
    id: 100, typeId: 5, typeName: 'MarketEvent',
    urn: 'urn:xs:MarketEvent:(internal,fed-rate-2025-05,prod)',
    name: 'fed-rate-2025-05', displayName: 'Fed 利率决议 2025-05',
    platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 2,
    createdAt: '2025-05-07T18:00:00Z', updatedAt: '2025-05-07T20:30:00Z',
    eventType: 'RATE_DECISION', title: 'Fed 维持利率不变，措辞偏鹰派',
    occurredAt: '2025-05-07T18:00:00Z', severity: 'HIGH',
    symbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
    source: 'bloomberg',
    impactDirection: 'BEARISH', affectedSymbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
    confidence: 0.87,
    summary: 'Fed 维持联邦基金利率目标区间 5.25%-5.50% 不变，声明措辞偏鹰派，暗示年内降息次数可能少于市场预期。EUR/USD 短线下跌 80 pips，黄金承压。',
  },
  {
    id: 101, typeId: 5, typeName: 'MarketEvent',
    urn: 'urn:xs:MarketEvent:(internal,nfp-2025-05,prod)',
    name: 'nfp-2025-05', displayName: '非农就业 2025-05',
    platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1,
    createdAt: '2025-05-02T12:30:00Z', updatedAt: '2025-05-02T13:00:00Z',
    eventType: 'NFP', title: '4月非农新增就业 17.5万，低于预期',
    occurredAt: '2025-05-02T12:30:00Z', severity: 'HIGH',
    symbols: ['EURUSD', 'USDJPY', 'XAUUSD'],
    source: 'reuters',
    impactDirection: 'BULLISH', affectedSymbols: ['EURUSD', 'XAUUSD'],
    confidence: 0.79,
    summary: '4月非农新增就业 17.5万，低于预期 24万，失业率升至 3.9%。美元走弱，EUR/USD 上涨 60 pips，黄金受益于避险情绪上涨。',
  },
  {
    id: 102, typeId: 5, typeName: 'MarketEvent',
    urn: 'urn:xs:MarketEvent:(internal,cpi-2025-04,prod)',
    name: 'cpi-2025-04', displayName: 'CPI 通胀数据 2025-04',
    platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1,
    createdAt: '2025-04-10T12:30:00Z', updatedAt: '2025-04-10T13:15:00Z',
    eventType: 'CPI', title: '3月CPI同比 3.5%，高于预期 3.4%',
    occurredAt: '2025-04-10T12:30:00Z', severity: 'MEDIUM',
    symbols: ['EURUSD', 'GBPUSD'],
    source: 'bloomberg',
    impactDirection: 'BEARISH', affectedSymbols: ['EURUSD', 'GBPUSD'],
    confidence: 0.72,
    summary: '3月CPI同比 3.5%，略高于预期，核心CPI环比 0.4%。市场降息预期进一步推迟，美元短线走强，EUR/USD 下跌 45 pips。',
  },
  {
    id: 103, typeId: 5, typeName: 'MarketEvent',
    urn: 'urn:xs:MarketEvent:(internal,geopolitical-2025-04,prod)',
    name: 'geopolitical-2025-04', displayName: '中东地缘冲突升级',
    platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1,
    createdAt: '2025-04-14T06:00:00Z', updatedAt: '2025-04-14T08:00:00Z',
    eventType: 'GEOPOLITICAL', title: '中东局势升级，油价跳涨',
    occurredAt: '2025-04-14T06:00:00Z', severity: 'HIGH',
    symbols: ['XAUUSD', 'USDCAD'],
    source: 'reuters',
    impactDirection: 'BULLISH', affectedSymbols: ['XAUUSD'],
    confidence: 0.65,
    summary: '中东地区局势升级，市场避险情绪升温，黄金跳涨 35 美元，原油上涨 3%，避险货币日元走强。',
  },
  {
    id: 104, typeId: 5, typeName: 'MarketEvent',
    urn: 'urn:xs:MarketEvent:(internal,boe-rate-2025-05,prod)',
    name: 'boe-rate-2025-05', displayName: 'BoE 利率决议 2025-05',
    platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1,
    createdAt: '2025-05-09T11:00:00Z', updatedAt: '2025-05-09T12:00:00Z',
    eventType: 'RATE_DECISION', title: 'BoE 降息 25bp 至 5.0%',
    occurredAt: '2025-05-09T11:00:00Z', severity: 'MEDIUM',
    symbols: ['GBPUSD', 'EURGBP'],
    source: 'bloomberg',
    impactDirection: 'BEARISH', affectedSymbols: ['GBPUSD', 'EURGBP'],
    confidence: 0.83,
    summary: '英国央行如期降息 25bp，为近四年来首次降息。GBP/USD 下跌 90 pips，EUR/GBP 上涨。',
  },
]

const MOCK_STRATEGIES: OntEntity[] = [
  { id: 80, typeId: 10, typeName: 'Strategy', urn: 'urn:xs:Strategy:(TrendFollowing,eurusd-trend-ld,prod)',   name: 'eurusd-trend-ld',    displayName: 'EURUSD 趋势 (LD)',  platform: 'TrendFollowing', env: 'prod', isSystem: false, status: 1, currentVersion: 3, description: '基于 MA 均线交叉信号，EURUSD 伦敦时段趋势跟踪策略', createdAt: '2025-03-01T00:00:00Z', updatedAt: '2025-05-10T00:00:00Z' },
  { id: 81, typeId: 10, typeName: 'Strategy', urn: 'urn:xs:Strategy:(TrendFollowing,xauusd-trend-sg,prod)',   name: 'xauusd-trend-sg',    displayName: 'XAUUSD 趋势 (SG)', platform: 'TrendFollowing', env: 'prod', isSystem: false, status: 1, currentVersion: 2, description: '黄金 MACD 动量策略，新加坡时段运行',                  createdAt: '2025-03-15T00:00:00Z', updatedAt: '2025-05-01T00:00:00Z' },
  { id: 82, typeId: 10, typeName: 'Strategy', urn: 'urn:xs:Strategy:(MeanReversion,eurusd-grid-ld,prod)',     name: 'eurusd-grid-ld',     displayName: 'EURUSD 网格 (LD)', platform: 'MeanReversion',  env: 'prod', isSystem: false, status: 1, currentVersion: 5, description: 'EURUSD 布林带网格策略，震荡行情下均值回归',           createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-05-20T00:00:00Z' },
  { id: 83, typeId: 10, typeName: 'Strategy', urn: 'urn:xs:Strategy:(MeanReversion,gbpusd-rsi-ld,prod)',      name: 'gbpusd-rsi-ld',      displayName: 'GBPUSD RSI (LD)',  platform: 'MeanReversion',  env: 'prod', isSystem: false, status: 0, currentVersion: 1, description: 'GBPUSD RSI 超买超卖策略，已暂停',                     createdAt: '2025-01-10T00:00:00Z', updatedAt: '2025-04-01T00:00:00Z' },
  { id: 84, typeId: 10, typeName: 'Strategy', urn: 'urn:xs:Strategy:(Arbitrage,eurusd-gbpusd-arb,prod)',      name: 'eurusd-gbpusd-arb',  displayName: 'EUR/GBP 套利',     platform: 'Arbitrage',      env: 'prod', isSystem: false, status: 1, currentVersion: 4, description: 'EURUSD / GBPUSD 跨品种价差套利，价差偏离 2σ 时建仓', createdAt: '2025-02-20T00:00:00Z', updatedAt: '2025-05-18T00:00:00Z' },
  { id: 85, typeId: 10, typeName: 'Strategy', urn: 'urn:xs:Strategy:(MarketMaking,eurusd-mm-ld,prod)',        name: 'eurusd-mm-ld',       displayName: 'EURUSD 做市 (LD)', platform: 'MarketMaking',   env: 'prod', isSystem: false, status: 1, currentVersion: 7, description: 'EURUSD 双边报价做市策略，伦敦时段，3 档报价',         createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-05-22T00:00:00Z' },
  { id: 86, typeId: 10, typeName: 'Strategy', urn: 'urn:xs:Strategy:(EventDriven,nfp-event-ld,prod)',         name: 'nfp-event-ld',       displayName: 'NFP 事件驱动',     platform: 'EventDriven',    env: 'prod', isSystem: false, status: 1, currentVersion: 2, description: '非农数据发布时触发，基于 LLM 影响分析方向建仓',       createdAt: '2025-04-01T00:00:00Z', updatedAt: '2025-05-15T00:00:00Z' },
  { id: 87, typeId: 10, typeName: 'Strategy', urn: 'urn:xs:Strategy:(Execution,eurusd-twap-ld,prod)',         name: 'eurusd-twap-ld',     displayName: 'EURUSD TWAP',      platform: 'Execution',      env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: 'EURUSD 大单 TWAP 执行算法，30 分钟内均匀拆单',       createdAt: '2025-05-01T00:00:00Z', updatedAt: '2025-05-01T00:00:00Z' },
]

// ── Action 实体数据 ───────────────────────────────────────────────────────────
const MOCK_ACTIONS: OntEntity[] = [
  // gRPC 操作
  { id: 70, typeId: 4, typeName: 'Action', urn: 'urn:xs:Action:(action_grpc,place_order,prod)',          name: 'place_order',          displayName: '下单',          platform: 'action_grpc',    env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '向 OMS 提交新订单，支持 MARKET / LIMIT / STOP 类型', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 71, typeId: 4, typeName: 'Action', urn: 'urn:xs:Action:(action_grpc,cancel_order,prod)',         name: 'cancel_order',         displayName: '撤单',          platform: 'action_grpc',    env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '取消未成交订单，需提供订单 ID',                       createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 72, typeId: 4, typeName: 'Action', urn: 'urn:xs:Action:(action_grpc,adjust_risk_param,prod)',    name: 'adjust_risk_param',    displayName: '调整风控参数',  platform: 'action_grpc',    env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '动态修改策略或账户的风控参数，如止损点数、最大持仓',   createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 73, typeId: 4, typeName: 'Action', urn: 'urn:xs:Action:(action_grpc,update_symbol_config,prod)', name: 'update_symbol_config', displayName: '修改品种配置',  platform: 'action_grpc',    env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '更新品种的 spread、markup、LP 配置等参数',             createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // Airflow 操作
  { id: 74, typeId: 4, typeName: 'Action', urn: 'urn:xs:Action:(action_airflow,generate_impact_report,prod)', name: 'generate_impact_report', displayName: '生成影响分析报告', platform: 'action_airflow', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '触发 Airflow DAG 生成市场事件影响分析报告，输出 PDF/HTML', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 75, typeId: 4, typeName: 'Action', urn: 'urn:xs:Action:(action_airflow,generate_pnl_report,prod)',    name: 'generate_pnl_report',    displayName: '生成 PnL 报告',    platform: 'action_airflow', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '触发 Airflow DAG 生成每日 PnL 报告，发送至指定邮箱',   createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // Alert 操作
  { id: 76, typeId: 4, typeName: 'Action', urn: 'urn:xs:Action:(action_alert,send_risk_alert,prod)',  name: 'send_risk_alert',  displayName: '发送风控预警', platform: 'action_alert', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '策略触发风控阈值时推送预警，支持 Slack / Email / SMS', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 77, typeId: 4, typeName: 'Action', urn: 'urn:xs:Action:(action_alert,send_event_alert,prod)', name: 'send_event_alert', displayName: '发送事件预警', platform: 'action_alert', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '市场事件发生时推送预警通知，关联 MarketEvent 实体',    createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
]

const MOCK_INSTANCES: OntEntity[] = [
  // PostgreSQL 实例
  { id: 30, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(postgresql,platform-rds-prod,prod)', name: 'platform-rds-prod', displayName: 'Platform RDS', platform: 'postgresql', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'PostgreSQL RDS，存储 meta/config schema 业务配置数据，eu-west-2', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // TimescaleDB 实例
  { id: 31, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(timescaledb,ladder-db-prod-ld,prod)', name: 'ladder-db-prod-ld', displayName: 'Ladder DB (LD)', platform: 'timescaledb', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'TimescaleDB 伦敦实例，存储 ladder/position/spread_metrics 时序数据，eu-west-2', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 32, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(timescaledb,ladder-db-prod-sg,prod)', name: 'ladder-db-prod-sg', displayName: 'Ladder DB (SG)', platform: 'timescaledb', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'TimescaleDB 新加坡实例，ap-southeast-1', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // Redis 实例
  { id: 33, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(redis,redis-prod-ld,prod)', name: 'redis-prod-ld', displayName: 'Redis (LD)', platform: 'redis', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'Redis 伦敦实例，缓存 EodPriceCache 和实时状态', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // MQ 实例
  { id: 34, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(mq,mq-prod-ld,prod)', name: 'mq-prod-ld', displayName: 'MQ (LD)', platform: 'mq', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'MQ 伦敦实例，instance_key=LD，eu-west-2', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 35, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(mq,mq-prod-sg,prod)', name: 'mq-prod-sg', displayName: 'MQ (SG)', platform: 'mq', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'MQ 新加坡实例，instance_key=SG，ap-southeast-1', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // S3
  { id: 36, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(s3,dev-acme-platform-backup,prod)', name: 'dev-acme-platform-backup', displayName: 'dev-acme-platform-backup', platform: 's3', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '数据备份桶，存储数据库备份、报告文件、客户文件等', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 55, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(s3,dev-acme-platform-lake,prod)',   name: 'dev-acme-platform-lake',   displayName: 'dev-acme-platform-lake',   platform: 's3', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: '数据湖桶，存储 warehouse/rawdata 等结构化归档数据', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // gRPC 服务实例
  { id: 37, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(grpc,acme-dataservice,prod)',             name: 'acme-dataservice',   displayName: 'DataService', platform: 'grpc',  env: 'prod', isSystem: true, status: 1, currentVersion: 3, description: '核心 gRPC DataService，提供 Configurator / Trader / StrategyService 三大服务，eu-west-2', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-04-01T00:00:00Z' },
  { id: 38, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(grpc,acme-analytics,prod)',               name: 'acme-analytics',     displayName: 'Analytics',   platform: 'grpc',  env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: '分析项目 gRPC 服务，提供 ReportService / AttributionService 接口，支持 PnL 报告生成和策略归因分析，eu-west-2', createdAt: '2025-06-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  // 外部 API
  { id: 39, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(reuters,reuters-eikon-prod,prod)',            name: 'reuters-eikon-prod',    displayName: 'Reuters Eikon', platform: 'reuters',    env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: 'Reuters Eikon API，提供外汇即期汇率和新闻事件实时数据', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 40, typeId: 11, typeName: 'Instance', urn: 'urn:xs:Instance:(bloomberg,bloomberg-api-prod,prod)',          name: 'bloomberg-api-prod',    displayName: 'Bloomberg API', platform: 'bloomberg',  env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: 'Bloomberg API，提供宏观经济日历和市场数据', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
]

// ── Container 物理分组数据 ────────────────────────────────────────────────────
const MOCK_CONTAINERS: OntEntity[] = [
  // platform-rds-prod 下的 schema
  { id: 40, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,meta,prod)',    name: 'meta',    displayName: 'meta',    platform: 'internal', env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '本体元数据 schema，存储 ont_type/ont_entity 等', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 41, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,config,prod)',  name: 'config',  displayName: 'config',  platform: 'internal', env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '业务配置 schema，存储 symbol_config 等', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // ladder-db-prod-ld 下的 schema
  { id: 42, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,public-ld,prod)', name: 'public', displayName: 'public', platform: 'internal', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'LD TimescaleDB public schema，存储 ladder/position/spread_metrics', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // ladder-db-prod-sg 下的 schema
  { id: 43, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,public-sg,prod)', name: 'public', displayName: 'public', platform: 'internal', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'SG TimescaleDB public schema', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // mq-prod-ld 下的服务 Container
  { id: 44, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,internal-fix-initiator-price-output,prod)',              name: 'internal-fix-initiator-price-output', displayName: 'internal-fix-initiator-price-output',              platform: 'internal', env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: 'LP 行情服务，队列路径 internal-fix-initiator-price-output', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 45, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,oms-output,prod)',             name: 'oms-output',                    displayName: 'oms-output',             platform: 'internal', env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: 'OMS 服务，队列路径 oms-output', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 52, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,markup-output,prod)',          name: 'markup-output',                  displayName: 'markup-output',          platform: 'internal', env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: 'Markup 服务，队列路径 markup-output', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 53, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,smart-order-router-output,prod)', name: 'smart-order-router-output', displayName: 'smart-order-router-output', platform: 'internal', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'Smart Order Router，队列路径 smart-order-router-output', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 54, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,position-manager-v2-output,prod)', name: 'position-manager-v2-output',  displayName: 'position-manager-v2-output', platform: 'internal', env: 'prod', isSystem: true, status: 1, currentVersion: 1, description: 'Position Manager 服务，队列路径 position-manager-v2-output', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // S3 bucket 下的路径前缀
  { id: 46, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,statement,prod)',       name: 'statement',       displayName: 'statement/',       platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: 'backup 桶 statement/ 路径，存储对账单和 PnL 报告', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 47, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,onboarding,prod)',      name: 'onboarding',      displayName: 'onboarding/',      platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: 'backup 桶 onboarding/ 路径，存储客户开户文件', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // lake 桶路径 Container
  { id: 56, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(internal,warehouse/ladder,prod)', name: 'warehouse/ladder', displayName: 'warehouse/ladder', platform: 'internal', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: 'lake 桶 warehouse/ladder 路径，存储 ladder 历史归档数据（Parquet）', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // gRPC Container — DataService (id=37)
  { id: 48, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(grpc,Configurator,prod)',    name: 'Configurator',    displayName: 'Configurator',    platform: 'grpc', env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '配置快照查询，port 50053', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 49, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(grpc,Trader,prod)',          name: 'Trader',          displayName: 'Trader',          platform: 'grpc', env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '持仓/订单查询，port 50053', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 50, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(grpc,StrategyService,prod)', name: 'StrategyService', displayName: 'StrategyService', platform: 'grpc', env: 'prod', isSystem: true,  status: 1, currentVersion: 1, description: '策略成交查询，port 50054', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  // gRPC Container — Analytics (id=38)
  { id: 51, typeId: 3, typeName: 'Container', urn: 'urn:xs:Container:(grpc,default-analytics,prod)',   name: 'default',         displayName: 'default',   platform: 'grpc', env: 'prod', isSystem: false, status: 1, currentVersion: 1, description: 'PnL 汇总查询，port 50056', createdAt: '2025-06-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
]

// Instance → Container 关联（Container BELONGS_TO Instance）
const CONTAINER_LINKS: Array<{ sourceId: number; targetId: number }> = [
  { sourceId: 40, targetId: 30 }, // meta → platform-rds-prod
  { sourceId: 41, targetId: 30 }, // config → platform-rds-prod
  { sourceId: 42, targetId: 31 }, // public → ladder-db-prod-ld
  { sourceId: 43, targetId: 32 }, // public → ladder-db-prod-sg
  { sourceId: 44, targetId: 34 }, // internal-fix-initiator → mq-prod-ld
  { sourceId: 45, targetId: 34 }, // oms → mq-prod-ld
  { sourceId: 52, targetId: 34 }, // markup → mq-prod-ld
  { sourceId: 53, targetId: 34 }, // smart-order-router → mq-prod-ld
  { sourceId: 54, targetId: 34 }, // position-manager → mq-prod-ld
  { sourceId: 46, targetId: 36 }, // statement → dev-acme-platform-backup
  { sourceId: 47, targetId: 36 }, // onboarding → dev-acme-platform-backup
  { sourceId: 56, targetId: 55 }, // warehouse/ladder → dev-acme-platform-lake
  { sourceId: 48, targetId: 37 }, // Configurator → DataService
  { sourceId: 49, targetId: 37 }, // Trader → DataService
  { sourceId: 50, targetId: 37 }, // StrategyService → DataService
  { sourceId: 51, targetId: 38 }, // default → Analytics
]

// 构建树形结构的通用函数
function buildTree<T extends OntEntity & { children?: T[]; datasetCount?: number }>(
  entities: OntEntity[],
  links: Array<{ sourceId: number; targetId: number }>,
  datasets: DatasetEntity[],
): T[] {
  const map = new Map<number, T>()
  entities.forEach(e => map.set(e.id, { ...e, children: [], datasetCount: 0 } as T))

  // 统计每个实体下的 dataset 数量（仅顶层，不含子节点）
  datasets.forEach(d => {
    const name = d.containerName ?? d.domainName
    if (!name) return
    map.forEach(node => {
      if (node.name === name) node.datasetCount = (node.datasetCount ?? 0) + 1
    })
  })

  const childIds = new Set(links.map(l => l.sourceId))
  links.forEach(({ sourceId, targetId }) => {
    const parent = map.get(targetId)
    const child  = map.get(sourceId)
    if (parent && child) parent.children!.push(child)
  })

  // 只返回根节点（没有作为 child 出现的节点）
  return Array.from(map.values()).filter(n => !childIds.has(n.id))
}

// 完整 FX 数据流（扩展版 10 节点）：
//   上游3跳: raw_ladder
//   上游2跳: lp_raw_quote
//   上游1跳: ladder + symbol_config（旁路配置）
//   焦点:    execution_ladder
//   下游1跳: client_ladder + spread_metrics
//   下游2跳: execution_report
//   下游3跳: account_position + account_balance
//   下游4跳: daily_pnl_report
// ── 实体关联数据 ──────────────────────────────────────────────────────────────
// ── 实体自定义属性数据 ────────────────────────────────────────────────────────
const MOCK_ENTITY_EXTRA: OntEntityExtra[] = [
  // Dataset: ladder (id=2)
  { id: 1,  entityId: 2,  key: 'sla',          value: '99.9%',           createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 2,  entityId: 2,  key: 'retention',     value: '90 days',         createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-03-01T00:00:00Z' },
  { id: 3,  entityId: 2,  key: 'alert_channel', value: '#risk-alerts',    createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
  // Dataset: symbol_config (id=1)
  { id: 4,  entityId: 1,  key: 'owner_team',    value: 'config-team',     createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 5,  entityId: 1,  key: 'review_cycle',  value: 'weekly',          createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-04-01T00:00:00Z' },
  // Strategy: eurusd-trend-ld (id=80)
  { id: 6,  entityId: 80, key: 'live_since',    value: '2025-03-01',      createdAt: '2025-03-01T00:00:00Z', updatedAt: '2025-03-01T00:00:00Z' },
  { id: 7,  entityId: 80, key: 'pnl_ytd',       value: '+12,450 USD',     createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-05-20T00:00:00Z' },
  { id: 8,  entityId: 80, key: 'risk_rating',   value: 'MEDIUM',          createdAt: '2025-03-01T00:00:00Z', updatedAt: '2025-05-01T00:00:00Z' },
  // MarketEvent: fed-rate-2025-05 (id=100)
  { id: 9,  entityId: 100, key: 'analyst',      value: 'john.smith',      createdAt: '2025-05-07T20:00:00Z', updatedAt: '2025-05-07T20:00:00Z' },
  { id: 10, entityId: 100, key: 'reviewed',     value: 'true',            createdAt: '2025-05-07T21:00:00Z', updatedAt: '2025-05-07T21:00:00Z' },
]

let extraIdSeq = MOCK_ENTITY_EXTRA.length + 1

const MOCK_ENTITY_LINKS: OntEntityLink[] = [
  // 物理归属
  { id: 1,  linkTypeId: 1,  linkTypeName: 'DATASET_IN_CONTAINER',       linkTypeDisplayName: '数据集属于容器',   sourceId: 1,  sourceUrn: 'urn:xs:Dataset:(postgresql,symbol_config,prod)',       sourceName: 'symbol_config',       targetId: 40, targetUrn: 'urn:xs:Container:(internal,config,prod)',              targetName: 'config' },
  { id: 2,  linkTypeId: 1,  linkTypeName: 'DATASET_IN_CONTAINER',       linkTypeDisplayName: '数据集属于容器',   sourceId: 2,  sourceUrn: 'urn:xs:Dataset:(timescaledb,ladder,prod)',             sourceName: 'ladder',              targetId: 42, targetUrn: 'urn:xs:Container:(internal,public-ld,prod)',           targetName: 'public' },
  { id: 3,  linkTypeId: 3,  linkTypeName: 'DATASET_IN_DOMAIN',          linkTypeDisplayName: '数据集属于域',     sourceId: 1,  sourceUrn: 'urn:xs:Dataset:(postgresql,symbol_config,prod)',       sourceName: 'symbol_config',       targetId: 1,  targetUrn: 'urn:xs:Domain:(internal,Trading,prod)',               targetName: 'Trading' },
  { id: 4,  linkTypeId: 3,  linkTypeName: 'DATASET_IN_DOMAIN',          linkTypeDisplayName: '数据集属于域',     sourceId: 2,  sourceUrn: 'urn:xs:Dataset:(timescaledb,ladder,prod)',             sourceName: 'ladder',              targetId: 2,  targetUrn: 'urn:xs:Domain:(internal,Market,prod)',                targetName: 'Market' },
  // 数据血缘
  { id: 5,  linkTypeId: 16, linkTypeName: 'DATASET_DERIVED_FROM',       linkTypeDisplayName: '数据集派生自',     sourceId: 2,  sourceUrn: 'urn:xs:Dataset:(timescaledb,ladder,prod)',             sourceName: 'ladder',              targetId: 3,  targetUrn: 'urn:xs:Dataset:(mq,config-output-LD,prod)',     targetName: 'config-output-LD' },
  // 客户关系
  { id: 6,  linkTypeId: 17, linkTypeName: 'CLIENT_RUNS_STRATEGY',       linkTypeDisplayName: '客户运行策略',     sourceId: 1,  sourceUrn: 'urn:xs:Client:(internal,client-001,prod)',             sourceName: 'client-001',          targetId: 80, targetUrn: 'urn:xs:Strategy:(TrendFollowing,eurusd-trend-ld,prod)', targetName: 'eurusd-trend-ld' },
  { id: 7,  linkTypeId: 17, linkTypeName: 'CLIENT_RUNS_STRATEGY',       linkTypeDisplayName: '客户运行策略',     sourceId: 1,  sourceUrn: 'urn:xs:Client:(internal,client-001,prod)',             sourceName: 'client-001',          targetId: 85, targetUrn: 'urn:xs:Strategy:(MarketMaking,eurusd-mm-ld,prod)',     targetName: 'eurusd-mm-ld' },
  // 策略关系
  { id: 8,  linkTypeId: 7,  linkTypeName: 'STRATEGY_RUNS_ON_DATASET',   linkTypeDisplayName: '策略运行于数据集', sourceId: 80, sourceUrn: 'urn:xs:Strategy:(TrendFollowing,eurusd-trend-ld,prod)', sourceName: 'eurusd-trend-ld',     targetId: 4,  targetUrn: 'urn:xs:Dataset:(timescaledb,account_position,prod)',  targetName: 'account_position' },
  { id: 9,  linkTypeId: 12, linkTypeName: 'STRATEGY_READS_DATASET',     linkTypeDisplayName: '策略订阅数据集',   sourceId: 80, sourceUrn: 'urn:xs:Strategy:(TrendFollowing,eurusd-trend-ld,prod)', sourceName: 'eurusd-trend-ld',     targetId: 2,  targetUrn: 'urn:xs:Dataset:(timescaledb,ladder,prod)',            targetName: 'ladder' },
  { id: 10, linkTypeId: 13, linkTypeName: 'STRATEGY_WRITES_DATASET',    linkTypeDisplayName: '策略写入数据集',   sourceId: 80, sourceUrn: 'urn:xs:Strategy:(TrendFollowing,eurusd-trend-ld,prod)', sourceName: 'eurusd-trend-ld',     targetId: 5,  targetUrn: 'urn:xs:Dataset:(timescaledb,execution_report,prod)',  targetName: 'execution_report' },
  { id: 11, linkTypeId: 15, linkTypeName: 'STRATEGY_HEDGES_STRATEGY',   linkTypeDisplayName: '策略互为对冲',     sourceId: 84, sourceUrn: 'urn:xs:Strategy:(Arbitrage,eurusd-gbpusd-arb,prod)',   sourceName: 'eurusd-gbpusd-arb',   targetId: 80, targetUrn: 'urn:xs:Strategy:(TrendFollowing,eurusd-trend-ld,prod)', targetName: 'eurusd-trend-ld', qualifier: 'LEG_A' },
  // 事件关系
  { id: 12, linkTypeId: 8,  linkTypeName: 'EVENT_AFFECTS_DATASET',      linkTypeDisplayName: '事件影响数据集',   sourceId: 1,  sourceUrn: 'urn:xs:MarketEvent:(internal,fed-rate-2025-05,prod)',   sourceName: 'fed-rate-2025-05',    targetId: 2,  targetUrn: 'urn:xs:Dataset:(timescaledb,ladder,prod)',            targetName: 'ladder',              qualifier: 'BEARISH' },
  { id: 13, linkTypeId: 14, linkTypeName: 'STRATEGY_TRIGGERED_BY_EVENT',linkTypeDisplayName: '事件触发策略',     sourceId: 1,  sourceUrn: 'urn:xs:MarketEvent:(internal,fed-rate-2025-05,prod)',   sourceName: 'fed-rate-2025-05',    targetId: 86, targetUrn: 'urn:xs:Strategy:(EventDriven,nfp-event-ld,prod)',     targetName: 'nfp-event-ld',        qualifier: 'CONFIRMED' },
  { id: 14, linkTypeId: 9,  linkTypeName: 'EVENT_TRIGGERS_ACTION',      linkTypeDisplayName: '事件触发操作',     sourceId: 1,  sourceUrn: 'urn:xs:MarketEvent:(internal,fed-rate-2025-05,prod)',   sourceName: 'fed-rate-2025-05',    targetId: 74, targetUrn: 'urn:xs:Action:(action_airflow,generate_impact_report,prod)', targetName: 'generate_impact_report' },
]

const MOCK_LINEAGE: LineageGraph = {
  nodes: [
    // ── 上游 3 跳：原始 tick ────────────────────────────────────────────────
    {
      id: 'n_tick',
      urn: 'urn:xs:Dataset:(postgresql,lp_tick_raw,prod)',
      name: 'raw_ladder', displayName: 'Raw Ladder',
      typeName: 'Dataset', platform: 'postgresql', env: 'prod',
      fields: [
        { name: 'id',      dataType: 'bigint',       isPk: true },
        { name: 'lp_id',   dataType: 'varchar(20)'              },
        { name: 'symbol',  dataType: 'varchar(20)'              },
        { name: 'bid',     dataType: 'decimal(18,8)'            },
        { name: 'ask',     dataType: 'decimal(18,8)'            },
        { name: 'tick_at', dataType: 'timestamptz'              },
      ],
    },
    // ── 上游 2 跳：LP 原始报价 ──────────────────────────────────────────────
    {
      id: 'n0',
      urn: 'urn:xs:Dataset:(postgresql,lp_raw_quote,prod)',
      name: 'lp_raw_quote', displayName: 'LP Raw Quote',
      typeName: 'Dataset', platform: 'postgresql', env: 'prod',
      fields: [
        { name: 'id',        dataType: 'bigint',       isPk: true },
        { name: 'lp_id',     dataType: 'varchar(20)'              },
        { name: 'symbol',    dataType: 'varchar(20)'              },
        { name: 'bid',       dataType: 'decimal(18,6)'            },
        { name: 'ask',       dataType: 'decimal(18,6)'            },
        { name: 'volume',    dataType: 'decimal(18,2)'            },
        { name: 'quoted_at', dataType: 'timestamptz'              },
      ],
    },
    // ── 上游 1 跳：品种配置（旁路输入） ────────────────────────────────────
    {
      id: 'n_cfg',
      urn: 'urn:xs:Dataset:(postgresql,symbol_config,prod)',
      name: 'symbol_config', displayName: 'Symbol Config',
      typeName: 'Dataset', platform: 'postgresql', env: 'prod',
      fields: [
        { name: 'symbol',      dataType: 'varchar(20)',  isPk: true },
        { name: 'markup_pips', dataType: 'decimal(10,4)'            },
        { name: 'min_spread',  dataType: 'decimal(10,4)'            },
        { name: 'max_volume',  dataType: 'decimal(18,2)'            },
        { name: 'is_active',   dataType: 'boolean'                  },
        { name: 'updated_at',  dataType: 'timestamptz'              },
      ],
    },
    // ── 上游 1 跳：聚合阶梯 ─────────────────────────────────────────────────
    {
      id: 'n1',
      urn: 'urn:xs:Dataset:(timescaledb,ladder,prod)',
      name: 'ladder', displayName: 'Ladder',
      typeName: 'Dataset', platform: 'timescaledb', env: 'prod',
      fields: [
        { name: 'id',         dataType: 'bigint',      isPk: true  },
        { name: 'symbol',     dataType: 'varchar(20)',              },
        { name: 'bid',        dataType: 'decimal(18,6)',            },
        { name: 'ask',        dataType: 'decimal(18,6)',            },
        { name: 'volume',     dataType: 'decimal(18,2)',            },
        { name: 'lp_id',      dataType: 'varchar(20)',              },
        { name: 'created_at', dataType: 'timestamptz',              },
      ],
    },
    // ── 焦点节点：execution_ladder ──────────────────────────────────────────
    {
      id: 'n2',
      urn: 'urn:xs:Dataset:(timescaledb,execution_ladder,prod)',
      name: 'execution_ladder', displayName: 'Execution Ladder',
      typeName: 'Dataset', platform: 'timescaledb', env: 'prod', isFocus: true,
      fields: [
        { name: 'id',         dataType: 'bigint',      isPk: true  },
        { name: 'symbol',     dataType: 'varchar(20)',              },
        { name: 'bid',        dataType: 'decimal(18,6)',            },
        { name: 'ask',        dataType: 'decimal(18,6)',            },
        { name: 'spread',     dataType: 'decimal(18,6)',            },
        { name: 'markup',     dataType: 'decimal(18,6)',            },
        { name: 'created_at', dataType: 'timestamptz',              },
      ],
    },
    // ── 下游 1 跳：客户报价 + 点差统计 ─────────────────────────────────────
    {
      id: 'n3',
      urn: 'urn:xs:Dataset:(timescaledb,client_ladder,prod)',
      name: 'client_ladder', displayName: 'Client Ladder',
      typeName: 'Dataset', platform: 'timescaledb', env: 'prod',
      fields: [
        { name: 'id',         dataType: 'bigint',      isPk: true  },
        { name: 'client_id',  dataType: 'varchar(50)',              },
        { name: 'symbol',     dataType: 'varchar(20)',              },
        { name: 'bid',        dataType: 'decimal(18,6)',            },
        { name: 'ask',        dataType: 'decimal(18,6)',            },
        { name: 'created_at', dataType: 'timestamptz',              },
      ],
    },
    {
      id: 'n4',
      urn: 'urn:xs:Dataset:(timescaledb,spread_metrics,prod)',
      name: 'spread_metrics', displayName: 'Spread Metrics',
      typeName: 'Dataset', platform: 'timescaledb', env: 'prod',
      fields: [
        { name: 'id',          dataType: 'bigint',      isPk: true },
        { name: 'symbol',      dataType: 'varchar(20)',             },
        { name: 'avg_spread',  dataType: 'decimal(18,6)',           },
        { name: 'min_spread',  dataType: 'decimal(18,6)',           },
        { name: 'max_spread',  dataType: 'decimal(18,6)',           },
        { name: 'window_start',dataType: 'timestamptz',             },
        { name: 'window_end',  dataType: 'timestamptz',             },
      ],
    },
    // ── 下游 2 跳：成交记录 ─────────────────────────────────────────────────
    {
      id: 'n5',
      urn: 'urn:xs:Dataset:(postgresql,execution_report,prod)',
      name: 'execution_report', displayName: 'Execution Report',
      typeName: 'Dataset', platform: 'postgresql', env: 'prod',
      fields: [
        { name: 'id',           dataType: 'bigint',      isPk: true },
        { name: 'order_id',     dataType: 'varchar(50)',             },
        { name: 'client_id',    dataType: 'varchar(50)',             },
        { name: 'symbol',       dataType: 'varchar(20)',             },
        { name: 'side',         dataType: 'varchar(4)',              },
        { name: 'volume',       dataType: 'decimal(18,2)',           },
        { name: 'exec_price',   dataType: 'decimal(18,6)',           },
        { name: 'exec_at',      dataType: 'timestamptz',             },
      ],
    },
    // ── 下游 3 跳：持仓 ─────────────────────────────────────────────────────
    {
      id: 'n6',
      urn: 'urn:xs:Dataset:(timescaledb,account_position,prod)',
      name: 'account_position', displayName: 'Account Position',
      typeName: 'Dataset', platform: 'timescaledb', env: 'prod',
      fields: [
        { name: 'id',             dataType: 'bigint',       isPk: true },
        { name: 'account_id',     dataType: 'varchar(50)'              },
        { name: 'symbol',         dataType: 'varchar(20)'              },
        { name: 'volume',         dataType: 'decimal(18,2)'            },
        { name: 'open_price',     dataType: 'decimal(18,6)'            },
        { name: 'unrealized_pnl', dataType: 'decimal(18,2)'            },
        { name: 'updated_at',     dataType: 'timestamptz'              },
      ],
    },
    // ── 下游 3 跳：余额 ─────────────────────────────────────────────────────
    {
      id: 'n7',
      urn: 'urn:xs:Dataset:(timescaledb,account_balance,prod)',
      name: 'account_balance', displayName: 'Account Balance',
      typeName: 'Dataset', platform: 'timescaledb', env: 'prod',
      fields: [
        { name: 'id',          dataType: 'bigint',       isPk: true },
        { name: 'account_id',  dataType: 'varchar(50)'              },
        { name: 'balance',     dataType: 'decimal(18,2)'            },
        { name: 'equity',      dataType: 'decimal(18,2)'            },
        { name: 'margin_used', dataType: 'decimal(18,2)'            },
        { name: 'updated_at',  dataType: 'timestamptz'              },
      ],
    },
    // ── 下游 4 跳：日终盈亏汇总 ────────────────────────────────────────────
    {
      id: 'n8',
      urn: 'urn:xs:Dataset:(postgresql,daily_pnl_report,prod)',
      name: 'daily_pnl_report', displayName: 'Daily PnL Report',
      typeName: 'Dataset', platform: 'postgresql', env: 'prod',
      fields: [
        { name: 'id',           dataType: 'bigint',       isPk: true },
        { name: 'account_id',   dataType: 'varchar(50)'              },
        { name: 'trade_date',   dataType: 'date'                     },
        { name: 'realized_pnl', dataType: 'decimal(18,2)'            },
        { name: 'total_equity', dataType: 'decimal(18,2)'            },
        { name: 'created_at',   dataType: 'timestamptz'              },
      ],
    },
  ],
  edges: [
    { id: 'e_tick', source: 'n_tick', target: 'n0', lineageType: 'TRANSFORMED' },
    { id: 'e0',     source: 'n0',     target: 'n1', lineageType: 'TRANSFORMED' },
    { id: 'e_cfg',  source: 'n_cfg',  target: 'n2', lineageType: 'VIEW'        },
    { id: 'e1',     source: 'n1',     target: 'n2', lineageType: 'TRANSFORMED' },
    { id: 'e2',     source: 'n2',     target: 'n3', lineageType: 'TRANSFORMED' },
    { id: 'e3',     source: 'n2',     target: 'n4', lineageType: 'TRANSFORMED' },
    { id: 'e4',     source: 'n3',     target: 'n5', lineageType: 'TRANSFORMED' },
    { id: 'e5',     source: 'n5',     target: 'n6', lineageType: 'TRANSFORMED' },
    { id: 'e6',     source: 'n5',     target: 'n7', lineageType: 'TRANSFORMED' },
    { id: 'e7',     source: 'n6',     target: 'n8', lineageType: 'TRANSFORMED' },
    { id: 'e8',     source: 'n7',     target: 'n8', lineageType: 'TRANSFORMED' },
  ],
  fieldEdges: [
    // raw_ladder → lp_raw_quote
    { id: 'fe_t0', sourceNodeId: 'n_tick', sourceField: 'lp_id',  targetNodeId: 'n0', targetField: 'lp_id'                           },
    { id: 'fe_t1', sourceNodeId: 'n_tick', sourceField: 'symbol', targetNodeId: 'n0', targetField: 'symbol'                          },
    { id: 'fe_t2', sourceNodeId: 'n_tick', sourceField: 'bid',    targetNodeId: 'n0', targetField: 'bid',    transformOp: 'smooth(bid)' },
    { id: 'fe_t3', sourceNodeId: 'n_tick', sourceField: 'ask',    targetNodeId: 'n0', targetField: 'ask',    transformOp: 'smooth(ask)' },
    // lp_raw_quote → ladder
    { id: 'fe0',   sourceNodeId: 'n0', sourceField: 'symbol', targetNodeId: 'n1', targetField: 'symbol'                               },
    { id: 'fe0b',  sourceNodeId: 'n0', sourceField: 'bid',    targetNodeId: 'n1', targetField: 'bid',    transformOp: 'best_bid(lps)'  },
    { id: 'fe0c',  sourceNodeId: 'n0', sourceField: 'ask',    targetNodeId: 'n1', targetField: 'ask',    transformOp: 'best_ask(lps)'  },
    { id: 'fe0d',  sourceNodeId: 'n0', sourceField: 'volume', targetNodeId: 'n1', targetField: 'volume', transformOp: 'sum(volume)'    },
    // symbol_config → execution_ladder
    { id: 'fe_c0', sourceNodeId: 'n_cfg', sourceField: 'markup_pips', targetNodeId: 'n2', targetField: 'markup'                      },
    // ladder → execution_ladder
    { id: 'fe1',   sourceNodeId: 'n1', sourceField: 'symbol', targetNodeId: 'n2', targetField: 'symbol'                               },
    { id: 'fe2',   sourceNodeId: 'n1', sourceField: 'bid',    targetNodeId: 'n2', targetField: 'bid',    transformOp: 'bid + markup'   },
    { id: 'fe3',   sourceNodeId: 'n1', sourceField: 'ask',    targetNodeId: 'n2', targetField: 'ask',    transformOp: 'ask + markup'   },
    { id: 'fe4',   sourceNodeId: 'n1', sourceField: 'ask',    targetNodeId: 'n2', targetField: 'spread', transformOp: 'ask - bid'      },
    // execution_ladder → client_ladder
    { id: 'fe5',   sourceNodeId: 'n2', sourceField: 'symbol', targetNodeId: 'n3', targetField: 'symbol'                               },
    { id: 'fe6',   sourceNodeId: 'n2', sourceField: 'bid',    targetNodeId: 'n3', targetField: 'bid'                                  },
    { id: 'fe7',   sourceNodeId: 'n2', sourceField: 'ask',    targetNodeId: 'n3', targetField: 'ask'                                  },
    // execution_ladder → spread_metrics
    { id: 'fe8',   sourceNodeId: 'n2', sourceField: 'symbol', targetNodeId: 'n4', targetField: 'symbol'                               },
    { id: 'fe9',   sourceNodeId: 'n2', sourceField: 'spread', targetNodeId: 'n4', targetField: 'avg_spread', transformOp: 'avg(spread)' },
    { id: 'fe10',  sourceNodeId: 'n2', sourceField: 'spread', targetNodeId: 'n4', targetField: 'min_spread', transformOp: 'min(spread)' },
    { id: 'fe11',  sourceNodeId: 'n2', sourceField: 'spread', targetNodeId: 'n4', targetField: 'max_spread', transformOp: 'max(spread)' },
    // client_ladder → execution_report
    { id: 'fe12',  sourceNodeId: 'n3', sourceField: 'client_id', targetNodeId: 'n5', targetField: 'client_id'                        },
    { id: 'fe13',  sourceNodeId: 'n3', sourceField: 'symbol',    targetNodeId: 'n5', targetField: 'symbol'                           },
    { id: 'fe14',  sourceNodeId: 'n3', sourceField: 'ask',       targetNodeId: 'n5', targetField: 'exec_price', transformOp: 'fill_price' },
    // execution_report → account_position
    { id: 'fe15',  sourceNodeId: 'n5', sourceField: 'client_id',  targetNodeId: 'n6', targetField: 'account_id'                      },
    { id: 'fe16',  sourceNodeId: 'n5', sourceField: 'symbol',     targetNodeId: 'n6', targetField: 'symbol'                          },
    { id: 'fe17',  sourceNodeId: 'n5', sourceField: 'volume',     targetNodeId: 'n6', targetField: 'volume',     transformOp: 'net_volume' },
    { id: 'fe18',  sourceNodeId: 'n5', sourceField: 'exec_price', targetNodeId: 'n6', targetField: 'open_price', transformOp: 'avg_price'  },
    // execution_report → account_balance
    { id: 'fe19',  sourceNodeId: 'n5', sourceField: 'client_id',  targetNodeId: 'n7', targetField: 'account_id'                      },
    { id: 'fe20',  sourceNodeId: 'n5', sourceField: 'exec_price', targetNodeId: 'n7', targetField: 'balance',    transformOp: 'realized_pnl' },
    // account_position → daily_pnl_report
    { id: 'fe21',  sourceNodeId: 'n6', sourceField: 'account_id',     targetNodeId: 'n8', targetField: 'account_id'                  },
    { id: 'fe22',  sourceNodeId: 'n6', sourceField: 'unrealized_pnl', targetNodeId: 'n8', targetField: 'realized_pnl', transformOp: 'sum(pnl)' },
    // account_balance → daily_pnl_report
    { id: 'fe23',  sourceNodeId: 'n7', sourceField: 'account_id', targetNodeId: 'n8', targetField: 'account_id'                      },
    { id: 'fe24',  sourceNodeId: 'n7', sourceField: 'equity',     targetNodeId: 'n8', targetField: 'total_equity'                    },
  ],
}

// ── API 函数 ──────────────────────────────────────────────────────────────────

function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), ms))
}

// ── ont_link_type 样例数据 ─────────────────────────────────────────────────────
// typeId 对应 MOCK_TYPES: 1=Dataset 2=Domain 3=Container 4=Action
//   5=MarketEvent 6=Quote 7=Client 8=Account 9=Position 10=Strategy 11=Instance

const MOCK_LINK_TYPES: OntLinkType[] = [
  // ── 物理归属链路（系统内置，构成三层物理结构）────────────────────────────────
  {
    id: 1,  name: 'DATASET_IN_CONTAINER',  displayName: '数据集属于容器',
    sourceTypeId: 1,  targetTypeId: 3,
    cardinality: 'MANY_TO_ONE', isDirected: true, reverseName: '包含数据集',
    description: '数据集归属于某个物理容器（schema / queue prefix）',
    isSystem: true,  status: 1,
  },
  {
    id: 2,  name: 'CONTAINER_IN_INSTANCE', displayName: '容器属于实例',
    sourceTypeId: 3,  targetTypeId: 11,
    cardinality: 'MANY_TO_ONE', isDirected: true, reverseName: '包含容器',
    description: '物理容器归属于某个部署实例',
    isSystem: true,  status: 1,
  },
  {
    id: 3,  name: 'DATASET_IN_DOMAIN',     displayName: '数据集属于域',
    sourceTypeId: 1,  targetTypeId: 2,
    cardinality: 'MANY_TO_ONE', isDirected: true, reverseName: '包含数据集',
    description: '数据集归属于某个业务域（逻辑分组）',
    isSystem: true,  status: 1,
  },
  {
    id: 4,  name: 'DOMAIN_IN_DOMAIN',      displayName: '子域属于父域',
    sourceTypeId: 2,  targetTypeId: 2,
    cardinality: 'MANY_TO_ONE', isDirected: true, reverseName: '包含子域',
    description: '域的嵌套层级关系，如 Spot 属于 Trading',
    isSystem: true,  status: 1,
  },
  // ── 数据血缘（系统内置，描述数据集间的派生关系）──────────────────────────────
  {
    id: 16, name: 'DATASET_DERIVED_FROM',  displayName: '数据集派生自',
    sourceTypeId: 1,  targetTypeId: 1,
    cardinality: 'MANY_TO_ONE', isDirected: true, reverseName: '派生出',
    description: '数据集由另一个数据集加工而来，如 Flink 聚合表 ← MQ，TimescaleDB 视图 ← 原始表',
    isSystem: true,  status: 1,
  },
  // ── 客户关系 ──────────────────────────────────────────────────────────────────
  {
    id: 5,  name: 'CLIENT_SUBSCRIBES_DATASET', displayName: '客户订阅数据集',
    sourceTypeId: 7,  targetTypeId: 1,
    cardinality: 'ONE_TO_MANY', isDirected: true, reverseName: '归属客户',
    description: '客户关联其账户数据、持仓报告、对账单等业务数据集',
    isSystem: false, status: 1,
  },
  {
    id: 17, name: 'CLIENT_RUNS_STRATEGY',  displayName: '客户运行策略',
    sourceTypeId: 7,  targetTypeId: 10,
    cardinality: 'ONE_TO_MANY', isDirected: true, reverseName: '归属客户',
    description: '客户名下运行的自动交易策略，一个客户可运行多个策略',
    isSystem: false, status: 1,
  },
  // ── 策略关系 ──────────────────────────────────────────────────────────────────
  {
    id: 7,  name: 'STRATEGY_RUNS_ON_DATASET',  displayName: '策略运行于数据集',
    sourceTypeId: 10, targetTypeId: 1,
    cardinality: 'MANY_TO_ONE', isDirected: true, reverseName: '承载的策略',
    description: '策略运行所依托的账户数据集（account_position、account_balance 等），决定资金归属',
    isSystem: false, status: 1,
  },
  {
    id: 12, name: 'STRATEGY_READS_DATASET',    displayName: '策略订阅数据集',
    sourceTypeId: 10, targetTypeId: 1,
    cardinality: 'MANY_TO_MANY', isDirected: true, reverseName: '被策略订阅',
    description: '策略运行依赖的行情数据源，如 ladder、mq queue、reuters spot rates',
    isSystem: false, status: 1,
  },
  {
    id: 13, name: 'STRATEGY_WRITES_DATASET',   displayName: '策略写入数据集',
    sourceTypeId: 10, targetTypeId: 1,
    cardinality: 'ONE_TO_MANY', isDirected: true, reverseName: '由策略写入',
    description: '策略执行后写入的数据集，如 execution_report、account_position',
    isSystem: false, status: 1,
  },
  {
    id: 14, name: 'STRATEGY_TRIGGERED_BY_EVENT', displayName: '事件触发策略',
    sourceTypeId: 5,  targetTypeId: 10,
    cardinality: 'MANY_TO_MANY', isDirected: true, reverseName: '触发的策略',
    description: '市场事件触发事件驱动型策略（EventDriven）建仓，依赖 MarketEvent 影响分析',
    isSystem: false, status: 1,
  },
  {
    id: 15, name: 'STRATEGY_HEDGES_STRATEGY',   displayName: '策略互为对冲',
    sourceTypeId: 10, targetTypeId: 10,
    cardinality: 'MANY_TO_MANY', isDirected: false, reverseName: '互为对冲',
    description: '套利策略（Arbitrage）的两腿互为对冲关系，平仓时同步操作',
    isSystem: false, status: 1,
  },
  // ── 事件分析关系 ──────────────────────────────────────────────────────────────
  {
    id: 8,  name: 'EVENT_AFFECTS_DATASET',  displayName: '事件影响数据集',
    sourceTypeId: 5,  targetTypeId: 1,
    cardinality: 'MANY_TO_MANY', isDirected: true, reverseName: '受事件影响',
    description: '市场事件（如 NFP、WAR）影响相关行情数据集的价格方向',
    qualifierValues: 'BULLISH / BEARISH / NEUTRAL',
    isSystem: false, status: 1,
  },
  {
    id: 9,  name: 'EVENT_TRIGGERS_ACTION',  displayName: '事件触发操作',
    sourceTypeId: 5,  targetTypeId: 4,
    cardinality: 'MANY_TO_MANY', isDirected: true, reverseName: '由事件触发',
    description: '市场事件触发预定义操作，如生成影响报告、发送预警、调整风控参数',
    isSystem: false, status: 1,
  },
  {
    id: 10, name: 'ACTION_APPLIES_TO',      displayName: '操作作用于数据集',
    sourceTypeId: 4,  targetTypeId: 1,
    cardinality: 'MANY_TO_MANY', isDirected: true, reverseName: '被操作作用',
    description: '操作（如查询持仓、生成报告）作用于特定数据集',
    isSystem: false, status: 1,
  },
]

export const ontologyApi = {
  getDimensionTypes: () => delay(MOCK_DIMENSION_TYPES),

  getDimensions: (dimensionTypeName?: string) => delay(
    dimensionTypeName ? MOCK_DIMENSIONS.filter(d => d.dimensionTypeName === dimensionTypeName) : MOCK_DIMENSIONS
  ),

  getLinkTypes: () => delay(MOCK_LINK_TYPES),

  getEntityLinks: (params?: { linkTypeName?: string }) => {
    let items = MOCK_ENTITY_LINKS
    if (params?.linkTypeName) items = items.filter(l => l.linkTypeName === params.linkTypeName)
    return delay(items)
  },

  getEntityExtra: (entityId: number) =>
    delay(MOCK_ENTITY_EXTRA.filter(e => e.entityId === entityId)),

  upsertEntityExtra: (entityId: number, key: string, value: string) => {
    const existing = MOCK_ENTITY_EXTRA.find(e => e.entityId === entityId && e.key === key)
    if (existing) {
      existing.value = value
      existing.updatedAt = new Date().toISOString()
      return delay(existing)
    }
    const item: OntEntityExtra = {
      id: extraIdSeq++, entityId, key, value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    MOCK_ENTITY_EXTRA.push(item)
    return delay(item)
  },

  deleteEntityExtra: (id: number) => {
    const idx = MOCK_ENTITY_EXTRA.findIndex(e => e.id === id)
    if (idx !== -1) MOCK_ENTITY_EXTRA.splice(idx, 1)
    return delay(undefined)
  },

  getTypes: () => delay(MOCK_TYPES),

  getAspects: (typeId?: number) => delay(
    typeId ? MOCK_ASPECTS.filter(a => a.typeId === typeId) : MOCK_ASPECTS
  ),

  getProperties: (typeId?: number, aspectId?: number) => {
    let items = [...MOCK_PROPERTIES]
    if (typeId)   items = items.filter(p => p.typeId === typeId)
    if (aspectId) items = items.filter(p => p.aspectId === aspectId)
    return delay(items)
  },

  getDomains: () => delay(MOCK_DOMAINS),

  getDomainTree: (): Promise<DomainTreeNode[]> =>
    delay(buildTree<DomainTreeNode>(MOCK_DOMAINS, DOMAIN_LINKS, MOCK_DATASETS)),

  getInstances: () => delay(MOCK_INSTANCES),

  getEvents: () => delay(MOCK_EVENTS),

  getStrategies: (params?: { strategyType?: string; query?: string }) => {
    let items = MOCK_STRATEGIES
    if (params?.strategyType) items = items.filter(s => s.platform === params.strategyType)
    if (params?.query) {
      const q = params.query.toLowerCase()
      items = items.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.displayName ?? '').toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q)
      )
    }
    return delay(items)
  },

  getActions: (params?: { actionType?: string; query?: string }) => {
    let items = MOCK_ACTIONS
    if (params?.actionType) items = items.filter(a => a.platform === params.actionType)
    if (params?.query) {
      const q = params.query.toLowerCase()
      items = items.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.displayName ?? '').toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
      )
    }
    return delay(items)
  },

  getContainers: () => delay(MOCK_CONTAINERS),

  getInstanceTree: (): Promise<ContainerTreeNode[]> => {
    const allEntities = [...MOCK_INSTANCES, ...MOCK_CONTAINERS]
    const tree = buildTree<ContainerTreeNode>(allEntities, CONTAINER_LINKS, MOCK_DATASETS)

    // 把 Dataset 挂到对应 Container 子节点下
    tree.forEach(instance => {
      instance.children?.forEach((container: ContainerTreeNode) => {
        const datasets = MOCK_DATASETS
          .filter(d => d.containerName === container.name)
          .map(d => ({ ...d, children: [], datasetCount: 0 } as unknown as ContainerTreeNode))
        container.children = [...(container.children ?? []), ...datasets]
      })
    })

    return delay(tree)
  },

  getDatasets: (params?: { domain?: string; container?: string; platform?: string; env?: string; query?: string }): Promise<PageResult<DatasetEntity>> => {
    let items = [...MOCK_DATASETS]
    if (params?.domain)    items = items.filter(d => d.domainName === params.domain)
    if (params?.container) items = items.filter(d => d.containerName === params.container)
    if (params?.platform)  items = items.filter(d => d.platform === params.platform)
    if (params?.env)       items = items.filter(d => d.env === params.env)
    if (params?.query) {
      const q = params.query.toLowerCase()
      items = items.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.displayName?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.tags?.some(t => t.toLowerCase().includes(q))
      )
    }
    // 从 ont_entity_property_value 派生 tags
    const enriched = items.map(d => ({
      ...d,
      tags: getEntityTags(d.id),
      scale: deriveScale(d.rowCount),
    }))
    return delay({ items: enriched, total: enriched.length, page: 1, pageSize: 50 })
  },

  getDataset: (id: number): Promise<DatasetEntity | undefined> => {
    const d = MOCK_DATASETS.find(d => d.id === id)
    if (!d) return delay(undefined)
    return delay({ ...d, tags: getEntityTags(d.id), scale: deriveScale(d.rowCount) })
  },

  // 全量统计，不受过滤条件影响
  getDatasetStats: (): Promise<{ total: number; byDomain: Record<string, number>; byPlatform: Record<string, number> }> => {
    const byDomain: Record<string, number> = {}
    const byPlatform: Record<string, number> = {}
    MOCK_DATASETS.forEach(d => {
      if (d.domainName) byDomain[d.domainName] = (byDomain[d.domainName] ?? 0) + 1
      byPlatform[d.platform] = (byPlatform[d.platform] ?? 0) + 1
    })
    return delay({ total: MOCK_DATASETS.length, byDomain, byPlatform })
  },

  getLineage: (_urn: string): Promise<LineageGraph> =>    delay(MOCK_LINEAGE),

  search: (params: SearchParams): Promise<PageResult<SearchResult>> => {
    const q = params.query.toLowerCase()
    const results: SearchResult[] = MOCK_DATASETS
      .filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.displayName?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.tags?.some(t => t.toLowerCase().includes(q))
      )
      .map(d => ({
        entityId: d.id,
        urn: d.urn,
        name: d.name,
        displayName: d.displayName,
        typeName: d.typeName,
        typeDisplayName: 'Dataset',
        description: d.description,
        platform: d.platform,
        env: d.env,
        matchScore: 1,
      }))
    return delay({ items: results, total: results.length, page: 1, pageSize: 20 })
  },
}
