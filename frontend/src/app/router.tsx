import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { FeedPage } from '../features/feed/FeedPage';
import { PostPage } from '../pages/PostPage';
import { SeriesPage } from '../pages/SeriesPage';
import { SearchPage } from '../pages/SearchPage';
import { NotFound } from '../components/NotFound';

/**
 * Every route of the SPA (Nginx serves index.html for unknown paths). Static segments outrank
 * `:sectionSlug`, so section slugs must never be posts, tags, series, search, bookmarks or admin.
 * Admin modals (/admin/status, /admin/backups) are routes rendered by the layout over the feed.
 */
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <FeedPage /> },
      { path: 'posts/:slug', element: <PostPage /> },
      { path: 'series/:slug', element: <SeriesPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'tags/:tagSlug', element: <FeedPage /> },
      { path: 'bookmarks', element: <FeedPage /> },
      { path: 'admin/:panel', element: <FeedPage /> },
      { path: ':sectionSlug', element: <FeedPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
