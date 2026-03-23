import { useEffect, useMemo, useState, useRef } from 'react';
import { getProduits, createProduit, updateProduit, deleteProduit } from '../services/stockApi';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Upload, 
  Download,
  MoreHorizontal,
  ChevronDown,
  Filter,
  X,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCcw,
  LayoutGrid,
  List,
  Eye
} from 'lucide-react';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  id: null,
  reference: '',
  name: '',
  category: '',
  price: 0,
  stock: 0,
  alertThreshold: 10,
  unit: 'pcs',
};

// Status configuration
const STATUS_CONFIG = {
  OK: { 
    label: 'En stock', 
    color: '#10b981', 
    bgColor: 'rgba(16, 185, 129, 0.12)',
    icon: CheckCircle 
  },
  LOW: { 
    label: 'Stock faible', 
    color: '#f59e0b', 
    bgColor: 'rgba(245, 158, 11, 0.12)',
    icon: AlertTriangle 
  },
  OUT: { 
    label: 'Rupture', 
    color: '#ef4444', 
    bgColor: 'rgba(239, 68, 68, 0.12)',
    icon: XCircle 
  },
};

function getStatus(stock, alertThreshold) {
  if (stock <= 0) return { ...STATUS_CONFIG.OUT, key: 'OUT' };
  if (stock <= alertThreshold) return { ...STATUS_CONFIG.LOW, key: 'LOW' };
  return { ...STATUS_CONFIG.OK, key: 'OK' };
}

function toCsv(products) {
  const headers = ['id', 'reference', 'name', 'category', 'price', 'stock', 'alertThreshold', 'unit'];
  const lines = [headers.join(',')];
  products.forEach((p) => {
    lines.push([
      p.id,
      p.reference,
      p.name,
      p.category,
      p.price,
      p.stock,
      p.alertThreshold,
      p.unit,
    ].map(v => `"${String(v ?? '')}"`).join(','));
  });
  return lines.join('\n');
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line);

  if (!lines.length) return [];

  const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  const getIndex = key => header.indexOf(key);
  const required = ['reference', 'name', 'price', 'stock'];
  if (!required.every(f => getIndex(f) > -1)) {
    throw new Error('CSV invalide : colonnes manquantes.');
  }

  return lines.slice(1).map((line, idx) => {
    const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
    return {
      id: Number(cols[getIndex('id')]) || Date.now() + idx,
      reference: cols[getIndex('reference')] || `REF-${Date.now() + idx}`,
      name: cols[getIndex('name')] || 'Produit inconnu',
      category: cols[getIndex('category')] || 'Général',
      price: Number(cols[getIndex('price')]) || 0,
      stock: Number(cols[getIndex('stock')]) || 0,
      alertThreshold: Number(cols[getIndex('alertthreshold')]) || 10,
      unit: cols[getIndex('unit')] || 'pcs',
    };
  });
}

