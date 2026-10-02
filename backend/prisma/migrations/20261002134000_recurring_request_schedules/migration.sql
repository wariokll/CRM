CREATE TABLE `recurring_request_schedules` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `store_id` INTEGER NULL,
  `organization_id` INTEGER NULL,
  `created_by_user_id` INTEGER NULL,
  `type_id` INTEGER NOT NULL,
  `department_id` INTEGER NOT NULL,
  `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
  `description` TEXT NOT NULL,
  `template_data` JSON NULL,
  `assignee_user_id` INTEGER NULL,
  `interval_days` INTEGER NOT NULL,
  `next_scheduled_at` DATETIME(3) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_by_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `recurring_request_schedules_is_active_next_scheduled_at_idx` (`is_active`, `next_scheduled_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `requests` ADD COLUMN `recurrence_schedule_id` INTEGER NULL;
CREATE INDEX `requests_recurrence_schedule_id_idx` ON `requests`(`recurrence_schedule_id`);
ALTER TABLE `requests` ADD CONSTRAINT `requests_recurrence_schedule_id_fkey` FOREIGN KEY (`recurrence_schedule_id`) REFERENCES `recurring_request_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
