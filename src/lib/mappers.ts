import { Project, MediaRow, GridFilter, SearchTag, ProjectMediaItem } from '@/types/project';
import { DailyData } from '@/types/daily';
import { ContactData, AboutUsData } from '@/types/about';
import { ClientData, ImageMeta } from '@/types/client';
import { AppConfig } from '@/types/app-config';
import {
  documentToHtmlString,
  Options,
} from '@contentful/rich-text-html-renderer';
import { Document, INLINES } from '@contentful/rich-text-types';

const optimizeUrl = (url: string, contentType?: string) => {
  if (!url) return '';
  if (
    contentType &&
    contentType.startsWith('image/') &&
    !contentType.includes('svg')
  ) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=2560&q=80`;
  }
  return url;
};

const getMediaType = (contentType: string): 'image' | 'video' => {
  return contentType.startsWith('video/') ? 'video' : 'image';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAssetUrl = (asset: any): string => {
  if (!asset || !asset.fields || !asset.fields.file || !asset.fields.file.url) {
    return '';
  }
  const url = `https:${asset.fields.file.url}`;
  return optimizeUrl(url, asset.fields.file.contentType);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAssetMetadata = (asset: any) => {
  if (!asset || !asset.fields || !asset.fields.file) {
    return { url: '', width: 0, height: 0, type: 'image' as const };
  }
  const file = asset.fields.file;
  const rawUrl = `https:${file.url}`;
  return {
    url: optimizeUrl(rawUrl, file.contentType),
    width: file.details?.image?.width || 0,
    height: file.details?.image?.height || 0,
    type: getMediaType(file.contentType || ''),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseRichText = (document: any): string => {
  if (!document) return '';
  const options: Options = {
    renderNode: {
      [INLINES.HYPERLINK]: (node, next) => {
        return `<a href="${node.data.uri}" target="_blank" rel="noopener noreferrer" class="rich-text-link">${next(
          node.content,
        )}</a>`;
      },
    },
  };
  return documentToHtmlString(document as Document, options);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapSearchTag = (entry: any): SearchTag => {
  const fields = entry.fields;
  return {
    id: entry.sys.id,
    display_name: String(fields.display_name || fields.displayName || ''),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapProject = (entry: any): Project => {
  const fields = entry.fields;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = (fields.tags || [])
    .map((ref: any) => {
      if (!ref.fields) return null;
      return mapSearchTag(ref);
    })
    .filter((tag: SearchTag | null) => tag !== null);

  return {
    id: entry.sys.id,
    sys: { id: entry.sys.id },
    fields: entry.fields, // Preserve fields for live preview
    title: String(fields.title || ''),
    slug: String(fields.slug || ''),
    clientName: String(fields.clientName || ''),
    description: String(fields.description || ''),
    tags: tags as SearchTag[],
    bubble_thumbnail: getAssetUrl(
      fields.bubbleThumbnail || fields.bubble_thumbnail,
    ),
    bubble_thumbnail_hover:
      getAssetUrl(
        fields.bubbleThumbnailHover || fields.bubble_thumbnail_hover,
      ) || undefined,
    thumbnails: (fields.thumbnails || [])
      .map(getAssetUrl)
      .filter((url: string) => url),
    banners: (fields.banners || [])
      .map(getAssetUrl)
      .filter((url: string) => url),
    cast: parseRichText(fields.cast),
    media_rows: (fields.mediaRows || fields.media_rows || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => {
        if (!row || !row.fields) return null;
        return {
          row_layout: (row.fields.rowLayout ||
            row.fields.row_layout ||
            'V-1') as MediaRow['row_layout'],
          medias: (row.fields.medias || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((entry: any) => {
              // Check if entry fields exists (it should be resolved)
              if (!entry.fields) return null;

              const type = entry.fields.type || 'contentful';

              if (type === 'vimeo') {
                return {
                  type: 'vimeo',
                  url: String(
                    entry.fields.vimeo_url || entry.fields.vimeoUrl || '',
                  ),
                  external_url:
                    entry.fields.external_url || entry.fields.externalUrl
                      ? String(
                          entry.fields.external_url || entry.fields.externalUrl,
                        )
                      : undefined,
                } as ProjectMediaItem;
              }

              // Default to contentful asset
              const asset =
                entry.fields.contentful_media || entry.fields.contentfulMedia;
              const metadata = getAssetMetadata(asset);
              return {
                url: metadata.url,
                width: metadata.width,
                height: metadata.height,
                type: metadata.type, // 'image' or 'video'
                external_url:
                  entry.fields.external_url || entry.fields.externalUrl
                    ? String(
                        entry.fields.external_url || entry.fields.externalUrl,
                      )
                    : undefined,
              } as ProjectMediaItem;
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((media: any) => media && media.url),
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((row: any) => row !== null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    card_bg_color: String(
      fields.card_bg_color ||
        fields['card_bg_color'] ||
        fields.cardBgColor ||
        fields.card_background_color ||
        fields.cardBackgroundColor ||
        '',
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    card_font_color: String(
      fields.card_font_color ||
        fields['card_font_color'] ||
        fields.cardFontColor ||
        fields.card_text_color ||
        fields.cardTextColor ||
        '',
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    card_tag_color: String(
      fields.card_tag_color ||
        fields['card_tag_color'] ||
        fields.cardTagColor ||
        '',
    ),
    description_2: String(fields.description_2 || fields.description2 || ''),
    projectType: (fields.projectType) || 'work',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    card_category:
      fields.card_category || fields.cardCategory
        ? {
            name: String(
              (fields.card_category || fields.cardCategory).fields?.name || '',
            ),
          }
        : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detail_category:
      fields.detail_category || fields.detailCategory
        ? {
            name: String(
              (fields.detail_category || fields.detailCategory).fields?.name ||
                '',
            ),
          }
        : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detail_category_2:
      fields.detail_category_2 || fields.detailCategory2
        ? {
            name: String(
              (fields.detail_category_2 || fields.detailCategory2).fields
                ?.name || '',
            ),
          }
        : undefined,
    services: (fields.services || []).map(String),
    card_description: String(
      fields.card_description || fields.cardDescription || '',
    ),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapContact = (entry: any): ContactData => {
  const fields = entry.fields;
  return {
    instagram: String(fields.instagram || ''),
    email: String(fields.email || ''),
    phone: String(fields.phone || ''),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapAboutUs = (entry: any): AboutUsData => {
  const fields = entry.fields;
  return {
    slogan: String(fields.slogan || ''),
    sloganImages: (fields.slogan_images || fields.sloganImages || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((asset: any) => {
        const meta = getAssetMetadata(asset);
        return {
          url: meta.url,
          width: meta.width,
          height: meta.height,
        };
      })
      .filter((img: ImageMeta) => img.url),
    firstParagraph: String(
      fields.first_paragraph || fields.firstParagraph || '',
    ),
    header: String(fields.header || ''),
    description2: String(fields.description_2 || fields.description2 || ''),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories: (fields.categories || []).map((cat: any) => ({
      name: String(cat.fields?.name || ''),
    })),
    founderImage: getAssetUrl(fields.founder_image || fields.founderImage),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    founders: (fields.founders || []).map((founder: any) => ({
      name: String(founder.fields?.name || ''),
      role: String(founder.fields?.role || ''),
    })),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapClient = (entry: any): ClientData => {
  const fields = entry.fields;
  return {
    id: entry.sys.id,
    clientName: String(fields.client_name || fields.clientName || ''),
    thumbnails: (fields.thumbnails || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((asset: any) => {
        const meta = getAssetMetadata(asset);
        return {
          url: meta.url,
          width: meta.width,
          height: meta.height,
        };
      })
      .filter((img: ImageMeta) => img.url),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapDaily = (entry: any): DailyData => {
  const fields = entry.fields;
  const mappedMedias = (fields.medias || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((asset: any) => {
      const metadata = getAssetMetadata(asset);
      return {
        url: metadata.url,
        width: metadata.width,
        height: metadata.height,
        type: metadata.type,
      };
    })
    .filter((media: { url: string }) => media.url);

  const thumbAsset = fields.thumbnail;
  const thumbMeta = getAssetMetadata(thumbAsset);
  const thumbnail = {
    url: thumbMeta.url,
    width: thumbMeta.width,
    height: thumbMeta.height,
    type: thumbMeta.type,
  };

  const bgAsset = fields.bg_media || fields.bgMedia;
  const bgMeta = getAssetMetadata(bgAsset);
  const bgMedia = bgMeta.url
    ? {
        url: bgMeta.url,
        width: bgMeta.width,
        height: bgMeta.height,
        type: bgMeta.type,
      }
    : undefined;

  return {
    id: entry.sys.id,
    sys: { id: entry.sys.id },
    fields: entry.fields, // Preserve fields for live preview
    title: String(fields.title || ''),
    slug: String(fields.slug || ''),
    thumbnail: thumbnail,
    description: String(fields.description || ''),
    medias: mappedMedias,
    bgMedia: bgMedia,
    description2: String(fields.description_2 || fields.description2 || ''),
    createdAt: entry.sys.createdAt,
    card_bg_color: String(
      fields.card_bg_color ||
        fields['card_bg_color'] ||
        fields.cardBgColor ||
        fields.card_background_color ||
        fields.cardBackgroundColor ||
        '',
    ),
    card_font_color: String(
      fields.card_font_color ||
        fields['card_font_color'] ||
        fields.cardFontColor ||
        fields.card_text_color ||
        fields.cardTextColor ||
        '',
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detail_category:
      fields.detail_category || fields.detailCategory
        ? {
            name: String(
              (fields.detail_category || fields.detailCategory).fields?.name ||
                '',
            ),
          }
        : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detail_category_2:
      fields.detail_category_2 || fields.detailCategory2
        ? {
            name: String(
              (fields.detail_category_2 || fields.detailCategory2).fields
                ?.name || '',
            ),
          }
        : undefined,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapGridFilter = (entry: any): GridFilter => {
  const fields = entry.fields;
  return {
    id: entry.sys.id,
    name: String(fields.name || ''),
    filters: (fields.filters || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((ref: any) => {
        if (!ref.fields) return null;
        return mapSearchTag(ref);
      })
      .filter((tag: SearchTag | null) => tag !== null) as SearchTag[],
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapAppConfig = (entry: any): AppConfig => {
  const fields = entry.fields;
  const playPageBgAsset = fields.play_page_bg_media || fields.playPageBgMedia;

  let play_page_bg_media;
  if (playPageBgAsset) {
    const meta = getAssetMetadata(playPageBgAsset);
    play_page_bg_media = {
      url: meta.url,
      width: meta.width,
      height: meta.height,
      type: meta.type,
    };
  }

  return {
    show_play_grid: Boolean(
      fields.show_play_grid || fields.showPlayGrid || false,
    ),
    play_page_bg_media,
  };
};
