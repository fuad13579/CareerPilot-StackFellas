"""Todo routes for to-do item management."""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Todo
from app.models.todo_models import TodoCreate, TodoUpdate, TodoResponse
from app.services.user_context_service import require_anonymous_user_id


router = APIRouter()


@router.post("", response_model=TodoResponse)
def create_todo(
    request: TodoCreate,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> TodoResponse:
    """Create a new to-do item."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    db_todo = Todo(
        anonymous_user_id=anonymous_user_id,
        title=request.title,
        description=request.description,
        due_date=request.due_date,
        linked_type=request.linked_type,
        linked_id=request.linked_id,
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
        linked_type=db_todo.linked_type,
        linked_id=db_todo.linked_id,
        created_at=db_todo.created_at.isoformat(),
    )


@router.get("", response_model=list[TodoResponse])
def get_todos(
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> list[TodoResponse]:
    """Get all to-do items."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    todos = (
        db.query(Todo)
        .filter(Todo.anonymous_user_id == anonymous_user_id)
        .order_by(Todo.created_at.desc())
        .all()
    )

    return [
        TodoResponse(
            id=todo.id,
            title=todo.title,
            description=todo.description,
            is_completed=todo.is_completed,
            due_date=todo.due_date,
            linked_type=todo.linked_type,
            linked_id=todo.linked_id,
            created_at=todo.created_at.isoformat(),
        )
        for todo in todos
    ]


@router.get("/stats", response_model=TodoStats)
def get_todo_stats(db: Session = Depends(get_db)) -> TodoStats:
    """Get todo statistics for progress tracking."""
    total = db.query(Todo).count()
    completed = db.query(Todo).filter(Todo.is_completed == True).count()
    remaining = total - completed
    progress_percentage = (completed / total * 100) if total > 0 else 0.0

    return TodoStats(
        total=total,
        completed=completed,
        remaining=remaining,
        progress_percentage=round(progress_percentage, 1),
    )


@router.patch("/{todo_id}", response_model=TodoResponse)
def update_todo(
    todo_id: int,
    request: TodoUpdate,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> TodoResponse:
    """Update a to-do item."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    todo = (
        db.query(Todo)
        .filter(Todo.id == todo_id, Todo.anonymous_user_id == anonymous_user_id)
        .first()
    )
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
    if request.linked_type is not None:
        todo.linked_type = request.linked_type
    if request.linked_id is not None:
        todo.linked_id = request.linked_id

    db.commit()
    db.refresh(todo)

    return TodoResponse(
        id=todo.id,
        title=todo.title,
        description=todo.description,
        is_completed=todo.is_completed,
        due_date=todo.due_date,
        linked_type=todo.linked_type,
        linked_id=todo.linked_id,
        created_at=todo.created_at.isoformat(),
    )


@router.delete("/{todo_id}")
def delete_todo(
    todo_id: int,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> dict:
    """Delete a to-do item."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    todo = (
        db.query(Todo)
        .filter(Todo.id == todo_id, Todo.anonymous_user_id == anonymous_user_id)
        .first()
    )
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(todo)
    db.commit()
    return {"message": "Todo deleted"}
