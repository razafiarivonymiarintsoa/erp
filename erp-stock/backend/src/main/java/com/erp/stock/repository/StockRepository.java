package com.erp.stock.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.erp.stock.entity.Stock;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {
    long countByProduitId(Long productId);
    List<Stock> findByProduitId(Long productId);
    List<Stock> findByEntrepotId(Long entrepotId);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT SUM(quantity) FROM stock",
        nativeQuery = true
    )
    Long sumTotalQuantity();
}
