import { ImageMeta } from './client';

export interface ContactData {
  instagram: string;
  email: string;
  phone: string;
}

export interface Founder {
  name: string;
  role: string;
}

export interface AboutUsData {
  slogan: string;
  sloganImages?: ImageMeta[];
  firstParagraph: string; // This is "Long text" in Contentful
  header: string;
  description2: string;
  categories: string[];
  founderImage?: string;
  founders?: Founder[];
}
