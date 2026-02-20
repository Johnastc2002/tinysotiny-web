import { Category } from './about';

export interface ContentfulMediaItem {
  url: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  external_url?: string;
}

export interface VimeoMediaItem {
  url: string;
  type: 'vimeo';
  external_url?: string;
}

export type ProjectMediaItem = ContentfulMediaItem | VimeoMediaItem;

export interface MediaRow {
  row_layout: 'V-1' | 'V-2' | 'V-3' | 'H-1' | 'H-2';
  medias: ProjectMediaItem[];
}

export interface Project {
  id: string;
  sys?: { id: string }; // For Contentful Live Preview
  fields?: any; // For Contentful Live Preview raw data
  title: string;
  clientName?: string;
  description: string;
  tags: SearchTag[];
  bubble_thumbnail: string;
  bubble_thumbnail_hover?: string;
  thumbnails: string[];
  banners: string[];
  cast: string;
  media_rows: MediaRow[];
  description_2?: string;
  projectType: 'work' | 'play';
  card_bg_color?: string;
  card_font_color?: string;
  card_tag_color?: string;
  services?: string[];
  card_category?: Category;
  detail_category?: Category;
  detail_category_2?: Category;
  slug: string;
  card_description?: string;
}

export interface SearchTag {
  id: string;
  display_name: string;
}

export interface GridFilter {
  id: string;
  name: string;
  filters: SearchTag[];
}
