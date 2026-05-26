import asyncpg
from app.models.ontology import (
    OntType, OntEntity, OntEntityDetail, OntAspect, OntProperty,
    OntPropertyEnum, AspectWithValues, PropertyValue,
    OntLinkType, OntEntityLink, LineageGraph, LineageNode,
)


async def list_types(pool: asyncpg.Pool) -> list[OntType]:
    rows = await pool.fetch(
        "SELECT id, name, display_name, description, is_system, status "
        "FROM meta.ont_type WHERE status = 1 ORDER BY is_system DESC, name"
    )
    return [OntType(**dict(r)) for r in rows]


async def list_entities(
    pool: asyncpg.Pool,
    type_name: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[OntEntity], int]:
    conditions = ["e.status = 1"]
    params: list = []
    i = 1

    if type_name:
        conditions.append(f"t.name = ${i}")
        params.append(type_name)
        i += 1
    if search:
        conditions.append(f"(e.name ILIKE ${i} OR e.display_name ILIKE ${i} OR e.urn ILIKE ${i})")
        params.append(f"%{search}%")
        i += 1

    where = "WHERE " + " AND ".join(conditions)

    total = await pool.fetchval(
        f"SELECT COUNT(*) FROM meta.ont_entity e JOIN meta.ont_type t ON e.type_id = t.id {where}",
        *params,
    )

    rows = await pool.fetch(
        f"""
        SELECT e.id, e.type_id, t.name AS type_name, e.urn, e.name, e.display_name,
               e.platform, e.env, e.description, e.is_system, e.status,
               e.current_version, e.created_at, e.updated_at
        FROM meta.ont_entity e
        JOIN meta.ont_type t ON e.type_id = t.id
        {where}
        ORDER BY e.updated_at DESC
        LIMIT ${i} OFFSET ${i+1}
        """,
        *params, limit, offset,
    )
    return [OntEntity(**dict(r)) for r in rows], total


async def get_entity(pool: asyncpg.Pool, entity_id: int) -> OntEntityDetail | None:
    row = await pool.fetchrow(
        """
        SELECT e.id, e.type_id, t.name AS type_name, e.urn, e.name, e.display_name,
               e.platform, e.env, e.description, e.is_system, e.status,
               e.current_version, e.created_at, e.updated_at
        FROM meta.ont_entity e
        JOIN meta.ont_type t ON e.type_id = t.id
        WHERE e.id = $1
        """,
        entity_id,
    )
    if not row:
        return None

    entity = OntEntityDetail(**dict(row))

    # 加载当前属性值（按 aspect 分组）
    value_rows = await pool.fetch(
        """
        SELECT a.id AS aspect_id, a.name AS aspect_name, a.display_name AS aspect_display,
               p.id AS property_id, p.name AS property_name, p.display_name AS prop_display,
               p.data_type, v.value
        FROM meta.ont_entity_property_value v
        JOIN meta.ont_property p ON v.property_id = p.id
        JOIN meta.ont_aspect a ON p.aspect_id = a.id
        WHERE v.entity_id = $1 AND v.end_version IS NULL
        ORDER BY a.sort_order, p.sort_order
        """,
        entity_id,
    )

    aspects: dict[int, AspectWithValues] = {}
    for r in value_rows:
        if r["aspect_id"] not in aspects:
            aspects[r["aspect_id"]] = AspectWithValues(
                aspect_id=r["aspect_id"],
                aspect_name=r["aspect_name"],
                display_name=r["aspect_display"],
            )
        aspects[r["aspect_id"]].properties.append(PropertyValue(
            property_id=r["property_id"],
            property_name=r["property_name"],
            display_name=r["prop_display"],
            data_type=r["data_type"],
            value=r["value"],
        ))

    entity.aspects = list(aspects.values())
    return entity


async def get_entity_by_urn(pool: asyncpg.Pool, urn: str) -> OntEntityDetail | None:
    row = await pool.fetchrow("SELECT id FROM meta.ont_entity WHERE urn = $1", urn)
    if not row:
        return None
    return await get_entity(pool, row["id"])


async def list_link_types(pool: asyncpg.Pool) -> list[OntLinkType]:
    rows = await pool.fetch(
        """
        SELECT lt.id, lt.name, lt.display_name,
               lt.source_type_id, st.name AS source_type_name,
               lt.target_type_id, tt.name AS target_type_name,
               lt.cardinality, lt.is_directed, lt.qualifier_values,
               lt.is_system, lt.status
        FROM meta.ont_link_type lt
        JOIN meta.ont_type st ON lt.source_type_id = st.id
        JOIN meta.ont_type tt ON lt.target_type_id = tt.id
        WHERE lt.status = 1
        ORDER BY lt.is_system DESC, lt.name
        """
    )
    return [OntLinkType(**dict(r)) for r in rows]


