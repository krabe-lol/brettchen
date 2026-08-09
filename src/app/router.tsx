import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { ProfilPage } from '@/pages/ProfilPage'
import { PublicProfilePage } from '@/pages/PublicProfilePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ArtikelListePage } from '@/pages/wissen/ArtikelListePage'
import { ArtikelDetailPage } from '@/pages/wissen/ArtikelDetailPage'
import { PatternListPage } from '@/pages/pattern/PatternListPage'
import { MyPatternListPage } from '@/pages/pattern/MyPatternListPage'
import { PatternNewPage } from '@/pages/pattern/PatternNewPage'
import { PatternDetailPage } from '@/pages/pattern/PatternDetailPage'
import { NutzungsbedingungenPage } from '@/pages/NutzungsbedingungenPage'
import { ImpressumPage } from '@/pages/ImpressumPage'
import { CollectionListPage } from '@/pages/CollectionListPage'
import { MyCollectionListPage } from '@/pages/MyCollectionListPage'
import { CollectionDetailPage } from '@/pages/CollectionDetailPage'
import { SearchResultsPage } from '@/pages/SearchResultsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'profil', element: <ProfilPage /> },
      { path: 'einstellungen', element: <SettingsPage /> },
      { path: 'profil/:username', element: <PublicProfilePage /> },
      { path: 'wissen', element: <ArtikelListePage /> },
      { path: 'wissen/:slug', element: <ArtikelDetailPage /> },
      { path: 'pattern', element: <PatternListPage /> },
      { path: 'meine-muster', element: <MyPatternListPage /> },
      { path: 'pattern/new', element: <PatternNewPage /> },
      { path: 'pattern/:slug', element: <PatternDetailPage /> },
      { path: 'sammlungen', element: <CollectionListPage /> },
      { path: 'meine-sammlungen', element: <MyCollectionListPage /> },
      { path: 'sammlung/:id', element: <CollectionDetailPage /> },
      { path: 'suche', element: <SearchResultsPage /> },
      { path: 'nutzungsbedingungen', element: <NutzungsbedingungenPage /> },
      { path: 'impressum', element: <ImpressumPage /> },
    ],
  },
])
