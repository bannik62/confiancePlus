-- Pool minimal pour GET /habits/daily-offer (évite eligible:false / reason:no_templates sans dépendre du seed).
-- Ne s’applique que si la table est encore vide (seed ou données existantes inchangés).
INSERT INTO "DailyHabitTemplate" ("id", "title", "icon", "xpTotal", "sortOrder", "isActive", "createdAt")
SELECT x.id, x.title, x.icon, x.xp, x.ord, true, NOW()
FROM (
  VALUES
    ('dht_mig_01', '15 minutes de marche', '🚶', 15, 0),
    ('dht_mig_02', 'Boire un grand verre d''eau', '💧', 15, 1),
    ('dht_mig_03', '1 h sans réseaux sociaux', '📵', 15, 2),
    ('dht_mig_04', '5 minutes de respiration', '🧘', 15, 3),
    ('dht_mig_05', 'Noter 3 gratitudes', '📝', 15, 4),
    ('dht_mig_06', 'Un repas équilibré', '🥗', 15, 5),
    ('dht_mig_07', 'Se coucher à l''heure prévue', '😴', 15, 6),
    ('dht_mig_08', '10 minutes de rangement', '🧹', 15, 7),
    ('dht_mig_09', '10 minutes de lumière naturelle', '☀️', 15, 8),
    ('dht_mig_10', 'Lire 20 pages', '📖', 15, 9)
) AS x(id, title, icon, xp, ord)
WHERE NOT EXISTS (SELECT 1 FROM "DailyHabitTemplate" LIMIT 1);
