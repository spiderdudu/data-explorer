// ── 分类器 ────────────────────────────────────────────────────────────────────

export interface OntClassifier {
  id: number
  name: string          // 'platform' | 'strategy_type' | 'container_type' ...
  displayName: string
  description?: string
}

export interface OntClassifierValue {
  id: number
  classifierId: number
  classifierName: string  // 冗余，方便前端过滤
  name: string
  displayName: string
  category?: string       // 二级分类，如 platform 下的 database/stream/file/api
  description?: string
  isSystem: boolean
  status: 1 | 0
}

// ── 本体类型 ──────────────────────────────────────────────────────────────────

export interface OntType {
  id: number
  name: string
  displayName: string
  description?: string
  isSystem: boolean
  status: 1 | 0
}

export interface OntAspect {
  id: number
  typeId: number
  classifierValueId?: number    // NULL=通用；非 NULL=仅对该分类值的实体生效
  classifierValueName?: string  // 冗余，方便 UI 显示（如 'postgresql'、'TrendFollowing'）
  name: string
  displayName: string
  description?: string
  sortOrder: number
}

export interface OntProperty {
  id: number
  aspectId: number
  typeId?: number
  name: string
  displayName: string
  dataType: 'string' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'enum' | 'ref' | 'json'
  refTypeId?: number
  isRequired: boolean
  isMulti: boolean
  isSystem: boolean
  sortOrder: number
  description?: string
}

// ── 实体 ──────────────────────────────────────────────────────────────────────

