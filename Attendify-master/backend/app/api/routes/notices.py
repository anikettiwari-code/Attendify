from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.attendance import Notice
from pydantic import BaseModel
from datetime import datetime
from typing import List

router = APIRouter()

class NoticeBase(BaseModel):
    title: str
    content: str
    author: str = "Admin"

class NoticeResponse(NoticeBase):
    id: int
    date: datetime
    class Config:
        from_attributes = True

@router.post("/", response_model=NoticeResponse)
def create_notice(notice: NoticeBase, db: Session = Depends(get_db)):
    db_notice = Notice(title=notice.title, content=notice.content, author=notice.author)
    db.add(db_notice)
    db.commit()
    db.refresh(db_notice)
    return db_notice

@router.get("/", response_model=List[NoticeResponse])
def get_notices(db: Session = Depends(get_db)):
    return db.query(Notice).order_by(Notice.date.desc()).all()

@router.delete("/{notice_id}")
def delete_notice(notice_id: int, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
    return {"message": "Notice deleted"}
