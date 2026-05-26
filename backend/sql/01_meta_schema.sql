-- XSyphon Ontology — meta schema DDL
-- 执行顺序：本文件 → 02_init_data.sql

CREATE SCHEMA IF NOT EXISTS meta;

CREATE OR REPLACE FUNCTION meta.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ── ont_type ──────────────────────────────────────────────────────────────────
CREATE TABLE meta.ont_type (
    id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    description  VARCHAR(1000),
    is_system    BOOLEAN      NOT NULL DEFAULT false,
    status       SMALLINT     NOT NULL DEFAULT 1 CHECK (status IN (1,0)),
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_ont_type_name UNIQUE (name)
);
COMMENT ON TABLE  meta.ont_type           IS '本体对象类型，如 MarketEvent、Quote、Client、Domain、Container';
COMMENT ON COLUMN meta.ont_type.is_system IS 'true=系统内置，不允许删除，只能 deprecated';
COMMENT ON COLUMN meta.ont_type.status    IS '1=正常使用；0=已废弃，不允许新建实例';

CREATE TRIGGER trg_ont_type_updated_at
    BEFORE UPDATE ON meta.ont_type
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- ── ont_entity ────────────────────────────────────────────────────────────────
CREATE TABLE meta.ont_entity (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type_id         BIGINT       NOT NULL REFERENCES meta.ont_type(id),
    urn             VARCHAR(500) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    display_name    VARCHAR(200),
    platform        VARCHAR(100) NOT NULL DEFAULT 'xsyphon',
    env             VARCHAR(20)  NOT NULL DEFAULT 'prod'
                                 CHECK (env IN ('prod','uat','dev')),
    description     VARCHAR(1000),
    is_system       BOOLEAN      NOT NULL DEFAULT false,
    status          SMALLINT     NOT NULL DEFAULT 1 CHECK (status IN (1,0)),
    current_version INTEGER      NOT NULL DEFAULT 0,
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_ont_entity_urn  UNIQUE (urn),
    CONSTRAINT uq_ont_entity_name UNIQUE (type_id, platform, name, env)
);
COMMENT ON COLUMN meta.ont_entity.urn             IS 'URN 格式：urn:xs:{type}:({platform},{name},{env})';
COMMENT ON COLUMN meta.ont_entity.platform        IS '数据来源平台，如 xsyphon / reuters / bloomberg';
COMMENT ON COLUMN meta.ont_entity.env             IS '环境：prod / uat / dev';
COMMENT ON COLUMN meta.ont_entity.current_version IS '属性值版本号，每次变更原子递增';

CREATE INDEX idx_ont_entity_type ON meta.ont_entity(type_id);
CREATE INDEX idx_ont_entity_urn  ON meta.ont_entity(urn);

CREATE TRIGGER trg_ont_entity_updated_at
    BEFORE UPDATE ON meta.ont_entity
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- ── ont_aspect ────────────────────────────────────────────────────────────────
CREATE TABLE meta.ont_aspect (
    id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type_id      BIGINT       NOT NULL REFERENCES meta.ont_type(id),
    name         VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    description  VARCHAR(1000),
    is_system    BOOLEAN      NOT NULL DEFAULT false,
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    status       SMALLINT     NOT NULL DEFAULT 1 CHECK (status IN (1,0)),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_ont_aspect_name UNIQUE (type_id, name)
);
COMMENT ON TABLE  meta.ont_aspect         IS '属性分组，对应 DataHub Aspect，同组属性原子更新';
COMMENT ON COLUMN meta.ont_aspect.type_id IS '归属对象类型';

CREATE INDEX idx_ont_aspect_type ON meta.ont_aspect(type_id);

