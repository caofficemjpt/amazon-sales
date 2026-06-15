import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PeriodProvider } from './context/PeriodContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { FinancialsPage } from './pages/FinancialsPage';
import { OrdersPage } from './pages/OrdersPage';
import { UploadPage } from './pages/UploadPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { PageLoader } from './components/ui/Loader';
import './App.css';

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="financials" element={<FinancialsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        
        {/* Admin only routes */}
        <Route
          path="upload"
          element={user.role === 'admin' ? <UploadPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="settings"
          element={user.role === 'admin' ? <SettingsPage /> : <Navigate to="/" replace />}
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <PeriodProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PeriodProvider>
    </AuthProvider>
  );
}

export default App;
