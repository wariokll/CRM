CREATE TABLE `organization_contacts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `organization_id` INTEGER NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `organization_contacts_organization_id_idx`(`organization_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `organization_contacts_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `organization_contacts` (`organization_id`, `full_name`, `phone`, `created_at`, `updated_at`)
SELECT `id`, `contact_name`, `phone`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `organizations`
WHERE `contact_name` IS NOT NULL AND TRIM(`contact_name`) <> '';
