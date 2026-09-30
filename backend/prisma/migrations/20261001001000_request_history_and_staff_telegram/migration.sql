-- CreateTable
CREATE TABLE `request_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `author_user_id` INTEGER NULL,
    `kind` VARCHAR(40) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `request_activities_request_id_created_at_idx`(`request_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_link_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `telegram_link_codes_code_key`(`code`),
    INDEX `telegram_link_codes_user_id_expires_at_idx`(`user_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `request_reminders` DROP INDEX `request_reminders_request_id_kind_key`,
    ADD COLUMN `audience` VARCHAR(16) NOT NULL DEFAULT 'CLIENT',
    ADD UNIQUE INDEX `request_reminders_request_id_kind_audience_key`(`request_id`, `kind`, `audience`);

-- AddForeignKey
ALTER TABLE `request_activities` ADD CONSTRAINT `request_activities_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `request_activities` ADD CONSTRAINT `request_activities_author_user_id_fkey` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `telegram_link_codes` ADD CONSTRAINT `telegram_link_codes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
