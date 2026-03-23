import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StockList from './pages/StockList';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Movements from './pages/Movements';

// Options pour React Router v7
const routerOptions = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

function AppRoutes() {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'with-sidebar-collapsed' : ''}`}>
      <Sidebar lowStockCount={lowStockCount} onCollapseChange={setSidebarCollapsed} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard onLowStockCount={setLowStockCount} />} />
          <Route path="/stocks" element={<StockList />} />
          <Route path="/produits" element={<Products />} />
          <Route path="/stock/:productId" element={<ProductDetail />} />
          <Route path="/mouvements" element={<Movements />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter {...routerOptions}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#fce7f3', color: '#831843', border: '1px solid #f9a8d4' },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}
