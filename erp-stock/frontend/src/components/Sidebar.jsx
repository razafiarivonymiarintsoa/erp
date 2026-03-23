import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Warehouse, History, ArrowRightLeft, LogOut, Bell, Menu } from 'lucide-react';

const NAV = [
  { label: 'Dashboard',    path: '/',           icon: <LayoutDashboard size={16} /> },
  { label: 'Stocks',       path: '/stocks',      icon: <Warehouse size={16} />      },
  { label: 'Produits',     path: '/produits',    icon: <Package size={16} />        },
  { label: 'Mouvements',   path: '/mouvements',  icon: <History size={16} />        },
];

export default function Sidebar({ lowStockCount = 0, onCollapseChange }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => {
    const value = !collapsed;
    setCollapsed(value);
    if (onCollapseChange) onCollapseChange(value);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>ERP Stock</h1>
            <span>Gestion des stocks</span>
          </div>
          <button className="btn btn-ghost" style={{ padding: 6 }} onClick={toggleCollapse}>
            <Menu size={14} />
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map(({ label, path, icon }) => (
          <button
            key={path}
            className={`nav-item ${pathname === path ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            {icon}
            <span>{label}</span>
            {label === 'Dashboard' && lowStockCount > 0 && (
              <span className="badge badge-red" style={{ marginLeft: 'auto' }}>
                <Bell size={12} /> {lowStockCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4, textAlign: 'center' }}>
          ERP Stock v1.0
        </div>
      </div>
    </aside>
  );
}