export default function Products() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  
  // UI state
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  
  const filterRef = useRef(null);
  const actionsRef = useRef(null);
  
  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    getProduits()
      .then(r => {
        const data = (r.data || []).map((p) => ({
          id: p.id,
          reference: p.reference || `REF-${p.id ?? Date.now()}`,
          name: p.name,
          category: p.category || 'Général',
          price: Number(p.price || 0),
          stock: Number(p.stock || 0),
          alertThreshold: Number(p.alertThreshold || 10),
          unit: p.unit || 'pcs',
        }));
        setProduits(data);
      })
      .catch(() => toast.error('Erreur lors du chargement des produits.'))
      .finally(() => setLoading(false));
    
    // Mode clair uniquement
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = useMemo(() => {
    const set = new Set(produits.map(p => p.category || 'Général'));
    return Array.from(set);
  }, [produits]);

  // Statistics
  const stats = useMemo(() => {
    const total = produits.length;
    const inStock = produits.filter(p => p.stock > 0).length;
    const outOfStock = produits.filter(p => p.stock <= 0).length;
    return { total, inStock, outOfStock };
  }, [produits]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return produits.filter((p) => {
      const matchText = [p.name, p.reference].join(' ').toLowerCase().includes(q);
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      const status = getStatus(p.stock, p.alertThreshold);
      const matchStatus = !statusFilter || status.key === statusFilter;
      return matchText && matchCategory && matchStatus;
    });
  }, [produits, search, categoryFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pageProducts = useMemo(() => 
    filteredProducts.slice(page * pageSize, (page + 1) * pageSize),
    [filteredProducts, page, pageSize]
  );

  const hasActiveFilters = categoryFilter || statusFilter;

  const openNew = () => {
    setForm(INITIAL_FORM);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setForm({ ...product });
    setModalOpen(true);
  };

  const openView = (product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    
    try {
      await deleteProduit(id);
      setProduits(cur => cur.filter(p => p.id !== id));
      toast.success('Produit supprimé.');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.reference.trim()) {
      return toast.error('Le nom et la référence sont obligatoires.');
    }
    const normalized = {
      ...form,
      name: form.name.trim(),
      reference: form.reference.trim(),
      category: form.category?.trim() || 'Général',
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      alertThreshold: Number(form.alertThreshold) || 10,
      unit: form.unit?.trim() || 'pcs',
    };

    try {
      if (normalized.id) {
        // Update existing product
        const response = await updateProduit(normalized.id, normalized);
        setProduits(cur => cur.map(p => (p.id === normalized.id ? response.data : p)));
        toast.success('Produit modifié.');
      } else {
        // Create new product
        const response = await createProduit(normalized);
        setProduits(cur => [response.data, ...cur]);
        toast.success('Produit ajouté.');
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Erreur produit:', error);
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = parseCsv(e.target.result);
        setProduits(cur => {
          const existing = new Map(cur.map(p => [String(p.reference).toLowerCase(), p]));
          imported.forEach((p) => { existing.set(String(p.reference).toLowerCase(), p); });
          return Array.from(existing.values());
        });
        toast.success('Import CSV réussi.');
      } catch (err) {
        toast.error(err.message || 'Erreur d\'import CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = null;
  };

  const handleExport = () => {
    const csv = toCsv(filteredProducts.length ? filteredProducts : produits);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'produits.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi.');
    setShowActionsMenu(false);
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setPage(0);
  };

  return (
    <div className="page products-page">
      {/* Header */}
      <div className="page-header-modern">
        <div className="header-title">
          <h2>Produits</h2>
          <p>{produits.length} produit(s) référencé(s)</p>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={18} />
            Nouveau produit
          </button>
          
          <div className="dropdown-container" ref={actionsRef}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowActionsMenu(!showActionsMenu)}
            >
              <MoreHorizontal size={18} />
              Actions
              <ChevronDown size={14} />
            </button>
            
            {showActionsMenu && (
              <div className="dropdown-menu">
                <label className="dropdown-item">
                  <Upload size={16} /> Import CSV
                  <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleImport} />
                </label>
                <button onClick={handleExport}>
                  <Download size={16} /> Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-row">
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <Package size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total produits</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.inStock}</span>
            <span className="stat-label">En stock</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <XCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.outOfStock}</span>
            <span className="stat-label">Rupture</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="filters-section">
        <div className="search-filter">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou référence..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="filter-dropdown" ref={filterRef}>
          <button 
            className={`btn btn-filter ${showFilters || hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtres
            {hasActiveFilters && <span className="filter-count">{(categoryFilter ? 1 : 0) + (statusFilter ? 1 : 0)}</span>}
          </button>
          
          {showFilters && (
            <div className="filters-panel">
              <div className="filters-header">
                <h4>Filtres</h4>
                {hasActiveFilters && (
                  <button className="reset-btn" onClick={resetFilters}>
                    <RefreshCcw size={12} /> Réinitialiser
                  </button>
                )}
              </div>
              
              <div className="filter-group">
                <label>Catégorie</label>
                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}>
                  <option value="">Toutes catégories</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Statut</label>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                  <option value="">Tous statuts</option>
                  <option value="OK">En stock</option>
                  <option value="LOW">Stock faible</option>
                  <option value="OUT">Rupture</option>
                </select>
              </div>
            </div>
          )}
        </div>
        
        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Vue tableau"
          >
            <List size={18} />
          </button>
          <button 
            className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Vue cartes"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-container">
          <Spinner />
          <p>Chargement des produits...</p>
        </div>
      ) : produits.length === 0 ? (
        /* Empty state - NO PRODUCTS */
        <div className="empty-state-container">
          <div className="empty-illustration">
            <div className="empty-icon-wrapper">
              <Package size={64} strokeWidth={1.5} />
            </div>
            <div className="empty-pulse"></div>
          </div>
          
          <h2>Aucun produit disponible</h2>
          <p>Commencez par ajouter votre premier produit pour gérer votre inventaire</p>
          
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={18} />
            Ajouter un produit
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* No results */
        <div className="no-results">
          <Search size={48} strokeWidth={1} />
          <h3>Aucun résultat trouvé</h3>
          <p>Essayez de modifier vos filtres de recherche</p>
          <button className="btn btn-ghost" onClick={resetFilters}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards view */
        <div className="cards-grid">
          {pageProducts.map((p, index) => {
            const status = getStatus(p.stock, p.alertThreshold);
            const Icon = status.icon;
            
            return (
              <div 
                key={p.id} 
                className="product-card"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="card-header">
                  <div className="product-info">
                    <div className="product-icon">
                      <Package size={20} />
                    </div>
                    <div>
                      <h4>{p.name}</h4>
                      <span className="ref">{p.reference}</span>
                    </div>
                  </div>
                  <span className="status-badge" style={{ background: status.bgColor, color: status.color }}>
                    <Icon size={12} />
                    {status.label}
                  </span>
                </div>
                
                <div className="card-details">
                  <div className="detail">
                    <label>Catégorie</label>
                    <span>{p.category}</span>
                  </div>
                  <div className="detail">
                    <label>Prix</label>
                    <span>{Number(p.price).toFixed(2)} €</span>
                  </div>
                  <div className="detail">
                    <label>Stock</label>
                    <span>{p.stock} {p.unit}</span>
                  </div>
                </div>
                
                <div className="card-footer">
                  <button className="action-btn" onClick={() => openView(p)}>
                    <Eye size={16} />
                  </button>
                  <button className="action-btn" onClick={() => openEdit(p)}>
                    <Edit3 size={16} />
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(p.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th style={{ textAlign: 'right' }}>Prix</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageProducts.map((p, index) => {
                const status = getStatus(p.stock, p.alertThreshold);
                const Icon = status.icon;
                
                return (
                  <tr key={p.id} style={{ animationDelay: `${index * 0.02}s` }}>
                    <td className="ref-cell">{p.reference}</td>
                    <td className="name-cell">{p.name}</td>
                    <td className="category-cell">{p.category}</td>
                    <td className="price-cell" style={{ textAlign: 'right' }}>{Number(p.price).toFixed(2)} €</td>
                    <td className="stock-cell" style={{ textAlign: 'right' }}>{p.stock} {p.unit}</td>
                    <td>
                      <span className="status-badge" style={{ background: status.bgColor, color: status.color }}>
                        <Icon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="action-btn" onClick={() => openView(p)} title="Voir">
                          <Eye size={16} />
                        </button>
                        <button className="action-btn" onClick={() => openEdit(p)} title="Modifier">
                          <Edit3 size={16} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(p.id)} title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Pagination */}
          {pageCount > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Affichage de {(page * pageSize) + 1} à {Math.min((page + 1) * pageSize, filteredProducts.length)} sur {filteredProducts.length} résultats
              </div>
              <div className="pagination-controls">
                <button 
                  className="page-btn"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Précédent
                </button>
                
                {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                  let pageNum;
                  if (pageCount <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 2) {
                    pageNum = i + 1;
                  } else if (page >= pageCount - 3) {
                    pageNum = pageCount - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={`page-btn ${page === pageNum - 1 ? 'active' : ''}`}
                      onClick={() => setPage(pageNum - 1)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  className="page-btn"
                  onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Modal */}
      {viewModalOpen && selectedProduct && (
        <div className="modal-overlay" onClick={() => setViewModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Détails du produit</h3>
              <button className="close-btn" onClick={() => setViewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {(() => {
                const status = getStatus(selectedProduct.stock, selectedProduct.alertThreshold);
                const Icon = status.icon;
                return (
                  <div className="product-details">
                    <div className="detail-row">
                      <label>Référence</label>
                      <span>{selectedProduct.reference}</span>
                    </div>
                    <div className="detail-row">
                      <label>Nom</label>
                      <span>{selectedProduct.name}</span>
                    </div>
                    <div className="detail-row">
                      <label>Catégorie</label>
                      <span>{selectedProduct.category}</span>
                    </div>
                    <div className="detail-row">
                      <label>Prix</label>
                      <span>{Number(selectedProduct.price).toFixed(2)} €</span>
                    </div>
                    <div className="detail-row">
                      <label>Stock</label>
                      <span>{selectedProduct.stock} {selectedProduct.unit}</span>
                    </div>
                    <div className="detail-row">
                      <label>Seuil d'alerte</label>
                      <span>{selectedProduct.alertThreshold}</span>
                    </div>
                    <div className="detail-row">
                      <label>Statut</label>
                      <span className="status-badge" style={{ background: status.bgColor, color: status.color }}>
                        <Icon size={12} />
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setViewModalOpen(false)}>Fermer</button>
              <button className="btn btn-primary" onClick={() => { setViewModalOpen(false); openEdit(selectedProduct); }}>
                <Edit3 size={16} /> Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{form.id ? 'Modifier le produit' : 'Ajouter un produit'}</h3>
              <button className="close-btn" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Référence *</label>
                    <input
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      required
                      placeholder="Ex: PROD-001"
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Ex: Produit example"
                    />
                  </div>
                  <div className="form-group">
                    <label>Catégorie</label>
                    <input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Ex: Electronique"
                    />
                  </div>
                  <div className="form-group">
                    <label>Prix (€)</label>
                    <input type="number" step="0.01" min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock</label>
                    <input type="number" min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Seuil d'alerte</label>
                    <input type="number" min="0"
                      value={form.alertThreshold}
                      onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Unité</label>
                    <input
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="Ex: pcs, kg, L"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{form.id ? 'Enregistrer' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* Products page */
        .products-page {
          --accent: #6366f1;
          --accent-light: rgba(99, 102, 241, 0.12);
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
        }
        
        .btn-secondary {
          background: var(--bg-2);
          border: 1px solid var(--border);
          color: var(--text);
        }
        
        /* Dropdown */
        .dropdown-container {
          position: relative;
        }
        
        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 6px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
          min-width: 180px;
          z-index: 100;
          animation: fadeIn 0.15s ease;
          overflow: hidden;
        }
        
        .dropdown-menu button, .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          color: var(--text);
          font-size: 13.5px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }
        
        .dropdown-menu button:hover, .dropdown-item:hover {
          background: var(--bg-3);
        }
        
        /* Stats */
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
        
        /* Filters */
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
        
        .filter-dropdown {
          position: relative;
        }
        
        .btn-filter {
          background: var(--bg-2);
          border: 1px solid var(--border);
          color: var(--text);
        }
        
        .btn-filter.active {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-light);
        }
        
        .filter-count {
          background: var(--accent);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 6px;
        }
        
        .filters-panel {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 6px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
          min-width: 240px;
          z-index: 100;
          animation: fadeIn 0.15s ease;
          padding: 16px;
        }
        
        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        
        .filters-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        
        .reset-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--accent);
          background: none;
          border: none;
          cursor: pointer;
        }
        
        .filter-group {
          margin-bottom: 14px;
        }
        
        .filter-group label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        
        .filter-group select {
          width: 100%;
          padding: 8px 12px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text);
          outline: none;
        }
        
        .filter-group select:focus {
          border-color: var(--accent);
        }
        
        /* View toggle */
        .view-toggle {
          display: flex;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .view-btn {
          padding: 8px 12px;
          border: none;
          background: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .view-btn:hover {
          color: var(--text);
        }
        
        .view-btn.active {
          background: var(--accent);
          color: white;
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
        
        /* Empty state */
        .empty-state-container {
          max-width: 480px;
          margin: 60px auto;
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
        
        .modern-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          border-top: 1px solid var(--border);
          vertical-align: middle;
        }
        
        .table-container tbody tr {
          transition: background 0.15s;
          animation: fadeInRow 0.3s ease forwards;
          opacity: 0;
        }
        
        @keyframes fadeInRow {
          to { opacity: 1; }
        }
        
        .table-container tbody tr:hover {
          background: rgba(99, 102, 241, 0.04);
        }
        
        .ref-cell {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .name-cell {
          font-weight: 500;
        }
        
        .category-cell {
          color: var(--text-muted);
        }
        
        .price-cell {
          font-family: var(--mono);
          font-weight: 500;
        }
        
        .stock-cell {
          font-family: var(--mono);
          font-weight: 500;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .row-actions {
          display: flex;
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
          color: var(--text-muted);
        }
        
        .action-btn:hover {
          background: var(--accent-light);
          color: var(--accent);
        }
        
        .action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        
        /* Cards */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        
        .product-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
          animation: fadeInRow 0.3s ease forwards;
          opacity: 0;
        }
        
        .product-card:hover {
          border-color: var(--accent);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .product-info {
          display: flex;
          gap: 12px;
        }
        
        .product-icon {
          width: 40px;
          height: 40px;
          background: var(--bg-3);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        
        .product-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 2px;
        }
        
        .product-info .ref {
          font-size: 12px;
          font-family: var(--mono);
          color: var(--text-muted);
        }
        
        .card-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        
        .card-details .detail {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .card-details label {
          font-size: 11px;
          color: var(--text-muted);
        }
        
        .card-details span {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        
        .card-footer {
          display: flex;
          gap: 8px;
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
        
        /* Modal */
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .modal-header h3 {
          font-size: 16px;
          font-weight: 600;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          border-radius: 6px;
        }
        
        .close-btn:hover {
          background: var(--bg-3);
          color: var(--text);
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        
        .product-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-row label {
          font-size: 13px;
          color: var(--text-muted);
        }
        
        .detail-row span {
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
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
            min-width: 600px;
          }
          
          .cards-grid {
            grid-template-columns: 1fr;
          }
          
          .pagination {
            flex-direction: column;
            text-align: center;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
