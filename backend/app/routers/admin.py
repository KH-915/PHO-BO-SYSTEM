from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
from typing import Optional

from ..database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateUserRequest(BaseModel):
    email: str
    phone: Optional[str] = None
    password: str


class UpdateUserRequest(BaseModel):
    # Phone is optional; empty string should be treated as NULL
    phone: Optional[str] = None
    # is_active should be provided explicitly for the stored procedure
    is_active: bool
    # Optional role to grant; pass null to skip role update
    role_id: Optional[int] = None


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    """List all users with their roles (aggregated) from the database."""
    try:
        result = db.execute(text(
            """
            SELECT 
                u.user_id,
                u.email,
                u.phone_number,
                u.is_active,
                u.created_at,
                u.last_login,
                GROUP_CONCAT(r.role_name ORDER BY r.role_name SEPARATOR ', ') AS roles,
                MIN(r.role_id) AS primary_role_id
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.user_id
            LEFT JOIN roles r ON r.role_id = ur.role_id
            GROUP BY u.user_id
            """
        ))
        users = []
        for row in result:
            users.append({
                # Frontend expects these keys
                "id": row.user_id,
                "email": row.email,
                "phone": row.phone_number,
                "is_active": bool(row.is_active),
                "created_at": str(row.created_at) if row.created_at else None,
                "last_login": str(row.last_login) if row.last_login else None,
                # New: roles display and primary role id for preselect
                "roles": getattr(row, 'roles', None),
                "primary_role_id": int(row.primary_role_id) if getattr(row, 'primary_role_id', None) is not None else None,
            })
        return users
    except SQLAlchemyError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(payload: CreateUserRequest, db: Session = Depends(get_db)):
    """Create a new user by calling the stored procedure sp_create_user."""
    try:
        # Call stored procedure: sp_create_user(email, phone, password)
        db.execute(
            text("CALL sp_create_user(:email, :phone, :password)"),
            {"email": payload.email, "phone": payload.phone, "password": payload.password}
        )
        db.commit()
        return {"message": "User created successfully"}
    except SQLAlchemyError as e:
        db.rollback()
        # Extract the MySQL error message (e.g., "Email already exists")
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)


@router.put("/users/{user_id}")
def update_user(user_id: int, payload: UpdateUserRequest, db: Session = Depends(get_db)):
    """Update a user by calling the stored procedure sp_update_user."""
    try:
        # Normalize empty phone to NULL
        phone = payload.phone if (payload.phone is not None and payload.phone != "") else None
        # Call stored procedure: sp_update_user(user_id, phone, is_active, role_id)
        db.execute(
            text("CALL sp_update_user(:user_id, :phone, :is_active, :role_id)"),
            {"user_id": user_id, "phone": phone, "is_active": payload.is_active, "role_id": payload.role_id}
        )
        db.commit()
        return {"message": "User updated successfully"}
    except SQLAlchemyError as e:
        db.rollback()
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user by calling the stored procedure sp_delete_user."""
    try:
        # Call stored procedure: sp_delete_user(user_id)
        db.execute(text("CALL sp_delete_user(:user_id)"), {"user_id": user_id})
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        # Extract the MySQL error message (e.g., "Cannot delete user who owns a group")
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)


@router.get("/roles")
def list_roles(db: Session = Depends(get_db)):
    """Return all available roles."""
    try:
        result = db.execute(text("SELECT role_id, role_name, description FROM roles"))
        roles = []
        for row in result:
          roles.append({
              "role_id": row.role_id if hasattr(row, 'role_id') else row[0],
              "role_name": row.role_name if hasattr(row, 'role_name') else row[1],
              "description": row.description if hasattr(row, 'description') else row[2],
          })
        return roles
    except SQLAlchemyError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/stats")
def get_statistics(year: int = 2025, min_posts: int = 0, db: Session = Depends(get_db)):
    """Get active users statistics by calling the stored procedure sp_get_active_users."""
    try:
        # Call stored procedure: sp_get_active_users(year, min_posts)
        result = db.execute(
            text("CALL sp_get_active_users(:year, :min_posts)"),
            {"year": year, "min_posts": min_posts}
        )
        
        stats = []
        for row in result:
            # Assume the procedure returns: user_id, email, total_posts, activity_score
            stats.append({
                "user_id": row[0],
                "email": row[1],
                "total_posts": row[2],
                "activity_score": row[3] if len(row) > 3 else None,
            })
        return stats
    except SQLAlchemyError as e:
        db.rollback()
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg)
