from fastapi import APIRouter

router = APIRouter()


@router.get("/dashboard/stats")
async def get_stats():
    return {"note": "implemented Tuesday"}