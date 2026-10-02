CREATE TABLE `boards` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `type` ENUM('PERSONAL', 'TEAM') NOT NULL,
  `owner_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  INDEX `boards_owner_id_type_deleted_at_idx` (`owner_id`, `type`, `deleted_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `boards_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `board_accesses` (
  `board_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  INDEX `board_accesses_user_id_idx` (`user_id`),
  PRIMARY KEY (`board_id`, `user_id`),
  CONSTRAINT `board_accesses_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `board_accesses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `board_columns` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `board_id` INTEGER NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `version` INTEGER NOT NULL DEFAULT 1,
  `deleted_at` DATETIME(3) NULL,
  INDEX `board_columns_board_id_deleted_at_position_idx` (`board_id`, `deleted_at`, `position`),
  PRIMARY KEY (`id`),
  CONSTRAINT `board_columns_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `board_cards` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `column_id` INTEGER NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `deadline` DATE NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `version` INTEGER NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  INDEX `board_cards_column_id_deleted_at_position_idx` (`column_id`, `deleted_at`, `position`),
  PRIMARY KEY (`id`),
  CONSTRAINT `board_cards_column_id_fkey` FOREIGN KEY (`column_id`) REFERENCES `board_columns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
