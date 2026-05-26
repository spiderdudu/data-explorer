from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_datasets():
    """List all available datasets."""
    return []


@router.get("/{dataset_name}")
def get_dataset(dataset_name: str):
    """Get dataset schema and metadata."""
    return {}


@router.get("/{dataset_name}/preview")
def preview_dataset(dataset_name: str, limit: int = 20):
    """Preview dataset rows."""
    return {"rows": [], "total": 0}