async def get_entity_links(
    pool: asyncpg.Pool,
    entity_id: int,
    direction: str = "both",  # "out" | "in" | "both"
) -> list[OntEntityLink]:
    if direction == "out":
        cond = "el.source_id = $1"
    elif direction == "in":
        cond = "el.target_id = $1"
    else:
        cond = "(el.source_id = $1 OR el.target_id = $1)"

    rows = await pool.fetch(
        f"""
        SELECT el.id, el.link_type_id, lt.name AS link_type_name, lt.display_name AS link_display_name,
               el.source_id, se.urn AS source_urn, se.name AS source_name,
               el.target_id, te.urn AS target_urn, te.name AS target_name,
               el.qualifier, el.confidence, el.status
        FROM meta.ont_entity_link el
        JOIN meta.ont_link_type lt ON el.link_type_id = lt.id
        JOIN meta.ont_entity se ON el.source_id = se.id
        JOIN meta.ont_entity te ON el.target_id = te.id
        WHERE {cond} AND el.status = 1
        ORDER BY lt.name
        """,
        entity_id,
    )
    return [OntEntityLink(**dict(r)) for r in rows]


async def get_lineage_graph(
    pool: asyncpg.Pool,
    entity_id: int,
    depth: int = 3,
) -> LineageGraph:
    """BFS 遍历 ont_upstream_lineage，构建血缘图。"""
    visited_ids: set[int] = set()
    nodes: dict[int, LineageNode] = {}
    edges: list[dict] = []

    async def load_node(eid: int) -> LineageNode | None:
        if eid in nodes:
            return nodes[eid]
        row = await pool.fetchrow(
            """
            SELECT e.id, e.urn, e.name, e.display_name, t.name AS type_name, e.platform
            FROM meta.ont_entity e JOIN meta.ont_type t ON e.type_id = t.id
            WHERE e.id = $1
            """,
            eid,
        )
        if not row:
            return None
        node = LineageNode(**dict(row))
        nodes[eid] = node
        return node

    queue = [(entity_id, 0)]
    while queue:
        eid, d = queue.pop(0)
        if eid in visited_ids or d > depth:
            continue
        visited_ids.add(eid)
        await load_node(eid)

        # 上游
        upstream_rows = await pool.fetch(
            "SELECT id, upstream_urn, lineage_type FROM meta.ont_upstream_lineage WHERE entity_id = $1",
            eid,
        )
        for r in upstream_rows:
            up_row = await pool.fetchrow(
                "SELECT id FROM meta.ont_entity WHERE urn = $1", r["upstream_urn"]
            )
            if up_row:
                up_id = up_row["id"]
                await load_node(up_id)
                edges.append({
                    "id": f"e_{up_id}_{eid}",
                    "source": up_id,
                    "target": eid,
                    "lineage_type": r["lineage_type"],
                })
                if up_id not in visited_ids:
                    queue.append((up_id, d + 1))

        # 下游
        downstream_rows = await pool.fetch(
            """
            SELECT ul.entity_id, ul.lineage_type
            FROM meta.ont_upstream_lineage ul
            JOIN meta.ont_entity e ON ul.entity_id = e.id
            WHERE ul.upstream_urn = (SELECT urn FROM meta.ont_entity WHERE id = $1)
            """,
            eid,
        )
        for r in downstream_rows:
            down_id = r["entity_id"]
            await load_node(down_id)
            edges.append({
                "id": f"e_{eid}_{down_id}",
                "source": eid,
                "target": down_id,
                "lineage_type": r["lineage_type"],
            })
            if down_id not in visited_ids:
                queue.append((down_id, d + 1))

    # 去重 edges
    seen_edges: set[str] = set()
    unique_edges = []
    for e in edges:
        if e["id"] not in seen_edges:
            seen_edges.add(e["id"])
            unique_edges.append(e)

    return LineageGraph(nodes=list(nodes.values()), edges=unique_edges)


async def search_entities(
    pool: asyncpg.Pool,
    q: str,
    limit: int = 20,
) -> list[OntEntity]:
    rows = await pool.fetch(
        """
        SELECT e.id, e.type_id, t.name AS type_name, e.urn, e.name, e.display_name,
               e.platform, e.env, e.description, e.is_system, e.status,
               e.current_version, e.created_at, e.updated_at
        FROM meta.ont_entity e
        JOIN meta.ont_type t ON e.type_id = t.id
        WHERE e.status = 1
          AND (e.name ILIKE $1 OR e.display_name ILIKE $1 OR e.urn ILIKE $1 OR e.description ILIKE $1)
        ORDER BY e.updated_at DESC
        LIMIT $2
        """,
        f"%{q}%", limit,
    )
    return [OntEntity(**dict(r)) for r in rows]