CREATE TRIGGER trg_ont_aspect_updated_at
    BEFORE UPDATE ON meta.ont_aspect
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- ── ont_property ──────────────────────────────────────────────────────────────
CREATE TABLE meta.ont_property (
    id             BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aspect_id      BIGINT       NOT NULL REFERENCES meta.ont_aspect(id),
    type_id        BIGINT       REFERENCES meta.ont_type(id),
    name           VARCHAR(100) NOT NULL,
    display_name   VARCHAR(200),
    data_type      VARCHAR(50)  NOT NULL
                                CHECK (data_type IN (
                                    'string','integer','decimal','boolean',
                                    'date','datetime','enum','ref','json'
                                )),
    ref_type_id    BIGINT       REFERENCES meta.ont_type(id),
    is_required    BOOLEAN      NOT NULL DEFAULT false,
    is_multi       BOOLEAN      NOT NULL DEFAULT false,
    is_system      BOOLEAN      NOT NULL DEFAULT false,
    default_value  VARCHAR(500),
    sort_order     INTEGER      NOT NULL DEFAULT 0,
    description    VARCHAR(1000),
    status         SMALLINT     NOT NULL DEFAULT 1 CHECK (status IN (1,0)),
    created_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_ont_property_name UNIQUE (aspect_id, name),
    CONSTRAINT chk_ont_property_ref CHECK (data_type != 'ref' OR ref_type_id IS NOT NULL)
);
COMMENT ON COLUMN meta.ont_property.aspect_id   IS '归属 Aspect';
COMMENT ON COLUMN meta.ont_property.type_id     IS '冗余字段，类型级属性填入对应 type_id，实例级属性为 NULL';
COMMENT ON COLUMN meta.ont_property.data_type   IS 'string|integer|decimal|boolean|date|datetime|enum|ref|json';
COMMENT ON COLUMN meta.ont_property.ref_type_id IS 'data_type=ref 时指向的对象类型';
COMMENT ON COLUMN meta.ont_property.is_multi    IS '是否允许多值';

CREATE INDEX idx_ont_property_aspect ON meta.ont_property(aspect_id);
CREATE INDEX idx_ont_property_type   ON meta.ont_property(type_id) WHERE type_id IS NOT NULL;

CREATE TRIGGER trg_ont_property_updated_at
    BEFORE UPDATE ON meta.ont_property
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- ── ont_property_enum ─────────────────────────────────────────────────────────
CREATE TABLE meta.ont_property_enum (
    id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    property_id  BIGINT       NOT NULL REFERENCES meta.ont_property(id),
    value        VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    description  VARCHAR(500),
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    status       SMALLINT     NOT NULL DEFAULT 1 CHECK (status IN (1,0)),
    CONSTRAINT uq_ont_enum_value UNIQUE (property_id, value)
);

CREATE INDEX idx_ont_enum_property ON meta.ont_property_enum(property_id);

-- ── ont_link_type ─────────────────────────────────────────────────────────────
CREATE TABLE meta.ont_link_type (
    id               BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    display_name     VARCHAR(200),
    source_type_id   BIGINT       NOT NULL REFERENCES meta.ont_type(id),
    target_type_id   BIGINT       NOT NULL REFERENCES meta.ont_type(id),
    cardinality      VARCHAR(20)  NOT NULL
                                  CHECK (cardinality IN ('ONE_TO_ONE','ONE_TO_MANY','MANY_TO_ONE','MANY_TO_MANY')),
    is_directed      BOOLEAN      NOT NULL DEFAULT true,
    reverse_name     VARCHAR(200),
    qualifier_values VARCHAR(500),
    description      VARCHAR(1000),
    is_system        BOOLEAN      NOT NULL DEFAULT false,
    status           SMALLINT     NOT NULL DEFAULT 1 CHECK (status IN (1,0)),
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_ont_link_type_name UNIQUE (name)
);

CREATE INDEX idx_ont_link_type_source ON meta.ont_link_type(source_type_id);
CREATE INDEX idx_ont_link_type_target ON meta.ont_link_type(target_type_id);

