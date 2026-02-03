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
      return <div className={`${className} border border-red-500`}><PhotographyAnimation /></div>;
    case 'MOTION GRAPHICS':
      return <div className={`${className} border border-red-500`}><MotionGraphicsAnimation /></div>;
    case 'VIDEOGRAPHY':
      return <div className={`${className} border border-red-500`}><VideographyAnimation /></div>;
    case 'BRANDING':
      return <div className={`${className} border border-red-500`}><BrandingAnimation /></div>;
    default:
      return null;
  }
};

export default CategorySVG;
