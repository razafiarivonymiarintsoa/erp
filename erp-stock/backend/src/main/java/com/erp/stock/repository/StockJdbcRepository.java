package com.erp.stock.repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import com.erp.stock.dto.EntrepotDto;
import com.erp.stock.dto.ProduitDto;
import com.erp.stock.dto.StockDto.MovementView;
import com.erp.stock.dto.StockDto.StockView;

@Repository
public class StockJdbcRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public StockJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ── add_stock ───────────────────────
    public void addStock(Long productId, Long warehouseId, Integer quantity, String note) {
        // Check if product exists
        Integer prodCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM produit WHERE id = ?", Integer.class, productId);
        if (prodCount == null || prodCount == 0) {
            throw new RuntimeException("Produit introuvable.");
        }
        // Check if warehouse exists
        Integer entCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM entrepot WHERE id = ?", Integer.class, warehouseId);
        if (entCount == null || entCount == 0) {
            throw new RuntimeException("Entrepôt introuvable.");
        }
        if (quantity <= 0) {
            throw new RuntimeException("La quantité doit être strictement positive.");
        }
        
        // Update or insert stock
        Integer existing = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM stock WHERE product_id = ? AND warehouse_id = ?", 
            Integer.class, productId, warehouseId);
        
        if (existing != null && existing > 0) {
            jdbcTemplate.update("UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?", 
                quantity, productId, warehouseId);
        } else {
            jdbcTemplate.update("INSERT INTO stock(product_id, warehouse_id, quantity) VALUES(?, ?, ?)", 
                productId, warehouseId, quantity);
        }
        
        // Record movement
        jdbcTemplate.update(
            "INSERT INTO mouvement_stock(product_id, warehouse_id, type, quantity, note) VALUES(?, ?, 'ENTREE', ?, ?)",
            productId, warehouseId, quantity, note);
    }

    // ── remove_stock ────────────────────
    public void removeStock(Long productId, Long warehouseId, Integer quantity, String note) {
        if (quantity <= 0) {
            throw new RuntimeException("La quantité doit être strictement positive.");
        }
        Integer currentQty = jdbcTemplate.queryForObject(
            "SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?", 
            Integer.class, productId, warehouseId);
        if (currentQty == null) {
            throw new RuntimeException("Aucun stock pour ce produit dans cet entrepôt.");
        }
        if (currentQty < quantity) {
            throw new RuntimeException("Stock insuffisant.");
        }
        jdbcTemplate.update("UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?", 
            quantity, productId, warehouseId);
        jdbcTemplate.update(
            "INSERT INTO mouvement_stock(product_id, warehouse_id, type, quantity, note) VALUES(?, ?, 'SORTIE', ?, ?)",
            productId, warehouseId, quantity, note);
    }

    // ── transfer_stock ──────────────────
    public void transferStock(Long productId, Long fromWarehouse, Long toWarehouse, Integer quantity, String note) {
        if (quantity <= 0) {
            throw new RuntimeException("La quantité doit être strictement positive.");
        }
        if (fromWarehouse.equals(toWarehouse)) {
            throw new RuntimeException("Les entrepôts doivent être différents.");
        }
        Integer fromQty = jdbcTemplate.queryForObject(
            "SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?", 
            Integer.class, productId, fromWarehouse);
        if (fromQty == null || fromQty < quantity) {
            throw new RuntimeException("Stock source insuffisant.");
        }

        jdbcTemplate.update("UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?", 
            quantity, productId, fromWarehouse);

        Integer existing = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM stock WHERE product_id = ? AND warehouse_id = ?", 
            Integer.class, productId, toWarehouse);
        
        if (existing != null && existing > 0) {
            jdbcTemplate.update("UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?", 
                quantity, productId, toWarehouse);
        } else {
            jdbcTemplate.update("INSERT INTO stock(product_id, warehouse_id, quantity) VALUES(?, ?, ?)", 
                productId, toWarehouse, quantity);
        }

        jdbcTemplate.update(
            "INSERT INTO mouvement_stock(product_id, warehouse_id, type, quantity, note) VALUES(?, ?, 'TRANSFERT_SORTANT', ?, ?)",
            productId, fromWarehouse, quantity, note);
        jdbcTemplate.update(
            "INSERT INTO mouvement_stock(product_id, warehouse_id, type, quantity, note) VALUES(?, ?, 'TRANSFERT_ENTRANT', ?, ?)",
            productId, toWarehouse, quantity, note);
    }

    // ── get_stock (par produit) ─────────────────────
    public List<StockView> getStockByProduct(Long productId) {
        String sql = "SELECT s.id AS stock_id, p.id AS product_id, p.name AS product_name, p.price AS product_price, " +
                     "e.id AS warehouse_id, e.name AS warehouse_name, e.location AS warehouse_location, " +
                     "s.quantity, p.alert_threshold, s.updated_at " +
                     "FROM stock s " +
                     "JOIN produit p ON p.id = s.product_id " +
                     "JOIN entrepot e ON e.id = s.warehouse_id " +
                     "WHERE s.product_id = ? " +
                     "ORDER BY e.name";
        return jdbcTemplate.query(sql, new StockRowMapper(), productId);
    }

    // ── get_all_stock ─────────────────────
    public List<StockView> getAllStock(Long warehouseId) {
        if (warehouseId != null) {
            String sql = "SELECT s.id AS stock_id, p.id AS product_id, p.name AS product_name, p.price AS product_price, " +
                         "e.id AS warehouse_id, e.name AS warehouse_name, e.location AS warehouse_location, " +
                         "s.quantity, p.alert_threshold, s.updated_at " +
                         "FROM stock s " +
                         "JOIN produit p ON p.id = s.product_id " +
                         "JOIN entrepot e ON e.id = s.warehouse_id " +
                         "WHERE s.warehouse_id = ? " +
                         "ORDER BY p.name, e.name";
            return jdbcTemplate.query(sql, new StockRowMapper(), warehouseId);
        } else {
            String sql = "SELECT s.id AS stock_id, p.id AS product_id, p.name AS product_name, p.price AS product_price, " +
                         "e.id AS warehouse_id, e.name AS warehouse_name, e.location AS warehouse_location, " +
                         "s.quantity, p.alert_threshold, s.updated_at " +
                         "FROM stock s " +
                         "JOIN produit p ON p.id = s.product_id " +
                         "JOIN entrepot e ON e.id = s.warehouse_id " +
                         "ORDER BY p.name, e.name";
            return jdbcTemplate.query(sql, new StockRowMapper());
        }
    }

    // ── get_movements ─────────────────────────
    public List<MovementView> getMovements(Long productId) {
        if (productId != null) {
            String sql = "SELECT m.id AS movement_id, p.id AS product_id, p.name AS product_name, " +
                         "e.id AS warehouse_id, e.name AS warehouse_name, m.type, m.quantity, " +
                         "m.movement_date, m.note " +
                         "FROM mouvement_stock m " +
                         "JOIN produit p ON p.id = m.product_id " +
                         "JOIN entrepot e ON e.id = m.warehouse_id " +
                         "WHERE m.product_id = ? " +
                         "ORDER BY m.movement_date DESC";
            return jdbcTemplate.query(sql, new MovementRowMapper(), productId);
        } else {
            String sql = "SELECT m.id AS movement_id, p.id AS product_id, p.name AS product_name, " +
                         "e.id AS warehouse_id, e.name AS warehouse_name, m.type, m.quantity, " +
                         "m.movement_date, m.note " +
                         "FROM mouvement_stock m " +
                         "JOIN produit p ON p.id = m.product_id " +
                         "JOIN entrepot e ON e.id = m.warehouse_id " +
                         "ORDER BY m.movement_date DESC";
            return jdbcTemplate.query(sql, new MovementRowMapper());
        }
    }

    // ── RowMappers ─────────────────────────────────────────────────
    private static class StockRowMapper implements RowMapper<StockView> {
        @Override
        public StockView mapRow(ResultSet rs, int rowNum) throws SQLException {
            return StockView.builder()
                    .stockId(rs.getLong("stock_id"))
                    .productId(rs.getLong("product_id"))
                    .productName(rs.getString("product_name"))
                    .productPrice(rs.getBigDecimal("product_price"))
                    .warehouseId(rs.getLong("warehouse_id"))
                    .warehouseName(rs.getString("warehouse_name"))
                    .warehouseLocation(rs.getString("warehouse_location"))
                    .quantity(rs.getInt("quantity"))
                    .alertThreshold(rs.getInt("alert_threshold"))
                    .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                    .build();
        }
    }

    private static class MovementRowMapper implements RowMapper<MovementView> {
        @Override
        public MovementView mapRow(ResultSet rs, int rowNum) throws SQLException {
            return MovementView.builder()
                    .movementId(rs.getLong("movement_id"))
                    .productId(rs.getLong("product_id"))
                    .productName(rs.getString("product_name"))
                    .warehouseId(rs.getLong("warehouse_id"))
                    .warehouseName(rs.getString("warehouse_name"))
                    .type(rs.getString("type"))
                    .quantity(rs.getInt("quantity"))
                    .movementDate(rs.getTimestamp("movement_date") != null ? rs.getTimestamp("movement_date").toLocalDateTime() : null)
                    .note(rs.getString("note"))
                    .build();
        }
    }

    // ── CRUD Produit ────────────────────────
    public List<ProduitDto> findAllProduits() {
        String sql = "SELECT id, reference, name, category, price, stock, alert_threshold, unit, created_at FROM produit ORDER BY name";
        return jdbcTemplate.query(sql, new ProduitRowMapper());
    }

    public ProduitDto findProduitById(Long id) {
        String sql = "SELECT id, reference, name, category, price, stock, alert_threshold, unit, created_at FROM produit WHERE id = ?";
        List<ProduitDto> results = jdbcTemplate.query(sql, new ProduitRowMapper(), id);
        return results.isEmpty() ? null : results.get(0);
    }

    public Long createProduit(String reference, String name, String category, BigDecimal price, Integer stock, Integer alertThreshold, String unit) {
        String sql = "INSERT INTO produit (reference, name, category, price, stock, alert_threshold, unit) VALUES (?, ?, ?, ?, ?, ?, ?)";
        jdbcTemplate.update(sql, reference, name, category, price, stock, alertThreshold, unit);
        return jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    public void updateProduit(Long id, String reference, String name, String category, BigDecimal price, Integer stock, Integer alertThreshold, String unit) {
        String sql = "UPDATE produit SET reference = ?, name = ?, category = ?, price = ?, stock = ?, alert_threshold = ?, unit = ? WHERE id = ?";
        jdbcTemplate.update(sql, reference, name, category, price, stock, alertThreshold, unit, id);
    }

    public void deleteProduit(Long id) {
        String sql = "DELETE FROM produit WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public List<ProduitDto> searchProduits(String query) {
        String sql = "SELECT id, reference, name, category, price, stock, alert_threshold, unit, created_at FROM produit WHERE name LIKE ? ORDER BY name";
        return jdbcTemplate.query(sql, new ProduitRowMapper(), "%" + query + "%");
    }

    private static class ProduitRowMapper implements RowMapper<ProduitDto> {
        @Override
        public ProduitDto mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new ProduitDto(
                rs.getLong("id"),
                rs.getString("reference"),
                rs.getString("name"),
                rs.getString("category"),
                rs.getBigDecimal("price"),
                rs.getInt("stock"),
                rs.getInt("alert_threshold"),
                rs.getString("unit"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null
            );
        }
    }

    // ── CRUD Entrepot ─────────────────────────────────────
    public List<EntrepotDto> findAllEntrepots() {
        String sql = "SELECT id, name, location, created_at FROM entrepot ORDER BY name";
        return jdbcTemplate.query(sql, new EntrepotRowMapper());
    }

    private static class EntrepotRowMapper implements RowMapper<EntrepotDto> {
        @Override
        public EntrepotDto mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new EntrepotDto(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("location"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null
            );
        }
    }

    // ── Dashboard ─────────────────────────────────────────
    public Long countProduits() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM produit", Long.class);
    }

    public Long countEntrepots() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM entrepot", Long.class);
    }

    // ── Create Entrepot ─────────────────────────────────────
    public EntrepotDto createEntrepot(EntrepotDto entrepot) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                "INSERT INTO entrepot (name, location) VALUES (?, ?)",
                Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, entrepot.getName());
            ps.setString(2, entrepot.getLocation());
            return ps;
        }, keyHolder);
        
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to retrieve generated ID for entrepot");
        }
        Long generatedId = key.longValue();
        entrepot.setId(generatedId);
        return entrepot;
    }

    // ── Update Entrepot ─────────────────────────────────────
    public EntrepotDto updateEntrepot(EntrepotDto entrepot) {
        int rowsAffected = jdbcTemplate.update(
            "UPDATE entrepot SET name = ?, location = ? WHERE id = ?",
            entrepot.getName(),
            entrepot.getLocation(),
            entrepot.getId()
        );
        if (rowsAffected == 0) {
            throw new RuntimeException("Entrepôt non trouvé avec l'ID: " + entrepot.getId());
        }
        return entrepot;
    }

    // ── Delete Entrepot ─────────────────────────────────────
    public void deleteEntrepot(Long id) {
        // Check if warehouse has stock
        Integer stockCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM stock WHERE warehouse_id = ?", Integer.class, id
        );
        if (stockCount != null && stockCount > 0) {
            throw new RuntimeException("Impossible de supprimer l'entrepôt: il contient du stock.");
        }
        
        int rowsAffected = jdbcTemplate.update("DELETE FROM entrepot WHERE id = ?", id);
        if (rowsAffected == 0) {
            throw new RuntimeException("Entrepôt non trouvé avec l'ID: " + id);
        }
    }

    // ── Get Entrepot by ID ─────────────────────────────────────
    public EntrepotDto findEntrepotById(Long id) {
        String sql = "SELECT id, name, location, created_at FROM entrepot WHERE id = ?";
        List<EntrepotDto> results = jdbcTemplate.query(sql, new EntrepotRowMapper(), id);
        return results.isEmpty() ? null : results.get(0);
    }

    public Long countStockLines() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM stock", Long.class);
    }

    public Long sumTotalQuantity() {
        Long result = jdbcTemplate.queryForObject("SELECT COALESCE(SUM(quantity), 0) FROM stock", Long.class);
        return result != null ? result : 0L;
    }
}
