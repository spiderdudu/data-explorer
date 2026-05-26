from fastapi import APIRouter

from app.api.v1 import ontology

router = APIRouter()
router.include_router(ontology.router, prefix="/ontology", tags=["ontology"])
