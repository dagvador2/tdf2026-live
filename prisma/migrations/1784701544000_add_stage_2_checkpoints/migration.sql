INSERT INTO checkpoints (id, stage_id, name, type, latitude, longitude, radius_m, "order", km_from_start, elevation, created_at)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM stages WHERE number = 2), 'Inter 1', 'sprint'::"CheckpointType", 45.34751848317683, 5.183329442515969, 80, 2, 8.15, 344, NOW()),
  (gen_random_uuid()::text, (SELECT id FROM stages WHERE number = 2), 'Inter 2', 'sprint'::"CheckpointType", 45.34817193634808, 5.09455201216042, 80, 3, 16.37, 348, NOW()),
  (gen_random_uuid()::text, (SELECT id FROM stages WHERE number = 2), 'Inter 3', 'sprint'::"CheckpointType", 45.39508217945695, 5.124714290723205, 80, 4, 22.30, 352, NOW());