CREATE TRIGGER trg_ont_link_type_updated_at
    BEFORE UPDATE ON meta.ont_link_type
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- ── ont_entity_property_value ─────────────────────────────────────────────────
CREATE TABLE meta.ont_entity_property_value (
    id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_id     BIGINT       NOT NULL REFERENCES meta.ont_entity(id),
    aspect_id     BIGINT       REFERENCES meta.ont_aspect(id),
    property_id   BIGINT       NOT NULL REFERENCES meta.ont_property(id),
    data_type     VARCHAR(50)  NOT NULL
                               CHECK (data_type IN (
                                   'string','integer','decimal','boolean',
                                   'date','datetime','enum','ref','json'
                               )),
    value         TEXT,
    start_version INTEGER      NOT NULL DEFAULT 1,
    end_version   INTEGER,
    created_by    VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_epv UNIQUE (entity_id, property_id, start_version)
);
COMMENT ON COLUMN meta.ont_entity_property_value.aspect_id     IS '所属 Aspect，按 Aspect 批量更新保证原子性';
COMMENT ON COLUMN meta.ont_entity_property_value.value         IS '统一 TEXT 存储；多值属性用逗号分隔；ref 类型存 entity id';
COMMENT ON COLUMN meta.ont_entity_property_value.start_version IS '该值生效的版本号，每个 entity 独立递增';
COMMENT ON COLUMN meta.ont_entity_property_value.end_version   IS 'NULL=当前值；非 NULL=该值失效时的版本号';

CREATE INDEX idx_epv_entity   ON meta.ont_entity_property_value(entity_id);
CREATE INDEX idx_epv_aspect   ON meta.ont_entity_property_value(aspect_id);
CREATE INDEX idx_epv_property ON meta.ont_entity_property_value(property_id);
CREATE INDEX idx_epv_current  ON meta.ont_entity_property_value(entity_id, property_id)
    WHERE end_version IS NULL;

-- ── ont_entity_link ───────────────────────────────────────────────────────────
CREATE TABLE meta.ont_entity_link (
    id           BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    link_type_id BIGINT        NOT NULL REFERENCES meta.ont_link_type(id),
    source_id    BIGINT        NOT NULL REFERENCES meta.ont_entity(id),
    target_id    BIGINT        NOT NULL REFERENCES meta.ont_entity(id),
    qualifier    VARCHAR(50),
    confidence   NUMERIC(3,2)  CHECK (confidence BETWEEN 0 AND 1),
    weight       NUMERIC(5,4),
    properties   JSONB,
    valid_from   TIMESTAMPTZ,
    valid_to     TIMESTAMPTZ,
    status       SMALLINT      NOT NULL DEFAULT 1 CHECK (status IN (1,0)),
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_entity_link UNIQUE (link_type_id, source_id, target_id, valid_from)
);
COMMENT ON COLUMN meta.ont_entity_link.qualifier  IS '关联性质标签，值来自 ont_link_type.qualifier_values';
COMMENT ON COLUMN meta.ont_entity_link.confidence IS 'LLM 推断的置信度，0.00~1.00，人工标注=1.00';

CREATE INDEX idx_el_link_type ON meta.ont_entity_link(link_type_id);
CREATE INDEX idx_el_source    ON meta.ont_entity_link(source_id);
CREATE INDEX idx_el_target    ON meta.ont_entity_link(target_id);

CREATE TRIGGER trg_el_updated_at
    BEFORE UPDATE ON meta.ont_entity_link
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- ── ont_entity_extra ──────────────────────────────────────────────────────────
CREATE TABLE meta.ont_entity_extra (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_id  BIGINT       NOT NULL REFERENCES meta.ont_entity(id),
    key        VARCHAR(100) NOT NULL,
    value      TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_entity_extra UNIQUE (entity_id, key)
);

CREATE INDEX idx_entity_extra_entity ON meta.ont_entity_extra(entity_id);
CREATE INDEX idx_entity_extra_key    ON meta.ont_entity_extra(key);

