from fastapi import APIRouter
from pydantic import BaseModel


class QueryRequest(BaseModel):
    dataset: str
    dimensions: list[str] = []
    metrics: list[dict] = []  # [{"field": "spread", "agg": "AVG"}]
    filters: list[dict] = []


router = APIRouter()


@router.post("/run")
def run_query(req: QueryRequest):
    """Execute a query and return aggregated results."""
    return {"rows": [], "duration_ms": 0}
