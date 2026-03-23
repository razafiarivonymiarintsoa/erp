package com.erp.stock.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "produit")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Produit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50)
    private String reference;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 100)
    private String category;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stock;

    @Column(name = "alert_threshold")
    private Integer alertThreshold;

    @Column(length = 20)
    private String unit;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { 
        this.createdAt = LocalDateTime.now();
        if (this.category == null || this.category.isBlank()) {
            this.category = "Général";
        }
        if (this.stock == null) {
            this.stock = 0;
        }
        if (this.alertThreshold == null) {
            this.alertThreshold = 10;
        }
        if (this.unit == null || this.unit.isBlank()) {
            this.unit = "pcs";
        }
    }
}

