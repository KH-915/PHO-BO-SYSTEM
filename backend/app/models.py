from enum import Enum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    PrimaryKeyConstraint,
    func,
)

from .database import Base


class GenderEnum(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class PostAuthorType(str, Enum):
    USER = "USER"
    PAGE = "PAGE"


class PrivacySetting(str, Enum):
    PUBLIC = "PUBLIC"
    FRIENDS = "FRIENDS"
    ONLY_ME = "ONLY_ME"


class PostType(str, Enum):
    ORIGINAL = "ORIGINAL"
    SHARE = "SHARE"


class LocationType(str, Enum):
    USER_TIMELINE = "USER_TIMELINE"
    GROUP = "GROUP"


class CommentableType(str, Enum):
    POST = "POST"
    FILE = "FILE"


class ReactionTargetType(str, Enum):
    POST = "POST"
    COMMENT = "COMMENT"


class ReactionType(str, Enum):
    LIKE = "LIKE"
    LOVE = "LOVE"
    HAHA = "HAHA"
    SAD = "SAD"
    ANGRY = "ANGRY"


class PageRoleEnum(str, Enum):
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    MODERATOR = "MODERATOR"
    ANALYST = "ANALYST"


class GroupPrivacy(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class GroupMemberRole(str, Enum):
    ADMIN = "ADMIN"
    MODERATOR = "MODERATOR"
    MEMBER = "MEMBER"


class GroupMemberStatus(str, Enum):
    JOINED = "JOINED"
    PENDING = "PENDING"
    BANNED = "BANNED"
    INVITED = "INVITED"


class EventPrivacy(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
    FRIENDS = "FRIENDS"


class PublicationLocation(str, Enum):
    USER_TIMELINE = "USER_TIMELINE"
    GROUP = "GROUP"
    PAGE_TIMELINE = "PAGE_TIMELINE"


class RSVPStatus(str, Enum):
    GOING = "GOING"
    INTERESTED = "INTERESTED"
    CANT_GO = "CANT_GO"


class ReportableType(str, Enum):
    POST = "POST"
    COMMENT = "COMMENT"
    USER = "USER"
    PAGE = "PAGE"
    GROUP = "GROUP"


class ReportStatus(str, Enum):
    PENDING = "PENDING"
    REVIEWED = "REVIEWED"
    ACTION_TAKEN = "ACTION_TAKEN"
    DISMISSED = "DISMISSED"


class ReportActionType(str, Enum):
    DELETE_CONTENT = "DELETE_CONTENT"
    BAN_USER = "BAN_USER"
    WARN_USER = "WARN_USER"
    DISMISS_REPORT = "DISMISS_REPORT"


class FriendshipStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    BLOCKED = "BLOCKED"


class User(Base):
    __tablename__ = "users"

    user_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), unique=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True))
    is_active = Column(Boolean, nullable=False, server_default="1")


