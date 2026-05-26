from fastapi import APIRouter, Depends, HTTPException, Query
import asyncpg

from app.core.db import get_pool
from app.models.ontology import OntType, OntEntity, OntEntityDetail, OntLinkType, OntEntityLink, LineageGraph
from app.services import ontology_service as svc

router = APIRouter()


@router.get("/types", response_model=list[OntType])
async def list_types(pool: asyncpg.Pool = Depends(get_pool)):
    return await svc.list_types(pool)


@router.get("/entities", response_model=dict)
async def list_entities(
    type_name: str | None = None,
    search: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    pool: asyncpg.Pool = Depends(get_pool),
):
    items, total = await svc.list_entities(pool, type_name=type_name, search=search, limit=limit, offset=offset)
    return {"total": total, "items": [i.model_dump() for i in items]}


@router.get("/entities/search", response_model=list[OntEntity])
async def search_entities(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=100),
    pool: asyncpg.Pool = Depends(get_pool),
):
    return await svc.search_entities(pool, q=q, limit=limit)


@router.get("/entities/{entity_id}", response_model=OntEntityDetail)
async def get_entity(entity_id: int, pool: asyncpg.Pool = Depends(get_pool)):
    entity = await svc.get_entity(pool, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.get("/entities/{entity_id}/links", response_model=list[OntEntityLink])
async def get_entity_links(
    entity_id: int,
    direction: str = Query("both", pattern="^(in|out|both)$"),
    pool: asyncpg.Pool = Depends(get_pool),
):
    return await svc.get_entity_links(pool, entity_id=entity_id, direction=direction)


@router.get("/entities/{entity_id}/lineage", response_model=LineageGraph)
async def get_lineage(
    entity_id: int,
    depth: int = Query(3, ge=1, le=10),
    pool: asyncpg.Pool = Depends(get_pool),
):
    return await svc.get_lineage_graph(pool, entity_id=entity_id, depth=depth)


@router.get("/link-types", response_model=list[OntLinkType])
async def list_link_types(pool: asyncpg.Pool = Depends(get_pool)):
    return await svc.list_link_types(pool)
