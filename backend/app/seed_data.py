"""Quick-and-dirty seed script to populate sample data for local testing."""

import argparse
from datetime import datetime, timedelta
from typing import Any, Dict

from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from . import models


def get_or_create(session: Session, model, match: Dict[str, Any], **extra):
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
    """Insert >=7 rows per table with realistic relationships."""
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Roles
    roles_data = [
        ("ADMIN", "Administrator"),
        ("USER", "Standard user"),
        ("MODERATOR", "Moderator"),
        ("EDITOR", "Content editor"),
        ("ANALYST", "Analytics"),
        ("SUPPORT", "Support"),
        ("GUEST", "Guest"),
    ]
    roles = {
        name: get_or_create(db, models.Role, {"role_name": name}, description=desc) for name, desc in roles_data
    }

    # Users
    users = {}
    for i in range(1, 8):
        email = f"user{i}@example.com"
        users[i] = get_or_create(
            db,
            models.User,
            {"email": email},
            phone_number=f"5550000{i:03d}",
            password_hash="hashed-password",
            is_active=True,
        )

    # Profiles
    for i in users:
        get_or_create(
            db,
            models.Profile,
            {"user_id": users[i].user_id},
            first_name=f"User{i}",
            last_name="Test",
            bio=f"Bio for user {i}",
        )

    # User roles (7 assignments)
    user_roles = [
        (users[1], roles["ADMIN"]),
        (users[1], roles["USER"]),
        (users[2], roles["USER"]),
        (users[3], roles["MODERATOR"]),
        (users[4], roles["EDITOR"]),
        (users[5], roles["ANALYST"]),
        (users[6], roles["SUPPORT"]),
    ]
    for u, r in user_roles:
        get_or_create(db, models.UserRole, {"user_id": u.user_id, "role_id": r.role_id})

    # Friendships (composite keys)
    friendship_pairs = [
        (users[1], users[2]),
        (users[1], users[3]),
        (users[2], users[3]),
        (users[2], users[4]),
        (users[3], users[5]),
        (users[4], users[5]),
        (users[6], users[7]),
    ]
    for a, b in friendship_pairs:
        low, high = sorted([a.user_id, b.user_id])
        get_or_create(
            db,
            models.Friendship,
            {"user_one_id": low, "user_two_id": high},
            status=models.FriendshipStatus.ACCEPTED,
            action_user_id=low,
        )

    # Pages
    pages = {}
    for i in range(1, 8):
        pages[i] = get_or_create(
            db,
            models.Page,
            {"username": f"page{i}"},
            page_name=f"Page {i}",
            category="Category",
            description=f"Description for page {i}",
            contact_info={"contact": f"contact{i}@example.com"},
        )

    # Page roles
    page_roles = [
        (users[1], pages[1], models.PageRoleEnum.ADMIN),
        (users[2], pages[2], models.PageRoleEnum.EDITOR),
        (users[3], pages[3], models.PageRoleEnum.MODERATOR),
        (users[4], pages[4], models.PageRoleEnum.ANALYST),
        (users[5], pages[5], models.PageRoleEnum.ADMIN),
        (users[6], pages[6], models.PageRoleEnum.MODERATOR),
        (users[7], pages[7], models.PageRoleEnum.ADMIN),
    ]
    for u, p, role in page_roles:
        get_or_create(db, models.PageRole, {"user_id": u.user_id, "page_id": p.page_id}, role=role)

    # Page follows
    page_follows = [
        (users[2], pages[1]),
        (users[3], pages[1]),
        (users[4], pages[2]),
        (users[5], pages[3]),
        (users[6], pages[4]),
        (users[7], pages[5]),
        (users[1], pages[6]),
    ]
    for u, p in page_follows:
        get_or_create(db, models.PageFollow, {"user_id": u.user_id, "page_id": p.page_id})

    # Groups
    groups = {}
    for i in range(1, 8):
        creator = users[(i % 3) + 1]
        groups[i] = get_or_create(
            db,
            models.Group,
            {"group_name": f"Group {i}", "creator_user_id": creator.user_id},
            description=f"Group {i} description",
            privacy_type=models.GroupPrivacy.PUBLIC if i % 2 else models.GroupPrivacy.PRIVATE,
            is_visible=True,
        )

    # Group memberships
    group_members = [
        (users[1], groups[1]),
        (users[2], groups[1]),
        (users[3], groups[2]),
        (users[4], groups[3]),
        (users[5], groups[4]),
        (users[6], groups[5]),
        (users[7], groups[6]),
    ]
    for u, g in group_members:
        get_or_create(
            db,
            models.GroupMembership,
            {"user_id": u.user_id, "group_id": g.group_id},
            role=models.GroupMemberRole.MEMBER,
            status=models.GroupMemberStatus.JOINED,
        )

    # Group rules
    for i in range(1, 8):
        get_or_create(
            db,
            models.GroupRule,
            {"group_id": groups[(i % 7) + 1].group_id, "title": f"Rule {i}"},
            details="Be kind.",
            display_order=i,
        )

    # Membership questions and answers
    questions = {}
    for i in range(1, 8):
        questions[i] = get_or_create(
            db,
            models.MembershipQuestion,
            {"group_id": groups[(i % 7) + 1].group_id, "question_text": f"Question {i}?"},
        )
    for i in range(1, 8):
        get_or_create(
            db,
            models.MembershipAnswer,
            {
                "user_id": users[(i % 7) + 1].user_id,
                "group_id": groups[(i % 7) + 1].group_id,
                "question_id": questions[i].question_id,
            },
            answer_text=f"Answer {i}",
        )

    # Posts
    posts = {}
    for i in range(1, 8):
        author = users[(i % 7) + 1]
        posts[i] = get_or_create(
            db,
            models.Post,
            {
                "author_id": author.user_id,
                "author_type": models.PostAuthorType.USER,
                "post_type": models.PostType.ORIGINAL,
                "text_content": f"Post content {i}",
            },
            privacy_setting=models.PrivacySetting.PUBLIC,
        )

    # Post locations
    for i in range(1, 8):
        get_or_create(
            db,
            models.PostLocation,
            {
                "post_id": posts[i].post_id,
                "location_id": groups[(i % 7) + 1].group_id,
                "location_type": models.LocationType.GROUP,
            },
        )

    # Files
    files = {}
    for i in range(1, 8):
        files[i] = get_or_create(
            db,
            models.File,
            {"file_url": f"https://example.com/file{i}.pdf"},
            uploader_user_id=users[(i % 7) + 1].user_id,
            file_name=f"file{i}.pdf",
            file_type="application/pdf",
            file_size=1024 + i,
        )

    # Post files
    for i in range(1, 8):
        get_or_create(
            db,
            models.PostFile,
            {"post_id": posts[i].post_id, "file_id": files[i].file_id},
            display_order=i,
        )

    # Comments
    comments = {}
    for i in range(1, 8):
        commenter = users[(i % 7) + 1]
        comments[i] = get_or_create(
            db,
            models.Comment,
            {
                "commenter_user_id": commenter.user_id,
                "commentable_id": posts[i].post_id,
                "commentable_type": models.CommentableType.POST,
            },
            text_content=f"Comment {i}",
        )

    # Reactions
    for i in range(1, 8):
        reactor = users[(i % 7) + 1]
        get_or_create(
            db,
            models.Reaction,
            {
                "reactor_user_id": reactor.user_id,
                "reactable_id": posts[i].post_id,
                "reactable_type": models.ReactionTargetType.POST,
            },
            reaction_type=models.ReactionType.LIKE,
        )

    # Events
    base_time = datetime(2025, 1, 1, 10, 0, 0)
    events = {}
    for i in range(1, 8):
        events[i] = get_or_create(
            db,
            models.Event,
            {"event_name": f"Event {i}", "host_id": pages[(i % 7) + 1].page_id, "host_type": models.PostAuthorType.PAGE},
            description=f"Event {i} description",
            start_time=base_time + timedelta(days=i),
            end_time=base_time + timedelta(days=i, hours=2),
            privacy_setting=models.EventPrivacy.PUBLIC,
        )

    # Event publications
    for i in range(1, 8):
        get_or_create(
            db,
            models.EventPublication,
            {
                "event_id": events[i].event_id,
                "publisher_id": pages[(i % 7) + 1].page_id,
                "publisher_type": models.PostAuthorType.PAGE,
                "location_id": pages[(i % 7) + 1].page_id,
                "location_type": models.PublicationLocation.PAGE_TIMELINE,
            },
        )

    # Event participants
    for i in range(1, 8):
        get_or_create(
            db,
            models.EventParticipant,
            {"event_id": events[i].event_id, "user_id": users[(i % 7) + 1].user_id},
            rsvp_status=models.RSVPStatus.GOING,
        )

    # Reports and reasons
    reasons = {}
    for i, title in enumerate(["Spam", "Abuse", "Fraud", "Harassment", "Hate", "Misinformation", "Other"], start=1):
        reasons[i] = get_or_create(db, models.ReportReason, {"title": title}, description=f"{title} description")

    reports = {}
    for i in range(1, 8):
        reports[i] = get_or_create(
            db,
            models.Report,
            {
                "reporter_user_id": users[(i % 7) + 1].user_id,
                "reportable_id": users[(i % 7) + 1].user_id,
                "reportable_type": models.ReportableType.USER,
                "reason_id": reasons[i].reason_id,
            },
            status=models.ReportStatus.PENDING,
        )

    # Report actions
    action_types = [
        models.ReportActionType.DISMISS_REPORT,
        models.ReportActionType.WARN_USER,
        models.ReportActionType.DELETE_CONTENT,
        models.ReportActionType.BAN_USER,
        models.ReportActionType.DISMISS_REPORT,
        models.ReportActionType.WARN_USER,
        models.ReportActionType.DELETE_CONTENT,
    ]
    for i in range(1, 8):
        get_or_create(
            db,
            models.ReportAction,
            {"report_id": reports[i].report_id, "reviewer_admin_id": users[1].user_id},
            action_taken=action_types[i - 1],
            notes=f"Action {i}",
        )

    db.close()


def clear_seed_data():
    """Delete all rows for the seeded tables."""
    db = SessionLocal()
    delete_order = [
        models.ReportAction,
        models.Report,
        models.ReportReason,
        models.EventParticipant,
        models.EventPublication,
        models.Event,
        models.MembershipAnswer,
        models.MembershipQuestion,
        models.GroupRule,
        models.GroupMembership,
        models.Group,
        models.PageFollow,
        models.PageRole,
        models.Page,
        models.Reaction,
        models.Comment,
        models.PostFile,
        models.File,
        models.PostLocation,
        models.Post,
        models.Friendship,
        models.UserRole,
        models.Role,
        models.Profile,
        models.User,
    ]
    for model in delete_order:
        db.query(model).delete(synchronize_session=False)
    db.commit()
    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or clear sample data.")
    parser.add_argument("--clear", action="store_true", help="Delete seeded data instead of inserting it.")
    args = parser.parse_args()

    if args.clear:
        clear_seed_data()
    else:
        seed()
