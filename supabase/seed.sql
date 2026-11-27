-- Demo dataset for SME Order Desk: a small Yaoundé / Bafoussam trading shop.
-- Run after 0001_init_order_desk_schema.sql. Safe to re-run (on conflict do nothing).
insert into public.businesses (id, name, country, currency, whatsapp_number, momo_mtn_number, momo_orange_number)
values ('11111111-1111-1111-1111-111111111111','Mami Ngono Boutique','CM','XAF','+237670000001','+237670000001','+237690000002')
on conflict (id) do nothing;

insert into public.customers (id, owner_id, name, phone, whatsapp_handle, momo_provider, momo_number, zone, notes) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Clarisse Mbah','+237671234567','Clarisse M','mtn_momo','+237671234567','Mvog-Mbi, Yaoundé','Habituée, commande chaque samedi'),
 ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Tonton Pascal','+237680112233','Pascal Dla','mtn_momo','+237680112233','Bonabéri, Douala','Paie souvent en différé'),
 ('aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Aïcha Bouba','+237691223344','Aicha B','orange_money','+237691223344','Mokolo, Yaoundé','Achète en gros pour revente'),
 ('aaaaaaaa-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Eric Fotso','+237655998877','Eric F','mtn_momo','+237655998877','Biyem-Assi, Yaoundé','Prend souvent à crédit'),
 ('aaaaaaaa-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Grace Nfor','+237677445566','Grace N','orange_money','+237677445566','Bafoussam Centre',null)
on conflict (id) do nothing;

insert into public.products (id, owner_id, name, sku, unit, unit_price_fcfa, stock_qty, low_stock_threshold) values
 ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Riz parfumé 25kg','RIZ25','sac',13500,40,10),
 ('bbbbbbbb-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Huile végétale 5L','HUI5','bidon',6500,25,8),
 ('bbbbbbbb-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Savon de ménage (carton de 12)','SAV12','carton',9000,8,10),
 ('bbbbbbbb-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Sucre en poudre 1kg','SUC1','paquet',900,60,20),
 ('bbbbbbbb-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Lait en poudre 400g','LAI400','boite',2500,30,10),
 ('bbbbbbbb-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Eau minérale 10L','EAU10','bidon',1500,50,15)
on conflict (id) do nothing;

insert into public.orders (id, owner_id, customer_id, channel, status, delivery_fee_fcfa, delivery_zone, ordered_at, raw_message) values
 ('cccccccc-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','whatsapp','delivered',1000,'Mvog-Mbi, Yaoundé', now() - interval '3 days', E'Clarisse: Bonjour mami, je veux 1 riz 25kg et 2 sucre svp\nMami: Ok, livraison Mvog-Mbi'),
 ('cccccccc-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000002','whatsapp','out_for_delivery',1500,'Bonabéri, Douala', now() - interval '2 days','Pascal: envoie 2 bidons huile + 1 carton savon a Bonaberi'),
 ('cccccccc-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000003','whatsapp','confirmed',0,NULL, now() - interval '1 day','Aicha: 10 sucre et 4 eau 10L, je passe recuperer'),
 ('cccccccc-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000004','whatsapp','new',1000,'Biyem-Assi, Yaoundé', now() - interval '5 hours','Eric: 3 lait en poudre, je paie la semaine prochaine'),
 ('cccccccc-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000005','whatsapp','delivered',2000,'Bafoussam Centre', now() - interval '6 days','Grace: 2 sacs riz + 1 huile 5L')
on conflict (id) do nothing;

insert into public.order_items (id, owner_id, order_id, product_id, name_snapshot, qty, unit_price_fcfa) values
 ('dddddddd-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','Riz parfumé 25kg',1,13500),
 ('dddddddd-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000004','Sucre en poudre 1kg',2,900),
 ('dddddddd-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','Huile végétale 5L',2,6500),
 ('dddddddd-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000003','Savon de ménage (carton de 12)',1,9000),
 ('dddddddd-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000004','Sucre en poudre 1kg',10,900),
 ('dddddddd-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000006','Eau minérale 10L',4,1500),
 ('dddddddd-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000004','bbbbbbbb-0000-0000-0000-000000000005','Lait en poudre 400g',3,2500),
 ('dddddddd-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000005','bbbbbbbb-0000-0000-0000-000000000001','Riz parfumé 25kg',2,13500),
 ('dddddddd-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000005','bbbbbbbb-0000-0000-0000-000000000002','Huile végétale 5L',1,6500)
on conflict (id) do nothing;

insert into public.payments (id, owner_id, order_id, customer_id, amount_fcfa, provider, momo_reference, momo_number, status, raw_sms, paid_at) values
 ('eeeeeeee-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',16300,'mtn_momo','MP241101.0001','+237671234567','confirmed','Vous avez recu 16 300 FCFA de Clarisse Mbah. Ref MP241101.0001. Solde: 45 000 FCFA.', now() - interval '3 days'),
 ('eeeeeeee-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002',23500,'mtn_momo','MP241102.0002','+237680112233','pending','Transfert de 23 500 FCFA vers Mami Ngono Boutique en attente de confirmation. Ref MP241102.0002.', now() - interval '2 days'),
 ('eeeeeeee-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002',23500,'mtn_momo','MP241102.0003','+237680112233','failed','Echec du transfert: numero du beneficiaire invalide. Ref MP241102.0003.', now() - interval '2 days'),
 ('eeeeeeee-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000003',10000,'orange_money','OM241103.0004','+237691223344','confirmed','Vous avez recu 10 000 FCFA via Orange Money. Ref OM241103.0004.', now() - interval '1 day'),
 ('eeeeeeee-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000003',2500,'orange_money','OM241103.0005','+237691223344','confirmed','Vous avez recu 2 500 FCFA via Orange Money. Ref OM241103.0005.', now() - interval '20 hours'),
 ('eeeeeeee-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000004',4000,'cash',NULL,NULL,'confirmed','Especes remises en main propre.', now() - interval '4 hours'),
 ('eeeeeeee-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000005',35500,'mtn_momo','MP241027.0006','+237677445566','confirmed','Vous avez recu 35 500 FCFA de Grace Nfor. Ref MP241027.0006.', now() - interval '6 days')
on conflict (id) do nothing;

insert into public.credit_ledger (id, owner_id, customer_id, order_id, entry_type, amount_fcfa, note, created_at) values
 ('ffffffff-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000003','debit',5000,'Reste a payer commande ORD-0003', now() - interval '1 day'),
 ('ffffffff-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000004','debit',8500,'Vente a credit commande ORD-0004', now() - interval '5 hours'),
 ('ffffffff-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000004',NULL,'credit',4000,'Remboursement partiel en especes', now() - interval '4 hours'),
 ('ffffffff-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000003',NULL,'credit',2500,'Remboursement partiel Orange Money OM241103.0005', now() - interval '20 hours')
on conflict (id) do nothing;
