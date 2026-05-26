from pydantic import BaseModel
from datetime import datetime


class OntType(BaseModel):
    id: int
    name: str
    display_name: str | None
    description: str | None
    is_system: bool
    status: int


class OntAspect(BaseModel):
    id: int
    type_id: int
    name: str
    display_name: str | None
    description: str | None
    is_system: bool
    sort_order: int
    status: int


class OntProperty(BaseModel):
    id: int
    aspect_id: int
    type_id: int | None
    name: str
    display_name: str | None
    data_type: str
    is_required: bool
    is_multi: bool
    is_system: bool
    sort_order: int
    status: int
    enums: list["OntPropertyEnum"] = []


class OntPropertyEnum(BaseModel):
    id: int
    property_id: int
    value: str
    display_name: str | None
    sort_order: int


class OntEntity(BaseModel):
    id: int
    type_id: int
    type_name: str | None = None
    urn: str
    name: str
    display_name: str | None
    platform: str
    env: str
    description: str | None
    is_system: bool
    status: int
    current_version: int
    created_at: datetime
    updated_at: datetime


class OntEntityDetail(OntEntity):
    aspects: list["AspectWithValues"] = []


class PropertyValue(BaseModel):
    property_id: int
    property_name: str
    display_name: str | None
    data_type: str
    value: str | None


class AspectWithValues(BaseModel):
    aspect_id: int
    aspect_name: str
    display_name: str | None
    properties: list[PropertyValue] = []


class OntLinkType(BaseModel):
    id: int
    name: str
    display_name: str | None
    source_type_id: int
    source_type_name: str | None = None
    target_type_id: int
    target_type_name: str | None = None
    cardinality: str
    is_directed: bool
    qualifier_values: str | None
    is_system: bool
    status: int


class OntEntityLink(BaseModel):
    id: int
    link_type_id: int
    link_type_name: str | None = None
    link_display_name: str | None = None
    source_id: int
    source_urn: str | None = None
    source_name: str | None = None
    target_id: int
    target_urn: str | None = None
    target_name: str | None = None
    qualifier: str | None
    confidence: float | None
    status: int


class LineageNode(BaseModel):
    id: int
    urn: str
    name: str
    display_name: str | None
    type_name: str
    platform: str


class LineageGraph(BaseModel):
    nodes: list[LineageNode]
    edges: list[dict]
