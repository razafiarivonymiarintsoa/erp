import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStockByProduct, getMovementsByProduct } from '../services/stockApi';
import { ArrowLeft, Package } from 'lucide-react';
import MovementBadge from '../components/MovementBadge';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [stocks,    setStocks]    = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getStockByProduct(productId), getMovementsByProduct(productId)])
      .then(([s, m]) => { setStocks(s.data); setMovements(m.data); })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <div className="page"><Spinner /></div>;

  const product = stocks[0];
  const totalQty = stocks.reduce((acc, s) => acc + s.quantity, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} />
          </button>
          <div>
            <h2>{product?.productName || `Produit #${productId}`}</h2>
            <p>Détail du stock par entrepôt · Prix unitaire : {product?.productPrice?.toFixed(2)} €</p>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '12px 20px' }}>
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--accent)' }}>
            <Package size={20} />
          </div>
          <div>
            <h3>{totalQty}</h3>
            <p>Qté totale</p>
          </div>
        </div>
      </div>

      {/* Stock par entrepôt */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Stock par entrepôt</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entrepôt</th>
                <th>Localisation</th>
                <th>Quantité</th>
                <th>Valeur stock</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => (
                <tr key={s.stockId}>
                  <td><span className="badge badge-blue">{s.warehouseName}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{s.warehouseLocation}</td>
                  <td>
                    <span className={`qty ${s.quantity < 10 ? 'qty-low' : s.quantity < 30 ? 'qty-medium' : 'qty-ok'}`}>
                      {s.quantity}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)' }}>
                    {(s.quantity * (s.productPrice || 0)).toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique mouvements */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Historique des mouvements</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Entrepôt</th>
                <th>Quantité</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>
                  Aucun mouvement enregistré
                </td></tr>
              )}
              {movements.map(m => (
                <tr key={m.movementId}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                    {new Date(m.movementDate).toLocaleString('fr-FR')}
                  </td>
                  <td><MovementBadge type={m.type} /></td>
                  <td>{m.warehouseName}</td>
                  <td><span className="qty">{m.quantity}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{m.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
