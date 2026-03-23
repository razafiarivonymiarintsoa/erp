package com.erp.stock.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.erp.stock.dto.EntrepotDto;
import com.erp.stock.dto.ProduitDto;
import com.erp.stock.dto.StockDto;
import com.erp.stock.dto.StockDto.MovementView;
import com.erp.stock.dto.StockDto.StockView;
import com.erp.stock.repository.StockJdbcRepository;

@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final StockJdbcRepository jdbcRepository;

    @Autowired
    public StockService(StockJdbcRepository jdbcRepository) {
        this.jdbcRepository = jdbcRepository;
    }

    // ── add_stock ─────────────────────────────────────────────────
    @Transactional
    public void addStock(StockDto.AddRequest req) {
        jdbcRepository.addStock(
            req.getProductId(),
            req.getWarehouseId(),
            req.getQuantity(),
            req.getNote()
        );
    }

    // ── remove_stock ──────────────────────────────────────────────
    @Transactional
    public void removeStock(StockDto.RemoveRequest req) {
        jdbcRepository.removeStock(
            req.getProductId(),
            req.getWarehouseId(),
            req.getQuantity(),
            req.getNote()
        );
    }

    // ── transfer_stock ────────────────────────────────────────────
    @Transactional
    public void transferStock(StockDto.TransferRequest req) {
        jdbcRepository.transferStock(
            req.getProductId(),
            req.getFromWarehouseId(),
            req.getToWarehouseId(),
            req.getQuantity(),
            req.getNote()
        );
    }

    // ── get_stock (by product) via procédure stockée ─────────────
    @Transactional(readOnly = true)
    public List<StockView> getStockByProduct(Long productId) {
        return jdbcRepository.getStockByProduct(productId);
    }

    // ── get_all_stock via procédure stockée ────────────────────────
    @Transactional(readOnly = true)
    public List<StockView> getAllStock(Long warehouseId) {
        return jdbcRepository.getAllStock(warehouseId);
    }

    // ── get_stock_movements via procédure stockée ─────────────────
    @Transactional(readOnly = true)
    public List<MovementView> getMovements(Long productId) {
        return jdbcRepository.getMovements(productId);
    }

    // ── Dashboard via JDBC ─────────────────────────────────────────
    @Transactional(readOnly = true)
    public StockDto.DashboardView getDashboard() {
        return StockDto.DashboardView.builder()
            .totalProducts(jdbcRepository.countProduits())
            .totalWarehouses(jdbcRepository.countEntrepots())
            .totalStockLines(jdbcRepository.countStockLines())
            .totalQuantity(jdbcRepository.sumTotalQuantity())
            .build();
    }

    // ── Produits / Entrepôts via JDBC ─────────────────────────────
    @Transactional(readOnly = true)
    public List<ProduitDto> getAllProduits() {
        return jdbcRepository.findAllProduits();
    }

    @Transactional(readOnly = true)
    public List<EntrepotDto> getAllEntrepots() {
        return jdbcRepository.findAllEntrepots();
    }

    // ── CRUD Entrepot via JDBC ─────────────────────────────────────
    @Transactional
    public EntrepotDto createEntrepot(Map<String, Object> request) {
        String name = (String) request.get("name");
        String location = (String) request.get("location");
        
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Le nom de l'entrepôt est requis.");
        }
        if (location == null || location.isBlank()) {
            throw new IllegalArgumentException("La localisation de l'entrepôt est requise.");
        }
        
        EntrepotDto entrepot = new EntrepotDto(null, name, location, null);
        return jdbcRepository.createEntrepot(entrepot);
    }

    @Transactional
    public EntrepotDto updateEntrepot(Long id, Map<String, Object> request) {
        String name = (String) request.get("name");
        String location = (String) request.get("location");
        
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Le nom de l'entrepôt est requis.");
        }
        if (location == null || location.isBlank()) {
            throw new IllegalArgumentException("La localisation de l'entrepôt est requise.");
        }
        
        EntrepotDto existing = jdbcRepository.findEntrepotById(id);
        if (existing == null) {
            throw new IllegalArgumentException("Entrepôt non trouvé avec l'ID: " + id);
        }
        
        EntrepotDto entrepot = new EntrepotDto(id, name, location, existing.getCreatedAt());
        return jdbcRepository.updateEntrepot(entrepot);
    }

    @Transactional
    public void deleteEntrepot(Long id) {
        jdbcRepository.deleteEntrepot(id);
    }

    @Transactional(readOnly = true)
    public List<ProduitDto> searchProduits(String query) {
        return jdbcRepository.searchProduits(query);
    }

    // ── CRUD Produit via JDBC ─────────────────────────────────────
    @Transactional
    public ProduitDto createProduit(Map<String, Object> request) {
        String reference = (String) request.get("reference");
        String name = (String) request.get("name");
        String category = (String) request.get("category");
        if (category == null || category.isBlank()) category = "Général";
        
        BigDecimal price = BigDecimal.ZERO;
        Object priceValue = request.get("price");
        if (priceValue != null) {
            if (priceValue instanceof Number) {
                price = BigDecimal.valueOf(((Number) priceValue).doubleValue());
            } else {
                String priceStr = priceValue instanceof String 
                    ? ((String) priceValue).trim() 
                    : priceValue.toString().trim();
                if (priceStr.isEmpty()) {
                    log.warn("WARN: price value is empty, setting to 0");
                    price = BigDecimal.ZERO;
                } else {
                    try {
                        price = new BigDecimal(priceStr);
                    } catch (NumberFormatException e) {
                        log.error("ERROR: Failed to parse price. Value='{}', class={}", priceStr, priceValue.getClass().getName(), e);
                        throw new IllegalArgumentException("Invalid price value: " + priceStr + ". Must be a valid number.");
                    }
                }
            }
        }
        
        Integer stock = 0;
        Object stockValue = request.get("stock");
        if (stockValue != null) {
            if (stockValue instanceof Number) {
                stock = ((Number) stockValue).intValue();
            } else {
                String stockStr = stockValue instanceof String 
                    ? ((String) stockValue).trim() 
                    : stockValue.toString().trim();
                if (stockStr.isEmpty()) {
                    log.warn("WARN: stock value is empty, setting to 0");
                    stock = 0;
                } else {
                    try {
                        stock = Integer.parseInt(stockStr);
                    } catch (NumberFormatException e) {
                        log.error("ERROR: Failed to parse stock. Value='{}', class={}", stockStr, stockValue.getClass().getName(), e);
                        throw new IllegalArgumentException("Invalid stock value: " + stockStr + ". Must be a valid integer.");
                    }
                }
            }
        }
        
        Integer alertThreshold = 10;
        Object alertValue = request.get("alertThreshold");
        if (alertValue != null) {
            if (alertValue instanceof Number) {
                alertThreshold = ((Number) alertValue).intValue();
            } else {
                String alertStr = alertValue instanceof String 
                    ? ((String) alertValue).trim() 
                    : alertValue.toString().trim();
                if (alertStr.isEmpty()) {
                    log.warn("WARN: alertThreshold value is empty, setting to 10");
                    alertThreshold = 10;
                } else {
                    try {
                        alertThreshold = Integer.parseInt(alertStr);
                    } catch (NumberFormatException e) {
                        log.error("ERROR: Failed to parse alertThreshold. Value='{}', class={}", alertStr, alertValue.getClass().getName(), e);
                        throw new IllegalArgumentException("Invalid alertThreshold value: " + alertStr + ". Must be a valid integer.");
                    }
                }
            }
        }
        
        String unit = (String) request.get("unit");
        if (unit == null || unit.isBlank()) unit = "pcs";
        
        Long id = jdbcRepository.createProduit(reference, name, category, price, stock, alertThreshold, unit);
        
        return jdbcRepository.findProduitById(id);
    }

    @Transactional
    public ProduitDto updateProduit(Long id, Map<String, Object> request) {
        if (id == null) {
            throw new IllegalArgumentException("Product ID cannot be null");
        }
        ProduitDto produit = jdbcRepository.findProduitById(id);
        if (produit == null) {
            throw new IllegalArgumentException("Produit non trouvé: " + id);
        }
        
        if (request.containsKey("reference")) 
            produit.setReference((String) request.get("reference"));
        if (request.containsKey("name")) 
            produit.setName((String) request.get("name"));
        if (request.containsKey("category")) {
            String category = (String) request.get("category");
            produit.setCategory(category != null && !category.isBlank() ? category : "Général");
        }
        if (request.containsKey("price") && request.get("price") != null) {
            Object priceValue = request.get("price");
            if (priceValue instanceof Number) {
                produit.setPrice(BigDecimal.valueOf(((Number) priceValue).doubleValue()));
            } else {
                String priceStr = priceValue instanceof String 
                    ? ((String) priceValue).trim() 
                    : priceValue.toString().trim();
                if (priceStr.isEmpty()) {
                    log.warn("WARN: price value is empty, setting to 0");
                    produit.setPrice(BigDecimal.ZERO);
                } else {
                    try {
                        produit.setPrice(new BigDecimal(priceStr));
                    } catch (NumberFormatException e) {
                        log.error("ERROR: Failed to parse price. Value='{}', class={}", priceStr, priceValue.getClass().getName(), e);
                        throw new IllegalArgumentException("Invalid price value: " + priceStr + ". Must be a valid number.");
                    }
                }
            }
        }
        if (request.containsKey("stock") && request.get("stock") != null) {
            Object stockValue = request.get("stock");
            if (stockValue instanceof Number) {
                produit.setStock(((Number) stockValue).intValue());
            } else {
                String stockStr = stockValue instanceof String 
                    ? ((String) stockValue).trim() 
                    : stockValue.toString().trim();
                if (stockStr.isEmpty()) {
                    log.warn("WARN: stock value is empty, setting to 0");
                    produit.setStock(0);
                } else {
                    try {
                        produit.setStock(Integer.parseInt(stockStr));
                    } catch (NumberFormatException e) {
                        log.error("ERROR: Failed to parse stock. Value='{}', class={}", stockStr, stockValue.getClass().getName(), e);
                        throw new IllegalArgumentException("Invalid stock value: " + stockStr + ". Must be a valid integer.");
                    }
                }
            }
        }
        if (request.containsKey("alertThreshold") && request.get("alertThreshold") != null) {
            Object alertValue = request.get("alertThreshold");
            if (alertValue instanceof Number) {
                produit.setAlertThreshold(((Number) alertValue).intValue());
            } else {
                String alertStr = alertValue instanceof String 
                    ? ((String) alertValue).trim() 
                    : alertValue.toString().trim();
                if (alertStr.isEmpty()) {
                    log.warn("WARN: alertThreshold value is empty, setting to 0");
                    produit.setAlertThreshold(0);
                } else {
                    try {
                        produit.setAlertThreshold(Integer.parseInt(alertStr));
                    } catch (NumberFormatException e) {
                        log.error("ERROR: Failed to parse alertThreshold. Value='{}', class={}", alertStr, alertValue.getClass().getName(), e);
                        throw new IllegalArgumentException("Invalid alertThreshold value: " + alertStr + ". Must be a valid integer.");
                    }
                }
            }
        }
        if (request.containsKey("unit")) {
            String unit = (String) request.get("unit");
            produit.setUnit(unit != null && !unit.isBlank() ? unit : "pcs");
        }
        
        jdbcRepository.updateProduit(
            produit.getId(),
            produit.getReference(),
            produit.getName(),
            produit.getCategory(),
            produit.getPrice(),
            produit.getStock(),
            produit.getAlertThreshold(),
            produit.getUnit()
        );
        
        return jdbcRepository.findProduitById(id);
    }

    @Transactional
    public void deleteProduit(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Product ID cannot be null");
        }
        ProduitDto produit = jdbcRepository.findProduitById(id);
        if (produit == null) {
            throw new IllegalArgumentException("Produit non trouvé: " + id);
        }
        jdbcRepository.deleteProduit(id);
    }
}
