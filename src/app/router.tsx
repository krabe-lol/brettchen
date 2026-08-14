import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'

/**
 * Every page is code-split via route.lazy (React Router's built-in
 * mechanism) instead of one big upfront bundle - the router keeps the
 * current page rendered while the next one's chunk loads, so there's no
 * blank screen or extra Suspense wiring needed.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, lazy: () => import('@/pages/HomePage').then((m) => ({ Component: m.HomePage })) },
      { path: 'login', lazy: () => import('@/pages/LoginPage').then((m) => ({ Component: m.LoginPage })) },
      { path: 'register', lazy: () => import('@/pages/RegisterPage').then((m) => ({ Component: m.RegisterPage })) },
      {
        path: 'forgot-password',
        lazy: () => import('@/pages/ForgotPasswordPage').then((m) => ({ Component: m.ForgotPasswordPage })),
      },
      {
        path: 'reset-password',
        lazy: () => import('@/pages/ResetPasswordPage').then((m) => ({ Component: m.ResetPasswordPage })),
      },
      { path: 'profil', lazy: () => import('@/pages/ProfilPage').then((m) => ({ Component: m.ProfilPage })) },
      {
        path: 'einstellungen',
        lazy: () => import('@/pages/SettingsPage').then((m) => ({ Component: m.SettingsPage })),
      },
      {
        path: 'profil/:username',
        lazy: () => import('@/pages/PublicProfilePage').then((m) => ({ Component: m.PublicProfilePage })),
      },
      {
        path: 'wissen',
        lazy: () => import('@/pages/wissen/ArtikelListePage').then((m) => ({ Component: m.ArtikelListePage })),
      },
      {
        path: 'wissen/:slug',
        lazy: () => import('@/pages/wissen/ArtikelDetailPage').then((m) => ({ Component: m.ArtikelDetailPage })),
      },
      {
        path: 'pattern',
        lazy: () => import('@/pages/pattern/PatternListPage').then((m) => ({ Component: m.PatternListPage })),
      },
      {
        path: 'meine-muster',
        lazy: () => import('@/pages/pattern/MyPatternListPage').then((m) => ({ Component: m.MyPatternListPage })),
      },
      {
        path: 'pattern/new',
        lazy: () => import('@/pages/pattern/PatternNewPage').then((m) => ({ Component: m.PatternNewPage })),
      },
      {
        path: 'pattern/:slug',
        lazy: () => import('@/pages/pattern/PatternDetailPage').then((m) => ({ Component: m.PatternDetailPage })),
      },
      {
        path: 'sammlungen',
        lazy: () => import('@/pages/collection/CollectionListPage').then((m) => ({ Component: m.CollectionListPage })),
      },
      {
        path: 'meine-sammlungen',
        lazy: () =>
          import('@/pages/collection/MyCollectionListPage').then((m) => ({ Component: m.MyCollectionListPage })),
      },
      {
        path: 'sammlung/:id',
        lazy: () =>
          import('@/pages/collection/CollectionDetailPage').then((m) => ({ Component: m.CollectionDetailPage })),
      },
      { path: 'suche', lazy: () => import('@/pages/SearchResultsPage').then((m) => ({ Component: m.SearchResultsPage })) },
      {
        path: 'terms',
        lazy: () =>
          import('@/pages/TermsPage').then((m) => ({ Component: m.TermsPage })),
      },
      { path: 'imprint', lazy: () => import('@/pages/ImprintPage').then((m) => ({ Component: m.ImprintPage })) },
    ],
  },
])
