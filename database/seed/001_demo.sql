-- Semua baris ditandai is_demo = true.
INSERT INTO suppliers (name, phone, is_demo) VALUES ('Toko Bahan Makassar', '0411000000', true);
-- avg_cost_milli = Rp per satuan x 1000 (kopi Rp180/gram = 180000)
INSERT INTO ingredients (name, unit, stock_qty, min_qty, avg_cost_milli, is_demo) VALUES
 ('Biji Kopi','gram',5000,1000,180000,true), ('Susu','ml',10000,2000,18000,true),
 ('Gula Aren','ml',3000,500,30000,true), ('Es Batu','gram',20000,3000,5000,true), ('Gelas Plastik','pcs',200,50,700000,true);
INSERT INTO menus (name, category, price, is_demo) VALUES
 ('Es Kopi Susu','Coffee',22000,true), ('Americano','Coffee',18000,true), ('Kentang Goreng','Snack',15000,true);
INSERT INTO recipes (menu_id, ingredient_id, qty)
 SELECT m.id, i.id, v.q FROM (VALUES ('Biji Kopi',18),('Susu',120),('Gula Aren',25),('Es Batu',150),('Gelas Plastik',1)) v(n,q)
 JOIN ingredients i ON i.name=v.n AND i.is_demo JOIN menus m ON m.name='Es Kopi Susu' AND m.is_demo;
