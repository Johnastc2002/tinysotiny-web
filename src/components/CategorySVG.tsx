import React from 'react';
import { Category } from '@/types/about';
import PhotographyAnimation from './PhotographyAnimation';
import MotionGraphicsAnimation from './MotionGraphicsAnimation';
import VideographyAnimation from './VideographyAnimation';
import BrandingAnimation from './BrandingAnimation';

interface CategorySVGProps {
  category: Category;
  className?: string;
}

const CategorySVG: React.FC<CategorySVGProps> = ({ category, className }) => {
  const normalizedName = category.name.toUpperCase();
  const wrapperClassName =
    `${className || ''} lottie-overflow-visible w-full h-full overflow-visible`;

  switch (normalizedName) {
    case 'PHOTOGRAPHY':
      return <div className={wrapperClassName}><PhotographyAnimation /></div>;
    case 'MOTION GRAPHICS':
      return <div className={wrapperClassName}><MotionGraphicsAnimation /></div>;
    case 'VIDEOGRAPHY':
      return <div className={wrapperClassName}><VideographyAnimation /></div>;
    case 'BRANDING':
      return <div className={wrapperClassName}><BrandingAnimation /></div>;
    default:
      return null;
  }
};

export default CategorySVG;
