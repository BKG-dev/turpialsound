-- Set default inventory=1 for all existing listings without inventory
UPDATE mp_listings SET inventory = 1 WHERE inventory IS NULL;
