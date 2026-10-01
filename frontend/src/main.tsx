import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AuthProvider } from './features/auth/AuthContext';
import { BookmarksProvider } from './features/bookmarks/BookmarksContext';
import { LanguageProvider } from './shared/i18n/LanguageContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <BookmarksProvider>
          <RouterProvider router={router} />
        </BookmarksProvider>
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
