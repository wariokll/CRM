ALTER TABLE `request_types` ADD COLUMN `requires_components` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `requests` ADD COLUMN `components_data` JSON NULL;
ALTER TABLE `recurring_request_schedules` ADD COLUMN `components_data` JSON NULL;