class Profile(Base):
    __tablename__ = "profiles"

    profile_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), unique=True, nullable=False, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    bio = Column(Text)
    date_of_birth = Column(Date)
    gender = Column(SAEnum(GenderEnum))
    profile_picture_url = Column(String(255))
    cover_photo_url = Column(String(255))


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(BigInteger, primary_key=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (PrimaryKeyConstraint("user_id", "role_id"),)

    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    role_id = Column(BigInteger, ForeignKey("roles.role_id"), nullable=False)


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (PrimaryKeyConstraint("user_one_id", "user_two_id"),)

    user_one_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    user_two_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    status = Column(SAEnum(FriendshipStatus), nullable=False)
    action_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Post(Base):
    __tablename__ = "posts"

    post_id = Column(BigInteger, primary_key=True, autoincrement=True)
    author_id = Column(BigInteger, nullable=False)
    author_type = Column(SAEnum(PostAuthorType), nullable=False)
    text_content = Column(Text)
    privacy_setting = Column(SAEnum(PrivacySetting), nullable=False, server_default=PrivacySetting.FRIENDS.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    post_type = Column(SAEnum(PostType), server_default=PostType.ORIGINAL.value)
    parent_post_id = Column(BigInteger, ForeignKey("posts.post_id"))


class PostLocation(Base):
    __tablename__ = "post_locations"
    __table_args__ = (PrimaryKeyConstraint("post_id", "location_id", "location_type"),)

    post_id = Column(BigInteger, ForeignKey("posts.post_id"), nullable=False)
    location_id = Column(BigInteger, nullable=False)
    location_type = Column(SAEnum(LocationType), nullable=False)


class File(Base):
    __tablename__ = "files"

    file_id = Column(BigInteger, primary_key=True, autoincrement=True)
    uploader_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_url = Column(String(255), nullable=False)
    thumbnail_url = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PostFile(Base):
    __tablename__ = "post_files"
    __table_args__ = (PrimaryKeyConstraint("post_id", "file_id"),)

    post_id = Column(BigInteger, ForeignKey("posts.post_id"), nullable=False)
    file_id = Column(BigInteger, ForeignKey("files.file_id"), nullable=False)
    display_order = Column(Integer, nullable=False, server_default="0")


class Comment(Base):
    __tablename__ = "comments"

    comment_id = Column(BigInteger, primary_key=True, autoincrement=True)
    commenter_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    commentable_id = Column(BigInteger, nullable=False)
    commentable_type = Column(SAEnum(CommentableType), nullable=False)
    parent_comment_id = Column(BigInteger, ForeignKey("comments.comment_id"))
    text_content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (PrimaryKeyConstraint("reactor_user_id", "reactable_id", "reactable_type"),)

    reactor_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    reactable_id = Column(BigInteger, nullable=False)
    reactable_type = Column(SAEnum(ReactionTargetType), nullable=False)
    reaction_type = Column(SAEnum(ReactionType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Page(Base):
    __tablename__ = "pages"

    page_id = Column(BigInteger, primary_key=True, autoincrement=True)
    page_name = Column(String(255), nullable=False)
    username = Column(String(100), unique=True)
    category = Column(String(100))
    description = Column(Text)
    contact_info = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PageRole(Base):
    __tablename__ = "page_roles"
    __table_args__ = (PrimaryKeyConstraint("user_id", "page_id"),)

    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    page_id = Column(BigInteger, ForeignKey("pages.page_id"), nullable=False)
    role = Column(SAEnum(PageRoleEnum), nullable=False)


class PageFollow(Base):
    __tablename__ = "page_follows"
    __table_args__ = (PrimaryKeyConstraint("user_id", "page_id"),)

    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    page_id = Column(BigInteger, ForeignKey("pages.page_id"), nullable=False)
    followed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Group(Base):
    __tablename__ = "groups"

    group_id = Column(BigInteger, primary_key=True, autoincrement=True)
    creator_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    group_name = Column(String(255), nullable=False)
    description = Column(Text)
    cover_photo_url = Column(String(255))
    privacy_type = Column(SAEnum(GroupPrivacy), nullable=False)
    is_visible = Column(Boolean, nullable=False, server_default="1")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    __table_args__ = (PrimaryKeyConstraint("user_id", "group_id"),)

    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    group_id = Column(BigInteger, ForeignKey("groups.group_id"), nullable=False)
    role = Column(SAEnum(GroupMemberRole), nullable=False, server_default=GroupMemberRole.MEMBER.value)
    status = Column(SAEnum(GroupMemberStatus), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class GroupRule(Base):
    __tablename__ = "group_rules"

    rule_id = Column(BigInteger, primary_key=True, autoincrement=True)
    group_id = Column(BigInteger, ForeignKey("groups.group_id"), nullable=False)
    title = Column(String(255), nullable=False)
    details = Column(Text)
    display_order = Column(Integer, nullable=False, server_default="0")


class MembershipQuestion(Base):
    __tablename__ = "membership_questions"

    question_id = Column(BigInteger, primary_key=True, autoincrement=True)
    group_id = Column(BigInteger, ForeignKey("groups.group_id"), nullable=False)
    question_text = Column(Text, nullable=False)


class MembershipAnswer(Base):
    __tablename__ = "membership_answers"
    __table_args__ = (PrimaryKeyConstraint("user_id", "group_id", "question_id"),)

    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    group_id = Column(BigInteger, ForeignKey("groups.group_id"), nullable=False)
    question_id = Column(BigInteger, ForeignKey("membership_questions.question_id"), nullable=False)
    answer_text = Column(Text, nullable=False)


class Event(Base):
    __tablename__ = "events"

    event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    host_id = Column(BigInteger, nullable=False)
    host_type = Column(SAEnum(PostAuthorType), nullable=False)
    event_name = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    location_text = Column(Text)
    privacy_setting = Column(SAEnum(EventPrivacy), nullable=False)


class EventPublication(Base):
    __tablename__ = "event_publications"

    publication_id = Column(BigInteger, primary_key=True, autoincrement=True)
    event_id = Column(BigInteger, ForeignKey("events.event_id"), nullable=False)
    publisher_id = Column(BigInteger, nullable=False)
    publisher_type = Column(SAEnum(PostAuthorType), nullable=False)
    location_id = Column(BigInteger, nullable=False)
    location_type = Column(SAEnum(PublicationLocation), nullable=False)


class EventParticipant(Base):
    __tablename__ = "event_participants"
    __table_args__ = (PrimaryKeyConstraint("event_id", "user_id"),)

    event_id = Column(BigInteger, ForeignKey("events.event_id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    rsvp_status = Column(SAEnum(RSVPStatus), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ReportReason(Base):
    __tablename__ = "report_reasons"

    reason_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)


class Report(Base):
    __tablename__ = "reports"

    report_id = Column(BigInteger, primary_key=True, autoincrement=True)
    reporter_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    reportable_id = Column(BigInteger, nullable=False)
    reportable_type = Column(SAEnum(ReportableType), nullable=False)
    reason_id = Column(Integer, ForeignKey("report_reasons.reason_id"), nullable=False)
    status = Column(SAEnum(ReportStatus), nullable=False, server_default=ReportStatus.PENDING.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ReportAction(Base):
    __tablename__ = "report_actions"

    action_id = Column(BigInteger, primary_key=True, autoincrement=True)
    report_id = Column(BigInteger, ForeignKey("reports.report_id"), nullable=False)
    reviewer_admin_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    action_taken = Column(SAEnum(ReportActionType), nullable=False)
    notes = Column(Text)
    action_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
