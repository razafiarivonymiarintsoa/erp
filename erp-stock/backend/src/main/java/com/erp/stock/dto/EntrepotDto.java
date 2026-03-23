package com.erp.stock.dto;

import java.time.LocalDateTime;

public class EntrepotDto {
    private Long id;
    private String name;
    private String location;
    private LocalDateTime createdAt;

    public EntrepotDto() {}

    public EntrepotDto(Long id, String name, String location, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
