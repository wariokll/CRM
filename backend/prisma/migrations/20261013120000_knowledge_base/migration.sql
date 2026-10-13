ALTER TABLE `user_permissions`
  MODIFY `permission` ENUM(
    'VIEW_ALL_REQUESTS',
    'MANAGE_REQUESTS',
    'CANCEL_REQUESTS',
    'TRANSFER_REQUESTS',
    'SET_PRIORITY',
    'ASSIGN_MASTERS',
    'MANAGE_CLIENTS',
    'MANAGE_ORGANIZATIONS',
    'MANAGE_STORES',
    'VIEW_STORE_SECRETS',
    'VIEW_TELEGRAM',
    'SEND_TELEGRAM',
    'MANAGE_TEMPLATES',
    'VIEW_REPORTS',
    'MANAGE_STAFF',
    'MANAGE_KNOWLEDGE'
  ) NOT NULL;

CREATE TABLE `knowledge_sections` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(160) NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `parent_id` INTEGER NULL,
  `created_by_user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `knowledge_sections_parent_id_position_idx` (`parent_id`, `position`),
  PRIMARY KEY (`id`),
  CONSTRAINT `knowledge_sections_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `knowledge_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `knowledge_sections_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `knowledge_articles` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `section_id` INTEGER NOT NULL,
  `title` VARCHAR(240) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `created_by_user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `knowledge_articles_section_id_position_idx` (`section_id`, `position`),
  PRIMARY KEY (`id`),
  CONSTRAINT `knowledge_articles_section_id_fkey`
    FOREIGN KEY (`section_id`) REFERENCES `knowledge_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `knowledge_articles_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `knowledge_attachments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `article_id` INTEGER NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(160) NOT NULL,
  `size` INTEGER NOT NULL,
  `data` LONGBLOB NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `knowledge_attachments_article_id_idx` (`article_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `knowledge_attachments_article_id_fkey`
    FOREIGN KEY (`article_id`) REFERENCES `knowledge_articles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
