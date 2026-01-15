import { ContentfulMediaItem } from './project';

export interface AppConfig {
  welcome_video?: ContentfulMediaItem;
  show_play_grid: boolean;
  play_page_bg_media?: ContentfulMediaItem;
}
