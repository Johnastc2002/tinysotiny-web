export interface ImageMeta {
  url: string;
  width: number;
  height: number;
}

export interface ClientData {
  id: string;
  clientName: string;
  thumbnails?: ImageMeta[];
}