export interface OntEntity {
  id: number
  typeId: number
  typeName: string
  urn: string
  name: string
  displayName?: string
  platform: string
  env: 'prod' | 'uat' | 'dev'
  description?: string
  isSystem: boolean
  status: 1 | 0
  currentVersion: number
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface OntEntityPropertyValue {
  id: number
  entityId: number
  aspectId?: number
  aspectName?: string
  propertyId: number
  propertyName: string
  propertyDisplayName: string
  dataType: string
  value: string
  startVersion: number
  endVersion?: number
}

export interface OntEntityExtra {
  id: number
  entityId: number
  key: string
  value: string
  createdAt: string
  updatedAt: string
}

// ── Dataset 专用视图 ──────────────────────────────────────────────────────────

export interface DatasetEntity extends OntEntity {
  // schemaMetadata aspect — platform 决定哪些字段有效
  schema?: string       // postgresql / timescaledb
  table?: string        // postgresql / timescaledb
  pk?: string           // postgresql / timescaledb
  filePath?: string     // s3 / file
  topic?: string        // mq
  grpcService?: string  // grpc
  grpcMethod?: string   // grpc
  grpcPayload?: string  // grpc — 固定请求参数 JSON
  // schemaMetadata aspect
  freshness?: 'realtime' | 'minute' | 'daily' | 'request'
  frequency?: '100ms' | '500ms' | '1s' | '1min' | '5min' | '1h' | '1d' | 'realtime' | 'n/a'
  rowCount?: number
  scale?: '<1K' | '~10K' | '~100K' | '~1M' | '~10M' | '>100M'
  sizeBytes?: number    // 数据集大小，字节数，展示时换算为 KB/MB/GB
  retention?: string    // 如：90d、1y、永久
  // datasetProperties aspect
  tags?: string[]
  // ownership aspect
  owner?: string
  team?: string
  steward?: string
  // 关联
  domainName?: string
  containerName?: string
  instanceName?: string
}

export interface OntEntityFieldExtra {
  id: number
  fieldId: number
  key: string
  value: string
  createdAt: string
  updatedAt: string
}

// ── Dataset 字段定义 ──────────────────────────────────────────────────────────

export interface OntEntityField {
  id: number
  entityId: number
  // 基础结构
  name: string
  displayName?: string
  dataType: string
  isNullable: boolean
  isPk: boolean
  defaultValue?: string
  sortOrder: number
  // 索引 / 分区
  isIndexed: boolean
  isPartitionKey: boolean
  // 敏感标记
  isPii: boolean
  sensitivityLevel?: 'public' | 'internal' | 'confidential' | 'restricted'
  // 数据质量统计
  distinctCount?: number
  nullCount?: number
  minValue?: string
  maxValue?: string
  avgValue?: string
  statsUpdatedAt?: string
  // 描述与标签
  description?: string
  tags?: string[]
}

// ── 关联 ──────────────────────────────────────────────────────────────────────

export interface OntLinkType {
  id: number
  name: string
  displayName: string
  sourceTypeId: number
  targetTypeId: number
  cardinality: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY'
  isDirected: boolean
  reverseName?: string
  qualifierValues?: string
  description?: string
  isSystem: boolean
  status: 1 | 0
}

export interface OntEntityLink {
  id: number
  linkTypeId: number
  linkTypeName: string
  linkTypeDisplayName: string
  sourceId: number
  sourceUrn: string
  sourceName: string
  targetId: number
  targetUrn: string
  targetName: string
  qualifier?: string
  confidence?: number
}

// ── 血缘 ──────────────────────────────────────────────────────────────────────

export interface OntUpstreamLineage {
  id: number
  entityId: number
  entityUrn: string
  entityName: string
  upstreamUrn: string
  upstreamName?: string
  lineageType: 'TRANSFORMED' | 'COPY' | 'VIEW'
}

// 字段（列）定义，用于字段级血缘展开
export interface LineageField {
  name: string
  dataType: string
  isPk?: boolean
  description?: string
}

// 字段级血缘连线：source 节点的某字段 → target 节点的某字段
export interface FieldLineageEdge {
  id: string
  sourceNodeId: string
  sourceField: string
  targetNodeId: string
  targetField: string
  transformOp?: string   // 转换逻辑描述，如 "price * volume"
}

export interface LineageGraph {
  nodes: LineageNode[]
  edges: LineageEdge[]
  fieldEdges?: FieldLineageEdge[]
}

export interface LineageNode {
  id: string
  urn: string
  name: string
  displayName?: string
  typeName: string
  platform: string
  env: string
  isFocus?: boolean
  fields?: LineageField[]   // 字段列表，展开时显示
}

export interface LineageEdge {
  id: string
  source: string
  target: string
  lineageType: 'TRANSFORMED' | 'COPY' | 'VIEW'
}

// ── 域/容器树节点（前端展示用） ───────────────────────────────────────────────

export interface DomainTreeNode extends OntEntity {
  children?: DomainTreeNode[]
  datasetCount?: number
}

export interface ContainerTreeNode extends OntEntity {
  children?: ContainerTreeNode[]
  datasetCount?: number
  region?: string
}

// ── 搜索 ──────────────────────────────────────────────────────────────────────

export interface SearchResult {
  entityId: number
  urn: string
  name: string
  displayName?: string
  typeName: string
  typeDisplayName: string
  description?: string
  platform: string
  env: string
  matchScore: number
}

export interface SearchParams {
  query: string
  typeNames?: string[]
  platforms?: string[]
  envs?: string[]
  page?: number
  pageSize?: number
}

// ── 通用分页 ──────────────────────────────────────────────────────────────────

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ── Agent Studio ──────────────────────────────────────────────────────────────

export type AgentType     = 'event_driven' | 'scheduled' | 'manual' | 'streaming'
export type AgentStatus   = 'active' | 'paused' | 'deprecated'
export type SkillType     = 'llm' | 'grpc' | 'http' | 'dag' | 'function'
export type ToolType      = 'mcp' | 'grpc' | 'http' | 'function'
export type TraceStatus   = 'running' | 'success' | 'failed' | 'timeout'
export type TriggerType   = 'event' | 'schedule' | 'manual' | 'stream'

export interface AgentSkillRef {
  name: string
  sortOrder: number
}

export interface OntAgent {
  id: number
  name: string
  displayName: string
  description?: string
  agentType: AgentType
  status: AgentStatus
  env: 'prod' | 'uat' | 'dev'
  version: number
  llmModel?: string
  maxRetries?: number
  timeoutSecs?: number
  skills: AgentSkillRef[]       // 有序 Skill 列表
  tools: string[]               // Tool name 列表
  // agentRuntime
  runCount: number
  successRate: number
  avgDurationMs?: number
  lastRunAt?: string
  // 触发配置（按 agentType 填充）
  cronExpr?: string             // scheduled
  eventTypes?: string[]         // event_driven
  minSeverity?: string          // event_driven
  createdAt: string
  updatedAt: string
}

export interface OntSkill {
  id: number
  name: string
  displayName: string
  description?: string
  skillType: SkillType
  version: number
  isAsync: boolean
  timeoutSecs?: number
  toolName?: string             // 依赖的 Tool name
  inputSchema?: string          // JSON Schema string
  outputSchema?: string
  createdAt: string
}

export interface OntTool {
  id: number
  name: string
  displayName: string
  description?: string
  toolType: ToolType
  endpoint: string
  authType?: string
  tls?: boolean
  createdAt: string
}

export interface TraceStep {
  skill: string
  skillType: SkillType
  status: TraceStatus | 'success' | 'failed'
  durationMs: number
  tokenIn?: number
  tokenOut?: number
  error?: string
}

export interface OntAgentTrace {
  id: string
  agentId: number
  agentName: string
  triggerType: TriggerType
  triggerRef?: string
  status: TraceStatus
  durationMs: number
  tokenIn: number
  tokenOut: number
  stepCount: number
  steps: TraceStep[]
  runAt: string
}

export interface OntEvalRun {
  id: string
  agentId: number
  agentName: string
  datasetName: string
  caseCount: number
  accuracy: number
  precision: number
  recall: number
  f1: number
  avgDurationMs: number
  avgTokenTotal: number
  status: 'running' | 'done' | 'failed'
  runAt: string
}

// ── Agent Pipeline ────────────────────────────────────────────────────────────

export type PipelineStage =
  | 'assembly'   // 组装
  | 'rbac'       // 权限
  | 'budget'     // 预算
  | 'test'       // 测试
  | 'publish'    // 发布
  | 'run'        // 运行
  | 'monitor'    // 监控

export type PipelineStatus = 'draft' | 'testing' | 'published' | 'running' | 'paused' | 'deprecated'

export interface PipelineAssembly {
  agentId?: number           // 选择的 Agent 实体
  agentName?: string
  skillNames: string[]       // 有序 Skill 列表
  toolNames: string[]        // Tool 列表
  llmModel?: string          // 模型
  datasetUrns: string[]      // 输入数据集 URN 列表
  triggerType?: string
  cronExpr?: string
  eventTypes?: string[]
}

export interface PipelineRbac {
  owners: string[]           // 可管理 Pipeline 的用户
  operators: string[]        // 可触发运行的用户
  viewers: string[]          // 只读查看
  requireApproval: boolean   // 发布前是否需要审批
  approvers: string[]
}

export interface PipelineBudget {
  maxTokensPerRun?: number
  maxTokensPerDay?: number
  maxRunsPerDay?: number
  maxCostUsdPerDay?: number
  alertThresholdPct: number  // 达到预算 X% 时告警
}

export interface PipelineTestCase {
  id: string
  input: string
  expectedOutput?: string
  actualOutput?: string
  status: 'pending' | 'pass' | 'fail'
  durationMs?: number
  tokenUsed?: number
}

export interface OntPipeline {
  id: number
  name: string
  displayName: string
  description?: string
  status: PipelineStatus
  currentStage: PipelineStage
  env: 'prod' | 'uat' | 'dev'
  version: number
  assembly: PipelineAssembly
  rbac: PipelineRbac
  budget: PipelineBudget
  testCases: PipelineTestCase[]
  // 运行时
  runCount: number
  successRate: number
  lastRunAt?: string
  publishedAt?: string
  publishedBy?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}
