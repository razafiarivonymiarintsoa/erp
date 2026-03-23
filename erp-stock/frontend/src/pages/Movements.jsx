import { useEffect, useState, useMemo } from 'react';
import { 
  getAllMovements, 
  getProduits, 
  getEntrepots,
  deleteMovement 
} from '../services/stockApi';
import { 
  Search, 
  Plus, 
  Download, 
  Calendar, 
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Eye,
  Trash2,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  RotateCcw,
  X,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import MovementBadge from '../components/MovementBadge';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

// Configuration des types de mouvement
const TYPE_CONFIG = {
  ENTREE: { 
    label: 'Entrée', 
    color: '#10b981', 
    bgColor: 'rgba(16, 185, 129, 0.12)',
    icon: ArrowDownCircle 
  },
  SORTIE: { 
    label: 'Sortie', 
    color: '#ef4444', 
    bgColor: 'rgba(239, 68, 68, 0.12)',
    icon: ArrowUpCircle 
  },
  TRANSFERT_ENTRANT: { 
    label: 'Transfert entrant', 
    color: '#3b82f6', 
    bgColor: 'rgba(59, 130, 246, 0.12)',
    icon: ArrowRightLeft 
  },
  TRANSFERT_SORTANT: { 
    label: 'Transfert sortant', 
    color: '#f59e0b', 
    bgColor: 'rgba(245, 158, 11, 0.12)',
    icon: RotateCcw 
  },
};

const ITEMS_PER_PAGE = 10;

export default function Movements() {
  // Données
  const [movements, setMovements] = useState([]);
  const [produits, setProduits] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // Tri
  const [sortField, setSortField] = useState('movementDate');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Actions ligne
  const [activeRowMenu, setActiveRowMenu] = useState(null);
  
  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        const [mouvementsRes, produitsRes, entrepotsRes] = await Promise.all([
          getAllMovements(),
          getProduits(),
          getEntrepots()
        ]);
        setMovements(mouvementsRes.data);
        setProduits(produitsRes.data);
        setEntrepots(entrepotsRes.data || []);
      } catch (error) {
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    loadData();
    
    // Mode clair uniquement
  }, []);

  // Calcul des statistiques
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const totalMovements = movements.length;
    const todayEntries = movements.filter(m => {
      const date = new Date(m.movementDate);
      return m.type === 'ENTREE' && date >= today && date <= todayEnd;
    }).length;
    const todayExits = movements.filter(m => {
      const date = new Date(m.movementDate);
      return m.type === 'SORTIE' && date >= today && date <= todayEnd;
    }).length;
    
    return { totalMovements, todayEntries, todayExits };
  }, [movements]);

  // Filtrage et tri
  const filteredAndSorted = useMemo(() => {
    let result = [...movements];
    
    // Filtre recherche
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(m => 
        m.productName?.toLowerCase().includes(searchLower) ||
        m.warehouseName?.toLowerCase().includes(searchLower) ||
        m.note?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtre type
    if (filterType) {
      result = result.filter(m => m.type === filterType);
    }
    
    // Filtre entrepôt
    if (filterWarehouse) {
      result = result.filter(m => m.warehouseId === parseInt(filterWarehouse));
    }
    
    // Filtre date
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(m => new Date(m.movementDate) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(m => new Date(m.movementDate) <= toDate);
    }
    
    // Tri
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'movementDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [movements, search, filterType, filterWarehouse, filterDateFrom, filterDateTo, sortField, sortDirection]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSorted, currentPage]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);

  // Handlers
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterWarehouse('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Produit', 'Entrepôt', 'Type', 'Quantité', 'Note'];
    const rows = filteredAndSorted.map(m => [
      new Date(m.movementDate).toLocaleString('fr-FR'),
      m.productName,
      m.warehouseName,
      TYPE_CONFIG[m.type]?.label || m.type,
      m.quantity,
      m.note || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mouvements_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Export CSV effectué avec succès');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) return;
    
    try {
      await deleteMovement(id);
      setMovements(prev => prev.filter(m => m.movementId !== id));
      toast.success('Mouvement supprimé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
    setActiveRowMenu(null);
  };

  const hasActiveFilters = search || filterType || filterWarehouse || filterDateFrom || filterDateTo;

  // Composant detri de colonne
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="sort-icon" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp size={14} className="sort-icon active" /> : 
      <ArrowDown size={14} className="sort-icon active" />;
  };

  // État vide
  if (!loading && movements.length === 0) {
    return (
      <div className="page" style={{ animation: 'fadeIn 0.3s ease' }}>
        <div className="empty-state-container">
          <div className="empty-illustration">
            <div className="empty-icon-wrapper">
              <Package size={64} strokeWidth={1.5} />
            </div>
            <div className="empty-pulse"></div>
          </div>
          
          <h2>Aucun mouvement pour le moment</h2>
          <p>Commencez par ajouter un mouvement de stock pour suivre vos entrées et sorties</p>
          
          <button className="btn btn-primary" onClick={() => {
            toast((t) => (
              <div className="toast-custom">
                <div className="toast-title">Créer un mouvement</div>
                <div className="toast-message">Les mouvements sont créés automatiquement lors des opérations de stock.</div>
                <div className="toast-actions">
                  <button onClick={() => { window.location.href = '/stocks'; toast.dismiss(t.id); }}>
                    Aller dans Stocks
                  </button>
                  <button onClick={() => toast.dismiss(t.id)} className="secondary">Fermer</button>
                </div>
              </div>
            ), { icon: '📦' });
          }}>
            <Plus size={18} />
            Ajouter un mouvement
          </button>
          
          <div className="empty-tips">
            <div className="tip">
              <ArrowDownCircle size={16} />
              <span>Ajoutez des entrées de stock</span>
            </div>
            <div className="tip">
              <ArrowUpCircle size={16} />
              <span>Enregistrez vos sorties</span>
            </div>
            <div className="tip">
              <ArrowRightLeft size={16} />
              <span>Effectuez des transferts</span>
            </div>
          </div>
        </div>
        
        <style>{`
          .empty-state-container {
            max-width: 480px;
            margin: 80px auto;
            text-align: center;
            padding: 40px;
            background: var(--bg-2);
            border-radius: 16px;
            border: 1px solid var(--border);
          }
          
          .empty-illustration {
            position: relative;
            width: 120px;
            height: 120px;
            margin: 0 auto 24px;
          }
          
          .empty-icon-wrapper {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, var(--bg-3), var(--bg-2));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            border: 2px solid var(--border);
          }
          
          .empty-pulse {
            position: absolute;
            inset: -10px;
            border-radius: 50%;
            border: 2px dashed var(--border);
            animation: spin 20s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .empty-state-container h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text);
          }
          
          .empty-state-container p {
            color: var(--text-muted);
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.5;
          }
          
          .empty-tips {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid var(--border);
          }
          
          .tip {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--text-muted);
          }
          
          .tip svg {
            color: var(--accent);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header avec statistiques */}
      <div className="page-header-modern">
        <div className="header-title">
          <h2>Historique des mouvements</h2>
          <p>Suivez tous les mouvements de stock</p>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} />
            Exporter CSV
          </button>
          <button className="btn btn-primary" onClick={() => {
            toast((t) => (
              <div className="toast-custom">
                <div className="toast-title">Créer un mouvement</div>
                <div className="toast-message">Les mouvements sont créés automatiquement lors des opérations de stock.</div>
                <div className="toast-actions">
                  <button onClick={() => { window.location.href = '/stocks'; toast.dismiss(t.id); }}>
                    Aller dans Stocks
                  </button>
                  <button onClick={() => toast.dismiss(t.id)} className="secondary">Fermer</button>
                </div>
              </div>
            ), { icon: '📦' });
          }}>
            <Plus size={18} />
            Ajouter un mouvement
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="stats-row">
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalMovements}</span>
            <span className="stat-label">Total mouvements</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <TrendingDown size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.todayEntries}</span>
            <span className="stat-label">Entrées aujourd'hui</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.todayExits}</span>
            <span className="stat-label">Sorties aujourd'hui</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="search-filter">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Rechercher produit, entrepôt, note..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
        
        <select 
          value={filterType} 
          onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
          className="filter-select"
        >
          <option value="">Tous les types</option>
          <option value="ENTREE">Entrée</option>
          <option value="SORTIE">Sortie</option>
          <option value="TRANSFERT_ENTRANT">Transfert entrant</option>
          <option value="TRANSFERT_SORTANT">Transfert sortant</option>
        </select>
        
        <select 
          value={filterWarehouse} 
          onChange={(e) => { setFilterWarehouse(e.target.value); setCurrentPage(1); }}
          className="filter-select"
        >
          <option value="">Tous les entrepôts</option>
          {entrepots.map(e => (
            <option key={e.id} value={e.id}>{e.nom}</option>
          ))}
        </select>
        
        <div className="date-filters">
          <div className="date-input-wrapper">
            <Calendar size={14} />
            <input 
              type="date" 
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
              placeholder="Du"
            />
          </div>
          <span className="date-separator">—</span>
          <div className="date-input-wrapper">
            <Calendar size={14} />
            <input 
              type="date" 
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
              placeholder="Au"
            />
          </div>
        </div>
        
        {hasActiveFilters && (
          <button className="btn btn-ghost reset-btn" onClick={resetFilters}>
            <RotateCcw size={14} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau ou chargement */}
      {loading ? (
        <div className="loading-container">
          <Spinner />
          <p>Chargement des mouvements...</p>
        </div>
      ) : (
        <>
          {filteredAndSorted.length === 0 ? (
            <div className="no-results">
              <Search size={48} strokeWidth={1} />
              <h3>Aucun résultat trouvé</h3>
              <p>Essayez de modifier vos filtres de recherche</p>
              <button className="btn btn-ghost" onClick={resetFilters}>
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('movementDate')} className="sortable">
                      Date & heure <SortIcon field="movementDate" />
                    </th>
                    <th onClick={() => handleSort('productName')} className="sortable">
                      Produit <SortIcon field="productName" />
                    </th>
                    <th onClick={() => handleSort('warehouseName')} className="sortable">
                      Entrepôt <SortIcon field="warehouseName" />
                    </th>
                    <th onClick={() => handleSort('type')} className="sortable">
                      Type <SortIcon field="type" />
                    </th>
                    <th onClick={() => handleSort('quantity')} class="sortable">
                      Quantité <SortIcon field="quantity" />
                    </th>
                    <th>Note</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((m, index) => (
                    <tr 
                      key={m.movementId} 
                      style={{ animationDelay: `${index * 0.03}s` }}
                      className="table-row"
                    >
                      <td className="date-cell">
                        <div className="date-main">
                          {new Date(m.movementDate).toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="date-time">
                          {new Date(m.movementDate).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </td>
                      <td className="product-cell">
                        <div className="product-info">
                          <div className="product-icon">
                            <Package size={16} />
                          </div>
                          <span className="product-name">{m.productName}</span>
                        </div>
                      </td>
                      <td className="warehouse-cell">{m.warehouseName}</td>
                      <td>
                        <MovementBadge type={m.type} />
                      </td>
                      <td className="quantity-cell">
                        <span className={`quantity ${m.type === 'ENTREE' || m.type === 'TRANSFERT_ENTRANT' ? 'positive' : 'negative'}`}>
                          {m.type === 'ENTREE' || m.type === 'TRANSFERT_ENTRANT' ? '+' : '−'}{m.quantity}
                        </span>
                      </td>
                      <td className="note-cell">
                        {m.note || <span className="no-note">—</span>}
                      </td>
                      <td className="actions-cell">
                        <div className="row-actions">
                          <button 
                            className="action-btn view"
                            onClick={() => toast.success('Détails du mouvement')}
                            title="Voir les détails"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDelete(m.movementId)}
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} sur {filteredAndSorted.length} résultats
                  </div>
                  <div className="pagination-controls">
                    <button 
                      className="page-btn"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button 
                      className="page-btn"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        /* Header moderne */
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
        }
        
        .btn-secondary {
          background: var(--bg-2);
          border: 1px solid var(--border);
          color: var(--text);
        }
        
        .btn-secondary:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        
        /* Stats row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .stat-card-modern {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.2s;
        }
        
        .stat-card-modern:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          line-height: 1;
        }
        
        .stat-label {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        
        /* Filtres */
        .filters-section {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
          align-items: center;
        }
        
        .search-filter {
          position: relative;
          flex: 1;
          min-width: 250px;
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
          padding: 10px 36px 10px 40px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 13.5px;
          color: var(--text);
          outline: none;
          transition: border 0.2s;
        }
        
        .search-filter input:focus {
          border-color: var(--accent);
        }
        
        .clear-search {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          border-radius: 50%;
        }
        
        .clear-search:hover {
          background: var(--bg-3);
          color: var(--text);
        }
        
        .filter-select {
          padding: 10px 32px 10px 12px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 13.5px;
          color: var(--text);
          cursor: pointer;
          outline: none;
          min-width: 160px;
        }
        
        .filter-select:focus {
          border-color: var(--accent);
        }
        
        .date-filters {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .date-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .date-input-wrapper svg {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
          pointer-events: none;
        }
        
        .date-input-wrapper input {
          padding: 10px 12px 10px 32px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 13.5px;
          color: var(--text);
          outline: none;
          min-width: 140px;
        }
        
        .date-input-wrapper input:focus {
          border-color: var(--accent);
        }
        
        .date-separator {
          color: var(--text-muted);
        }
        
        .reset-btn {
          white-space: nowrap;
        }
        
        /* Loading */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
        }
        
        .loading-container p {
          margin-top: 16px;
          color: var(--text-muted);
          font-size: 14px;
        }
        
        /* No results */
        .no-results {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }
        
        .no-results svg {
          margin-bottom: 16px;
          opacity: 0.4;
        }
        
        .no-results h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }
        
        .no-results p {
          font-size: 14px;
          margin-bottom: 20px;
        }
        
        /* Table */
        .table-container {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 12px;
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
          padding: 14px 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-muted);
          text-align: left;
          white-space: nowrap;
        }
        
        .modern-table th.sortable {
          cursor: pointer;
          user-select: none;
          transition: color 0.2s;
        }
        
        .modern-table th.sortable:hover {
          color: var(--accent);
        }
        
        .sort-icon {
          margin-left: 6px;
          opacity: 0.4;
        }
        
        .sort-icon.active {
          opacity: 1;
          color: var(--accent);
        }
        
        .modern-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          border-top: 1px solid var(--border);
          vertical-align: middle;
        }
        
        .table-row {
          transition: background 0.15s;
          animation: fadeInRow 0.3s ease forwards;
          opacity: 0;
        }
        
        @keyframes fadeInRow {
          to { opacity: 1; }
        }
        
        .table-row:hover {
          background: rgba(99, 102, 241, 0.04);
        }
        
        .date-cell {
          font-family: var(--mono);
        }
        
        .date-main {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        
        .date-time {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        
        .product-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .product-icon {
          width: 32px;
          height: 32px;
          background: var(--bg-3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        
        .product-name {
          font-weight: 500;
        }
        
        .quantity-cell .quantity {
          font-family: var(--mono);
          font-weight: 600;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 6px;
        }
        
        .quantity.positive {
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }
        
        .quantity.negative {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        
        .note-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .no-note {
          color: var(--text-muted);
        }
        
        .actions-col {
          width: 100px;
        }
        
        .actions-cell {
          text-align: center;
        }
        
        .row-actions {
          display: flex;
          justify-content: center;
          gap: 6px;
        }
        
        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          background: transparent;
        }
        
        .action-btn.view {
          color: var(--text-muted);
        }
        
        .action-btn.view:hover {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
        }
        
        .action-btn.delete {
          color: var(--text-muted);
        }
        
        .action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        
        /* Pagination */
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .pagination-info {
          font-size: 13px;
          color: var(--text-muted);
        }
        
        .pagination-controls {
          display: flex;
          gap: 6px;
        }
        
        .page-btn {
          padding: 8px 14px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-2);
          color: var(--text);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .page-btn:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent);
        }
        
        .page-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-filter {
            min-width: 100%;
          }
          
          .filter-select, .date-filters {
            width: 100%;
          }
          
          .date-filters {
            flex-direction: column;
          }
          
          .date-separator {
            display: none;
          }
        }
        
        @media (max-width: 768px) {
          .page-header-modern {
            flex-direction: column;
          }
          
          .header-actions {
            width: 100%;
          }
          
          .header-actions .btn {
            flex: 1;
            justify-content: center;
          }
          
          .stats-row {
            grid-template-columns: 1fr;
          }
          
          .table-container {
            overflow-x: auto;
          }
          
          .modern-table {
            min-width: 700px;
          }
          
          .pagination {
            flex-direction: column;
            text-align: center;
          }
          
          .pagination-controls {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
        
        /* Dark mode improvements */
        .dark-mode .stat-card-modern:hover,
        .dark-mode .table-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        
        /* Custom toast */
        .toast-custom {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .toast-title {
          font-weight: 600;
          font-size: 14px;
        }
        
        .toast-message {
          font-size: 13px;
          color: var(--text-muted);
        }
        
        .toast-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        
        .toast-actions button {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: var(--accent);
          color: white;
          font-size: 12px;
          cursor: pointer;
        }
        
        .toast-actions button.secondary {
          background: var(--bg-3);
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
