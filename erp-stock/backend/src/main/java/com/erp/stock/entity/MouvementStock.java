package com.erp.stock.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mouvement_stock")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MouvementStock {

    public enum Type { ENTREE, SORTIE, TRANSFERT_ENTRANT, TRANSFERT_SORTANT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Produit produit;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Entrepot entrepot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "movement_date")
    private LocalDateTime movementDate;

    private String note;
}
