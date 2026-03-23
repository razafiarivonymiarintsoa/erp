package com.erp.stock.controller;

import com.erp.stock.dto.EntrepotDto;
import com.erp.stock.dto.ProduitDto;
import com.erp.stock.dto.StockDto;
import com.erp.stock.service.StockService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stock")
@CrossOrigin(origins = "*")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    // ── Opérations Stock ─────────────────────────────────────────

    @PostMapping("/add")
    public ResponseEntity<Map<String, String>> addStock(@Valid @RequestBody StockDto.AddRequest req) {
        stockService.addStock(req);
        return ResponseEntity.ok(Map.of("message", "Stock ajouté avec succès."));
    }

    @PostMapping("/remove")
    public ResponseEntity<Map<String, String>> removeStock(@Valid @RequestBody StockDto.RemoveRequest req) {
        stockService.removeStock(req);
        return ResponseEntity.ok(Map.of("message", "Stock retiré avec succès."));
    }

    @PostMapping("/transfer")
    public ResponseEntity<Map<String, String>> transferStock(@Valid @RequestBody StockDto.TransferRequest req) {
        stockService.transferStock(req);
        return ResponseEntity.ok(Map.of("message", "Transfert effectué avec succès."));
    }

    // ── Lectures Stock ───────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<StockDto.StockView>> getAllStock(
            @RequestParam(required = false) Long warehouseId) {
        return ResponseEntity.ok(stockService.getAllStock(warehouseId));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<List<StockDto.StockView>> getStockByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(stockService.getStockByProduct(productId));
    }

    @GetMapping("/movements/{productId}")
    public ResponseEntity<List<StockDto.MovementView>> getMovementsByProduct(
            @PathVariable Long productId) {
        return ResponseEntity.ok(stockService.getMovements(productId));
    }

    @GetMapping("/movements")
    public ResponseEntity<List<StockDto.MovementView>> getAllMovements() {
        return ResponseEntity.ok(stockService.getMovements(null));
    }

    // ── Dashboard ────────────────────────────────────────────────

    @GetMapping("/dashboard")
    public ResponseEntity<StockDto.DashboardView> getDashboard() {
        return ResponseEntity.ok(stockService.getDashboard());
    }

    // ── Produits & Entrepôts ─────────────────────────────────────

    @GetMapping("/produits")
    public ResponseEntity<List<ProduitDto>> getProduits(
            @RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(stockService.searchProduits(search));
        }
        return ResponseEntity.ok(stockService.getAllProduits());
    }

    @PostMapping("/produits")
    public ResponseEntity<ProduitDto> createProduit(@Valid @RequestBody Map<String, Object> request) {
        ProduitDto produit = stockService.createProduit(request);
        return ResponseEntity.ok(produit);
    }

    @PutMapping("/produits/{id}")
    public ResponseEntity<ProduitDto> updateProduit(
            @PathVariable Long id, 
            @Valid @RequestBody Map<String, Object> request) {
        ProduitDto produit = stockService.updateProduit(id, request);
        return ResponseEntity.ok(produit);
    }

    @DeleteMapping("/produits/{id}")
    public ResponseEntity<Map<String, String>> deleteProduit(@PathVariable Long id) {
        stockService.deleteProduit(id);
        return ResponseEntity.ok(Map.of("message", "Produit supprimé avec succès."));
    }

    @GetMapping("/entrepots")
    public ResponseEntity<List<EntrepotDto>> getEntrepots() {
        return ResponseEntity.ok(stockService.getAllEntrepots());
    }

    // ── CRUD Entrepôts ─────────────────────────────────────────

    @PostMapping("/entrepots")
    public ResponseEntity<EntrepotDto> createEntrepot(@Valid @RequestBody Map<String, Object> request) {
        EntrepotDto entrepot = stockService.createEntrepot(request);
        return ResponseEntity.ok(entrepot);
    }

    @PutMapping("/entrepots/{id}")
    public ResponseEntity<EntrepotDto> updateEntrepot(
            @PathVariable Long id, 
            @Valid @RequestBody Map<String, Object> request) {
        EntrepotDto entrepot = stockService.updateEntrepot(id, request);
        return ResponseEntity.ok(entrepot);
    }

    @DeleteMapping("/entrepots/{id}")
    public ResponseEntity<Map<String, String>> deleteEntrepot(@PathVariable Long id) {
        stockService.deleteEntrepot(id);
        return ResponseEntity.ok(Map.of("message", "Entrepôt supprimé avec succès."));
    }
}
