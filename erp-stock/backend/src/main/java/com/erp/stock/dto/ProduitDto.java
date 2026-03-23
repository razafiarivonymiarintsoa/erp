package com.erp.stock.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProduitDto {
    private Long id;
    private String reference;
    private String name;
    private String category;
    private BigDecimal price;
    private Integer stock;
    private Integer alertThreshold;
    private String unit;
    private LocalDateTime createdAt;

    public ProduitDto() {}

    public ProduitDto(Long id, String reference, String name, String category, 
                      BigDecimal price, Integer stock, Integer alertThreshold, 
                      String unit, LocalDateTime createdAt) {
        this.id = id;
        this.reference = reference;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stock = stock;
        this.alertThreshold = alertThreshold;
        this.unit = unit;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    
    public Integer getAlertThreshold() { return alertThreshold; }
    public void setAlertThreshold(Integer alertThreshold) { this.alertThreshold = alertThreshold; }
    
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
