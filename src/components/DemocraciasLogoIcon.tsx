import React from 'react';

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export function DemocraciasLogoIcon({ size = 20, className = '', ...props }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 transition-opacity ${className}`}
      {...props}
    >
      {/* Balão de fala corporativo Democracias */}
      <path
        d="M6 8C6 5.79086 7.79086 4 10 4H22C24.2091 4 26 5.79086 26 8V18C26 20.2091 24.2091 22 22 22H13L7.5 26.5C6.8 27.05 6 26.5 6 25.6V22C6 22 6 22 6 8Z"
        className="fill-slate-800 dark:fill-slate-100"
      />
      {/* Seta de progresso Democracias (Laranja Vibrante) */}
      <path
        d="M11 13L15 9L19 13M15 10V17"
        stroke="#f97316"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
