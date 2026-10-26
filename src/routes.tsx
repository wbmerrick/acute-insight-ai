import { RouteObject } from 'react-router';
import { lazy } from 'react';
import HomePage from './pages/index';
import ProdNotFoundPage from './pages/_404';

const NotFoundPage = ProdNotFoundPage;

const LoginPage = lazy(() => import('./pages/login'));
const SignupPage = lazy(() => import('./pages/signup'));
const PatientPortalPage = lazy(() => import('./pages/portal/index'));
const ProviderDashboardPage = lazy(() => import('./pages/provider/index'));
const ClinicianPage = lazy(() => import('./pages/clinician/index'));
const TwoFactorPage = lazy(() => import('./pages/two-factor'));
const ForgotPasswordPage = lazy(() => import('./pages/forgot-password'));
const ResetPasswordPage = lazy(() => import('./pages/reset-password'));
const AccountSecurityPage = lazy(() => import('./pages/account-security'));
const IntakePage = lazy(() => import('./pages/intake/index'));
const AboutPage = lazy(() => import('./pages/about'));
const ProvidersPage = lazy(() => import('./pages/providers'));
const PatientsPage = lazy(() => import('./pages/patients'));
const AdminProvidersPage = lazy(() => import('./pages/admin/providers'));
const HowItWorksPage = lazy(() => import('./pages/how-it-works'));
const DemoPage = lazy(() => import('./pages/demo'));
const PrivacyPage = lazy(() => import('./pages/privacy'));
const TermsPage = lazy(() => import('./pages/terms'));
const SecurityPage = lazy(() => import('./pages/security'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/portal',
    element: <PatientPortalPage />,
  },
  {
    path: '/provider',
    element: <ProviderDashboardPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/2fa',
    element: <TwoFactorPage />,
  },
  {
    path: '/account/security',
    element: <AccountSecurityPage />,
  },
  {
    path: '/clinician',
    element: <ClinicianPage />,
  },
  {
    path: '/intake',
    element: <IntakePage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/providers',
    element: <ProvidersPage />,
  },
  {
    path: '/patients',
    element: <PatientsPage />,
  },
  {
    path: '/admin/providers',
    element: <AdminProvidersPage />,
  },
  {
    path: '/how-it-works',
    element: <HowItWorksPage />,
  },
  {
    path: '/demo',
    element: <DemoPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/security',
    element: <SecurityPage />,
  },
  {
    id: 'airo-not-found',
    path: '*',
    element: <NotFoundPage />,
  },
];

export type Path = '/' | '/login' | '/signup' | '/portal' | '/about' | '/providers' | '/patients';
export type Params = Record<string, string | undefined>;