CREATE TRIGGER trg_entity_extra_updated_at
    BEFORE UPDATE ON meta.ont_entity_extra
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- ── ont_upstream_lineage ──────────────────────────────────────────────────────
CREATE TABLE meta.ont_upstream_lineage (
    id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_id    BIGINT       NOT NULL REFERENCES meta.ont_entity(id),
    upstream_urn VARCHAR(500) NOT NULL,
    lineage_type VARCHAR(20)  NOT NULL DEFAULT 'TRANSFORMED'
                              CHECK (lineage_type IN ('TRANSFORMED','COPY','VIEW')),
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_upstream_lineage UNIQUE (entity_id, upstream_urn)
);

CREATE INDEX idx_upstream_lineage_entity   ON meta.ont_upstream_lineage(entity_id);
CREATE INDEX idx_upstream_lineage_upstream ON meta.ont_upstream_lineage(upstream_urn);

CREATE TRIGGER trg_upstream_lineage_updated_at
    BEFORE UPDATE ON meta.ont_upstream_lineage
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- ── ont_field_lineage ─────────────────────────────────────────────────────────
CREATE TABLE meta.ont_field_lineage (
    id                  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    upstream_lineage_id BIGINT       NOT NULL REFERENCES meta.ont_upstream_lineage(id),
    upstream_type       VARCHAR(10)  NOT NULL DEFAULT 'FIELD'
                                     CHECK (upstream_type IN ('FIELD','FIELD_SET')),
    upstream_fields     JSONB        NOT NULL,
    downstream_type     VARCHAR(10)  NOT NULL DEFAULT 'FIELD'
                                     CHECK (downstream_type IN ('FIELD','FIELD_SET')),
    downstream_fields   JSONB        NOT NULL,
    transform_op        VARCHAR(500),
    confidence          NUMERIC(3,2) NOT NULL DEFAULT 1.00
                                     CHECK (confidence BETWEEN 0 AND 1),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_field_lineage_upstream ON meta.ont_field_lineage(upstream_lineage_id);

-- ── ont_action_param ──────────────────────────────────────────────────────────
CREATE TABLE meta.ont_action_param (
    id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_id     BIGINT       NOT NULL REFERENCES meta.ont_entity(id),
    param_type    VARCHAR(10)  NOT NULL CHECK (param_type IN ('input','output')),
    name          VARCHAR(100) NOT NULL,
    display_name  VARCHAR(200),
    data_type     VARCHAR(50)  NOT NULL
                               CHECK (data_type IN (
                                   'string','integer','decimal','boolean',
                                   'date','datetime','enum','ref','json'
                               )),
    is_required   BOOLEAN      NOT NULL DEFAULT false,
    default_value VARCHAR(500),
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    description   VARCHAR(1000),
    CONSTRAINT uq_action_param UNIQUE (entity_id, param_type, name)
);

CREATE INDEX idx_action_param_entity ON meta.ont_action_param(entity_id);

-- ── ont_audit_log ─────────────────────────────────────────────────────────────
CREATE TABLE meta.ont_audit_log (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_id  BIGINT       REFERENCES meta.ont_entity(id),
    action_id  BIGINT       REFERENCES meta.ont_entity(id),
    status     VARCHAR(20)  NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','running','done','failed','ignored')),
    result     JSONB,
    started_at TIMESTAMPTZ,
    ended_at   TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON COLUMN meta.ont_audit_log.entity_id IS '操作关联的实体，如 MarketEvent 实例';
COMMENT ON COLUMN meta.ont_audit_log.action_id IS '触发的 Action 实体实例';
COMMENT ON COLUMN meta.ont_audit_log.status    IS 'pending|running|done|failed|ignored';

CREATE INDEX idx_audit_log_entity ON meta.ont_audit_log(entity_id);
CREATE INDEX idx_audit_log_action ON meta.ont_audit_log(action_id);
CREATE INDEX idx_audit_log_status ON meta.ont_audit_log(status);

CREATE TRIGGER trg_audit_log_updated_at
    BEFORE UPDATE ON meta.ont_audit_log
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();
