import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { content } from '../lib/content';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  useEffect(() => {
    document.title = content.title;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
