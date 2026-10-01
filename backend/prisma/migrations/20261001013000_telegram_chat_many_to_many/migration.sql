-- Telegram accounts can be linked to any number of organizations and stores.
CREATE TABLE `telegram_chat_organizations` (
    `telegram_chat_id` INTEGER NOT NULL,
    `organization_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `telegram_chat_organizations_organization_id_idx`(`organization_id`),
    PRIMARY KEY (`telegram_chat_id`, `organization_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `telegram_chat_stores` (
    `telegram_chat_id` INTEGER NOT NULL,
    `store_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `telegram_chat_stores_store_id_idx`(`store_id`),
    PRIMARY KEY (`telegram_chat_id`, `store_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve any links created by earlier CRM versions.
INSERT IGNORE INTO `telegram_chat_organizations` (`telegram_chat_id`, `organization_id`, `created_at`)
SELECT `id`, `organization_id`, `created_at`
FROM `telegram_chats`
WHERE `organization_id` IS NOT NULL;

INSERT IGNORE INTO `telegram_chat_stores` (`telegram_chat_id`, `store_id`, `created_at`)
SELECT `id`, `store_id`, `created_at`
FROM `telegram_chats`
WHERE `store_id` IS NOT NULL;

ALTER TABLE `telegram_chat_organizations` ADD CONSTRAINT `telegram_chat_organizations_telegram_chat_id_fkey` FOREIGN KEY (`telegram_chat_id`) REFERENCES `telegram_chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `telegram_chat_organizations` ADD CONSTRAINT `telegram_chat_organizations_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `telegram_chat_stores` ADD CONSTRAINT `telegram_chat_stores_telegram_chat_id_fkey` FOREIGN KEY (`telegram_chat_id`) REFERENCES `telegram_chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `telegram_chat_stores` ADD CONSTRAINT `telegram_chat_stores_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
