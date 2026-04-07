import { Outlet } from 'react-router-dom';

import { Footer } from './components/Footer';
import { Header } from './components/Header';

export function App() {
  return (
    <>
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
