from fastapi import APIRouter

router = APIRouter()


@router.get("/audit")
async def get_audit(limit: int = 20):
    return {"audit_log": [], "note": "implemented Sunday"}