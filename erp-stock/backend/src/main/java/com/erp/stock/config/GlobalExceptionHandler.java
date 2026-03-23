package com.erp.stock.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception ex) {
        String message = ex.getMessage();

        // Extraire le message SQL (procédure stockée)
        if (ex.getCause() instanceof SQLException sqlEx) {
            message = sqlEx.getMessage();
        } else if (ex instanceof org.springframework.dao.DataIntegrityViolationException) {
            message = "Violation de contrainte de données.";
        }

        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        if (message != null && (
                message.contains("insuffisant") ||
                message.contains("introuvable") ||
                message.contains("négatif") ||
                message.contains("positif") ||
                message.contains("différents"))) {
            status = HttpStatus.BAD_REQUEST;
        }

        return ResponseEntity.status(status).body(Map.of(
            "error",   message != null ? message : "Erreur interne.",
            "status",  status.value(),
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}
