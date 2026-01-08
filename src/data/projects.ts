import { Project } from '@/types/project';

export const projects: Project[] = [
  {
    id: 1,
    title: 'Urban Exploration',
    clientName: 'Nike',
    description:
      'A journey through the concrete jungle, capturing the essence of movement and style in urban environments.',
    tags: ['PHOTOGRAPHY', 'ART DIRECTION', 'STREET'],
    bubble_thumbnail: 'https://picsum.photos/seed/nike1/400',
    bubble_thumbnail_hover: 'https://picsum.photos/seed/nike1hover/400',
    thumbnails: ['https://picsum.photos/seed/nike_thumb/800'],
    banners: [
      'https://picsum.photos/seed/nike_banner1/1920/1080',
      'https://picsum.photos/seed/nike_banner2/1920/1080',
      'https://picsum.photos/seed/nike_banner3/1920/1080',
    ],
    cast: 'Director: John Doe\nModel: Jane Smith\nStylist: Mike Ross\nPhotographer: Eddie Li\nGaffer: Wes\nDOP: Ken Mok\nPost Production: Yin Ip\nMakeup Artist: Chi Chi Li\nSet Designer: Anna Chen\nLighting Assistant: Tom Wang',
    images: [
      'https://picsum.photos/seed/nike_img1/800',
      'https://picsum.photos/seed/nike_img2/800',
      'https://picsum.photos/seed/nike_img3/800',
      'https://picsum.photos/seed/nike_img4/800',
      'https://picsum.photos/seed/nike_img5/800',
      'https://picsum.photos/seed/nike_img6/800',
      'https://picsum.photos/seed/nike_img7/800',
      'https://picsum.photos/seed/nike_img8/800',
    ],
  },
  {
    id: 2,
    title: 'Natural Harmony',
    clientName: 'Aesop',
    description:
      'Exploring the delicate balance between nature and skincare, featuring organic textures and calming tones.',
    tags: ['BRANDING', 'PRODUCT', 'LIFESTYLE'],
    bubble_thumbnail: 'https://picsum.photos/seed/aesop1/400',
    thumbnails: ['https://picsum.photos/seed/aesop_thumb/800'],
    banners: [
      'https://picsum.photos/seed/aesop_banner/1920/1080',
      'https://picsum.photos/seed/aesop_banner2/1920/1080',
    ],
    cast: 'Photographer: Sarah Lee\nArt Director: James Wu\nStylist: Emma Watson\nModel: Lucas Chen\nLighting: David Miller\nRetoucher: Sophie Taylor\nAssistant: Chris Evans\nLocation Scout: Olivia Brown',
    images: [
      'https://picsum.photos/seed/aesop_img1/800',
      'https://picsum.photos/seed/aesop_img2/800',
      'https://picsum.photos/seed/aesop_img3/800',
      'https://picsum.photos/seed/aesop_img4/800',
      'https://picsum.photos/seed/aesop_img5/800',
    ],
  },
  {
    id: 3,
    title: 'Future Tech',
    clientName: 'Sony',
    description:
      'Showcasing the next generation of wearable technology with a sleek, futuristic aesthetic.',
    tags: ['TECH', '3D DESIGN', 'COMMERCIAL'],
    bubble_thumbnail: 'https://picsum.photos/seed/sony1/400',
    thumbnails: ['https://picsum.photos/seed/sony_thumb/800'],
    banners: ['https://picsum.photos/seed/sony_banner/1920/1080'],
    cast: 'CGI Artist: Mike Brown\nCreative Director: Alice Cooper\n3D Modeler: Sam Wilson\nTexture Artist: Kate Hudson\nAnimator: Ryan Reynolds\nSound Design: Hans Zimmer\nCompositor: Michael Bay',
    images: [
      'https://picsum.photos/seed/sony_img1/800',
      'https://picsum.photos/seed/sony_img2/800',
      'https://picsum.photos/seed/sony_img3/800',
      'https://picsum.photos/seed/sony_img4/800',
      'https://picsum.photos/seed/sony_img5/800',
    ],
  },
  {
    id: 4,
    title: 'Summer Vibes',
    clientName: 'Coca-Cola',
    description:
      'Capturing the joy and refreshment of summer moments with vibrant colors and energetic compositions.',
    tags: ['ADVERTISING', 'LIFESTYLE', 'SUMMER'],
    bubble_thumbnail: 'https://picsum.photos/seed/coke1/400',
    thumbnails: ['https://picsum.photos/seed/coke_thumb/800'],
    banners: ['https://picsum.photos/seed/coke_banner/1920/1080'],
    cast: 'Director: Emily White\nProducer: George Lucas\nDOP: Roger Deakins\nEditor: Thelma Schoonmaker\nColorist: DaVinci Dave\nSound Mixer: Skywalker Sound\nMusic: John Williams\nProduction Design: Sarah Greenwood',
    images: [
      'https://picsum.photos/seed/coke_img1/800',
      'https://picsum.photos/seed/coke_img2/800',
      'https://picsum.photos/seed/coke_img3/800',
      'https://picsum.photos/seed/coke_img4/800',
      'https://picsum.photos/seed/coke_img5/800',
    ],
  },
  {
    id: 5,
    title: 'Minimalist Living',
    clientName: 'Muji',
    description:
      'Emphasizing simplicity and functionality in everyday life through clean lines and neutral palettes.',
    tags: ['INTERIOR', 'MINIMALISM', 'HOME'],
    bubble_thumbnail: 'https://picsum.photos/seed/muji1/400',
    thumbnails: ['https://picsum.photos/seed/muji_thumb/800'],
    banners: ['https://picsum.photos/seed/muji_banner/1920/1080'],
    cast: 'Stylist: Alex Green\nInterior Designer: Kelly Hoppen\nPhotographer: Mario Testino\nAssistant Stylist: Jane Doe\nSet Builder: Bob The Builder\nLighting: Lux Lighting\nCoordinator: Project Manager',
    images: [
      'https://picsum.photos/seed/muji_img1/800',
      'https://picsum.photos/seed/muji_img2/800',
      'https://picsum.photos/seed/muji_img3/800',
      'https://picsum.photos/seed/muji_img4/800',
    ],
  },
];

export function getProjectById(id: string | number): Project | undefined {
  return projects.find((p) => p.id.toString() === id.toString());
}
