-- Add second finishing floor FF-02
INSERT INTO floors (id, factory_id, name, floor_index)
VALUES ('f2000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FF-02', 6);

-- Add 4 finishing lines to FF-02
INSERT INTO lines (floor_id, line_number, type, operator_count, helper_count, machine_count)
VALUES 
  ('f2000000-0000-0000-0000-000000000002', 5, 'finishing', 20, 5, 15),
  ('f2000000-0000-0000-0000-000000000002', 6, 'finishing', 20, 5, 15),
  ('f2000000-0000-0000-0000-000000000002', 7, 'finishing', 20, 5, 15),
  ('f2000000-0000-0000-0000-000000000002', 8, 'finishing', 20, 5, 15);