import { Category } from './about';

export interface DailyMedia {
  url: string;
  width: number;
  height: number;
  type: 'image' | 'video';
}

export interface DailyData {
  id: string;
  title: string;
  thumbnail: DailyMedia;
  description: string;
  medias: DailyMedia[];
  bgMedia?: DailyMedia; // Changed to optional DailyMedia type to support video
  description2: string;
  createdAt: string; // useful for sorting or display if needed
  card_bg_color?: string;
  card_font_color?: string;
  detail_category?: Category;
  detail_category_2?: Category;
}
