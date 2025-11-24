"""Quick-and-dirty seed script to populate sample data for local testing."""

from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from . import models


def get_or_create(session: Session, model, match: dict, **extra):
    """Fetch by matching fields, or create if missing."""
    obj = session.query(model).filter_by(**match).first()
    if obj:
        return obj
    obj = model(**match, **extra)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Core roles and users
    admin_role = get_or_create(db, models.Role, {"role_name": "ADMIN"}, description="Administrator")
    user_role = get_or_create(db, models.Role, {"role_name": "USER"}, description="Standard user")

    alice = get_or_create(
        db,
        models.User,
        {"email": "alice@example.com"},
        phone_number="1234567890",
        password_hash="hashed-password",
        is_active=True,
    )
    bob = get_or_create(
        db,
        models.User,
        {"email": "bob@example.com"},
        phone_number="9876543210",
        password_hash="hashed-password",
        is_active=True,
    )

    get_or_create(db, models.Profile, {"user_id": alice.user_id}, first_name="Alice", last_name="Nguyen")
    get_or_create(db, models.Profile, {"user_id": bob.user_id}, first_name="Bob", last_name="Tran")

    for u, r in [(alice, admin_role), (alice, user_role), (bob, user_role)]:
        get_or_create(db, models.UserRole, {"user_id": u.user_id, "role_id": r.role_id})

    # Pages and groups
    pho_page = get_or_create(
        db,
        models.Page,
        {"username": "pho.bo"},
        page_name="Pho Bo Page",
        category="Restaurant",
        description="Official Pho Bo updates",
        contact_info={"phone": "1234567890"},
    )
    community_group = get_or_create(
        db,
        models.Group,
        {"group_name": "Pho Lovers", "creator_user_id": alice.user_id},
        description="Discuss pho recipes",
        privacy_type=models.GroupPrivacy.PUBLIC,
        is_visible=True,
    )
    get_or_create(
        db,
        models.GroupMembership,
        {"user_id": alice.user_id, "group_id": community_group.group_id},
        role=models.GroupMemberRole.ADMIN,
        status=models.GroupMemberStatus.JOINED,
    )
    get_or_create(
        db,
        models.GroupMembership,
        {"user_id": bob.user_id, "group_id": community_group.group_id},
        role=models.GroupMemberRole.MEMBER,
        status=models.GroupMemberStatus.JOINED,
    )

    # Posts, files, comments, reactions
    post = get_or_create(
        db,
        models.Post,
        {"author_id": alice.user_id, "author_type": models.PostAuthorType.USER, "post_type": models.PostType.ORIGINAL},
        text_content="Welcome to Pho Lovers!",
        privacy_setting=models.PrivacySetting.PUBLIC,
    )
    get_or_create(
        db,
        models.PostLocation,
        {"post_id": post.post_id, "location_id": community_group.group_id, "location_type": models.LocationType.GROUP},
    )

    file_record = get_or_create(
        db,
        models.File,
        {"file_url": "https://example.com/menu.pdf"},
        uploader_user_id=alice.user_id,
        file_name="menu.pdf",
        file_type="application/pdf",
        file_size=1024,
    )
    get_or_create(db, models.PostFile, {"post_id": post.post_id, "file_id": file_record.file_id}, display_order=0)

    comment = get_or_create(
        db,
        models.Comment,
        {"commenter_user_id": bob.user_id, "commentable_id": post.post_id, "commentable_type": models.CommentableType.POST},
        text_content="Looks delicious!",
    )
    get_or_create(
        db,
        models.Reaction,
        {
            "reactor_user_id": bob.user_id,
            "reactable_id": post.post_id,
            "reactable_type": models.ReactionTargetType.POST,
        },
        reaction_type=models.ReactionType.LIKE,
    )

    # Events
    event = get_or_create(
        db,
        models.Event,
        {"event_name": "Pho Tasting", "host_id": pho_page.page_id, "host_type": models.PostAuthorType.PAGE},
        description="Join us for a pho tasting session.",
        start_time="2025-12-01T10:00:00",
        end_time="2025-12-01T12:00:00",
        privacy_setting=models.EventPrivacy.PUBLIC,
    )
    get_or_create(
        db,
        models.EventPublication,
        {
            "event_id": event.event_id,
            "publisher_id": pho_page.page_id,
            "publisher_type": models.PostAuthorType.PAGE,
            "location_id": pho_page.page_id,
            "location_type": models.PublicationLocation.PAGE_TIMELINE,
        },
    )
    get_or_create(
        db,
        models.EventParticipant,
        {"event_id": event.event_id, "user_id": alice.user_id},
        rsvp_status=models.RSVPStatus.GOING,
    )

    # Reports
    spam_reason = get_or_create(
        db, models.ReportReason, {"title": "Spam"}, description="Unwanted or repetitive content"
    )
    report = get_or_create(
        db,
        models.Report,
        {"reporter_user_id": alice.user_id, "reportable_id": bob.user_id, "reportable_type": models.ReportableType.USER},
        reason_id=spam_reason.reason_id,
        status=models.ReportStatus.PENDING,
    )
    get_or_create(
        db,
        models.ReportAction,
        {"report_id": report.report_id, "reviewer_admin_id": alice.user_id},
        action_taken=models.ReportActionType.DISMISS_REPORT,
        notes="False alarm",
    )

    db.close()


if __name__ == "__main__":
    seed()
