from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from . import models, schemas

router = APIRouter()


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
register_simple_crud(
    prefix="users",
    model_cls=models.User,
    create_schema=schemas.UserCreate,
    update_schema=schemas.UserUpdate,
    response_schema=schemas.User,
    pk_field="user_id",
)
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
register_simple_crud(
    prefix="posts",
    model_cls=models.Post,
    create_schema=schemas.PostCreate,
    update_schema=schemas.PostUpdate,
    response_schema=schemas.Post,
    pk_field="post_id",
)
register_simple_crud(
    prefix="files",
    model_cls=models.File,
    create_schema=schemas.FileCreate,
    update_schema=schemas.FileUpdate,
    response_schema=schemas.File,
    pk_field="file_id",
)
register_simple_crud(
    prefix="comments",
    model_cls=models.Comment,
    create_schema=schemas.CommentCreate,
    update_schema=schemas.CommentUpdate,
    response_schema=schemas.Comment,
    pk_field="comment_id",
)
register_simple_crud(
    prefix="pages",
    model_cls=models.Page,
    create_schema=schemas.PageCreate,
    update_schema=schemas.PageUpdate,
    response_schema=schemas.Page,
    pk_field="page_id",
)
register_simple_crud(
    prefix="groups",
    model_cls=models.Group,
    create_schema=schemas.GroupCreate,
    update_schema=schemas.GroupUpdate,
    response_schema=schemas.Group,
    pk_field="group_id",
)
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
def create_reaction(payload: schemas.ReactionBase, db: Session = Depends(get_db)):
    record = models.Reaction(**payload.model_dump())
    db.add(record)
    db.commit()
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
