CREATE TABLE `components` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `components_name_key` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `request_type_components` (
  `request_type_id` INTEGER NOT NULL,
  `component_id` INTEGER NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  INDEX `request_type_components_component_id_idx` (`component_id`),
  PRIMARY KEY (`request_type_id`, `component_id`),
  CONSTRAINT `request_type_components_request_type_id_fkey` FOREIGN KEY (`request_type_id`) REFERENCES `request_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `request_type_components_component_id_fkey` FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
