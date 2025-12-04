// Based on USERS + PROFILES + PAGES
export interface Author {
  id: string; // user_id or page_id
  name: string; // Combined first+last OR page_name
  avatar_url: string;
  type: 'USER' | 'PAGE'; // Matches author_type
}

// Based on FILES
export interface Attachment {
  file_id: string;
  file_url: string;
  file_type: 'image/jpeg' | 'video/mp4' | string;
}

// Based on POSTS + Joined Data
export interface PostData {
  post_id: string;
  text_content: string;
  privacy_setting: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME';
  created_at: string;
  author: Author; // Polymorphic resolution from backend
  files: Attachment[]; // From POST_FILES join
  stats: { // Aggregated counts
    likes: number;
    comments: number;
  };
}