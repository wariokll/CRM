-- DropForeignKey
ALTER TABLE `requests` DROP FOREIGN KEY `requests_created_by_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `requests` DROP FOREIGN KEY `requests_store_id_fkey`;

-- DropForeignKey
ALTER TABLE `stores` DROP FOREIGN KEY `stores_user_id_fkey`;

-- DropIndex
DROP INDEX `requests_created_by_user_id_fkey` ON `requests`;

-- AlterTable
ALTER TABLE `request_types` ADD COLUMN `available_on_telegram` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `available_on_web` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `default_priority` ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN `department_id` INTEGER NULL,
    ADD COLUMN `requires_organization` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `requires_store` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `template_fields` JSON NULL;

-- AlterTable
ALTER TABLE `requests` ADD COLUMN `contact_id` INTEGER NULL,
    ADD COLUMN `department_id` INTEGER NULL,
    ADD COLUMN `organization_id` INTEGER NULL,
    ADD COLUMN `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN `source` ENUM('WEB', 'TELEGRAM_ACCOUNT', 'TELEGRAM_BOT') NOT NULL DEFAULT 'WEB',
    ADD COLUMN `template_data` JSON NULL,
    MODIFY `store_id` INTEGER NULL,
    MODIFY `created_by_user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `stores` ADD COLUMN `organization_id` INTEGER NULL,
    MODIFY `user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('CLIENT', 'ADMIN', 'DIRECTOR', 'DEPARTMENT_HEAD', 'MASTER') NOT NULL DEFAULT 'CLIENT';
