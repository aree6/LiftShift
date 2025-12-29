import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { CSV_LOADING_ANIMATION_SRC } from '../constants';

type CsvLoadingAnimationProps = {
  className?: string;
  size?: number;
};

export const CsvLoadingAnimation: React.FC<CsvLoadingAnimationProps> = ({
  className,
  size = 160,
}) => {
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="img"
    >
      <DotLottieReact
        src={CSV_LOADING_ANIMATION_SRC}
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
