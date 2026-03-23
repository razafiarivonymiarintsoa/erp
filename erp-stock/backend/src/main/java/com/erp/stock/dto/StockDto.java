package com.erp.stock.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// ─── Requests ───────────────────────────────────────────────

public class StockDto {

    @Getter @Setter
    public static class AddRequest {
        @NotNull Long productId;
        @NotNull Long warehouseId;
        @NotNull @Positive Integer quantity;
        String note;
    }

    @Getter @Setter
    public static class RemoveRequest {
        @NotNull Long productId;
        @NotNull Long warehouseId;
        @NotNull @Positive Integer quantity;
        String note;
    }

    @Getter @Setter
    public static class TransferRequest {
        @NotNull Long productId;
        @NotNull Long fromWarehouseId;
        @NotNull Long toWarehouseId;
        @NotNull @Positive Integer quantity;
        String note;
    }

    // ─── Responses ──────────────────────────────────────────

    @Getter @Setter @Builder @AllArgsConstructor @NoArgsConstructor
    public static class StockView {
        Long stockId;
        Long productId;
        String productName;
        BigDecimal productPrice;
        Long warehouseId;
        String warehouseName;
        String warehouseLocation;
        Integer quantity;
        Integer alertThreshold;
        LocalDateTime updatedAt;
    }

    @Getter @Setter @Builder @AllArgsConstructor @NoArgsConstructor
    public static class MovementView {
        Long movementId;
        Long productId;
        String productName;
        Long warehouseId;
        String warehouseName;
        String type;
        Integer quantity;
        LocalDateTime movementDate;
        String note;
    }

    @Getter @Setter @Builder @AllArgsConstructor @NoArgsConstructor
    public static class DashboardView {
        Long totalProducts;
        Long totalWarehouses;
        Long totalStockLines;
        Long totalQuantity;
    }
}
