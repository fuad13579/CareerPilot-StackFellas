"""Todo routes for to-do item management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Todo
from app.models.todo_models import TodoCreate, TodoUpdate, TodoResponse


router = APIRouter()


@router.post("", response_model=TodoResponse)
def create_todo(request: TodoCreate, db: Session = Depends(get_db)) -> TodoResponse:
    """Create a new to-do item."""
    db_todo = Todo(
        title=request.title,
        description=request.description,
        due_date=request.due_date,
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)

    return TodoResponse(
        id=db_todo.id,
        title=db_todo.title,
        description=db_todo.description,
        is_completed=db_todo.is_completed,
        due_date=db_todo.due_date,
        created_at=db_todo.created_at.isoformat(),
    )


@router.get("", response_model=list[TodoResponse])
def get_todos(db: Session = Depends(get_db)) -> list[TodoResponse]:
    """Get all to-do items."""
    todos = db.query(Todo).order_by(Todo.created_at.desc()).all()

    return [
        TodoResponse(
            id=todo.id,
            title=todo.title,
            description=todo.description,
            is_completed=todo.is_completed,
            due_date=todo.due_date,
            created_at=todo.created_at.isoformat(),
        )
        for todo in todos
    ]


@router.patch("/{todo_id}", response_model=TodoResponse)
def update_todo(todo_id: int, request: TodoUpdate, db: Session = Depends(get_db)) -> TodoResponse:
    """Update a to-do item."""
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    if request.title is not None:
        todo.title = request.title
    if request.description is not None:
        todo.description = request.description
    if request.is_completed is not None:
        todo.is_completed = request.is_completed
    if request.due_date is not None:
        todo.due_date = request.due_date

    db.commit()
    db.refresh(todo)

    return TodoResponse(
        id=todo.id,
        title=todo.title,
        description=todo.description,
        is_completed=todo.is_completed,
        due_date=todo.due_date,
        created_at=todo.created_at.isoformat(),
    )


@router.delete("/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)) -> dict:
    """Delete a to-do item."""
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(todo)
    db.commit()
    return {"message": "Todo deleted"}