UPDATE `users` SET `role` = 'DIRECTOR' WHERE `role` = 'ADMIN';
ALTER TABLE `users` MODIFY `role` ENUM('CLIENT', 'DIRECTOR', 'DEPARTMENT_HEAD', 'MASTER') NOT NULL DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE `user_permissions` (
    `user_id` INTEGER NOT NULL,
    `permission` ENUM('VIEW_ALL_REQUESTS', 'MANAGE_REQUESTS', 'CANCEL_REQUESTS', 'TRANSFER_REQUESTS', 'SET_PRIORITY', 'ASSIGN_MASTERS', 'MANAGE_CLIENTS', 'MANAGE_ORGANIZATIONS', 'MANAGE_STORES', 'VIEW_STORE_SECRETS', 'VIEW_TELEGRAM', 'SEND_TELEGRAM', 'MANAGE_TEMPLATES', 'VIEW_REPORTS', 'MANAGE_STAFF') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`user_id`, `permission`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_slug_key`(`slug`),
    UNIQUE INDEX `departments_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_departments` (
    `user_id` INTEGER NOT NULL,
    `department_id` INTEGER NOT NULL,
    `membership_role` ENUM('HEAD', 'MASTER') NOT NULL DEFAULT 'MASTER',

    INDEX `user_departments_department_id_membership_role_idx`(`department_id`, `membership_role`),
    PRIMARY KEY (`user_id`, `department_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('IP', 'OOO', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `legal_name` VARCHAR(191) NOT NULL,
    `short_name` VARCHAR(191) NULL,
    `inn` VARCHAR(191) NULL,
    `kpp` VARCHAR(191) NULL,
    `ogrn` VARCHAR(191) NULL,
    `legal_address` TEXT NULL,
    `contact_name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `rejection_reason` TEXT NULL,
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `organizations_status_idx`(`status`),
    INDEX `organizations_inn_idx`(`inn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_members` (
    `organization_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,

    INDEX `organization_members_user_id_idx`(`user_id`),
    PRIMARY KEY (`organization_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `display_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `linked_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contacts_linked_user_id_idx`(`linked_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_assignees` (
    `request_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `assigned_by_user_id` INTEGER NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `request_assignees_user_id_idx`(`user_id`),
    PRIMARY KEY (`request_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `author_user_id` INTEGER NOT NULL,
    `visibility` ENUM('INTERNAL', 'CLIENT') NOT NULL DEFAULT 'INTERNAL',
    `body` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `request_comments_request_id_created_at_idx`(`request_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_department_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `from_department_id` INTEGER NULL,
    `to_department_id` INTEGER NOT NULL,
    `transferred_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `request_department_history_request_id_idx`(`request_id`),
    INDEX `request_department_history_from_department_id_idx`(`from_department_id`),
    INDEX `request_department_history_to_department_id_idx`(`to_department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_integrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` ENUM('USER_ACCOUNT', 'BOT') NOT NULL,
    `status` ENUM('DISABLED', 'NEEDS_CONFIGURATION', 'CONNECTING', 'ACTIVE', 'ERROR') NOT NULL DEFAULT 'NEEDS_CONFIGURATION',
    `display_name` VARCHAR(191) NULL,
    `last_error` TEXT NULL,
    `last_connected_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `telegram_integrations_kind_key`(`kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_chats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `integration_id` INTEGER NOT NULL,
    `external_chat_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `unread_count` INTEGER NOT NULL DEFAULT 0,
    `linked_user_id` INTEGER NULL,
    `organization_id` INTEGER NULL,
    `store_id` INTEGER NULL,
    `contact_id` INTEGER NULL,
    `request_id` INTEGER NULL,
    `last_message_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `telegram_chats_last_message_at_idx`(`last_message_at`),
    UNIQUE INDEX `telegram_chats_integration_id_external_chat_id_key`(`integration_id`, `external_chat_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `external_message_id` VARCHAR(191) NOT NULL,
    `direction` ENUM('INCOMING', 'OUTGOING') NOT NULL,
    `body` TEXT NULL,
    `payload` JSON NULL,
    `sent_by_user_id` INTEGER NULL,
    `sent_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `telegram_messages_chat_id_sent_at_idx`(`chat_id`, `sent_at`),
    UNIQUE INDEX `telegram_messages_chat_id_external_message_id_key`(`chat_id`, `external_message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed the fixed departments and preserve all existing CRM data.
INSERT INTO `departments` (`slug`, `name`, `is_active`, `created_at`, `updated_at`) VALUES
    ('subscriber', 'Абонентский', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('service', 'Сервисный', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('sales', 'Торговый', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

UPDATE `request_types`
SET `department_id` = (SELECT `id` FROM `departments` WHERE `slug` = 'service');

UPDATE `requests`
SET `department_id` = (SELECT `id` FROM `departments` WHERE `slug` = 'service');

INSERT INTO `organizations` (
    `type`, `legal_name`, `short_name`, `phone`, `email`, `status`, `created_by_user_id`, `created_at`, `updated_at`
)
SELECT 'OTHER', `ip_name`, `ip_name`, `phone`, `email`, 'ACTIVE', `id`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `users`
WHERE `role` = 'CLIENT';

INSERT INTO `organization_members` (`organization_id`, `user_id`, `is_primary`)
SELECT `id`, `created_by_user_id`, true
FROM `organizations`
WHERE `created_by_user_id` IS NOT NULL;

UPDATE `stores` s
JOIN `organizations` o ON o.`created_by_user_id` = s.`user_id`
SET s.`organization_id` = o.`id`;

UPDATE `requests` r
LEFT JOIN `stores` s ON s.`id` = r.`store_id`
SET r.`organization_id` = s.`organization_id`;

INSERT IGNORE INTO `request_assignees` (`request_id`, `user_id`, `assigned_by_user_id`, `assigned_at`)
SELECT `id`, `assigned_admin_id`, `assigned_admin_id`, CURRENT_TIMESTAMP(3)
FROM `requests`
WHERE `assigned_admin_id` IS NOT NULL;

INSERT INTO `request_comments` (`request_id`, `author_user_id`, `visibility`, `body`, `created_at`)
SELECT r.`id`, COALESCE(r.`assigned_admin_id`, d.`id`), 'CLIENT', r.`admin_comment`, r.`updated_at`
FROM `requests` r
JOIN (SELECT MIN(`id`) AS `id` FROM `users` WHERE `role` = 'DIRECTOR') d
WHERE r.`admin_comment` IS NOT NULL AND TRIM(r.`admin_comment`) <> '';

INSERT INTO `telegram_integrations` (`kind`, `status`, `created_at`, `updated_at`) VALUES
    ('USER_ACCOUNT', 'NEEDS_CONFIGURATION', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('BOT', 'NEEDS_CONFIGURATION', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

ALTER TABLE `request_types` MODIFY `department_id` INTEGER NOT NULL;
ALTER TABLE `requests` MODIFY `department_id` INTEGER NOT NULL;
ALTER TABLE `stores` MODIFY `organization_id` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `request_types_department_id_idx` ON `request_types`(`department_id`);

-- CreateIndex
CREATE INDEX `requests_organization_id_idx` ON `requests`(`organization_id`);

-- CreateIndex
CREATE INDEX `requests_department_id_idx` ON `requests`(`department_id`);

-- CreateIndex
CREATE INDEX `requests_priority_idx` ON `requests`(`priority`);

-- CreateIndex
CREATE INDEX `stores_organization_id_idx` ON `stores`(`organization_id`);

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_departments` ADD CONSTRAINT `user_departments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_departments` ADD CONSTRAINT `user_departments_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stores` ADD CONSTRAINT `stores_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stores` ADD CONSTRAINT `stores_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_types` ADD CONSTRAINT `request_types_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_linked_user_id_fkey` FOREIGN KEY (`linked_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_assignees` ADD CONSTRAINT `request_assignees_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_assignees` ADD CONSTRAINT `request_assignees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_assignees` ADD CONSTRAINT `request_assignees_assigned_by_user_id_fkey` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_comments` ADD CONSTRAINT `request_comments_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_comments` ADD CONSTRAINT `request_comments_author_user_id_fkey` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_department_history` ADD CONSTRAINT `request_department_history_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_department_history` ADD CONSTRAINT `request_department_history_from_department_id_fkey` FOREIGN KEY (`from_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_department_history` ADD CONSTRAINT `request_department_history_to_department_id_fkey` FOREIGN KEY (`to_department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_department_history` ADD CONSTRAINT `request_department_history_transferred_by_user_id_fkey` FOREIGN KEY (`transferred_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_chats` ADD CONSTRAINT `telegram_chats_integration_id_fkey` FOREIGN KEY (`integration_id`) REFERENCES `telegram_integrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_chats` ADD CONSTRAINT `telegram_chats_linked_user_id_fkey` FOREIGN KEY (`linked_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_chats` ADD CONSTRAINT `telegram_chats_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_chats` ADD CONSTRAINT `telegram_chats_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_chats` ADD CONSTRAINT `telegram_chats_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_chats` ADD CONSTRAINT `telegram_chats_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_messages` ADD CONSTRAINT `telegram_messages_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `telegram_chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_messages` ADD CONSTRAINT `telegram_messages_sent_by_user_id_fkey` FOREIGN KEY (`sent_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
