import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/stock',
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || 'Erreur réseau.';
    return Promise.reject(new Error(msg));
  }
);

// ── Stock ─────────────────────────────────────────────────────
export const getAllStock      = (warehouseId) => api.get('', { params: warehouseId ? { warehouseId } : {} });
export const getStockByProduct = (productId)  => api.get(`/${productId}`);
export const addStock          = (data)        => api.post('/add', data);
export const removeStock       = (data)        => api.post('/remove', data);
export const transferStock     = (data)        => api.post('/transfer', data);

// ── Mouvements ────────────────────────────────────────────────
export const getAllMovements        = ()          => api.get('/movements');
export const getMovementsByProduct  = (productId) => api.get(`/movements/${productId}`);
export const deleteMovement         = (id)        => api.delete(`/movements/${id}`);

// ── Référentiels ─────────────────────────────────────────────
export const getProduits   = (search) => api.get('/produits', { params: search ? { search } : {} });
export const createProduit  = (data)   => api.post('/produits', data);
export const updateProduit  = (id, data) => api.put(`/produits/${id}`, data);
export const deleteProduit  = (id)     => api.delete(`/produits/${id}`);
export const getEntrepots  = ()        => api.get('/entrepots');
export const getDashboard  = ()        => api.get('/dashboard');
