export interface ContentfulMediaItem {
  url: string;
  type: 'image' | 'video';
  width: number;
  height: number;
}

export interface VimeoMediaItem {
  url: string;
  type: 'vimeo';
}

export type ProjectMediaItem = ContentfulMediaItem | VimeoMediaItem;

export interface MediaRow {
  row_layout: 'V-1' | 'V-2' | 'V-3' | 'H-1' | 'H-2';
  medias: ProjectMediaItem[];
}

export interface Project {
  id: string;
  title: string;
  clientName: string;
  description: string;
  tags: string[];
  bubble_thumbnail: string;
  bubble_thumbnail_hover?: string;
  thumbnails: string[];
  banners: string[];
  cast: string;
  media_rows: MediaRow[];
  description_2?: string;
  projectType: 'work' | 'play';
}

export interface SearchTag {
  id: string;
  display_name: string;
  tag_id: string;
}

export interface GridFilter {
  id: string;
  name: string;
  filters: SearchTag[];
}
