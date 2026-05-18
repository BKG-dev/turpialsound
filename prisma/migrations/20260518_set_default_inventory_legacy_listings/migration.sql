-- Set default inventory=1 + hasInventory=true for all existing listings without inventory
UPDATE mp_listings SET inventory = 1, has_inventory = true WHERE inventory IS NULL;
