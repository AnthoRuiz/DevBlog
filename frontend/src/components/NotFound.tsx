import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Translations } from '../i18n';

// Client-side 404: the SPA cannot return a real 404 status for unknown routes
export const NotFound: FC<{ t: Translations }> = ({ t }) => (
  <div className="max-w-xl mx-auto text-center py-20">
    <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#22D3EE] mb-3">404</p>
    <h1 className="text-3xl font-extrabold tracking-tight text-[#F8FAFC]">{t.notFoundTitle}</h1>
    <p className="mt-3 text-sm text-[#94A3B8]">{t.notFoundBody}</p>
    <Link
      to="/"
      className="inline-block mt-6 px-4 py-2.5 rounded-[10px] border border-[#475569] hover:border-[#22D3EE] text-sm text-[#F8FAFC] transition-colors"
    >
      {t.goHome}
    </Link>
  </div>
);
