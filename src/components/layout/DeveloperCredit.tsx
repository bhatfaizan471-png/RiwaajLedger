import React from 'react';

interface DeveloperCreditProps {
  className?: string;
}

export function DeveloperCredit({ className = '' }: DeveloperCreditProps) {
  return (
    <div className={`text-center pt-3.5 mt-3.5 border-t border-[#F0ECE1] ${className}`} id="developer-credit-section">
      <p className="text-xs text-[#78716C] font-medium tracking-tight">
        Developed by <span className="text-[#1C1917] font-semibold">Faizan Ahmad Bhat</span>
      </p>
      <div className="mt-1">
        <a
          href="https://faizanahamadbhat.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F5132] hover:text-[#0C4328] hover:underline transition-smooth focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] rounded-xs"
          id="developer-portfolio-link"
        >
          <span>View Developer Portfolio ↗</span>
        </a>
      </div>
    </div>
  );
}
