from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from . import models


class UserBase(BaseModel):
    email: EmailStr
    phone_number: Optional[str] = None
    password_hash: str
    is_active: Optional[bool] = True
    last_login: Optional[datetime] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password_hash: Optional[str] = None
    is_active: Optional[bool] = None
    last_login: Optional[datetime] = None


class User(UserBase):
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfileBase(BaseModel):
    user_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[models.GenderEnum] = None
    profile_picture_url: Optional[str] = None
    cover_photo_url: Optional[str] = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[models.GenderEnum] = None
    profile_picture_url: Optional[str] = None
    cover_photo_url: Optional[str] = None


class Profile(ProfileBase):
    profile_id: int

    model_config = ConfigDict(from_attributes=True)


class RoleBase(BaseModel):
    role_name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    role_name: Optional[str] = None
    description: Optional[str] = None


class Role(RoleBase):
    role_id: int

    model_config = ConfigDict(from_attributes=True)


class UserRoleBase(BaseModel):
    user_id: int
    role_id: int


class UserRole(UserRoleBase):
    model_config = ConfigDict(from_attributes=True)


class FriendshipBase(BaseModel):
    user_one_id: int
    user_two_id: int
    status: models.FriendshipStatus
    action_user_id: int


class FriendshipCreate(FriendshipBase):
    pass


class FriendshipUpdate(BaseModel):
    status: Optional[models.FriendshipStatus] = None
    action_user_id: Optional[int] = None


class Friendship(FriendshipBase):
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostBase(BaseModel):
    author_id: int
    author_type: models.PostAuthorType
    text_content: Optional[str] = None
    privacy_setting: Optional[models.PrivacySetting] = models.PrivacySetting.FRIENDS
    post_type: Optional[models.PostType] = models.PostType.ORIGINAL
    parent_post_id: Optional[int] = None


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    text_content: Optional[str] = None
    privacy_setting: Optional[models.PrivacySetting] = None
    post_type: Optional[models.PostType] = None
    parent_post_id: Optional[int] = None


class Post(PostBase):
    post_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PostLocationBase(BaseModel):
    post_id: int
    location_id: int
    location_type: models.LocationType


class PostLocation(PostLocationBase):
    model_config = ConfigDict(from_attributes=True)


class FileBase(BaseModel):
    uploader_user_id: int
    file_name: str
    file_type: str
    file_size: int
    file_url: str
    thumbnail_url: Optional[str] = None


class FileCreate(FileBase):
    pass


class FileUpdate(BaseModel):
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class File(FileBase):
    file_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostFileBase(BaseModel):
    post_id: int
    file_id: int
    display_order: Optional[int] = 0


class PostFileUpdate(BaseModel):
    display_order: Optional[int] = None


class PostFile(PostFileBase):
    model_config = ConfigDict(from_attributes=True)


class CommentBase(BaseModel):
    commenter_user_id: int
    commentable_id: int
    commentable_type: models.CommentableType
    parent_comment_id: Optional[int] = None
    text_content: str


class CommentCreate(CommentBase):
    pass


class CommentUpdate(BaseModel):
    text_content: Optional[str] = None
    parent_comment_id: Optional[int] = None


class Comment(CommentBase):
    comment_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReactionBase(BaseModel):
    reactor_user_id: int
    reactable_id: int
    reactable_type: models.ReactionTargetType
    reaction_type: models.ReactionType


class ReactionUpdate(BaseModel):
    reaction_type: Optional[models.ReactionType] = None


class Reaction(ReactionBase):
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PageBase(BaseModel):
    page_name: str
    username: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    contact_info: Optional[dict] = None


class PageCreate(PageBase):
    pass


class PageUpdate(BaseModel):
    page_name: Optional[str] = None
    username: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    contact_info: Optional[dict] = None


class Page(PageBase):
    page_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PageRoleBase(BaseModel):
    user_id: int
    page_id: int
    role: models.PageRoleEnum


class PageRoleUpdate(BaseModel):
    role: Optional[models.PageRoleEnum] = None


class PageRole(PageRoleBase):
    model_config = ConfigDict(from_attributes=True)


class PageFollowBase(BaseModel):
    user_id: int
    page_id: int
    followed_at: Optional[datetime] = None


class PageFollow(PageFollowBase):
    model_config = ConfigDict(from_attributes=True)


