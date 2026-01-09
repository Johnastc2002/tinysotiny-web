export interface MediaRow {
  row_layout: 'V-1' | 'V-2' | 'V-3' | 'H-1' | 'H-2';
  medias: string[];
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
