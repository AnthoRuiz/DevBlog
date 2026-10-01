import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './shared/api/queries';
import { router } from './app/router';
import { AuthProvider } from './features/auth/AuthContext';
import { BookmarksProvider } from './features/bookmarks/BookmarksContext';
import { LanguageProvider } from './shared/i18n/LanguageContext';
import { initGlobalErrorListeners } from './shared/api/logger';
import './index.css';

// Report uncaught errors and unhandled promise rejections to the backend log
initGlobalErrorListeners();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BookmarksProvider>
            <RouterProvider router={router} />
          </BookmarksProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
