import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { STATIC_MODE } from './lib/api';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RoleDetailPage from './pages/RoleDetailPage';
import RolesPage from './pages/RolesPage';
import SignInPage from './pages/SignInPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/roles/:slug" element={<RoleDetailPage />} />
        {/* Accounts need the API: the static build keeps everything else. */}
        {STATIC_MODE ? (
          <>
            <Route path="/profile" element={<Navigate to="/" replace />} />
            <Route path="/signin" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignInPage initialMode="signup" />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
