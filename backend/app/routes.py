from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response,UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
import os
from datetime import datetime, timedelta

from jose import jwt, JWTError
from passlib.context import CryptContext

from .database import get_db
from . import models, schemas
from sqlalchemy import desc, func
from typing import Optional
from .cloudinary_utils import upload_to_cloudinary
from uuid import uuid4
from fastapi import Body

router = APIRouter()

# --- Simple auth helpers (JWT cookie + bcrypt) ---
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except Exception as e:
        # bubble a clear server error for easier debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Password hashing failed: {e}")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def _get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.user_id == user_id).first()

# def get_current_user_from_cookie(request: Request, db: Session):
#     token = request.cookies.get("access_token")
#     if not token:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         sub = payload.get("sub")
#         if not sub:
#             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
#         user = _get_user_by_id(db, int(sub))
#         if not user:
#             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
#         return user
#     except JWTError:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
def get_current_user_from_cookie(request: Request, db: Session):
    token = request.cookies.get("access_token")

    # fallback to Authorization header so SPA/localStorage flows work too
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = _get_user_by_id(db, int(sub))
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
# --- Helpers ---
def _friendship_status(db: Session, viewer_id: Optional[int], target_id: int) -> str:
    if viewer_id is None or viewer_id == target_id:
        return "NONE" if viewer_id is None else "SELF"
    fr = _get_friendship_by_users(db, viewer_id, target_id)
    return fr.status.value if fr else "NONE"


