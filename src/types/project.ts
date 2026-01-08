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
  images: string[];
  projectType: 'work' | 'play';
}