class GroupBase(BaseModel):
    creator_user_id: int
    group_name: str
    description: Optional[str] = None
    cover_photo_url: Optional[str] = None
    privacy_type: models.GroupPrivacy
    is_visible: Optional[bool] = True


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    group_name: Optional[str] = None
    description: Optional[str] = None
    cover_photo_url: Optional[str] = None
    privacy_type: Optional[models.GroupPrivacy] = None
    is_visible: Optional[bool] = None


class Group(GroupBase):
    group_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GroupMembershipBase(BaseModel):
    user_id: int
    group_id: int
    role: Optional[models.GroupMemberRole] = models.GroupMemberRole.MEMBER
    status: models.GroupMemberStatus


class GroupMembershipCreate(GroupMembershipBase):
    pass


class GroupMembershipUpdate(BaseModel):
    role: Optional[models.GroupMemberRole] = None
    status: Optional[models.GroupMemberStatus] = None


class GroupMembership(GroupMembershipBase):
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GroupRuleBase(BaseModel):
    group_id: int
    title: str
    details: Optional[str] = None
    display_order: Optional[int] = 0


class GroupRuleCreate(GroupRuleBase):
    pass


class GroupRuleUpdate(BaseModel):
    title: Optional[str] = None
    details: Optional[str] = None
    display_order: Optional[int] = None


class GroupRule(GroupRuleBase):
    rule_id: int

    model_config = ConfigDict(from_attributes=True)


class MembershipQuestionBase(BaseModel):
    group_id: int
    question_text: str


class MembershipQuestionCreate(MembershipQuestionBase):
    pass


class MembershipQuestionUpdate(BaseModel):
    question_text: Optional[str] = None


class MembershipQuestion(MembershipQuestionBase):
    question_id: int

    model_config = ConfigDict(from_attributes=True)


class MembershipAnswerBase(BaseModel):
    user_id: int
    group_id: int
    question_id: int
    answer_text: str


class MembershipAnswerCreate(MembershipAnswerBase):
    pass


class MembershipAnswerUpdate(BaseModel):
    answer_text: Optional[str] = None


class MembershipAnswer(MembershipAnswerBase):
    model_config = ConfigDict(from_attributes=True)


class EventBase(BaseModel):
    host_id: int
    host_type: models.PostAuthorType
    event_name: str
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    location_text: Optional[str] = None
    privacy_setting: models.EventPrivacy


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    event_name: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location_text: Optional[str] = None
    privacy_setting: Optional[models.EventPrivacy] = None


class Event(EventBase):
    event_id: int

    model_config = ConfigDict(from_attributes=True)


class EventPublicationBase(BaseModel):
    event_id: int
    publisher_id: int
    publisher_type: models.PostAuthorType
    location_id: int
    location_type: models.PublicationLocation


class EventPublicationCreate(EventPublicationBase):
    pass


class EventPublicationUpdate(BaseModel):
    publisher_id: Optional[int] = None
    publisher_type: Optional[models.PostAuthorType] = None
    location_id: Optional[int] = None
    location_type: Optional[models.PublicationLocation] = None


class EventPublication(EventPublicationBase):
    publication_id: int

    model_config = ConfigDict(from_attributes=True)


class EventParticipantBase(BaseModel):
    event_id: int
    user_id: int
    rsvp_status: models.RSVPStatus


class EventParticipantCreate(EventParticipantBase):
    pass


class EventParticipantUpdate(BaseModel):
    rsvp_status: Optional[models.RSVPStatus] = None


class EventParticipant(EventParticipantBase):
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportReasonBase(BaseModel):
    title: str
    description: Optional[str] = None


class ReportReasonCreate(ReportReasonBase):
    pass


class ReportReasonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class ReportReason(ReportReasonBase):
    reason_id: int

    model_config = ConfigDict(from_attributes=True)


class ReportBase(BaseModel):
    reporter_user_id: int
    reportable_id: int
    reportable_type: models.ReportableType
    reason_id: int
    status: Optional[models.ReportStatus] = models.ReportStatus.PENDING


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    status: Optional[models.ReportStatus] = None
    reason_id: Optional[int] = None


class Report(ReportBase):
    report_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportActionBase(BaseModel):
    report_id: int
    reviewer_admin_id: int
    action_taken: models.ReportActionType
    notes: Optional[str] = None


class ReportActionCreate(ReportActionBase):
    pass


class ReportActionUpdate(BaseModel):
    action_taken: Optional[models.ReportActionType] = None
    notes: Optional[str] = None


class ReportAction(ReportActionBase):
    action_id: int
    action_at: datetime

    model_config = ConfigDict(from_attributes=True)
