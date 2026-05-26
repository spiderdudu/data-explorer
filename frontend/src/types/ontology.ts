// ── 分类维度 ──────────────────────────────────────────────────────────────────

export interface OntDimensionType {
  id: number
  name: string          // 'platform' | 'strategy_type'
  displayName: string
  description?: string
}

export interface OntDimension {
  id: number
  dimensionTypeId: number
  dimensionTypeName: string  // 冗余，方便前端过滤
  name: string
  displayName: string
  category?: string          // 二级分类，如 platform 下的 database/stream/file/api
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
  dimensionId?: number       // NULL=通用；非 NULL=仅对该维度值的实体生效
  dimensionName?: string     // 冗余，方便 UI 显示（如 'postgresql'、'TrendFollowing'）
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
