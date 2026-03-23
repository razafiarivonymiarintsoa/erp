import { useEffect, useMemo, useState, useRef } from 'react';
import { useTable, useSortBy } from 'react-table';
import { getAllStock, addStock, removeStock, transferStock, getEntrepots, getProduits, getMovementsByProduct } from '../services/stockApi';
import { 
  Plus, 
  Minus, 
  ArrowRightLeft, 
  Search, 
  Filter, 
  Pencil, 
  Trash2, 
  Clock, 
  Upload, 
  Download, 
  RefreshCcw,
  Package,
  MoreHorizontal,
  X,
  ChevronDown,
  LayoutGrid,
  List,
  TrendingUp,
  Package2,
  DollarSign,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

// Statuts
const STATUS_OK = 'OK';
const STATUS_LOW = 'Bas';
const STATUS_OUT = 'Rupture';

const getStatus = (qty) => {
  if (qty <= 5) return STATUS_OUT;
  if (qty <= 15) return STATUS_LOW;
  return STATUS_OK;
};

const STATUS_CONFIG = {
  [STATUS_OK]: { 
    label: 'OK', 
    color: '#10b981', 
    bgColor: 'rgba(16, 185, 129, 0.12)',
    icon: CheckCircle 
  },
  [STATUS_LOW]: { 
    label: 'Bas', 
    color: '#f59e0b', 
    bgColor: 'rgba(245, 158, 11, 0.12)',
    icon: AlertTriangle 
  },
  [STATUS_OUT]: { 
    label: 'Rupture', 
    color: '#ef4444', 
    bgColor: 'rgba(239, 68, 68, 0.12)',
    icon: XCircle 
  },
};

function StockForm({ mode, produits, entrepots, existing, onSubmit, onCancel, onValueChange }) {
  const [form, setForm] = useState({
    productId: existing?.productId || '',
    warehouseId: existing?.warehouseId || '',
    fromWarehouseId: existing?.warehouseId || '',
    toWarehouseId: existing?.warehouseId || '',
    quantity: existing?.quantity || '',
    note: existing?.note || '',
  });

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (onValueChange) onValueChange({ ...form, [key]: value });
  };

  const validate = () => {
    if (!form.productId) return 'Produit requis';
    if (mode !== 'view' && Number(form.quantity) <= 0) return 'Quantité doit être > 0';
    if ((mode === 'add' || mode === 'remove') && !form.warehouseId) return 'Entrepôt requis';
    if (mode === 'transfer' && form.fromWarehouseId === form.toWarehouseId) return 'Entrepôts source/destination doivent être différents';
    if (mode === 'remove' && Number(form.quantity) > Number(existing?.quantity || 0)) return 'Quantité supérieure au stock disponible';
    return null;
  };

  const actionLabel = mode === 'add' ? 'Ajouter' : mode === 'remove' ? 'Retirer' : mode === 'transfer' ? 'Transférer' : 'Modifier';

  const handleSubmit = async () => {
    const error = validate();
    if (error) return toast.error(error);
    await onSubmit({ ...form, productId: Number(form.productId), quantity: Number(form.quantity), warehouseId: Number(form.warehouseId || 0), fromWarehouseId: Number(form.fromWarehouseId || 0), toWarehouseId: Number(form.toWarehouseId || 0) });
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="form-group">
        <label>Produit *</label>
        <select value={form.productId} onChange={(e) => setField('productId', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {produits.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
      </div>

      <div className="form-group">
        <label>Quantité *</label>
        <input type="number" min="1" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} />
      </div>

      {(mode === 'add' || mode === 'remove') && (
        <div className="form-group">
          <label>Entrepôt *</label>
          <select value={form.warehouseId} onChange={(e) => setField('warehouseId', e.target.value)}>
            <option value="">— Sélectionner —</option>
            {entrepots.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
          </select>
        </div>
      )}

      {mode === 'transfer' && (
        <div className="form-grid">
          <div className="form-group">
            <label>Source *</label>
            <select value={form.fromWarehouseId} onChange={(e) => setField('fromWarehouseId', e.target.value)}>
              <option value="">— Source —</option>
              {entrepots.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          </div>
          <div className="form-group">
            <label>Destination *</label>
            <select value={form.toWarehouseId} onChange={(e) => setField('toWarehouseId', e.target.value)}>
              <option value="">— Destination —</option>
              {entrepots.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Motif</label>
        <input value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder="Raison / commentaire" />
      </div>

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>{actionLabel}</button>
      <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onCancel}>Annuler</button>
    </div>
  );
}

function exportStockCSV(items) {
  const rows = [
    ['Produit', 'Entrepôt', 'Quantité', 'Prix unitaire', 'Statut'],
    ...items.map((s) => [s.productName, s.warehouseName, s.quantity, s.productPrice || 0, getStatus(s.quantity)]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stocks-export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function StockList() {
  const [stocks, setStocks] = useState([]);
  const [produits, setProduits] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [filterWH, setFilterWH] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [quantityMin, setQuantityMin] = useState('');
  const [quantityMax, setQuantityMax] = useState('');
  
  // UI
  const [viewMode, setViewMode] = useState('table');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const pageSize = 10;
  const filterRef = useRef(null);
  const actionsRef = useRef(null);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, e] = await Promise.all([getAllStock(filterWH || undefined), getProduits(), getEntrepots()]);
      setStocks(s.data || []);
      setProduits(p.data || []);
      setEntrepots(e.data || []);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    
    // Mode clair uniquement
  }, [filterWH]);

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
    const cats = new Set();
    stocks.forEach((s) => {
      const cat = s.productName?.split(' ')[0] || 'Autre';
      cats.add(cat);
    });
    return Array.from(cats);
  }, [stocks]);

  const filtered = useMemo(() => {
    const base = stocks.filter((s) => {
      const q = search.toLowerCase();
      if (q && !(`${s.productName} ${s.warehouseName}`.toLowerCase().includes(q))) return false;
      if (filterStatus && getStatus(s.quantity) !== filterStatus) return false;
      if (filterCategory && !(s.productName || '').toLowerCase().startsWith(filterCategory.toLowerCase())) return false;
      if (quantityMin && s.quantity < Number(quantityMin)) return false;
      if (quantityMax && s.quantity > Number(quantityMax)) return false;
      return true;
    });
    setPage(0);
    return base;
  }, [stocks, search, filterStatus, filterCategory, quantityMin, quantityMax]);

  const maxStock = useMemo(() => Math.max(1, ...stocks.map((s) => s.quantity || 0)), [stocks]);
  const totalQuantity = useMemo(() => stocks.reduce((a, v) => a + (v.quantity || 0), 0), [stocks]);
  const totalValue = useMemo(() => stocks.reduce((a, v) => a + ((v.quantity || 0) * Number(v.productPrice || 0)), 0), [stocks]);

  const columns = useMemo(() => [
    { Header: '#', accessor: 'index', Cell: ({ row }) => row.index + 1, width: 50 },
    { Header: 'Produit', accessor: 'productName' },
    { Header: 'Entrepôt', accessor: 'warehouseName' },
    { Header: 'Quantité', id: 'quantity-status', Cell: ({ row }) => {
      const value = row.original.quantity;
      const status = getStatus(value);
      const config = STATUS_CONFIG[status];
      const Icon = config.icon;
      const percentage = Math.round((value / maxStock) * 100);
      
      return (
        <div className="quantity-cell">
          <div className="quantity-bar-wrapper">
            <div className="quantity-bar">
              <div 
                className="quantity-bar-fill" 
                style={{ 
                  width: `${percentage}%`,
                  background: config.color
                }} 
              />
            </div>
          </div>
          <div className="quantity-info">
            <span className="quantity-value">{value}</span>
            <span className={`status-badge`} style={{ background: config.bgColor, color: config.color }}>
              <Icon size={12} />
              {config.label}
            </span>
          </div>
        </div>
      );
    } },
    { Header: 'Prix', accessor: (row) => row.productPrice ? `${Number(row.productPrice).toFixed(2)} €` : '—' },
    { Header: 'Actions', accessor: 'actions', disableSortBy: true, width: 120, Cell: ({ row }) => {
      const item = row.original;
      const handleHistory = async () => {
        try {
          const m = await getMovementsByProduct(item.productId);
          toast.success(`Derniers mouvements: ${m.data.length}`);
        } catch (err) {
          toast.error('Impossible de charger l\'historique');
        }
      };

      return (
        <div className="row-actions">
          <button className="action-btn" title="Voir" onClick={() => { setSelected(item); setModal('view'); }}>
            <Eye size={16} />
          </button>
          <button className="action-btn" title="Modifier" onClick={() => { setSelected(item); setModal('edit'); }}>
            <Pencil size={16} />
          </button>
          <button className="action-btn delete" title="Supprimer" onClick={() => {
            if (!window.confirm('Supprimer cette ligne ?')) return;
            removeStock({ productId: item.productId, warehouseId: item.warehouseId, quantity: item.quantity })
              .then(() => { toast.success('Supprimé'); load(); })
              .catch((e) => toast.error(e.message));
          }}>
            <Trash2 size={16} />
          </button>
        </div>
      );
    } },
  ], [maxStock]);

  const tableInstance = useTable({ columns, data: filtered }, useSortBy);
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = tableInstance;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => rows.slice(page * pageSize, (page + 1) * pageSize), [rows, page, pageSize]);

  const handleSubmit = async (payload) => {
    try {
      if (modal === 'add') await addStock({ ...payload, productId: Number(payload.productId), warehouseId: Number(payload.warehouseId) });
      else if (modal === 'remove') {
        await removeStock({ productId: Number(payload.productId), warehouseId: Number(payload.warehouseId), quantity: Number(payload.quantity) });
      } else if (modal === 'transfer') await transferStock(payload);
      else if (modal === 'edit') {
        const diff = Number(payload.quantity) - Number(selected.quantity);
        if (diff > 0) await addStock({ ...payload, warehouseId: Number(payload.warehouseId), quantity: diff });
        if (diff < 0) await removeStock({ productId: Number(payload.productId), warehouseId: Number(payload.warehouseId), quantity: -diff });
      }
      toast.success('Opération réussie');
      setModal(null);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Échec de l\'opération');
    }
  };

  const handleImportCSV = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        for (let i = 1; i < lines.length; i += 1) {
          const [product, warehouse, qty] = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          const produit = produits.find((p) => p.name.toLowerCase() === product.toLowerCase());
          const entrep = entrepots.find((w) => w.name.toLowerCase() === warehouse.toLowerCase());
          if (!produit || !entrep) continue;
          await addStock({ productId: produit.id, warehouseId: entrep.id, quantity: Number(qty) });
        }
        toast.success('Import CSV terminé');
        load();
      } catch (err) {
        toast.error('Erreur import CSV');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterCategory('');
    setQuantityMin('');
    setQuantityMax('');
  };

  const hasActiveFilters = search || filterStatus || filterCategory || quantityMin || quantityMax;

  // Calculer les stats par statut
  const statsByStatus = useMemo(() => {
    return {
      ok: stocks.filter(s => getStatus(s.quantity) === STATUS_OK).length,
      low: stocks.filter(s => getStatus(s.quantity) === STATUS_LOW).length,
      out: stocks.filter(s => getStatus(s.quantity) === STATUS_OUT).length,
    };
  }, [stocks]);

  return (
    <div className="page stock-page">
      {/* Header */}
      <div className="page-header-modern">
        <div className="header-title">
          <h2>Gestion des stocks</h2>
          <p>Gérez votre inventaire</p>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => { setSelected(null); setModal('add'); }}>
            <Plus size={18} />
            Ajouter
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
                <button onClick={() => { setSelected(null); setModal('remove'); setShowActionsMenu(false); }}>
                  <Minus size={16} /> Retirer du stock
                </button>
                <button onClick={() => { setSelected(null); setModal('transfer'); setShowActionsMenu(false); }}>
                  <ArrowRightLeft size={16} /> Transférer
                </button>
                <div className="dropdown-divider" />
                <button onClick={() => { exportStockCSV(filtered); setShowActionsMenu(false); }}>
                  <Download size={16} /> Export CSV
                </button>
                <label className="dropdown-item" onClick={() => setShowActionsMenu(false)}>
                  <Upload size={16} /> Import CSV
                  <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} disabled={isImporting} />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="stats-row">
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <Package2 size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stocks.length}</span>
            <span className="stat-label">Total produits</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalQuantity}</span>
            <span className="stat-label">Quantité totale</span>
          </div>
        </div>
        
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <DollarSign size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">€{totalValue.toFixed(2)}</span>
            <span className="stat-label">Valeur totale</span>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{statsByStatus.out}</span>
            <span className="stat-label">Rupture de stock</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="search-filter">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Rechercher un produit..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            {hasActiveFilters && <span className="filter-count">{(filterStatus ? 1 : 0) + (filterCategory ? 1 : 0) + (quantityMin || quantityMax ? 1 : 0)}</span>}
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
                <label>Entrepôt</label>
                <select value={filterWH} onChange={(e) => setFilterWH(e.target.value)}>
                  <option value="">Tous les entrepôts</option>
                  {entrepots.map(e => <option key={e.id} value={e.id}>{e.nom || e.name}</option>)}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Statut</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  <option value={STATUS_OK}>OK</option>
                  <option value={STATUS_LOW}>Bas</option>
                  <option value={STATUS_OUT}>Rupture</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Catégorie</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">Toutes catégories</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Quantité</label>
                <div className="quantity-range">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={quantityMin}
                    onChange={(e) => setQuantityMin(e.target.value)}
                  />
                  <span>—</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={quantityMax}
                    onChange={(e) => setQuantityMax(e.target.value)}
                  />
                </div>
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

      {/* Contenu */}
      {loading ? (
        <div className="loading-container">
          <Spinner />
          <p>Chargement des stocks...</p>
        </div>
      ) : stocks.length === 0 ? (
        /* État vide - AUCUN STOCK */
        <div className="empty-state-container">
          <div className="empty-illustration">
            <div className="empty-icon-wrapper">
              <Package size={64} strokeWidth={1.5} />
            </div>
            <div className="empty-pulse"></div>
          </div>
          
          <h2>Aucun stock trouvé</h2>
          <p>Ajoutez votre premier produit pour commencer à gérer votre inventaire</p>
          
          <button className="btn btn-primary" onClick={() => { setSelected(null); setModal('add'); }}>
            <Plus size={18} />
            Ajouter un stock
          </button>
          
          <div className="empty-tips">
            <div className="tip">
              <Plus size={16} />
              <span>Ajoutez des produits en stock</span>
            </div>
            <div className="tip">
              <ArrowRightLeft size={16} />
              <span>Effectuez des transferts</span>
            </div>
            <div className="tip">
              <TrendingUp size={16} />
              <span>Suivez vos niveaux</span>
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        /* Aucun résultat après filtrage */
        <div className="no-results">
          <Search size={48} strokeWidth={1} />
          <h3>Aucun résultat trouvé</h3>
          <p>Essayez de modifier vos filtres de recherche</p>
          <button className="btn btn-ghost" onClick={resetFilters}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Vue cartes */
        <div className="cards-grid">
          {filtered.map((item, index) => {
            const status = getStatus(item.quantity);
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            
            return (
              <div 
                key={`${item.productId}-${item.warehouseId}`} 
                className="stock-card"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="card-header">
                  <div className="card-product">
                    <Package size={20} />
                    <div>
                      <h4>{item.productName}</h4>
                      <span>{item.warehouseName}</span>
                    </div>
                  </div>
                  <span className="status-badge" style={{ background: config.bgColor, color: config.color }}>
                    <Icon size={12} />
                    {config.label}
                  </span>
                </div>
                
                <div className="card-quantity">
                  <span className="qty">{item.quantity}</span>
                  <span className="unit">unités</span>
                </div>
                
                <div className="card-footer">
                  <button className="action-btn" onClick={() => { setSelected(item); setModal('view'); }}>
                    <Eye size={16} />
                  </button>
                  <button className="action-btn" onClick={() => { setSelected(item); setModal('edit'); }}>
                    <Pencil size={16} />
                  </button>
                  <button className="action-btn delete" onClick={() => {
                    if (!window.confirm('Supprimer cette ligne ?')) return;
                    removeStock({ productId: item.productId, warehouseId: item.warehouseId, quantity: item.quantity })
                      .then(() => { toast.success('Supprimé'); load(); });
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vue tableau */
        <div className="table-container">
          <table {...getTableProps()} className="modern-table">
            <thead>
              {headerGroups.map((headerGroup) => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column) => (
                    <th {...column.getHeaderProps(column.getSortByToggleProps())} style={{ width: column.width }}>
                      {column.render('Header')}
                      <span>{column.isSorted ? (column.isSortedDesc ? ' ↓' : ' ↑') : ''}</span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {pageRows.map((row, index) => {
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()} style={{ animationDelay: `${index * 0.02}s` }}>
                    {row.cells.map((cell) => (
                      <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Pagination */}
          {pageCount > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Affichage de {(page * pageSize) + 1} à {Math.min((page + 1) * pageSize, filtered.length)} sur {filtered.length} résultats
              </div>
              <div className="pagination-controls">
                <button 
                  className="page-btn"
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
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
                  onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
                  disabled={page >= pageCount - 1}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal 
          title={
            modal === 'add' ? 'Ajouter du stock' : 
            modal === 'remove' ? 'Retirer du stock' : 
            modal === 'transfer' ? 'Transférer du stock' : 
            modal === 'view' ? 'Détails du stock' : 
            'Modifier stock'
          } 
          onClose={() => { setModal(null); setSelected(null); }}
        >
          {modal === 'view' && selected ? (
            <div className="stock-details">
              <div className="detail-row">
                <label>Produit</label>
                <span>{selected.productName}</span>
              </div>
              <div className="detail-row">
                <label>Entrepôt</label>
                <span>{selected.warehouseName}</span>
              </div>
              <div className="detail-row">
                <label>Quantité</label>
                <span className="qty">{selected.quantity}</span>
              </div>
              <div className="detail-row">
                <label>Prix unitaire</label>
                <span>{selected.productPrice ? `${Number(selected.productPrice).toFixed(2)} €` : '—'}</span>
              </div>
              <div className="detail-row">
                <label>Statut</label>
                {(() => {
                  const status = getStatus(selected.quantity);
                  const config = STATUS_CONFIG[status];
                  const Icon = config.icon;
                  return (
                    <span className="status-badge" style={{ background: config.bgColor, color: config.color }}>
                      <Icon size={12} />
                      {config.label}
                    </span>
                  );
                })()}
              </div>
              <div className="detail-actions">
                <button className="btn btn-primary" onClick={() => { setModal('edit'); }}>
                  <Pencil size={16} /> Modifier
                </button>
                <button className="btn btn-ghost" onClick={() => { setModal(null); }}>
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <StockForm 
              mode={modal === 'edit' ? 'edit' : modal} 
              produits={produits} 
              entrepots={entrepots} 
              existing={selected} 
              onSubmit={handleSubmit} 
              onCancel={() => setModal(null)} 
            />
          )}
        </Modal>
      )}

      <style>{`
        /* Header moderne */
        .stock-page {
          --accent: #6366f1;
          --accent-light: rgba(99, 102, 241, 0.12);
        }
        
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
          min-width: 200px;
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
        
        .dropdown-divider {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }
        
        /* Stats row */
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
          min-width: 280px;
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
        
        .filter-group select, .filter-group input {
          width: 100%;
          padding: 8px 12px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text);
          outline: none;
        }
        
        .filter-group select:focus, .filter-group input:focus {
          border-color: var(--accent);
        }
        
        .quantity-range {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .quantity-range input {
          width: 80px !important;
        }
        
        .quantity-range span {
          color: var(--text-muted);
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
        
        .modern-table th[style*="cursor"] {
          cursor: pointer;
        }
        
        .modern-table th span {
          margin-left: 6px;
          opacity: 0.6;
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
        
        .quantity-cell {
          min-width: 140px;
        }
        
        .quantity-bar-wrapper {
          margin-bottom: 8px;
        }
        
        .quantity-bar {
          height: 6px;
          background: var(--bg-3);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .quantity-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        
        .quantity-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .quantity-value {
          font-weight: 600;
          font-family: var(--mono);
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
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
        
        /* Cards view */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .stock-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
          animation: fadeInRow 0.3s ease forwards;
          opacity: 0;
        }
        
        .stock-card:hover {
          border-color: var(--accent);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .card-product {
          display: flex;
          gap: 12px;
        }
        
        .card-product svg {
          color: var(--text-muted);
        }
        
        .card-product h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 2px;
        }
        
        .card-product span {
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .card-quantity {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .card-quantity .qty {
          font-size: 28px;
          font-weight: 700;
          font-family: var(--mono);
          color: var(--text);
        }
        
        .card-quantity .unit {
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .card-footer {
          display: flex;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        
        /* Stock details modal */
        .stock-details {
          padding: 8px 0;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
        
        .detail-row:last-of-type {
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
        
        .detail-row .qty {
          font-family: var(--mono);
          font-weight: 600;
        }
        
        .detail-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
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
          
          .view-toggle {
            align-self: flex-end;
          }
          
          .filters-panel {
            left: 0;
            right: 0;
            min-width: auto;
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
          
          .pagination {
            flex-direction: column;
            text-align: center;
          }
          
          .pagination-controls {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
        
        /* Dark mode */
        .dark-mode .stock-card:hover,
        .dark-mode .table-container tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
}
