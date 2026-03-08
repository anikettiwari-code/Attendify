/**
 * Notice Types
 */

export interface Notice {
  id: number;
  title: string;
  content: string;
  author: string;
  date: string;
}

export interface CreateNoticeRequest {
  title: string;
  content: string;
  author?: string;
}