# --- Auth endpoints: register / login / logout / users/me ---
@router.post('/auth/register', status_code=status.HTTP_201_CREATED)
def auth_register(payload: dict, response: Response, db: Session = Depends(get_db)):
    # payload expected: {email, password, phone_number?, first_name?, last_name?}
        email = payload.get('email')
        password = payload.get('password')
        phone = payload.get('phone_number')
        first_name = payload.get('first_name') or ""
        last_name = payload.get('last_name') or ""
        date_of_birth = payload.get('date_of_birth')
        gender = payload.get('gender')

        # Convert empty string to None for phone_number
        if phone == '':
            phone = None

        if not email or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing email or password"
            )

        # --- check trùng email ---
        existing_email = db.query(models.User).filter(models.User.email == email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="EMAIL_EXIST"
            )

        # --- check trùng phone (nếu có) ---
        if phone:
            existing_phone = db.query(models.User).filter(models.User.phone_number == phone).first()
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="PHONE_EXIST"
                )

        # tạo user
        user = models.User(
            email=email,
            phone_number=phone,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # tạo profile kèm thông tin cơ bản
        try:
            profile = models.Profile(
                user_id=user.user_id,
                first_name=first_name,
                last_name=last_name,
                date_of_birth=date_of_birth,   # DB kiểu DATE thì passing string YYYY-MM-DD vẫn ok
                gender=gender,
            )
            db.add(profile)
            db.commit()
        except Exception:
            db.rollback()

        # tạo token + set cookie
        token = create_access_token({"sub": str(user.user_id)})
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        # Fetch user roles (will be empty for new users unless default role is assigned)
        user_roles = (
            db.query(models.Role)
            .join(models.UserRole, models.UserRole.role_id == models.Role.role_id)
            .filter(models.UserRole.user_id == user.user_id)
            .all()
        )
        roles = [{"role_id": role.role_id, "role_name": role.role_name} for role in user_roles]
        is_admin = any(role.role_name.lower() == "system admin" for role in user_roles)
        
        return {
            "message": "Đăng ký thành công",
            "user": {
                "user_id": user.user_id,
                "email": user.email,
                "first_name": first_name,
                "last_name": last_name,
                "roles": roles,
                "is_admin": is_admin
            }
        }


@router.post('/auth/login')
def auth_login(payload: dict, response: Response, db: Session = Depends(get_db)):
    # payload expected: {"email":..., "password":...}
    email = payload.get('email')
    password = payload.get('password')
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email hoặc mật khẩu không chính xác")
    # update last_login
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": str(user.user_id)})
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="lax", max_age=ACCESS_TOKEN_EXPIRE_MINUTES*60)

    # return user info
    profile = db.query(models.Profile).filter(models.Profile.user_id == user.user_id).first()
    
    # Fetch user roles
    user_roles = (
        db.query(models.Role)
        .join(models.UserRole, models.UserRole.role_id == models.Role.role_id)
        .filter(models.UserRole.user_id == user.user_id)
        .all()
    )
    roles = [{"role_id": role.role_id, "role_name": role.role_name} for role in user_roles]
    is_admin = any(role.role_name.lower() == "system admin" for role in user_roles)
    
    user_info = {"user_id": user.user_id, "email": user.email, "roles": roles, "is_admin": is_admin}
    if profile:
        user_info.update({"first_name": profile.first_name, "last_name": profile.last_name})
    return {"access_token": token, "token_type": "Bearer", "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES*60, "user": user_info}


@router.post('/auth/logout')
def auth_logout(response: Response):
    response.delete_cookie('access_token')
    return {"message": "Logged out"}



@router.get('/users/me')
def users_me(request: Request, db: Session = Depends(get_db)):
    """Get current user information including roles"""
    user = get_current_user_from_cookie(request, db)
    profile = db.query(models.Profile).filter(models.Profile.user_id == user.user_id).first()

    # Fetch user roles
    user_roles = (
        db.query(models.Role)
        .join(models.UserRole, models.UserRole.role_id == models.Role.role_id)
        .filter(models.UserRole.user_id == user.user_id)
        .all()
    )
    roles = [{"role_id": role.role_id, "role_name": role.role_name} for role in user_roles]
    is_admin = any(role.role_name.lower() == "system admin" for role in user_roles)
    
    print(f"DEBUG /users/me - User ID: {user.user_id}, Roles: {roles}, Is Admin: {is_admin}")

    data = {
        "user_id": user.user_id,
        "email": user.email,
        "roles": roles,
        "is_admin": is_admin,
    }

    if profile:
        data.update({
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "profile_picture_url": profile.profile_picture_url,
            "cover_photo_url": getattr(profile, "cover_photo_url", None),
            "bio": getattr(profile, "bio", None),
            "date_of_birth": getattr(profile, "date_of_birth", None),
            "gender": getattr(profile, "gender", None),
        })

    return data



@router.get('/users/suggestions')
def users_suggestions(request: Request, db: Session = Depends(get_db)):
    """Return a list of user suggestions (exclude current user and existing friendships/pending)."""
    current = get_current_user_from_cookie(request, db)
    current_id = current.user_id

    # find related user ids via friendships where current is either one or two and status is pending/accepted
    related = (
        db.query(models.Friendship)
        .filter(
            or_(models.Friendship.user_one_id == current_id, models.Friendship.user_two_id == current_id)
        )
        .all()
    )
    exclude_ids = {current_id}
    for r in related:
        # pick the other user id
        other = r.user_two_id if r.user_one_id == current_id else r.user_one_id
        exclude_ids.add(other)

    # query users excluding those ids, include profile info
    q = (
        db.query(models.User, models.Profile)
        .outerjoin(models.Profile, models.Profile.user_id == models.User.user_id)
        .filter(~models.User.user_id.in_(list(exclude_ids)))
        .limit(100)  # Increased limit to show more users
    )
    results = []
    for user, profile in q.all():
        results.append(
            {
                "user_id": user.user_id,
                "email": user.email,
                "first_name": getattr(profile, "first_name", "") if profile else "",
                "last_name": getattr(profile, "last_name", "") if profile else "",
                "avatar_url": getattr(profile, "profile_picture_url", None) if profile else None,
            }
        )
    return results


@router.get('/feed')
def get_feed(request: Request, db: Session = Depends(get_db), limit: int = 20):
    """Return feed posts that the current user is allowed to see.
    Rules:
      - Public posts are visible to everyone
      - Friends posts are visible to accepted friends
      - Users always see their own posts
    """
    try:
        current = get_current_user_from_cookie(request, db)
        current_id = current.user_id
    except HTTPException:
        # not authenticated: only show public posts
        current = None
        current_id = None

    friend_ids = set()
    if current_id:
        frs = db.query(models.Friendship).filter(
            or_(models.Friendship.user_one_id == current_id, models.Friendship.user_two_id == current_id),
            models.Friendship.status == models.FriendshipStatus.ACCEPTED,
        ).all()
        for f in frs:
            other = f.user_two_id if f.user_one_id == current_id else f.user_one_id
            friend_ids.add(other)

    # build query - include public posts, user's own posts, friends' posts, group posts, and followed page posts
    conds = [models.Post.privacy_setting == models.PrivacySetting.PUBLIC]
    if current_id:
        conds.append(models.Post.author_id == current_id)
        if friend_ids:
            conds.append(and_(models.Post.privacy_setting == models.PrivacySetting.FRIENDS, models.Post.author_id.in_(list(friend_ids))))
        
        # Add posts from groups the user has joined
        joined_groups = db.query(models.GroupMembership.group_id).filter(
            models.GroupMembership.user_id == current_id,
            models.GroupMembership.status == models.GroupMemberStatus.JOINED
        ).all()
        joined_group_ids = [g[0] for g in joined_groups]
        
        if joined_group_ids:
            # Get post IDs from these groups
            group_post_ids = db.query(models.PostLocation.post_id).filter(
                models.PostLocation.location_type == models.LocationType.GROUP,
                models.PostLocation.location_id.in_(joined_group_ids)
            ).all()
            group_post_ids = [p[0] for p in group_post_ids]
            
            if group_post_ids:
                conds.append(models.Post.post_id.in_(group_post_ids))
        
        # Add posts from pages the user follows
        followed_pages = db.query(models.PageFollow.page_id).filter(
            models.PageFollow.user_id == current_id
        ).all()
        followed_page_ids = [p[0] for p in followed_pages]
        
        if followed_page_ids:
            # Get post IDs from these pages
            page_post_ids = db.query(models.PostLocation.post_id).filter(
                models.PostLocation.location_type == models.LocationType.PAGE_TIMELINE,
                models.PostLocation.location_id.in_(followed_page_ids)
            ).all()
            page_post_ids = [p[0] for p in page_post_ids]
            
            if page_post_ids:
                conds.append(models.Post.post_id.in_(page_post_ids))

    query = db.query(models.Post).filter(or_(*conds)).order_by(desc(models.Post.created_at)).limit(limit)
    posts = []
    for p in query.all():
        profile = db.query(models.Profile).filter(models.Profile.user_id == p.author_id).first()
        # compute reaction/comment stats
        likes = (
            db.query(func.count(models.Reaction.reactable_id))
            .filter(models.Reaction.reactable_type == models.ReactionTargetType.POST, models.Reaction.reactable_id == p.post_id)
            .scalar()
        )
        comments = (
            db.query(func.count(models.Comment.comment_id))
            .filter(models.Comment.commentable_type == models.CommentableType.POST, models.Comment.commentable_id == p.post_id)
            .scalar()
        )
        is_liked = False
        if current_id:
            exists = (
                db.query(models.Reaction)
                .filter(models.Reaction.reactable_type == models.ReactionTargetType.POST,
                        models.Reaction.reactable_id == p.post_id,
                        models.Reaction.reactor_user_id == current_id)
                .first()
            )
            is_liked = True if exists else False

        post_data = {
            "post_id": p.post_id,
            "author_id": p.author_id,
            "author_name": (profile.first_name + ' ' + profile.last_name) if profile else None,
            "author_avatar": getattr(profile, 'profile_picture_url', None) if profile else None,
            "text_content": p.text_content,
            "privacy_setting": p.privacy_setting,
            "created_at": p.created_at,
            "post_type": p.post_type,
            "stats": {"likes": int(likes or 0), "comments": int(comments or 0)},
            "is_liked_by_me": bool(is_liked),
            "files": [],
            "location": None
        }
        
        # Get post location (if posted in group or page)
        post_location = db.query(models.PostLocation).filter(models.PostLocation.post_id == p.post_id).first()
        if post_location:
            if post_location.location_type == models.LocationType.GROUP:
                group = db.query(models.Group).filter(models.Group.group_id == post_location.location_id).first()
                if group:
                    post_data["location"] = {
                        "type": "GROUP",
                        "group_id": group.group_id,
                        "group_name": group.group_name
                    }
            elif post_location.location_type == models.LocationType.PAGE_TIMELINE:
                page = db.query(models.Page).filter(models.Page.page_id == post_location.location_id).first()
                if page:
                    post_data["location"] = {
                        "type": "PAGE",
                        "page_id": page.page_id,
                        "page_name": page.page_name
                    }
                    # Override author info to show page name
                    post_data["author_name"] = page.page_name
                    post_data["author_avatar"] = None

        # Get attached files
        post_files = (
            db.query(models.PostFile)
            .filter(models.PostFile.post_id == p.post_id)
            .order_by(models.PostFile.display_order)
            .all()
        )
        for pf in post_files:
            file_obj = db.query(models.File).filter(models.File.file_id == pf.file_id).first()
            if file_obj:
                # Determine file kind
                kind = "FILE"
                if file_obj.file_type.startswith("image/"):
                    kind = "IMAGE"
                elif file_obj.file_type.startswith("video/"):
                    kind = "VIDEO"
                
                # Get file stats (reactions and comments)
                file_likes = (
                    db.query(func.count(models.Reaction.reactable_id))
                    .filter(models.Reaction.reactable_type == models.ReactionTargetType.FILE, 
                           models.Reaction.reactable_id == file_obj.file_id)
                    .scalar()
                )
                file_comments = (
                    db.query(func.count(models.Comment.comment_id))
                    .filter(models.Comment.commentable_type == models.CommentableType.FILE,
                           models.Comment.commentable_id == file_obj.file_id)
                    .scalar()
                )
                file_is_liked = False
                if current_id:
                    file_reaction = (
                        db.query(models.Reaction)
                        .filter(models.Reaction.reactable_type == models.ReactionTargetType.FILE,
                               models.Reaction.reactable_id == file_obj.file_id,
                               models.Reaction.reactor_user_id == current_id)
                        .first()
                    )
                    file_is_liked = True if file_reaction else False

                post_data["files"].append({
                    "file_id": file_obj.file_id,
                    "file_name": file_obj.file_name,
                    "file_type": file_obj.file_type,
                    "file_url": file_obj.file_url,
                    "thumbnail_url": file_obj.thumbnail_url,
                    "kind": kind,
                    "stats": {"likes": int(file_likes or 0), "comments": int(file_comments or 0)},
                    "is_liked_by_me": bool(file_is_liked)
                })

        # If this is a shared post, include the original post data recursively
        if p.post_type == models.PostType.SHARE and p.parent_post_id:
            def get_shared_post_data(post_id):
                shared = db.query(models.Post).filter(models.Post.post_id == post_id).first()
                if not shared:
                    return None
                shared_profile = db.query(models.Profile).filter(models.Profile.user_id == shared.author_id).first()
                shared_data = {
                    "post_id": shared.post_id,
                    "author_id": shared.author_id,
                    "author_name": (shared_profile.first_name + ' ' + shared_profile.last_name) if shared_profile else None,
                    "author_avatar": getattr(shared_profile, 'profile_picture_url', None) if shared_profile else None,
                    "text_content": shared.text_content,
                    "privacy_setting": shared.privacy_setting,
                    "created_at": shared.created_at,
                    "post_type": shared.post_type,
                    "files": []
                }
                
                # Get files for shared post
                shared_post_files = (
                    db.query(models.PostFile)
                    .filter(models.PostFile.post_id == shared.post_id)
                    .order_by(models.PostFile.display_order)
                    .all()
                )
                for spf in shared_post_files:
                    sfile_obj = db.query(models.File).filter(models.File.file_id == spf.file_id).first()
                    if sfile_obj:
                        kind = "FILE"
                        if sfile_obj.file_type.startswith("image/"):
                            kind = "IMAGE"
                        elif sfile_obj.file_type.startswith("video/"):
                            kind = "VIDEO"
                        shared_data["files"].append({
                            "file_id": sfile_obj.file_id,
                            "file_name": sfile_obj.file_name,
                            "file_type": sfile_obj.file_type,
                            "file_url": sfile_obj.file_url,
                            "thumbnail_url": sfile_obj.thumbnail_url,
                            "kind": kind
                        })
                
                # Recursively get parent if this is also a share
                if shared.post_type == models.PostType.SHARE and shared.parent_post_id:
                    shared_data["shared_post"] = get_shared_post_data(shared.parent_post_id)
                return shared_data
            
            post_data["shared_post"] = get_shared_post_data(p.parent_post_id)

        posts.append(post_data)
    return posts


@router.post('/friends/{target_id}', response_model=schemas.Friendship, status_code=status.HTTP_201_CREATED)
def send_friend_request(target_id: int, request: Request, db: Session = Depends(get_db)):
    """Create a PENDING friendship request between current user and target user.
    The friendship is stored such that user_one_id < user_two_id.
    """
    current = get_current_user_from_cookie(request, db)
    current_id = current.user_id
    if current_id == target_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot friend yourself")

    # ensure target exists
    target = db.query(models.User).filter(models.User.user_id == target_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    user_one = min(current_id, target_id)
    user_two = max(current_id, target_id)

    existing = db.query(models.Friendship).filter(
        models.Friendship.user_one_id == user_one, models.Friendship.user_two_id == user_two
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friendship already exists")

    record = models.Friendship(
        user_one_id=user_one,
        user_two_id=user_two,
        status=models.FriendshipStatus.PENDING,
        action_user_id=current_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get('/friends/requests')
def list_incoming_friend_requests(request: Request, db: Session = Depends(get_db)):
    """Return pending friendship requests where the current user is the recipient."""
    current = get_current_user_from_cookie(request, db)
    current_id = current.user_id

    # pending friendships involving current user where action_user_id != current (i.e., they requested)
    q = db.query(models.Friendship).filter(
        or_(models.Friendship.user_one_id == current_id, models.Friendship.user_two_id == current_id),
        models.Friendship.status == models.FriendshipStatus.PENDING,
        models.Friendship.action_user_id != current_id,
    )
    results = []
    for f in q.all():
        other = f.user_two_id if f.user_one_id == current_id else f.user_one_id
        user = db.query(models.User).filter(models.User.user_id == other).first()
        profile = db.query(models.Profile).filter(models.Profile.user_id == other).first()
        results.append({
            "user_id": other,
            "first_name": getattr(profile, 'first_name', '') if profile else '',
            "last_name": getattr(profile, 'last_name', '') if profile else '',
            "avatar_url": getattr(profile, 'profile_picture_url', None) if profile else None,
        })
    return results


@router.get('/friends')
def list_friends(request: Request, db: Session = Depends(get_db)):
    """Return accepted friends for current user."""
    current = get_current_user_from_cookie(request, db)
    current_id = current.user_id

    q = db.query(models.Friendship).filter(
        or_(models.Friendship.user_one_id == current_id, models.Friendship.user_two_id == current_id),
        models.Friendship.status == models.FriendshipStatus.ACCEPTED,
    )
    results = []
    for f in q.all():
        other = f.user_two_id if f.user_one_id == current_id else f.user_one_id
        user = db.query(models.User).filter(models.User.user_id == other).first()
        profile = db.query(models.Profile).filter(models.Profile.user_id == other).first()
        results.append({
            "user_id": other,
            "first_name": getattr(profile, 'first_name', '') if profile else '',
            "last_name": getattr(profile, 'last_name', '') if profile else '',
            "avatar_url": getattr(profile, 'profile_picture_url', None) if profile else None,
        })
    return results


def _get_friendship_by_users(db: Session, a: int, b: int):
    one = min(a, b)
    two = max(a, b)
    return db.query(models.Friendship).filter(models.Friendship.user_one_id == one, models.Friendship.user_two_id == two).first()


@router.put('/friends/{target_id}/accept', response_model=schemas.Friendship)
def accept_friend_request(target_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    current_id = current.user_id
    if current_id == target_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target")
    rec = _get_friendship_by_users(db, current_id, target_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found")
    if rec.status != models.FriendshipStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Not pending")
    # ensure current user is the recipient (action_user_id != current)
    if rec.action_user_id == current_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot accept your own request")
    rec.status = models.FriendshipStatus.ACCEPTED
    rec.action_user_id = current_id
    db.commit()
    db.refresh(rec)
    return rec


@router.delete('/friends/{target_id}/reject', status_code=status.HTTP_204_NO_CONTENT)
def reject_friend_request(target_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    current_id = current.user_id
    rec = _get_friendship_by_users(db, current_id, target_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found")
    if rec.status != models.FriendshipStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Not pending")
    # only recipient can reject
    if rec.action_user_id == current_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reject your own request")
    db.delete(rec)
    db.commit()


@router.delete('/friends/{target_id}', status_code=status.HTTP_204_NO_CONTENT)
def unfriend(target_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    current_id = current.user_id
    rec = _get_friendship_by_users(db, current_id, target_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found")
    db.delete(rec)
    db.commit()



def _get_simple_object(db: Session, model_cls, pk_field: str, item_id: int):
    obj = db.query(model_cls).filter(getattr(model_cls, pk_field) == item_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return obj


def register_simple_crud(prefix: str, model_cls, create_schema, update_schema, response_schema, pk_field: str):
    list_path = f"/{prefix}"
    item_path = f"/{prefix}/{{item_id}}"

    @router.post(list_path, response_model=response_schema, status_code=status.HTTP_201_CREATED)
    def create_item(payload: create_schema, db: Session = Depends(get_db)):
        obj = model_cls(**payload.model_dump(exclude_unset=True))
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @router.get(list_path, response_model=list[response_schema])
    def list_items(db: Session = Depends(get_db)):
        return db.query(model_cls).all()

    @router.get(item_path, response_model=response_schema)
    def read_item(item_id: int, db: Session = Depends(get_db)):
        return _get_simple_object(db, model_cls, pk_field, item_id)

    @router.put(item_path, response_model=response_schema)
    def update_item(item_id: int, payload: update_schema, db: Session = Depends(get_db)):
        obj = _get_simple_object(db, model_cls, pk_field, item_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return obj

    @router.delete(item_path, status_code=status.HTTP_204_NO_CONTENT)
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        obj = _get_simple_object(db, model_cls, pk_field, item_id)
        db.delete(obj)
        db.commit()


# Register CRUD routes for single primary-key tables
# Comment out users simple CRUD - we have custom endpoints for user profile
# register_simple_crud(
#     prefix="users",
#     model_cls=models.User,
#     create_schema=schemas.UserCreate,
#     update_schema=schemas.UserUpdate,
#     response_schema=schemas.User,
#     pk_field="user_id",
# )
register_simple_crud(
    prefix="profiles",
    model_cls=models.Profile,
    create_schema=schemas.ProfileCreate,
    update_schema=schemas.ProfileUpdate,
    response_schema=schemas.Profile,
    pk_field="profile_id",
)
register_simple_crud(
    prefix="roles",
    model_cls=models.Role,
    create_schema=schemas.RoleCreate,
    update_schema=schemas.RoleUpdate,
    response_schema=schemas.Role,
    pk_field="role_id",
)
# register_simple_crud(
#     prefix="posts",
#     model_cls=models.Post,
#     create_schema=schemas.PostCreate,
#     update_schema=schemas.PostUpdate,
#     response_schema=schemas.Post,
#     pk_field="post_id",
# )
#  CÓ THỂ SẼ CHỈNH SỬA ROUTES POST SAU NÀY

register_simple_crud(
    prefix="files",
    model_cls=models.File,
    create_schema=schemas.FileCreate,
    update_schema=schemas.FileUpdate,
    response_schema=schemas.File,
    pk_field="file_id",
)

# Groups CRUD - Using custom endpoints instead of register_simple_crud
# register_simple_crud(
#     prefix="groups",
#     model_cls=models.Group,
#     create_schema=schemas.GroupCreate,
#     update_schema=schemas.GroupUpdate,
#     response_schema=schemas.Group,
#     pk_field="group_id",
# )

# Group Rules CRUD
register_simple_crud(
    prefix="group-rules",
    model_cls=models.GroupRule,
    create_schema=schemas.GroupRuleCreate,
    update_schema=schemas.GroupRuleUpdate,
    response_schema=schemas.GroupRule,
    pk_field="rule_id",
)

# Membership Questions CRUD - Using custom endpoint with group_id filter
# register_simple_crud(
#     prefix="membership-questions",
#     model_cls=models.MembershipQuestion,
#     create_schema=schemas.MembershipQuestionCreate,
#     update_schema=schemas.MembershipQuestionUpdate,
#     response_schema=schemas.MembershipQuestion,
#     pk_field="question_id",
# )

@router.get("/membership-questions")
def get_membership_questions(group_id: int, db: Session = Depends(get_db)):
    """Get membership questions for a specific group"""
    return db.query(models.MembershipQuestion).filter(
        models.MembershipQuestion.group_id == group_id
    ).all()

@router.post("/membership-questions", status_code=status.HTTP_201_CREATED)
def create_membership_question(payload: schemas.MembershipQuestionCreate, db: Session = Depends(get_db)):
    """Create a new membership question"""
    obj = models.MembershipQuestion(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/membership-questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_membership_question(question_id: int, db: Session = Depends(get_db)):
    """Delete a membership question"""
    question = db.query(models.MembershipQuestion).filter(
        models.MembershipQuestion.question_id == question_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()

@router.post("/comments", status_code=status.HTTP_201_CREATED)
def create_comment(payload: schemas.CommentCreate, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    data = payload.model_dump()
    data['commenter_user_id'] = current.user_id
    obj = models.Comment(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    # attach commenter info
    profile = db.query(models.Profile).filter(models.Profile.user_id == obj.commenter_user_id).first()
    commenter_name = None
    commenter_avatar = None
    if profile:
        commenter_name = ((profile.first_name or '') + ' ' + (profile.last_name or '')).strip() or None
        commenter_avatar = profile.profile_picture_url
    return {
        "comment_id": obj.comment_id,
        "commenter_user_id": obj.commenter_user_id,
        "commenter_name": commenter_name,
        "commenter_avatar": commenter_avatar,
        "commentable_id": obj.commentable_id,
        "commentable_type": obj.commentable_type,
        "parent_comment_id": obj.parent_comment_id,
        "text_content": obj.text_content,
        "created_at": obj.created_at,
    }


@router.get("/comments")
def list_comments(
    commentable_id: int | None = None,
    commentable_type: models.CommentableType | None = None,
    db: Session = Depends(get_db),
):
    """List comments. If `commentable_id` and/or `commentable_type` are provided,
    filter the results accordingly. Results are ordered ascending by `created_at`.
    Returns an array of dicts including commenter_name and commenter_avatar.
    """
    q = db.query(models.Comment)
    if commentable_id is not None:
        q = q.filter(models.Comment.commentable_id == commentable_id)
    if commentable_type is not None:
        q = q.filter(models.Comment.commentable_type == commentable_type)
    q = q.order_by(models.Comment.created_at.asc())
    results = []
    for c in q.all():
        profile = db.query(models.Profile).filter(models.Profile.user_id == c.commenter_user_id).first()
        commenter_name = None
        commenter_avatar = None
        if profile:
            commenter_name = ((profile.first_name or '') + ' ' + (profile.last_name or '')).strip() or None
            commenter_avatar = profile.profile_picture_url
        results.append({
            "comment_id": c.comment_id,
            "commenter_user_id": c.commenter_user_id,
            "commenter_name": commenter_name,
            "commenter_avatar": commenter_avatar,
            "commentable_id": c.commentable_id,
            "commentable_type": c.commentable_type,
            "parent_comment_id": c.parent_comment_id,
            "text_content": c.text_content,
            "created_at": c.created_at,
        })
    return results


@router.get("/comments/{comment_id}", response_model=schemas.Comment)
def read_comment(comment_id: int, db: Session = Depends(get_db)):
    return _get_simple_object(db, models.Comment, "comment_id", comment_id)


@router.put("/comments/{comment_id}", response_model=schemas.Comment)
def update_comment(comment_id: int, payload: schemas.CommentUpdate, db: Session = Depends(get_db)):
    obj = _get_simple_object(db, models.Comment, "comment_id", comment_id)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    obj = _get_simple_object(db, models.Comment, "comment_id", comment_id)
    db.delete(obj)
    db.commit()

# Pages CRUD - Using custom create endpoint to auto-assign ADMIN role
@router.post("/pages", response_model=schemas.Page, status_code=status.HTTP_201_CREATED)
def create_page(payload: schemas.PageCreate, request: Request, db: Session = Depends(get_db)):
    """Create a page and automatically assign creator as ADMIN"""
    current = get_current_user_from_cookie(request, db)
    
    obj = models.Page(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    db.flush()  # Get the page_id without committing
    
    # Automatically assign creator as ADMIN
    page_role = models.PageRole(
        user_id=current.user_id,
        page_id=obj.page_id,
        role=models.PageRoleEnum.ADMIN
    )
    db.add(page_role)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/pages", response_model=list[schemas.Page])
def list_pages(db: Session = Depends(get_db)):
    return db.query(models.Page).all()

@router.put("/pages/{item_id}", response_model=schemas.Page)
def update_page(item_id: int, payload: schemas.PageUpdate, db: Session = Depends(get_db)):
    obj = _get_simple_object(db, models.Page, "page_id", item_id)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/pages/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(item_id: int, db: Session = Depends(get_db)):
    obj = _get_simple_object(db, models.Page, "page_id", item_id)
    db.delete(obj)
    db.commit()

# Groups CRUD - Using custom endpoints (duplicate removed)
# register_simple_crud(
#     prefix="groups",
#     model_cls=models.Group,
#     create_schema=schemas.GroupCreate,
#     update_schema=schemas.GroupUpdate,
#     response_schema=schemas.Group,
#     pk_field="group_id",
# )
register_simple_crud(
    prefix="group-rules",
    model_cls=models.GroupRule,
    create_schema=schemas.GroupRuleCreate,
    update_schema=schemas.GroupRuleUpdate,
    response_schema=schemas.GroupRule,
    pk_field="rule_id",
)
register_simple_crud(
    prefix="membership-questions",
    model_cls=models.MembershipQuestion,
    create_schema=schemas.MembershipQuestionCreate,
    update_schema=schemas.MembershipQuestionUpdate,
    response_schema=schemas.MembershipQuestion,
    pk_field="question_id",
)
register_simple_crud(
    prefix="events",
    model_cls=models.Event,
    create_schema=schemas.EventCreate,
    update_schema=schemas.EventUpdate,
    response_schema=schemas.Event,
    pk_field="event_id",
)
register_simple_crud(
    prefix="event-publications",
    model_cls=models.EventPublication,
    create_schema=schemas.EventPublicationCreate,
    update_schema=schemas.EventPublicationUpdate,
    response_schema=schemas.EventPublication,
    pk_field="publication_id",
)
register_simple_crud(
    prefix="reports",
    model_cls=models.Report,
    create_schema=schemas.ReportCreate,
    update_schema=schemas.ReportUpdate,
    response_schema=schemas.Report,
    pk_field="report_id",
)
register_simple_crud(
    prefix="report-reasons",
    model_cls=models.ReportReason,
    create_schema=schemas.ReportReasonCreate,
    update_schema=schemas.ReportReasonUpdate,
    response_schema=schemas.ReportReason,
    pk_field="reason_id",
)
register_simple_crud(
    prefix="report-actions",
    model_cls=models.ReportAction,
    create_schema=schemas.ReportActionCreate,
    update_schema=schemas.ReportActionUpdate,
    response_schema=schemas.ReportAction,
    pk_field="action_id",
)


def _get_composite_object(db: Session, model_cls, keys: dict):
    query = db.query(model_cls)
    for field, value in keys.items():
        query = query.filter(getattr(model_cls, field) == value)
    obj = query.first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return obj


@router.post("/user-roles", response_model=schemas.UserRole, status_code=status.HTTP_201_CREATED)
def create_user_role(payload: schemas.UserRoleBase, db: Session = Depends(get_db)):
    record = models.UserRole(**payload.model_dump())
    db.add(record)
    db.commit()
    return record


@router.get("/user-roles", response_model=list[schemas.UserRole])
def list_user_roles(db: Session = Depends(get_db)):
    return db.query(models.UserRole).all()


@router.delete("/user-roles/{user_id}/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_role(user_id: int, role_id: int, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.UserRole, {"user_id": user_id, "role_id": role_id})
    db.delete(obj)
    db.commit()


@router.post("/friendships", response_model=schemas.Friendship, status_code=status.HTTP_201_CREATED)
def create_friendship(payload: schemas.FriendshipCreate, db: Session = Depends(get_db)):
    record = models.Friendship(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/friendships", response_model=list[schemas.Friendship])
def list_friendships(db: Session = Depends(get_db)):
    return db.query(models.Friendship).all()


@router.get("/friendships/{user_one_id}/{user_two_id}", response_model=schemas.Friendship)
def read_friendship(user_one_id: int, user_two_id: int, db: Session = Depends(get_db)):
    return _get_composite_object(
        db, models.Friendship, {"user_one_id": user_one_id, "user_two_id": user_two_id}
    )


@router.put("/friendships/{user_one_id}/{user_two_id}", response_model=schemas.Friendship)
def update_friendship(
    user_one_id: int, user_two_id: int, payload: schemas.FriendshipUpdate, db: Session = Depends(get_db)
):
    obj = _get_composite_object(db, models.Friendship, {"user_one_id": user_one_id, "user_two_id": user_two_id})
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/friendships/{user_one_id}/{user_two_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_friendship(user_one_id: int, user_two_id: int, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.Friendship, {"user_one_id": user_one_id, "user_two_id": user_two_id})
    db.delete(obj)
    db.commit()


@router.post("/post-locations", response_model=schemas.PostLocation, status_code=status.HTTP_201_CREATED)
def create_post_location(payload: schemas.PostLocationBase, db: Session = Depends(get_db)):
    record = models.PostLocation(**payload.model_dump())
    db.add(record)
    db.commit()
    return record

@router.post("/posts", status_code=status.HTTP_201_CREATED)
def create_post(
    payload: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    Tạo post mới.

    payload ví dụ:
    {
        "text_content": "hello",
        "privacy_setting": "PUBLIC",      # PUBLIC | FRIENDS | ONLY_ME
        "file_ids": [1, 2, 3],            # optional
        "location_type": "USER_TIMELINE", # USER_TIMELINE | GROUP | PAGE_TIMELINE
        "location_id": 123                # với USER_TIMELINE có thể bỏ, mặc định = user hiện tại
    }
    """
    current = get_current_user_from_cookie(request, db)

    text_content = (payload.get("text_content") or "").strip()
    file_ids = payload.get("file_ids") or []

    # không cho post trống hoàn toàn
    if not text_content and not file_ids:
        raise HTTPException(status_code=400, detail="EMPTY_POST")

    # --- location ---
    location_type = payload.get("location_type") or models.LocationType.USER_TIMELINE
    if isinstance(location_type, str):
        try:
            location_type = models.LocationType[location_type]
        except KeyError:
            raise HTTPException(status_code=400, detail="INVALID_LOCATION_TYPE")

    location_id = payload.get("location_id")

    # USER_TIMELINE: chỉ được post lên timeline của chính mình
    if location_type == models.LocationType.USER_TIMELINE:
        if location_id is None:
            location_id = current.user_id
        if location_id != current.user_id:
            raise HTTPException(status_code=403, detail="CANNOT_POST_TO_OTHER_TIMELINE")
        
        # Privacy setting chỉ áp dụng cho USER_TIMELINE
        privacy = payload.get("privacy_setting") or models.PrivacySetting.PUBLIC
        if isinstance(privacy, str):
            try:
                privacy = models.PrivacySetting[privacy]
            except KeyError:
                raise HTTPException(status_code=400, detail="INVALID_PRIVACY")

    # GROUP: phải là member JOINED, privacy luôn là PUBLIC (visibility phụ thuộc vào group)
    elif location_type == models.LocationType.GROUP:
        if not location_id:
            raise HTTPException(status_code=400, detail="MISSING_LOCATION_ID")
        gm = db.query(models.GroupMembership).filter(
            models.GroupMembership.group_id == location_id,
            models.GroupMembership.user_id == current.user_id,
            models.GroupMembership.status == models.GroupMemberStatus.JOINED,
        ).first()
        if not gm:
            raise HTTPException(status_code=403, detail="GROUP_NOT_JOINED")
        
        # Bài đăng trong group luôn là PUBLIC, visibility do group privacy quyết định
        privacy = models.PrivacySetting.PUBLIC

    # PAGE_TIMELINE: phải có PageRole bất kỳ
    elif location_type == models.LocationType.PAGE_TIMELINE:
        if not location_id:
            raise HTTPException(status_code=400, detail="MISSING_LOCATION_ID")
        role = db.query(models.PageRole).filter(
            models.PageRole.user_id == current.user_id,
            models.PageRole.page_id == location_id,
        ).first()
        if not role:
            raise HTTPException(status_code=403, detail="PAGE_ACCESS_DENIED")
        
        # Bài đăng trên page cũng mặc định là PUBLIC
        privacy = models.PrivacySetting.PUBLIC

    else:
        # nếu spec có thêm các loại khác, sau này bổ sung tiếp
        raise HTTPException(status_code=400, detail="UNSUPPORTED_LOCATION_TYPE")

    # --- Determine author based on location type ---
    # When posting to a PAGE, the author should be the page, not the user
    if location_type == models.LocationType.PAGE_TIMELINE:
        author_id = location_id
        author_type = models.PostAuthorType.PAGE
    else:
        author_id = current.user_id
        author_type = models.PostAuthorType.USER

    # --- tạo Post ---
    post = models.Post(
        author_id=author_id,
        author_type=author_type,
        text_content=text_content,
        privacy_setting=privacy,
        post_type=models.PostType.ORIGINAL,  # enum REGULAR/SHARE/...; dùng giá trị text tuỳ bạn khai báo
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # --- gắn PostLocation ---
    pl = models.PostLocation(
        post_id=post.post_id,
        location_id=location_id,
        location_type=location_type,
    )
    db.add(pl)

    # --- gắn PostFile (nếu có file_ids) ---
    for fid in file_ids:
        file_obj = db.query(models.File).filter(
            models.File.file_id == fid,
            models.File.uploader_user_id == current.user_id,  # đảm bảo file của chính user
        ).first()
        if not file_obj:
            # bỏ qua file không tồn tại/không đúng owner
            continue
        link = models.PostFile(post_id=post.post_id, file_id=file_obj.file_id)
        db.merge(link)

    db.commit()

    return {
        "post_id": post.post_id,
        "author_id": current.user_id,
        "text_content": post.text_content,
        "privacy_setting": post.privacy_setting,
        "created_at": post.created_at,
        "location": {
            "location_id": location_id,
            "location_type": location_type,
        },
        "file_ids": file_ids,
    }



@router.get("/post-locations", response_model=list[schemas.PostLocation])
def list_post_locations(db: Session = Depends(get_db)):
    return db.query(models.PostLocation).all()


@router.get("/post-locations/{post_id}/{location_id}/{location_type}", response_model=schemas.PostLocation)
def read_post_location(post_id: int, location_id: int, location_type: models.LocationType, db: Session = Depends(get_db)):
    return _get_composite_object(
        db,
        models.PostLocation,
        {"post_id": post_id, "location_id": location_id, "location_type": location_type},
    )


@router.delete("/post-locations/{post_id}/{location_id}/{location_type}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post_location(
    post_id: int, location_id: int, location_type: models.LocationType, db: Session = Depends(get_db)
):
    obj = _get_composite_object(
        db,
        models.PostLocation,
        {"post_id": post_id, "location_id": location_id, "location_type": location_type},
    )
    db.delete(obj)
    db.commit()


@router.post("/post-files", response_model=schemas.PostFile, status_code=status.HTTP_201_CREATED)
def create_post_file(payload: schemas.PostFileBase, db: Session = Depends(get_db)):
    record = models.PostFile(**payload.model_dump())
    db.add(record)
    db.commit()
    return record


@router.get("/post-files", response_model=list[schemas.PostFile])
def list_post_files(db: Session = Depends(get_db)):
    return db.query(models.PostFile).all()


@router.put("/post-files/{post_id}/{file_id}", response_model=schemas.PostFile)
def update_post_file(post_id: int, file_id: int, payload: schemas.PostFileUpdate, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.PostFile, {"post_id": post_id, "file_id": file_id})
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/post-files/{post_id}/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post_file(post_id: int, file_id: int, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.PostFile, {"post_id": post_id, "file_id": file_id})
    db.delete(obj)
    db.commit()


@router.post("/reactions", response_model=schemas.Reaction, status_code=status.HTTP_201_CREATED)
def create_reaction(payload: schemas.ReactionBase, request: Request, db: Session = Depends(get_db)):
    """Create or toggle a reaction.
    Behavior:
      - If the current user already reacted with the same reaction_type -> treat as toggle off (delete) and return 204 No Content.
      - If the current user already reacted with a different reaction_type -> update the reaction_type and return the updated record.
      - Otherwise create a new reaction.
    The endpoint prefers the authenticated user from the cookie; if not present and caller supplies `reactor_user_id` in payload, that will be used.
    """
    # prefer authenticated user
    try:
        current = get_current_user_from_cookie(request, db)
        reactor_id = current.user_id
    except HTTPException:
        # fallback to payload-provided id (useful for scripts/tests); if not provided, raise
        if getattr(payload, 'reactor_user_id', None):
            reactor_id = payload.reactor_user_id
        else:
            raise

    # check for existing reaction by this user on the same target
    existing = (
        db.query(models.Reaction)
        .filter(
            models.Reaction.reactor_user_id == reactor_id,
            models.Reaction.reactable_id == payload.reactable_id,
            models.Reaction.reactable_type == payload.reactable_type,
        )
        .first()
    )

    # toggle semantics
    if existing:
        if existing.reaction_type == payload.reaction_type:
            # same reaction -> remove (toggle off)
            db.delete(existing)
            db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        else:
            # change type
            existing.reaction_type = payload.reaction_type
            db.commit()
            db.refresh(existing)
            return existing

    # create new
    record = models.Reaction(
        reactor_user_id=reactor_id,
        reactable_id=payload.reactable_id,
        reactable_type=payload.reactable_type,
        reaction_type=payload.reaction_type,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/reactions", response_model=list[schemas.Reaction])
def list_reactions(db: Session = Depends(get_db)):
    return db.query(models.Reaction).all()


@router.put("/reactions/{reactor_user_id}/{reactable_id}/{reactable_type}", response_model=schemas.Reaction)
def update_reaction(
    reactor_user_id: int,
    reactable_id: int,
    reactable_type: models.ReactionTargetType,
    payload: schemas.ReactionUpdate,
    db: Session = Depends(get_db),
):
    obj = _get_composite_object(
        db,
        models.Reaction,
        {"reactor_user_id": reactor_user_id, "reactable_id": reactable_id, "reactable_type": reactable_type},
    )
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/reactions/{reactor_user_id}/{reactable_id}/{reactable_type}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reaction(
    reactor_user_id: int, reactable_id: int, reactable_type: models.ReactionTargetType, db: Session = Depends(get_db)
):
    obj = _get_composite_object(
        db,
        models.Reaction,
        {"reactor_user_id": reactor_user_id, "reactable_id": reactable_id, "reactable_type": reactable_type},
    )
    db.delete(obj)
    db.commit()


@router.post("/page-roles", response_model=schemas.PageRole, status_code=status.HTTP_201_CREATED)
def create_page_role(payload: schemas.PageRoleBase, db: Session = Depends(get_db)):
    record = models.PageRole(**payload.model_dump())
    db.add(record)
    db.commit()
    return record


@router.get("/page-roles", response_model=list[schemas.PageRole])
def list_page_roles(db: Session = Depends(get_db)):
    return db.query(models.PageRole).all()


@router.put("/page-roles/{user_id}/{page_id}", response_model=schemas.PageRole)
def update_page_role(user_id: int, page_id: int, payload: schemas.PageRoleUpdate, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.PageRole, {"user_id": user_id, "page_id": page_id})
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/page-roles/{user_id}/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page_role(user_id: int, page_id: int, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.PageRole, {"user_id": user_id, "page_id": page_id})
    db.delete(obj)
    db.commit()


@router.post("/page-follows", response_model=schemas.PageFollow, status_code=status.HTTP_201_CREATED)
def create_page_follow(payload: schemas.PageFollowBase, db: Session = Depends(get_db)):
    record = models.PageFollow(**payload.model_dump(exclude_unset=True))
    db.add(record)
    db.commit()
    return record


@router.get("/page-follows", response_model=list[schemas.PageFollow])
def list_page_follows(db: Session = Depends(get_db)):
    return db.query(models.PageFollow).all()


@router.delete("/page-follows/{user_id}/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page_follow(user_id: int, page_id: int, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.PageFollow, {"user_id": user_id, "page_id": page_id})
    db.delete(obj)
    db.commit()


@router.post("/group-memberships", response_model=schemas.GroupMembership, status_code=status.HTTP_201_CREATED)
def create_group_membership(payload: schemas.GroupMembershipCreate, db: Session = Depends(get_db)):
    record = models.GroupMembership(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/group-memberships", response_model=list[schemas.GroupMembership])
def list_group_memberships(db: Session = Depends(get_db)):
    return db.query(models.GroupMembership).all()


@router.put("/group-memberships/{user_id}/{group_id}", response_model=schemas.GroupMembership)
def update_group_membership(
    user_id: int, group_id: int, payload: schemas.GroupMembershipUpdate, db: Session = Depends(get_db)
):
    obj = _get_composite_object(db, models.GroupMembership, {"user_id": user_id, "group_id": group_id})
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/group-memberships/{user_id}/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group_membership(user_id: int, group_id: int, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.GroupMembership, {"user_id": user_id, "group_id": group_id})
    db.delete(obj)
    db.commit()


@router.post("/membership-answers", response_model=schemas.MembershipAnswer, status_code=status.HTTP_201_CREATED)
def create_membership_answer(payload: schemas.MembershipAnswerCreate, db: Session = Depends(get_db)):
    record = models.MembershipAnswer(**payload.model_dump())
    db.add(record)
    db.commit()
    return record


@router.get("/membership-answers", response_model=list[schemas.MembershipAnswer])
def list_membership_answers(db: Session = Depends(get_db)):
    return db.query(models.MembershipAnswer).all()


@router.put(
    "/membership-answers/{user_id}/{group_id}/{question_id}", response_model=schemas.MembershipAnswer
)
def update_membership_answer(
    user_id: int,
    group_id: int,
    question_id: int,
    payload: schemas.MembershipAnswerUpdate,
    db: Session = Depends(get_db),
):
    obj = _get_composite_object(
        db,
        models.MembershipAnswer,
        {"user_id": user_id, "group_id": group_id, "question_id": question_id},
    )
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/membership-answers/{user_id}/{group_id}/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_membership_answer(user_id: int, group_id: int, question_id: int, db: Session = Depends(get_db)):
    obj = _get_composite_object(
        db,
        models.MembershipAnswer,
        {"user_id": user_id, "group_id": group_id, "question_id": question_id},
    )
    db.delete(obj)
    db.commit()


@router.post("/event-participants", response_model=schemas.EventParticipant, status_code=status.HTTP_201_CREATED)
def create_event_participant(payload: schemas.EventParticipantCreate, db: Session = Depends(get_db)):
    record = models.EventParticipant(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/event-participants", response_model=list[schemas.EventParticipant])
def list_event_participants(db: Session = Depends(get_db)):
    return db.query(models.EventParticipant).all()


@router.put("/event-participants/{event_id}/{user_id}", response_model=schemas.EventParticipant)
def update_event_participant(event_id: int, user_id: int, payload: schemas.EventParticipantUpdate, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.EventParticipant, {"event_id": event_id, "user_id": user_id})
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/event-participants/{event_id}/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_participant(event_id: int, user_id: int, db: Session = Depends(get_db)):
    obj = _get_composite_object(db, models.EventParticipant, {"event_id": event_id, "user_id": user_id})
    db.delete(obj)
    db.commit()


# --- Users ---
@router.get("/users/{user_id}")
def get_user_profile(user_id: int, request: Request, db: Session = Depends(get_db)):
    viewer = None
    try:
        viewer = get_current_user_from_cookie(request, db)
    except HTTPException:
        pass
    viewer_id = getattr(viewer, "user_id", None)
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    profile = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    
    # Chỉ hiện email và date_of_birth nếu xem profile chính mình
    show_private = (viewer_id == user_id)
    
    result = {
        "user_id": user.user_id,
        "first_name": getattr(profile, "first_name", ""),
        "last_name": getattr(profile, "last_name", ""),
        "avatar_url": getattr(profile, "profile_picture_url", None),
        "cover_photo_url": getattr(profile, "cover_photo_url", None),
        "bio": getattr(profile, "bio", None),
        "gender": getattr(profile, "gender", None),
        "friendship_status": _friendship_status(db, viewer_id, user_id),
    }
    
    if show_private:
        result["email"] = user.email
        result["phone_number"] = user.phone_number
        result["date_of_birth"] = getattr(profile, "date_of_birth", None)
    
    return result

@router.put("/users/me")
def update_me(payload: dict, request: Request, db: Session = Depends(get_db)):
    me = get_current_user_from_cookie(request, db)
    profile = db.query(models.Profile).filter(models.Profile.user_id == me.user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field in ["first_name", "last_name", "bio", "date_of_birth", "gender", "profile_picture_url", "cover_photo_url"]:
        if field in payload:
            setattr(profile, field, payload[field])
    db.commit()
    db.refresh(profile)
    return {"message": "Update success", "data": payload}

@router.get("/users/{user_id}/posts")
def user_posts(user_id: int, request: Request, db: Session = Depends(get_db), limit: int = 10, offset: int = 0):
    viewer = None
    try:
        viewer = get_current_user_from_cookie(request, db)
    except HTTPException:
        pass
    viewer_id = getattr(viewer, "user_id", None)
    is_friend = False
    if viewer_id and viewer_id != user_id:
        fr = _get_friendship_by_users(db, viewer_id, user_id)
        is_friend = fr is not None and fr.status == models.FriendshipStatus.ACCEPTED
    conds = [models.Post.author_id == user_id]
    if viewer_id == user_id:
        pass
    elif is_friend:
        conds.append(models.Post.privacy_setting.in_([models.PrivacySetting.PUBLIC, models.PrivacySetting.FRIENDS]))
    else:
        conds.append(models.Post.privacy_setting == models.PrivacySetting.PUBLIC)
    posts = (
        db.query(models.Post)
        .filter(and_(*conds))
        .order_by(desc(models.Post.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    # Format posts with full info like feed
    result = []
    for post in posts:
        # Get author info
        author_profile = db.query(models.Profile).filter(models.Profile.user_id == post.author_id).first()
        author_name = "Unknown"
        author_avatar = None
        if author_profile:
            author_name = f"{author_profile.first_name} {author_profile.last_name}".strip()
            author_avatar = author_profile.profile_picture_url
        
        # Get location info
        location_info = None
        post_location = db.query(models.PostLocation).filter(models.PostLocation.post_id == post.post_id).first()
        if post_location:
            if post_location.location_type == models.LocationType.GROUP:
                group = db.query(models.Group).filter(models.Group.group_id == post_location.location_id).first()
                if group:
                    location_info = {"type": "GROUP", "id": group.group_id, "name": group.group_name}
            elif post_location.location_type == models.LocationType.PAGE_TIMELINE:
                page = db.query(models.Page).filter(models.Page.page_id == post_location.location_id).first()
                if page:
                    location_info = {"type": "PAGE", "id": page.page_id, "name": page.page_name}
        
        # Get files
        post_files_links = db.query(models.PostFile).filter(models.PostFile.post_id == post.post_id).all()
        files = []
        for pf in post_files_links:
            file = db.query(models.File).filter(models.File.file_id == pf.file_id).first()
            if file:
                files.append({
                    "file_id": file.file_id,
                    "file_url": file.file_url,
                    "file_type": file.file_type,
                    "thumbnail_url": file.thumbnail_url
                })
        
        result.append({
            "post_id": post.post_id,
            "author_id": post.author_id,
            "author_name": author_name,
            "author_avatar": author_avatar,
            "text_content": post.text_content,
            "privacy_setting": post.privacy_setting,
            "created_at": post.created_at,
            "location": location_info,
            "files": files
        })
    
    return result

# --- Friends extras: cancel, block, list with pagination ---
@router.delete("/friends/{target_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_friend_request(target_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    rec = _get_friendship_by_users(db, current.user_id, target_id)
    if not rec or rec.status != models.FriendshipStatus.PENDING or rec.action_user_id != current.user_id:
        raise HTTPException(status_code=404, detail="No pending request to cancel")
    db.delete(rec)
    db.commit()

@router.post("/friends/{target_id}/block")
def block_user(target_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    one, two = sorted([current.user_id, target_id])
    rec = db.query(models.Friendship).filter(models.Friendship.user_one_id == one, models.Friendship.user_two_id == two).first()
    if rec:
        rec.status = models.FriendshipStatus.BLOCKED
        rec.action_user_id = current.user_id
    else:
        rec = models.Friendship(
            user_one_id=one,
            user_two_id=two,
            status=models.FriendshipStatus.BLOCKED,
            action_user_id=current.user_id,
        )
        db.add(rec)
    db.commit()
    return {"message": "User blocked", "status": "BLOCKED"}

@router.delete("/friends/{target_id}/block")
def unblock_user(target_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    rec = _get_friendship_by_users(db, current.user_id, target_id)
    if not rec or rec.status != models.FriendshipStatus.BLOCKED:
        raise HTTPException(status_code=404, detail="No block found")
    db.delete(rec)
    db.commit()
    return {"message": "Unblocked"}

@router.get("/friends")
def list_friends_v2(request: Request, db: Session = Depends(get_db), user_id: Optional[int] = None, limit: int = 50, offset: int = 0):
    current = get_current_user_from_cookie(request, db)
    target_id = user_id or current.user_id
    q = db.query(models.Friendship).filter(
        or_(models.Friendship.user_one_id == target_id, models.Friendship.user_two_id == target_id),
        models.Friendship.status == models.FriendshipStatus.ACCEPTED,
    ).offset(offset).limit(limit)
    results = []
    for f in q.all():
        other = f.user_two_id if f.user_one_id == target_id else f.user_one_id
        profile = db.query(models.Profile).filter(models.Profile.user_id == other).first()
        user = db.query(models.User).filter(models.User.user_id == other).first()
        results.append({
            "user_id": other,
            "name": ((getattr(profile, "first_name", "") or "") + " " + (getattr(profile, "last_name", "") or "")).strip(),
            "avatar": getattr(profile, "profile_picture_url", None),
        })
    return results

# --- Media upload (placeholder storage) ---
@router.post("/media/upload", status_code=status.HTTP_201_CREATED)
def upload_media(
    file: UploadFile = FastAPIFile(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    # 1. Check login
    user = get_current_user_from_cookie(request, db)

    # 2. Đọc file
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="INVALID_FILE")

    # 3. Upload lên Cloudinary
    unique_name = f"user_{user.user_id}_{uuid4().hex}"
    try:
        result = upload_to_cloudinary(content, unique_name)
    except ValueError as e:
        # Cloudinary not configured
        raise HTTPException(
            status_code=503, 
            detail=f"File upload service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {str(e)}"
        )
    finally:
        file.file.close()

    file_url = result["secure_url"]
    file_size = result.get("bytes", len(content))
    resource_type = result.get("resource_type", "raw")  # image, video, raw
    mime_type = file.content_type or "application/octet-stream"

    # 4. Lưu DB
    rec = models.File(
        uploader_user_id=user.user_id,
        file_name=file.filename,
        file_type=mime_type,
        file_size=file_size,
        file_url=file_url,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # 5. Xác định loại cho FE
    kind = "FILE"
    if resource_type == "image":
        kind = "IMAGE"
    elif resource_type == "video":
        kind = "VIDEO"

    return {
        "file_id": rec.file_id,
        "url": rec.file_url,
        "type": rec.file_type,
        "kind": kind,
    }

# --- Posts: share ---
@router.post("/posts/{post_id}/share", status_code=status.HTTP_201_CREATED)
def share_post(post_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    original = db.query(models.Post).filter(models.Post.post_id == post_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Post not found")
    if original.privacy_setting == models.PrivacySetting.ONLY_ME:
        raise HTTPException(status_code=400, detail="PRIVACY_VIOLATION")
    text_content = payload.get("text_content")
    privacy = payload.get("privacy_setting", models.PrivacySetting.FRIENDS)
    share = models.Post(
        author_id=current.user_id,
        author_type=models.PostAuthorType.USER,
        text_content=text_content,
        privacy_setting=privacy,
        post_type=models.PostType.SHARE,
        parent_post_id=original.post_id,  # Store immediate parent, not original
    )
    db.add(share)
    db.commit()
    db.refresh(share)
    return {"post_id": share.post_id, "parent_post_id": share.parent_post_id}

# --- Interactions: seen tracking ---
@router.post("/interactions/seen")
def mark_seen(payload: dict, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    post_ids = payload.get("post_ids") or []
    # Assume a table USER_SEEN_POSTS exists; if not, skip DB insert and just echo.
    try:
        for pid in post_ids:
            db.execute(
                models.UserSeenPost.__table__.insert().prefix_with("IGNORE"),
                {"user_id": current.user_id, "post_id": pid},
            )
        db.commit()
    except Exception:
        db.rollback()
    return {"status": "synced"}

# --- Groups ---
@router.get("/groups/my-groups")
async def get_my_groups(request: Request, db: Session = Depends(get_db)):
    """Get all groups user is a member of"""
    current = get_current_user_from_cookie(request, db)
    
    memberships = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == current.user_id,
        models.GroupMembership.status.in_([models.GroupMemberStatus.JOINED, models.GroupMemberStatus.PENDING])
    ).all()
    
    result = []
    for m in memberships:
        group = db.query(models.Group).filter(models.Group.group_id == m.group_id).first()
        if group:
            member_count = db.query(models.GroupMembership).filter(
                models.GroupMembership.group_id == group.group_id,
                models.GroupMembership.status == models.GroupMemberStatus.JOINED
            ).count()
            
            result.append({
                "group_id": group.group_id,
                "group_name": group.group_name,
                "description": group.description,
                "cover_photo_url": group.cover_photo_url,
                "privacy_type": group.privacy_type,
                "member_count": member_count,
                "my_role": m.role,
                "my_status": m.status,
            })
    
    return result

@router.get("/groups/{group_id}")
def get_group(group_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        current = get_current_user_from_cookie(request, db)
        current_id = current.user_id
    except:
        current_id = None
    
    group = db.query(models.Group).filter(models.Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is banned
    if current_id:
        membership = db.query(models.GroupMembership).filter(
            models.GroupMembership.user_id == current_id,
            models.GroupMembership.group_id == group_id,
        ).first()
        
        if membership and membership.status == models.GroupMemberStatus.BANNED:
            raise HTTPException(status_code=403, detail="You are banned from this group")
        
        my_status = getattr(membership, "status", None)
        my_role = getattr(membership, "role", None)
    else:
        my_status = None
        my_role = None
    
    # Get creator profile
    creator_profile = db.query(models.Profile).filter(models.Profile.user_id == group.creator_user_id).first()
    creator_name = None
    if creator_profile:
        creator_name = f"{creator_profile.first_name} {creator_profile.last_name}".strip()
    
    # Get member count
    member_count = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.status == models.GroupMemberStatus.JOINED
    ).count()
    
    return {
        "group_id": group.group_id,
        "group_name": group.group_name,
        "description": group.description,
        "cover_photo_url": group.cover_photo_url,
        "privacy_type": group.privacy_type,
        "is_visible": group.is_visible,
        "creator_user_id": group.creator_user_id,
        "creator_name": creator_name,
        "created_at": group.created_at,
        "member_count": member_count,
        "my_status": my_status,
        "my_role": my_role,
    }

@router.get("/groups/{group_id}/posts")
def get_group_posts(group_id: int, request: Request, db: Session = Depends(get_db)):
    """Get all posts in a group"""
    try:
        current = get_current_user_from_cookie(request, db)
        current_id = current.user_id
    except:
        current_id = None
    
    group = db.query(models.Group).filter(models.Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # For PRIVATE groups, only members can see posts
    if group.privacy_type == models.GroupPrivacy.PRIVATE:
        if not current_id:
            raise HTTPException(status_code=401, detail="Login required")
        
        membership = db.query(models.GroupMembership).filter(
            models.GroupMembership.user_id == current_id,
            models.GroupMembership.group_id == group_id,
            models.GroupMembership.status == models.GroupMemberStatus.JOINED
        ).first()
        
        if not membership:
            raise HTTPException(status_code=403, detail="Only members can view posts in private groups")
    
    # Get post locations for this group
    post_locations = db.query(models.PostLocation).filter(
        models.PostLocation.location_type == models.LocationType.GROUP,
        models.PostLocation.location_id == group_id
    ).all()
    
    post_ids = [pl.post_id for pl in post_locations]
    if not post_ids:
        return []
    
    # Get posts
    posts = db.query(models.Post).filter(models.Post.post_id.in_(post_ids)).order_by(models.Post.created_at.desc()).all()
    
    result = []
    for post in posts:
        # Get author info
        author_profile = db.query(models.Profile).filter(models.Profile.user_id == post.author_id).first()
        author_name = "Unknown"
        author_avatar = None
        if author_profile:
            author_name = f"{author_profile.first_name} {author_profile.last_name}".strip()
            author_avatar = author_profile.profile_picture_url
        
        # Get files
        post_files_links = db.query(models.PostFile).filter(models.PostFile.post_id == post.post_id).all()
        files = []
        for pf in post_files_links:
            file = db.query(models.File).filter(models.File.file_id == pf.file_id).first()
            if file:
                files.append({
                    "file_id": file.file_id,
                    "file_url": file.file_url,
                    "file_type": file.file_type,
                    "thumbnail_url": file.thumbnail_url
                })
        
        result.append({
            "post_id": post.post_id,
            "author_id": post.author_id,
            "author_name": author_name,
            "author_avatar": author_avatar,
            "text_content": post.text_content,
            "privacy_setting": post.privacy_setting,
            "created_at": post.created_at,
            "files": files
        })
    
    return result

@router.get("/groups")
def get_all_groups(db: Session = Depends(get_db)):
    """Get all visible groups with member counts"""
    groups = db.query(models.Group).filter(
        models.Group.is_visible == True
    ).all()

    result = []
    for group in groups:
        member_count = db.query(models.GroupMembership).filter(
            models.GroupMembership.group_id == group.group_id,
            models.GroupMembership.status == models.GroupMemberStatus.JOINED
        ).count()

        creator = db.query(models.User).filter(models.User.user_id == group.creator_user_id).first()
        creator_profile = db.query(models.Profile).filter(models.Profile.user_id == group.creator_user_id).first() if creator else None
        creator_name = None
        if creator_profile:
            creator_name = ((creator_profile.first_name or '') + ' ' + (creator_profile.last_name or '')).strip() or None

        result.append({
            "group_id": group.group_id,
            "group_name": group.group_name,
            "description": group.description,
            "cover_photo_url": group.cover_photo_url,
            "privacy_type": group.privacy_type,
            "member_count": member_count,
            "creator_name": creator_name,
            "created_at": group.created_at.isoformat() if group.created_at else None
        })

    return result

@router.post("/groups", status_code=status.HTTP_201_CREATED)
def create_group_with_setup(payload: dict, request: Request, db: Session = Depends(get_db)):
    """Create group with rules and questions in one request"""
    current = get_current_user_from_cookie(request, db)
    
    # Create group
    group = models.Group(
        creator_user_id=current.user_id,
        group_name=payload["group_name"],
        description=payload.get("description"),
        cover_photo_url=payload.get("cover_photo_url"),
        privacy_type=payload.get("privacy_type", "PUBLIC"),
        is_visible=payload.get("is_visible", True),
    )
    db.add(group)
    db.flush()
    
    # Add creator as admin
    membership = models.GroupMembership(
        user_id=current.user_id,
        group_id=group.group_id,
        role=models.GroupMemberRole.ADMIN,
        status=models.GroupMemberStatus.JOINED
    )
    db.add(membership)
    
    # Add rules
    rules = payload.get("rules", [])
    for idx, rule in enumerate(rules):
        rule_obj = models.GroupRule(
            group_id=group.group_id,
            title=rule["title"],
            details=rule.get("details"),
            display_order=idx
        )
        db.add(rule_obj)
    
    # Add membership questions
    questions = payload.get("questions", [])
    for question in questions:
        q_obj = models.MembershipQuestion(
            group_id=group.group_id,
            question_text=question["question_text"],
            is_required=question.get("is_required", False)
        )
        db.add(q_obj)
    
    db.commit()
    db.refresh(group)
    
    return {
        "group_id": group.group_id,
        "group_name": group.group_name,
        "privacy_type": group.privacy_type,
        "message": "Group created successfully"
    }

@router.get("/groups/{group_id}/questions")
def get_group_questions(group_id: int, db: Session = Depends(get_db)):
    return db.query(models.MembershipQuestion).filter(models.MembershipQuestion.group_id == group_id).all()

@router.post("/groups/{group_id}/join")
def join_group(group_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    group = db.query(models.Group).filter(models.Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is banned
    existing = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == current.user_id,
        models.GroupMembership.group_id == group_id
    ).first()
    
    if existing and existing.status == models.GroupMemberStatus.BANNED:
        raise HTTPException(status_code=403, detail="You are banned from this group")
    
    # Check required questions
    required_questions = db.query(models.MembershipQuestion).filter(
        models.MembershipQuestion.group_id == group_id,
        models.MembershipQuestion.is_required == True
    ).all()
    
    answers = payload.get("answers") or []
    answered_question_ids = [ans["question_id"] for ans in answers]
    
    for req_q in required_questions:
        if req_q.question_id not in answered_question_ids:
            raise HTTPException(status_code=400, detail=f"Question '{req_q.question_text}' is required")
    
    # Determine status based on group privacy
    status_val = models.GroupMemberStatus.JOINED if group.privacy_type == models.GroupPrivacy.PUBLIC else models.GroupMemberStatus.PENDING
    
    if existing:
        existing.status = status_val
        existing.role = models.GroupMemberRole.MEMBER
    else:
        gm = models.GroupMembership(
            user_id=current.user_id,
            group_id=group_id,
            role=models.GroupMemberRole.MEMBER,
            status=status_val
        )
        db.add(gm)
    
    # Save answers
    for ans in answers:
        answer_obj = db.query(models.MembershipAnswer).filter(
            models.MembershipAnswer.user_id == current.user_id,
            models.MembershipAnswer.group_id == group_id,
            models.MembershipAnswer.question_id == ans["question_id"]
        ).first()
        
        if answer_obj:
            answer_obj.answer_text = ans["answer_text"]
        else:
            rec = models.MembershipAnswer(
                user_id=current.user_id,
                group_id=group_id,
                question_id=ans["question_id"],
                answer_text=ans["answer_text"]
            )
            db.add(rec)
    
    db.commit()
    return {"status": status_val.value, "message": "Request sent" if status_val == models.GroupMemberStatus.PENDING else "Joined successfully"}

@router.delete("/groups/{group_id}/leave")
def leave_group(group_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    gm = db.query(models.GroupMembership).filter(models.GroupMembership.group_id == group_id, models.GroupMembership.user_id == current.user_id).first()
    if gm:
        db.delete(gm)
        db.commit()
    return {"status": "LEFT"}

@router.get("/groups/{group_id}/feed")
def group_feed(group_id: int, request: Request, db: Session = Depends(get_db), limit: int = 10, last_post_id: Optional[int] = None):
    current = get_current_user_from_cookie(request, db)
    group = db.query(models.Group).filter(models.Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.privacy_type == models.GroupPrivacy.PRIVATE:
        gm = db.query(models.GroupMembership).filter(
            models.GroupMembership.group_id == group_id,
            models.GroupMembership.user_id == current.user_id,
            models.GroupMembership.status == models.GroupMemberStatus.JOINED,
        ).first()
        if not gm:
            raise HTTPException(status_code=403, detail="GROUP_NOT_JOINED")
    query = (
        db.query(models.Post)
        .join(models.PostLocation, models.PostLocation.post_id == models.Post.post_id)
        .filter(models.PostLocation.location_type == models.LocationType.GROUP, models.PostLocation.location_id == group_id)
    )
    if last_post_id:
        query = query.filter(models.Post.post_id < last_post_id)
    return query.order_by(desc(models.Post.created_at)).limit(limit).all()

@router.get("/groups/{group_id}/members")
def group_members(group_id: int, request: Request, db: Session = Depends(get_db), status_filter: Optional[models.GroupMemberStatus] = models.GroupMemberStatus.JOINED):
    get_current_user_from_cookie(request, db)
    q = db.query(models.GroupMembership).filter(models.GroupMembership.group_id == group_id)
    if status_filter:
        q = q.filter(models.GroupMembership.status == status_filter)
    return q.all()

@router.put("/groups/{group_id}/members/{user_id}")
def update_group_member(group_id: int, user_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    admin = get_current_user_from_cookie(request, db)
    admin_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == admin.user_id,
    ).first()
    if not admin_membership or admin_membership.role not in [models.GroupMemberRole.ADMIN, models.GroupMemberRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="No permission")
    gm = db.query(models.GroupMembership).filter(models.GroupMembership.group_id == group_id, models.GroupMembership.user_id == user_id).first()
    if not gm:
        raise HTTPException(status_code=404, detail="Membership not found")
    if "status" in payload:
        gm.status = payload["status"]
    if "role" in payload and admin_membership.role == models.GroupMemberRole.ADMIN:
        gm.role = payload["role"]
    db.commit()
    db.refresh(gm)
    return {"status": gm.status, "role": gm.role}

@router.post("/groups/{group_id}/members/{user_id}/approve")
def approve_member(group_id: int, user_id: int, request: Request, db: Session = Depends(get_db)):
    """Approve pending member request"""
    admin = get_current_user_from_cookie(request, db)
    admin_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == admin.user_id,
    ).first()
    if not admin_membership or admin_membership.role not in [models.GroupMemberRole.ADMIN, models.GroupMemberRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="No permission")
    
    gm = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == user_id
    ).first()
    if not gm:
        raise HTTPException(status_code=404, detail="Request not found")
    
    gm.status = models.GroupMemberStatus.JOINED
    db.commit()
    return {"message": "Member approved", "status": "JOINED"}

@router.post("/groups/{group_id}/members/{user_id}/reject")
def reject_member(group_id: int, user_id: int, request: Request, db: Session = Depends(get_db)):
    """Reject pending member request"""
    admin = get_current_user_from_cookie(request, db)
    admin_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == admin.user_id,
    ).first()
    if not admin_membership or admin_membership.role not in [models.GroupMemberRole.ADMIN, models.GroupMemberRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="No permission")
    
    gm = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == user_id
    ).first()
    if gm:
        db.delete(gm)
        db.commit()
    
    return {"message": "Request rejected"}

@router.post("/groups/{group_id}/members/{user_id}/ban")
def ban_member(group_id: int, user_id: int, request: Request, db: Session = Depends(get_db)):
    """Ban a member from the group"""
    admin = get_current_user_from_cookie(request, db)
    admin_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == admin.user_id,
    ).first()
    if not admin_membership or admin_membership.role not in [models.GroupMemberRole.ADMIN, models.GroupMemberRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="No permission")
    
    gm = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == user_id
    ).first()
    
    if gm:
        gm.status = models.GroupMemberStatus.BANNED
    else:
        gm = models.GroupMembership(
            user_id=user_id,
            group_id=group_id,
            role=models.GroupMemberRole.MEMBER,
            status=models.GroupMemberStatus.BANNED
        )
        db.add(gm)
    
    db.commit()
    return {"message": "Member banned", "status": "BANNED"}

@router.post("/groups/{group_id}/invite/{user_id}")
def invite_friend_to_group(group_id: int, user_id: int, request: Request, db: Session = Depends(get_db)):
    """Admin/Moderator invites a friend to join the group"""
    admin = get_current_user_from_cookie(request, db)
    
    # Check if requester is admin/moderator
    admin_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == admin.user_id,
    ).first()
    if not admin_membership or admin_membership.role not in [models.GroupMemberRole.ADMIN, models.GroupMemberRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="No permission to invite members")
    
    # Check if group exists
    group = db.query(models.Group).filter(models.Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if invitee exists
    invitee = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member or has pending request
    existing = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == user_id
    ).first()
    
    if existing:
        if existing.status == models.GroupMemberStatus.JOINED:
            raise HTTPException(status_code=400, detail="User is already a member")
        elif existing.status == models.GroupMemberStatus.PENDING:
            # Auto-approve if invited by admin
            existing.status = models.GroupMemberStatus.JOINED
            db.commit()
            return {"message": "Pending request approved", "status": "JOINED"}
        elif existing.status == models.GroupMemberStatus.BANNED:
            raise HTTPException(status_code=400, detail="User is banned from this group")
    
    # Create new membership with JOINED status (direct invite)
    membership = models.GroupMembership(
        user_id=user_id,
        group_id=group_id,
        role=models.GroupMemberRole.MEMBER,
        status=models.GroupMemberStatus.JOINED
    )
    db.add(membership)
    db.commit()
    
    return {
        "message": f"Successfully invited {invitee.full_name or invitee.username} to the group",
        "status": "JOINED"
    }

@router.post("/groups/{group_id}/members/{user_id}/unban")
def unban_member(group_id: int, user_id: int, request: Request, db: Session = Depends(get_db)):
    """Unban a member from the group"""
    admin = get_current_user_from_cookie(request, db)
    admin_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == admin.user_id,
    ).first()
    if not admin_membership or admin_membership.role not in [models.GroupMemberRole.ADMIN, models.GroupMemberRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="No permission")
    
    gm = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == user_id,
        models.GroupMembership.status == models.GroupMemberStatus.BANNED
    ).first()
    
    if gm:
        db.delete(gm)
        db.commit()
    
    return {"message": "Member unbanned"}

@router.get("/groups/{group_id}/pending-requests")
def get_pending_requests(group_id: int, request: Request, db: Session = Depends(get_db)):
    """Get pending join requests for a group (admin/moderator only)"""
    admin = get_current_user_from_cookie(request, db)
    admin_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == admin.user_id,
    ).first()
    if not admin_membership or admin_membership.role not in [models.GroupMemberRole.ADMIN, models.GroupMemberRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="No permission")
    
    pending = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.status == models.GroupMemberStatus.PENDING
    ).all()
    
    result = []
    for p in pending:
        profile = db.query(models.Profile).filter(models.Profile.user_id == p.user_id).first()
        answers = db.query(models.MembershipAnswer).filter(
            models.MembershipAnswer.user_id == p.user_id,
            models.MembershipAnswer.group_id == group_id
        ).all()
        
        user_name = None
        user_avatar = None
        if profile:
            user_name = f"{profile.first_name} {profile.last_name}".strip()
            user_avatar = profile.profile_picture_url
        
        result.append({
            "user_id": p.user_id,
            "user_name": user_name,
            "user_avatar": user_avatar,
            "joined_at": p.joined_at,
            "answers": [{"question_id": a.question_id, "answer_text": a.answer_text} for a in answers]
        })
    
    return result

# --- Pages ---
@router.get("/pages/{page_id}")
def get_page(page_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    page = db.query(models.Page).filter(models.Page.page_id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    role = db.query(models.PageRole).filter(models.PageRole.user_id == current.user_id, models.PageRole.page_id == page_id).first()
    follow = db.query(models.PageFollow).filter(models.PageFollow.user_id == current.user_id, models.PageFollow.page_id == page_id).first()

    # Count followers
    follower_count = db.query(models.PageFollow).filter(models.PageFollow.page_id == page_id).count()

    return {
        "page_id": page.page_id,
        "name": page.page_name,
        "username": page.username,
        "category": page.category,
        "description": page.description,
        "contact_info": page.contact_info,
        "follower_count": follower_count,
        "is_followed": bool(follow),
        "my_role": getattr(role, "role", None)
    }

@router.post("/pages/{page_id}/follow")
def follow_page(page_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    db.merge(models.PageFollow(user_id=current.user_id, page_id=page_id))
    db.commit()
    return {"status": "FOLLOWED"}

@router.delete("/pages/{page_id}/follow")
def unfollow_page(page_id: int, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    rec = db.query(models.PageFollow).filter(models.PageFollow.user_id == current.user_id, models.PageFollow.page_id == page_id).first()
    if rec:
        db.delete(rec)
        db.commit()
    return {"status": "UNFOLLOWED"}

@router.get("/pages/{page_id}/posts")
def page_posts(page_id: int, db: Session = Depends(get_db), request: Request = None, limit: int = 10, last_post_id: Optional[int] = None):
    """Get formatted posts for a page with author and file information"""
    current = None
    if request:
        try:
            current = get_current_user_from_cookie(request, db)
        except HTTPException:
            pass
    viewer_id = getattr(current, "user_id", None)

    # Get page info
    page = db.query(models.Page).filter(models.Page.page_id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    q = db.query(models.Post).join(
        models.PostLocation, models.PostLocation.post_id == models.Post.post_id
    ).filter(
        models.PostLocation.location_type == models.LocationType.PAGE_TIMELINE,
        models.PostLocation.location_id == page_id,
    )
    if last_post_id:
        q = q.filter(models.Post.post_id < last_post_id)

    posts = q.order_by(desc(models.Post.created_at)).limit(limit).all()

    # Format posts with page information
    formatted_posts = []
    for post in posts:
        # Get files
        files_q = db.query(models.File).join(
            models.PostFile, models.PostFile.file_id == models.File.file_id
        ).filter(models.PostFile.post_id == post.post_id)
        files = files_q.all()

        # Get stats
        like_count = db.query(models.Reaction).filter(
            models.Reaction.reactable_id == post.post_id,
            models.Reaction.reactable_type == models.ReactionTargetType.POST
        ).count()

        comment_count = db.query(models.Comment).filter(
            models.Comment.commentable_id == post.post_id,
            models.Comment.commentable_type == models.CommentableType.POST
        ).count()

        is_liked = False
        if viewer_id:
            is_liked = db.query(models.Reaction).filter(
                models.Reaction.reactor_user_id == viewer_id,
                models.Reaction.reactable_id == post.post_id,
                models.Reaction.reactable_type == models.ReactionTargetType.POST
            ).first() is not None

        formatted_posts.append({
            "post_id": post.post_id,
            "text_content": post.text_content,
            "created_at": post.created_at,
            "privacy_setting": "PUBLIC",
            "author_id": page_id,
            "author_name": page.page_name,
            "author_avatar": None,
            "files": [
                {
                    "file_id": f.file_id,
                    "file_url": f.file_url,
                    "file_name": f.file_name,
                    "file_type": f.file_type,
                    "kind": "IMAGE" if f.file_type.startswith("image/") else "VIDEO" if f.file_type.startswith("video/") else "FILE"
                }
                for f in files
            ],
            "stats": {
                "likes": like_count,
                "comments": comment_count
            },
            "is_liked_by_me": is_liked
        })

    return formatted_posts

@router.get("/pages/{page_id}/roles")
def page_roles(page_id: int, request: Request, db: Session = Depends(get_db)):
    admin = get_current_user_from_cookie(request, db)
    admin_role = db.query(models.PageRole).filter(models.PageRole.user_id == admin.user_id, models.PageRole.page_id == page_id, models.PageRole.role == models.PageRoleEnum.ADMIN).first()
    if not admin_role:
        raise HTTPException(status_code=403, detail="No permission")
    return db.query(models.PageRole).filter(models.PageRole.page_id == page_id).all()

@router.post("/pages/{page_id}/roles")
def assign_page_role(page_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    admin = get_current_user_from_cookie(request, db)
    admin_role = db.query(models.PageRole).filter(models.PageRole.user_id == admin.user_id, models.PageRole.page_id == page_id, models.PageRole.role == models.PageRoleEnum.ADMIN).first()
    if not admin_role:
        raise HTTPException(status_code=403, detail="No permission")
    user = db.query(models.User).filter(models.User.email == payload["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    rec = models.PageRole(user_id=user.user_id, page_id=page_id, role=payload["role"])
    db.merge(rec)
    db.commit()
    return {"message": "Role assigned"}

@router.delete("/pages/{page_id}/roles/{user_id}")
def remove_page_role(page_id: int, user_id: int, request: Request, db: Session = Depends(get_db)):
    admin = get_current_user_from_cookie(request, db)
    admin_role = db.query(models.PageRole).filter(models.PageRole.user_id == admin.user_id, models.PageRole.page_id == page_id, models.PageRole.role == models.PageRoleEnum.ADMIN).first()
    if not admin_role:
        raise HTTPException(status_code=403, detail="No permission")

    # Prevent admin from removing themselves
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself from the page")

    rec = db.query(models.PageRole).filter(models.PageRole.user_id == user_id, models.PageRole.page_id == page_id).first()
    if rec:
        db.delete(rec)
        db.commit()
    return {"message": "Role removed"}

@router.get("/me/pages")
def my_pages(request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    roles = db.query(models.PageRole, models.Page).join(models.Page, models.Page.page_id == models.PageRole.page_id).filter(models.PageRole.user_id == current.user_id).all()
    return [{"page_id": p.page_id, "name": p.page_name, "role": pr.role} for pr, p in roles]

# --- Events ---
@router.post("/events", status_code=status.HTTP_201_CREATED)
def create_event(payload: dict, request: Request, db: Session = Depends(get_db)):
    """Create a new event"""
    current = get_current_user_from_cookie(request, db)

    # Validate host
    host_id = payload.get("host_id")
    host_type = payload.get("host_type")

    if host_type == models.PostAuthorType.USER:
        if host_id != current.user_id:
            raise HTTPException(status_code=403, detail="Cannot create event as another user")
    elif host_type == models.PostAuthorType.PAGE:
        # Check if user is admin/editor of the page
        role = db.query(models.PageRole).filter(
            models.PageRole.page_id == host_id,
            models.PageRole.user_id == current.user_id,
            models.PageRole.role_type.in_([models.PageRoleType.ADMIN, models.PageRoleType.EDITOR])
        ).first()
        if not role:
            raise HTTPException(status_code=403, detail="Must be admin or editor to create page event")

    # Create event
    event = models.Event(
        host_id=host_id,
        host_type=host_type,
        event_name=payload["event_name"],
        description=payload.get("description"),
        start_time=payload["start_time"],
        end_time=payload.get("end_time"),
        location_text=payload.get("location_text"),
        privacy_setting=payload.get("privacy_setting", models.EventPrivacy.PUBLIC)
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Auto-RSVP creator as GOING
    participant = models.EventParticipant(
        event_id=event.event_id,
        user_id=current.user_id,
        rsvp_status=models.RSVPStatus.GOING
    )
    db.add(participant)
    db.commit()

    return event

@router.get("/events/{event_id}")
def get_event(event_id: int, request: Request, db: Session = Depends(get_db)):
    """Get event details with host info, participant counts, and user's RSVP"""
    try:
        current = get_current_user_from_cookie(request, db)
        current_user_id = current.user_id
    except:
        current_user_id = None

    event = db.query(models.Event).filter(models.Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get host info
    host_info = {}
    if event.host_type == models.PostAuthorType.USER:
        host = db.query(models.User).filter(models.User.user_id == event.host_id).first()
        if host:
            host_info = {
                "host_id": host.user_id,
                "host_type": "USER",
                "name": f"{host.first_name} {host.last_name}",
                "avatar": host.avatar_url
            }
    elif event.host_type == models.PostAuthorType.PAGE:
        host = db.query(models.Page).filter(models.Page.page_id == event.host_id).first()
        if host:
            host_info = {
                "host_id": host.page_id,
                "host_type": "PAGE",
                "name": host.page_name,
                "avatar": host.avatar_url,
                "username": host.page_username
            }

    # Get participant counts
    going_count = db.query(models.EventParticipant).filter(
        models.EventParticipant.event_id == event_id,
        models.EventParticipant.rsvp_status == models.RSVPStatus.GOING
    ).count()

    interested_count = db.query(models.EventParticipant).filter(
        models.EventParticipant.event_id == event_id,
        models.EventParticipant.rsvp_status == models.RSVPStatus.INTERESTED
    ).count()

    # Get current user's RSVP
    user_rsvp = None
    if current_user_id:
        participant = db.query(models.EventParticipant).filter(
            models.EventParticipant.event_id == event_id,
            models.EventParticipant.user_id == current_user_id
        ).first()
        if participant:
            user_rsvp = participant.rsvp_status.value

    return {
        "event_id": event.event_id,
        "host_id": event.host_id,
        "host_type": event.host_type.value,
        "event_name": event.event_name,
        "description": event.description,
        "start_time": event.start_time.isoformat() if event.start_time else None,
        "end_time": event.end_time.isoformat() if event.end_time else None,
        "location_text": event.location_text,
        "privacy_setting": event.privacy_setting.value,
        "host": host_info,
        "going_count": going_count,
        "interested_count": interested_count,
        "user_rsvp": user_rsvp
    }

@router.put("/events/{event_id}")
def update_event(event_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """Update event - only host can update"""
    current = get_current_user_from_cookie(request, db)

    event = db.query(models.Event).filter(models.Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if user is the host or has permission
    can_edit = False
    if event.host_type == models.PostAuthorType.USER:
        can_edit = event.host_id == current.user_id
    elif event.host_type == models.PostAuthorType.PAGE:
        role = db.query(models.PageRole).filter(
            models.PageRole.page_id == event.host_id,
            models.PageRole.user_id == current.user_id,
            models.PageRole.role_type.in_([models.PageRoleType.ADMIN, models.PageRoleType.EDITOR])
        ).first()
        can_edit = role is not None

    if not can_edit:
        raise HTTPException(status_code=403, detail="Only the host can update this event")

    # Update fields
    if "event_name" in payload:
        event.event_name = payload["event_name"]
    if "description" in payload:
        event.description = payload["description"]
    if "start_time" in payload:
        event.start_time = payload["start_time"]
    if "end_time" in payload:
        event.end_time = payload["end_time"]
    if "location_text" in payload:
        event.location_text = payload["location_text"]
    if "privacy_setting" in payload:
        event.privacy_setting = payload["privacy_setting"]

    db.commit()
    db.refresh(event)
    return event

@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, request: Request, db: Session = Depends(get_db)):
    """Delete event - only host can delete"""
    current = get_current_user_from_cookie(request, db)

    event = db.query(models.Event).filter(models.Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if user is the host or has permission
    can_delete = False
    if event.host_type == models.PostAuthorType.USER:
        can_delete = event.host_id == current.user_id
    elif event.host_type == models.PostAuthorType.PAGE:
        role = db.query(models.PageRole).filter(
            models.PageRole.page_id == event.host_id,
            models.PageRole.user_id == current.user_id,
            models.PageRole.role_type == models.PageRoleType.ADMIN
        ).first()
        can_delete = role is not None

    if not can_delete:
        raise HTTPException(status_code=403, detail="Only the host can delete this event")

    # Delete participants first
    db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event_id).delete()
    # Delete publications
    db.query(models.EventPublication).filter(models.EventPublication.event_id == event_id).delete()
    # Delete event
    db.delete(event)
    db.commit()
    return None

@router.post("/events/{event_id}/rsvp")
def rsvp_event(event_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    status_val = payload.get("status")

    # Check if event exists
    event = db.query(models.Event).filter(models.Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rec = models.EventParticipant(event_id=event_id, user_id=current.user_id, rsvp_status=status_val)
    db.merge(rec)
    db.commit()
    return {"status": status_val}

@router.get("/events/{event_id}/participants")
def event_participants(event_id: int, db: Session = Depends(get_db), status_filter: Optional[models.RSVPStatus] = None):
    """Get event participants with user details"""
    q = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event_id)
    if status_filter:
        q = q.filter(models.EventParticipant.rsvp_status == status_filter)

    participants = q.all()

    # Format with user details
    result = []
    for p in participants:
        user = db.query(models.User).filter(models.User.user_id == p.user_id).first()
        if user:
            result.append({
                "user_id": user.user_id,
                "name": f"{user.first_name} {user.last_name}",
                "avatar": user.avatar_url,
                "rsvp_status": p.rsvp_status.value,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None
            })

    return result

@router.get("/events")
def list_events(request: Request, db: Session = Depends(get_db), type: Optional[str] = None):
    """List events with host info and participant counts"""
    try:
        current = get_current_user_from_cookie(request, db)
        current_user_id = current.user_id
    except:
        current_user_id = None

    # Filter events based on type
    if type == "HOSTING" and current_user_id:
        events = db.query(models.Event).filter(
            models.Event.host_id == current_user_id,
            models.Event.host_type == models.PostAuthorType.USER
        ).all()
    elif type == "GOING" and current_user_id:
        eps = db.query(models.EventParticipant).filter(
            models.EventParticipant.user_id == current_user_id,
            models.EventParticipant.rsvp_status.in_([models.RSVPStatus.GOING, models.RSVPStatus.INTERESTED])
        ).all()
        ids = [e.event_id for e in eps]
        events = db.query(models.Event).filter(models.Event.event_id.in_(ids)).all()
    else:
        # Get all public events
        events = db.query(models.Event).filter(
            models.Event.privacy_setting == models.EventPrivacy.PUBLIC
        ).all()

    # Format events with host info and counts
    result = []
    for event in events:
        # Get host info
        host_info = {}
        if event.host_type == models.PostAuthorType.USER:
            host = db.query(models.User).filter(models.User.user_id == event.host_id).first()
            if host:
                host_info = {
                    "host_id": host.user_id,
                    "host_type": "USER",
                    "name": f"{host.first_name} {host.last_name}",
                    "avatar": host.avatar_url
                }
        elif event.host_type == models.PostAuthorType.PAGE:
            host = db.query(models.Page).filter(models.Page.page_id == event.host_id).first()
            if host:
                host_info = {
                    "host_id": host.page_id,
                    "host_type": "PAGE",
                    "name": host.page_name,
                    "avatar": host.avatar_url,
                    "username": host.page_username
                }

        # Get participant counts
        going_count = db.query(models.EventParticipant).filter(
            models.EventParticipant.event_id == event.event_id,
            models.EventParticipant.rsvp_status == models.RSVPStatus.GOING
        ).count()

        interested_count = db.query(models.EventParticipant).filter(
            models.EventParticipant.event_id == event.event_id,
            models.EventParticipant.rsvp_status == models.RSVPStatus.INTERESTED
        ).count()

        # Get current user's RSVP
        user_rsvp = None
        if current_user_id:
            participant = db.query(models.EventParticipant).filter(
                models.EventParticipant.event_id == event.event_id,
                models.EventParticipant.user_id == current_user_id
            ).first()
            if participant:
                user_rsvp = participant.rsvp_status.value

        result.append({
            "event_id": event.event_id,
            "host_id": event.host_id,
            "host_type": event.host_type.value,
            "event_name": event.event_name,
            "description": event.description,
            "start_time": event.start_time.isoformat() if event.start_time else None,
            "end_time": event.end_time.isoformat() if event.end_time else None,
            "location_text": event.location_text,
            "privacy_setting": event.privacy_setting.value,
            "host": host_info,
            "going_count": going_count,
            "interested_count": interested_count,
            "user_rsvp": user_rsvp
        })

    return result

# --- Reports & admin ---
@router.get("/reports/reasons")
def report_reasons(db: Session = Depends(get_db)):
    return db.query(models.ReportReason).all()

@router.post("/reports", status_code=status.HTTP_201_CREATED)
def create_report(payload: dict, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    if payload.get("target_type") == models.ReportableType.POST and payload.get("target_id") == current.user_id:
        raise HTTPException(status_code=400, detail="Cannot report own content")
    rec = models.Report(
        reporter_user_id=current.user_id,
        reportable_id=payload["target_id"],
        reportable_type=payload["target_type"],
        reason_id=payload["reason_id"],
        status=models.ReportStatus.PENDING,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"report_id": rec.report_id, "message": "Thanks for reporting"}

@router.get("/admin/reports")
def admin_reports(request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    role = db.query(models.UserRole).filter(models.UserRole.user_id == current.user_id).first()
    if not role:
        raise HTTPException(status_code=403, detail="Not admin")
    return db.query(models.Report).filter(models.Report.status == models.ReportStatus.PENDING).all()

@router.post("/admin/reports/{report_id}/resolve")
def resolve_report(report_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    current = get_current_user_from_cookie(request, db)
    role = db.query(models.UserRole).filter(models.UserRole.user_id == current.user_id).first()
    if not role:
        raise HTTPException(status_code=403, detail="Not admin")
    report = db.query(models.Report).filter(models.Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    action = models.ReportAction(
        report_id=report_id,
        reviewer_admin_id=current.user_id,
        action_taken=payload["action_taken"],
        notes=payload.get("notes"),
    )
    report.status = models.ReportStatus.ACTION_TAKEN
    db.add(action)
    db.commit()
    return {"status": "RESOLVED"}

