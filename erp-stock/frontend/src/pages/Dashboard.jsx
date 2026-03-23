import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getAllStock, getAllMovements, addStock } from '../services/stockApi';
import { 
  Package, 
  Warehouse, 
  TrendingUp, 
  Layers, 
  AlertTriangle, 
  RefreshCcw, 
  Search, 
  Download,
  Plus
} from 'lucide-react';
import Spinner from '../components/Spinner';
import MovementBadge from '../components/MovementBadge';
import toast from 'react-hot-toast';

function formatMGA(value) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0 }).format(value);
}

// Simple line chart component
function LineChart({ data }) {
  if (!data?.length) return <div className="chart-empty">Aucune donnée</div>;
  
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);
  
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 85 - ((value - minValue) / range) * 70;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="chart-container">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart-svg">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline 
          points={points} 
          fill="none" 
          stroke="url(#lineGrad)" 
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="chart-labels">
        {data.slice(0, 5).map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// Bar chart component
function BarChart({ data }) {
  if (!data?.length) return <div className="chart-empty">Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bar-chart-container">
      {data.map((d, i) => (
        <div key={i} className="bar-item">
          <span className="bar-label">{d.name}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// Pie chart component
function PieChart({ slices }) {
  if (!slices?.length) return <div className="chart-empty">Aucune donnée</div>;
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  let cumulative = 0;
  const segments = slices.map((slice, i) => {
    const percent = (slice.value / total) * 100;
    const start = cumulative;
    cumulative += percent;
    return { ...slice, percent: Math.round(percent), color: colors[i % colors.length], start };
  });

  return (
    <div className="pie-chart-container">
      <div className="pie-legend">
        {segments.map((s, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.name}</span>
            <span className="legend-value">{s.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ onLowStockCount }) {
  const [stats, setStats] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  // Mode sombre desactive
  const [filterPeriod, setFilterPeriod] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [lowAlertShown, setLowAlertShown] = useState(false);
  const navigate = useNavigate();

  // Mode clair uniquement

  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([getDashboard(), getAllStock(), getAllMovements()])
      .then(([d, s, m]) => {
        setStats(d.data);
        setStocks(s.data ?? []);
        setMovements(m.data ?? []);
      })
      .catch(() => toast.error('Erreur chargement dashboard'))
      .finally(() => setLoading(false));
  }, []);

  // Low stock alert
  const lowStockEntries = useMemo(() => {
    const list = stocks.filter((s) => s.quantity <= (s.alertThreshold ?? 15)).sort((a, b) => a.quantity - b.quantity);
    if (onLowStockCount) onLowStockCount(list.length);
    if (list.length && !lowAlertShown) {
      toast.error(`⚠️ ${list.length} produit(s) en stock faible`);
      setLowAlertShown(true);
    }
    return list;
  }, [stocks, onLowStockCount, lowAlertShown]);

  const maxStock = useMemo(() => Math.max(...stocks.map((s) => s.quantity || 0), 1), [stocks]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    const now = new Date();
    const from = new Date();
    if (filterPeriod === 'day') from.setDate(now.getDate() - 1);
    else if (filterPeriod === 'week') from.setDate(now.getDate() - 7);
    else from.setDate(now.getDate() - 30);

    return movements
      .filter((m) => {
        const date = new Date(m.movementDate);
        return date >= from && date <= now;
      })
      .filter((m) => 
        !searchQuery || 
        m.productName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.movementDate) - new Date(a.movementDate))
      .slice(0, 10);
  }, [movements, filterPeriod, searchQuery]);

  // Chart data
  const timelineData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return { 
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }), 
        value: Math.floor(Math.random() * 50) + 50 
      };
    });
  }, []);

  const topItems = useMemo(() => {
    const byStock = [...stocks].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    return byStock.map((item) => ({ 
      name: item.productName || `Ligne ${item.stockId}`, 
      value: item.quantity || 0 
    }));
  }, [stocks]);

  const categoryStats = useMemo(() => {
    const group = stocks.reduce((acc, s) => {
      const cat = (s.productName?.split(' ')[0] || 'Autre');
      acc[cat] = (acc[cat] || 0) + (s.quantity || 0);
      return acc;
    }, {});
    return Object.entries(group).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [stocks]);

  // Status helper
  const getStatusLabel = (qty) => {
    if (qty <= 5) return { label: 'Rupture', class: 'status-out' };
    if (qty <= 15) return { label: 'Bas', class: 'status-low' };
    return { label: 'OK', class: 'status-ok' };
  };

  // Refresh data
  const refreshData = () => {
    setLoading(true);
    Promise.all([getDashboard(), getAllStock(), getAllMovements()])
      .then(([d, s, m]) => {
        setStats(d.data);
        setStocks(s.data ?? []);
        setMovements(m.data ?? []);
        toast.success('Données actualisées');
      })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false));
  };

  // Export
  const exportData = () => {
    const data = {
      stats,
      stocks: stocks.length,
      movements: movements.length,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Export réussi');
  };

  if (loading) {
    return (
      <div className="page dashboard-page">
        <div className="loading-container">
          <Spinner />
          <p>Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  const totalValueMGA = (stats?.totalQuantity ?? 0) * 10000;

  return (
    <div className="page dashboard-page">
      {/* Header */}
      <div className="page-header-modern">
        <div className="header-title">
          <h2>Tableau de bord</h2>
          <p>Vue d'ensemble de votre inventaire</p>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-icon" onClick={refreshData} title="Actualiser">
            <RefreshCcw size={18} />
          </button>
          <button className="btn btn-secondary" onClick={exportData}>
            <Download size={16} />
            Exporter
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/produits')}>
            <Plus size={18} />
            Nouveau produit
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-row">
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(232, 67, 147, 0.12)', color: '#e84393' }}>
            <Package size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalProducts ?? 0}</span>
            <span className="stat-label">Total produits</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <Warehouse size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalWarehouses ?? 0}</span>
            <span className="stat-label">Entrepôts</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Layers size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalStockLines ?? 0}</span>
            <span className="stat-label">Lignes de stock</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalQuantity ?? 0}</span>
            <span className="stat-label">Quantité totale</span>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div className="filters-section">
        <div className="search-filter">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Rechercher dans les mouvements..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="period-tabs">
          <button 
            className={`period-tab ${filterPeriod === 'day' ? 'active' : ''}`}
            onClick={() => setFilterPeriod('day')}
          >
            Aujourd'hui
          </button>
          <button 
            className={`period-tab ${filterPeriod === 'week' ? 'active' : ''}`}
            onClick={() => setFilterPeriod('week')}
          >
            Semaine
          </button>
          <button 
            className={`period-tab ${filterPeriod === '30' ? 'active' : ''}`}
            onClick={() => setFilterPeriod('30')}
          >
            30 jours
          </button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="card chart-card">
          <div className="card-header">
            <h3>Évolution du stock</h3>
            <span className="card-subtitle">7 derniers jours</span>
          </div>
          <LineChart data={timelineData} />
        </div>
        
        <div className="card chart-card">
          <div className="card-header">
            <h3>Répartition par catégorie</h3>
            <span className="card-subtitle">{categoryStats.length} catégories</span>
          </div>
          <PieChart slices={categoryStats} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="tables-grid">
        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h3>Top produits en stock</h3>
            <button className="btn btn-ghost" onClick={() => navigate('/stocks')}>
              Voir tout
            </button>
          </div>
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th style={{ textAlign: 'right' }}>Qté</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {topItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">Aucun produit</td>
                  </tr>
                ) : (
                  topItems.map((item, i) => {
                    const status = getStatusLabel(item.value);
                    return (
                      <tr key={i}>
                        <td className="product-cell">{item.name}</td>
                        <td className="qty-cell" style={{ textAlign: 'right' }}>{item.value}</td>
                        <td>
                          <span className={`status-badge ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Movements */}
        <div className="card">
          <div className="card-header">
            <h3>Mouvements récents</h3>
            <button className="btn btn-ghost" onClick={() => navigate('/mouvements')}>
              Voir tout
            </button>
          </div>
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Qté</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-cell">Aucun mouvement</td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr key={m.movementId}>
                      <td className="date-cell">
                        {new Date(m.movementDate).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="product-cell">{m.productName}</td>
                      <td><MovementBadge type={m.type} /></td>
                      <td className="qty-cell" style={{ textAlign: 'right' }}>
                        <span className={m.type === 'ENTREE' || m.type === 'TRANSFERT_ENTRANT' ? 'qty-positive' : 'qty-negative'}>
                          {m.type === 'ENTREE' || m.type === 'TRANSFERT_ENTRANT' ? '+' : '−'}{m.quantity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockEntries.length > 0 && (
        <div className="alert-card">
          <div className="alert-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="alert-content">
            <h4>Alerte stock faible</h4>
            <p>{lowStockEntries.length} produit(s) nécessitent votre attention</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/stocks')}>
            Gérer les stocks
          </button>
        </div>
      )}

      <style>{`
        .dashboard-page {
          --accent: #6366f1;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 20px;
        }

        .loading-container p {
          margin-top: 16px;
          color: var(--text-muted);
        }

        /* Header */
        .page-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-title h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }

        .header-title p {
          font-size: 14px;
          color: var(--text-muted);
        }

        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .btn-icon {
          width: 40px;
          height: 40px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-icon:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Stats */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card-modern {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s;
        }

        .stat-card-modern:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          line-height: 1;
        }

        .stat-label {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        /* Filters */
        .filters-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-filter {
          position: relative;
          flex: 1;
          min-width: 250px;
          max-width: 400px;
        }

        .search-filter .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-filter input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text);
          outline: none;
        }

        .search-filter input:focus {
          border-color: var(--accent);
        }

        .period-tabs {
          display: flex;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }

        .period-tab {
          padding: 10px 16px;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .period-tab:hover {
          color: var(--text);
        }

        .period-tab.active {
          background: var(--accent);
          color: white;
        }

        /* Charts */
        .charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .chart-card {
          min-height: 280px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }

        .card-subtitle {
          font-size: 12px;
          color: var(--text-muted);
        }

        .chart-container {
          height: 200px;
        }

        .line-chart-svg {
          width: 100%;
          height: 160px;
        }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          padding: 8px 0 0;
          font-size: 11px;
          color: var(--text-muted);
        }

        .bar-chart-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bar-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bar-label {
          width: 80px;
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bar-track {
          flex: 1;
          height: 8px;
          background: var(--bg-3);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .bar-value {
          width: 40px;
          text-align: right;
          font-size: 12px;
          font-weight: 500;
          color: var(--text);
        }

        .pie-chart-container {
          padding: 16px 0;
        }

        .pie-legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }

        .legend-label {
          flex: 1;
          font-size: 13px;
          color: var(--text);
        }

        .legend-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }

        /* Tables */
        .tables-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .table-container {
          overflow: hidden;
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
        }

        .modern-table thead {
          background: var(--bg-3);
        }

        .modern-table th {
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          text-align: left;
        }

        .modern-table td {
          padding: 12px 16px;
          font-size: 13px;
          border-top: 1px solid var(--border);
        }

        .modern-table tbody tr {
          transition: background 0.15s;
        }

        .modern-table tbody tr:hover {
          background: rgba(232, 67, 147, 0.04);
        }

        .product-cell {
          font-weight: 500;
        }

        .qty-cell {
          font-family: var(--mono);
          font-weight: 500;
        }

        .date-cell {
          font-size: 12px;
          color: var(--text-muted);
        }

        .empty-cell {
          text-align: center;
          color: var(--text-muted);
          padding: 32px !important;
        }

        .qty-positive {
          color: #10b981;
          font-weight: 600;
        }

        .qty-negative {
          color: #ef4444;
          font-weight: 600;
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-ok {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }

        .status-low {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
        }

        .status-out {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }

        /* Alert */
        .alert-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
        }

        .alert-icon {
          width: 48px;
          height: 48px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
        }

        .alert-content {
          flex: 1;
        }

        .alert-content h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 2px;
        }

        .alert-content p {
          font-size: 13px;
          color: var(--text-muted);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .tables-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .page-header-modern {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .header-actions .btn {
            flex: 1;
            justify-content: center;
          }

          .stats-row {
            grid-template-columns: 1fr;
          }

          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }

          .search-filter {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
