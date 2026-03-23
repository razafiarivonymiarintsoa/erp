-- Procédures stockées pour H2 (mode MySQL)
CREATE PROCEDURE sp_add_stock(IN p_product_id BIGINT, IN p_warehouse_id BIGINT, IN p_quantity INT, IN p_note VARCHAR(255))
BEGIN ATOMIC
  DECLARE prod_count INT;
  DECLARE ent_count INT;
  SET prod_count = (SELECT COUNT(*) FROM produit WHERE id = p_product_id);
  IF prod_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Produit introuvable.';
  END IF;
  SET ent_count = (SELECT COUNT(*) FROM entrepot WHERE id = p_warehouse_id);
  IF ent_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Entrepôt introuvable.';
  END IF;
  IF p_quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La quantité doit être strictement positive.';
  END IF;

  IF (SELECT COUNT(*) FROM stock WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id) > 0 THEN
    UPDATE stock SET quantity = quantity + p_quantity WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
  ELSE
    INSERT INTO stock(product_id, warehouse_id, quantity) VALUES(p_product_id, p_warehouse_id, p_quantity);
  END IF;

  INSERT INTO mouvement_stock(product_id, warehouse_id, type, quantity, note)
  VALUES(p_product_id, p_warehouse_id, 'ENTREE', p_quantity, p_note);
END;

CREATE PROCEDURE sp_remove_stock(IN p_product_id BIGINT, IN p_warehouse_id BIGINT, IN p_quantity INT, IN p_note VARCHAR(255))
BEGIN ATOMIC
  IF p_quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La quantité doit être strictement positive.';
  END IF;
  DECLARE current_qty INT;
  SET current_qty = (SELECT quantity FROM stock WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id);
  IF current_qty IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Aucun stock pour ce produit dans cet entrepôt.';
  END IF;
  IF current_qty < p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuffisant.';
  END IF;
  UPDATE stock SET quantity = quantity - p_quantity WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
  INSERT INTO mouvement_stock(product_id, warehouse_id, type, quantity, note)
  VALUES(p_product_id, p_warehouse_id, 'SORTIE', p_quantity, p_note);
END;

CREATE PROCEDURE sp_transfer_stock(IN p_product_id BIGINT, IN p_from_warehouse BIGINT, IN p_to_warehouse BIGINT, IN p_quantity INT, IN p_note VARCHAR(255))
BEGIN ATOMIC
  IF p_quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La quantité doit être strictement positive.';
  END IF;
  IF p_from_warehouse = p_to_warehouse THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Les entrepôts doivent être différents.';
  END IF;
  DECLARE from_qty INT;
  SET from_qty = (SELECT quantity FROM stock WHERE product_id = p_product_id AND warehouse_id = p_from_warehouse);
  IF from_qty IS NULL OR from_qty < p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock source insuffisant.';
  END IF;

  UPDATE stock SET quantity = quantity - p_quantity WHERE product_id = p_product_id AND warehouse_id = p_from_warehouse;

  IF (SELECT COUNT(*) FROM stock WHERE product_id = p_product_id AND warehouse_id = p_to_warehouse) > 0 THEN
    UPDATE stock SET quantity = quantity + p_quantity WHERE product_id = p_product_id AND warehouse_id = p_to_warehouse;
  ELSE
    INSERT INTO stock(product_id, warehouse_id, quantity) VALUES(p_product_id, p_to_warehouse, p_quantity);
  END IF;

  INSERT INTO mouvement_stock(product_id, warehouse_id, type, quantity, note) VALUES(p_product_id, p_from_warehouse, 'TRANSFERT_SORTANT', p_quantity, p_note);
  INSERT INTO mouvement_stock(product_id, warehouse_id, type, quantity, note) VALUES(p_product_id, p_to_warehouse, 'TRANSFERT_ENTRANT', p_quantity, p_note);
END;

CREATE PROCEDURE sp_get_stock_by_product(IN p_product_id BIGINT)
BEGIN ATOMIC
  SELECT s.id AS stock_id, p.id AS product_id, p.name AS product_name, p.price AS product_price,
         e.id AS warehouse_id, e.name AS warehouse_name, e.location AS warehouse_location,
         s.quantity, s.updated_at
    FROM stock s
    JOIN produit p ON p.id = s.product_id
    JOIN entrepot e ON e.id = s.warehouse_id
   WHERE s.product_id = p_product_id
   ORDER BY e.name;
END;

CREATE PROCEDURE sp_get_all_stock()
BEGIN ATOMIC
  SELECT s.id AS stock_id, p.id AS product_id, p.name AS product_name, p.price AS product_price,
         e.id AS warehouse_id, e.name AS warehouse_name, e.location AS warehouse_location,
         s.quantity, s.updated_at
    FROM stock s
    JOIN produit p ON p.id = s.product_id
    JOIN entrepot e ON e.id = s.warehouse_id
   ORDER BY p.name, e.name;
END;

CREATE PROCEDURE sp_get_all_stock_by_warehouse(IN p_warehouse_id BIGINT)
BEGIN ATOMIC
  SELECT s.id AS stock_id, p.id AS product_id, p.name AS product_name, p.price AS product_price,
         e.id AS warehouse_id, e.name AS warehouse_name, e.location AS warehouse_location,
         s.quantity, s.updated_at
    FROM stock s
    JOIN produit p ON p.id = s.product_id
    JOIN entrepot e ON e.id = s.warehouse_id
   WHERE s.warehouse_id = p_warehouse_id
   ORDER BY p.name, e.name;
END;

CREATE PROCEDURE sp_get_movements()
BEGIN ATOMIC
  SELECT m.id AS movement_id, p.id AS product_id, p.name AS product_name,
         e.id AS warehouse_id, e.name AS warehouse_name, m.type, m.quantity,
         m.movement_date, m.note
    FROM mouvement_stock m
    JOIN produit p ON p.id = m.product_id
    JOIN entrepot e ON e.id = m.warehouse_id
   ORDER BY m.movement_date DESC;
END;

CREATE PROCEDURE sp_get_movements_by_product(IN p_product_id BIGINT)
BEGIN ATOMIC
  SELECT m.id AS movement_id, p.id AS product_id, p.name AS product_name,
         e.id AS warehouse_id, e.name AS warehouse_name, m.type, m.quantity,
         m.movement_date, m.note
    FROM mouvement_stock m
    JOIN produit p ON p.id = m.product_id
    JOIN entrepot e ON e.id = m.warehouse_id
   WHERE m.product_id = p_product_id
   ORDER BY m.movement_date DESC;
END;
