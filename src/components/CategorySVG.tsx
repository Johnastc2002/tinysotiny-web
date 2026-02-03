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

  switch (normalizedName) {
    case 'PHOTOGRAPHY':
      return <div className={className}><PhotographyAnimation /></div>;
    case 'MOTION GRAPHICS':
      return <div className={className}><MotionGraphicsAnimation /></div>;
    case 'VIDEOGRAPHY':
      return <div className={className}><VideographyAnimation /></div>;
    case 'BRANDING':
      return <div className={className}><BrandingAnimation /></div>;
    default:
      return null;
  }
};

export default CategorySVG;
