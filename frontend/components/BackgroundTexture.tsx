import React from 'react';
import styled from 'styled-components';

const BackgroundTexture: React.FC = () => {
  return (
    <StyledWrapper>
      <div className="futuristic-pattern">
        <span className="ripple-overlay" />
        <svg className="texture-filter">
          <filter id="advanced-texture">
            // #00009000
            <feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves={8} result="noise" />
            <feSpecularLighting in="noise" surfaceScale={300} specularConstant={2000} specularExponent={20} lightingColor="rgba(0, 0, 90, 1)" result="specular">
              <fePointLight x={50} y={50} z={600} />
            </feSpecularLighting>
            <feComposite in="specular" in2="SourceGraphic" operator="in" result="litNoise" />
            <feBlend in="SourceGraphic" in2="litNoise" mode="overlay" />
          </filter>
        </svg>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;

  .futuristic-pattern {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      145deg,
      rgb(0, 0, 0),
      rgba(35, 35, 35, 0.9),
      rgb(50, 50, 50)
    );
    filter: url(#advanced-texture);
  }

  .texture-filter {
    position: absolute;
    width: 0;
    height: 0;
  }
`;

export default BackgroundTexture;
