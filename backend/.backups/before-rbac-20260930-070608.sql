/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: servio_crm
-- ------------------------------------------------------
-- Server version	11.7.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES
('d8419e41-bca7-4336-87c6-d20e58324fd5','0ac4f6178997b720f454000f203b07c99c87fe6bb87a455ffd0da5c92ef2d7cf','2026-09-25 16:55:39.408','20260925165014_init',NULL,NULL,'2026-09-25 16:55:35.804',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_is_read_idx` (`user_id`,`is_read`),
  CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_attachments`
--

DROP TABLE IF EXISTS `request_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `file_path` varchar(191) NOT NULL,
  `original_name` varchar(191) NOT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `request_attachments_request_id_idx` (`request_id`),
  CONSTRAINT `request_attachments_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_attachments`
--

LOCK TABLES `request_attachments` WRITE;
/*!40000 ALTER TABLE `request_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `request_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_types`
--

DROP TABLE IF EXISTS `request_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(191) DEFAULT '#ee7d6a',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_types_name_key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_types`
--

LOCK TABLES `request_types` WRITE;
/*!40000 ALTER TABLE `request_types` DISABLE KEYS */;
INSERT INTO `request_types` VALUES
(1,'Не работает касса',NULL,'#ee7d6a',1,'2026-09-25 16:55:40.487','2026-09-25 16:55:40.487'),
(2,'Ошибка при закрытии смены',NULL,'#8979cf',1,'2026-09-25 16:55:40.487','2026-09-25 16:55:40.487'),
(3,'Подключение к ОФД',NULL,'#60a3da',1,'2026-09-25 16:55:40.487','2026-09-25 16:55:40.487'),
(4,'Плановое обслуживание',NULL,'#60bb94',1,'2026-09-25 16:55:40.487','2026-09-25 16:55:40.487');
/*!40000 ALTER TABLE `request_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `requests`
--

DROP TABLE IF EXISTS `requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `created_by_user_id` int(11) NOT NULL,
  `type_id` int(11) NOT NULL,
  `urgency` enum('URGENT','SCHEDULED') NOT NULL,
  `scheduled_at` datetime(3) DEFAULT NULL,
  `description` text NOT NULL,
  `status` enum('NEW','ACCEPTED','IN_PROGRESS','DONE','CANCELLED') NOT NULL DEFAULT 'NEW',
  `admin_comment` text DEFAULT NULL,
  `assigned_admin_id` int(11) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `closed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `requests_store_id_idx` (`store_id`),
  KEY `requests_status_idx` (`status`),
  KEY `requests_urgency_idx` (`urgency`),
  KEY `requests_scheduled_at_idx` (`scheduled_at`),
  KEY `requests_created_by_user_id_fkey` (`created_by_user_id`),
  KEY `requests_type_id_fkey` (`type_id`),
  KEY `requests_assigned_admin_id_fkey` (`assigned_admin_id`),
  CONSTRAINT `requests_assigned_admin_id_fkey` FOREIGN KEY (`assigned_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `requests_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `requests_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `requests_type_id_fkey` FOREIGN KEY (`type_id`) REFERENCES `request_types` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `requests`
--

LOCK TABLES `requests` WRITE;
/*!40000 ALTER TABLE `requests` DISABLE KEYS */;
INSERT INTO `requests` VALUES
(1,1,2,1,'URGENT',NULL,'???????????????? ??????: ???????? ??????? ???????? ???????? CRM.','ACCEPTED','?????? ??????? ? ??????. ?????????????? ???? ????????.',NULL,'2026-09-25 16:56:47.014','2026-09-25 18:01:38.354',NULL),
(2,2,5,1,'SCHEDULED','2026-09-27 07:00:00.000','???????? ???????? ??????? ???????????????','NEW',NULL,1,'2026-09-25 18:04:25.341','2026-09-25 18:04:25.341',NULL),
(3,2,5,4,'SCHEDULED','2026-09-30 07:00:00.000','фывфывфы','NEW',NULL,1,'2026-09-25 18:04:33.191','2026-09-25 18:04:33.191',NULL),
(4,2,5,3,'SCHEDULED','2026-09-29 07:00:00.000','1233111','NEW',NULL,1,'2026-09-25 18:04:45.847','2026-09-25 18:04:45.847',NULL),
(5,3,6,1,'SCHEDULED','2026-09-30 20:55:00.000','22222','NEW',NULL,NULL,'2026-09-25 20:55:43.596','2026-09-25 20:55:43.596',NULL),
(6,1,2,1,'URGENT',NULL,'11111','NEW',NULL,NULL,'2026-09-29 08:24:14.836','2026-09-29 08:24:14.836',NULL);
/*!40000 ALTER TABLE `requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_accesses`
--

DROP TABLE IF EXISTS `store_accesses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_accesses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `anydesk_id` varchar(191) DEFAULT NULL,
  `anydesk_password_encrypted` text DEFAULT NULL,
  `ofd_url` varchar(191) DEFAULT NULL,
  `ofd_login` varchar(191) DEFAULT NULL,
  `ofd_password_encrypted` text DEFAULT NULL,
  `nalog_url` varchar(191) DEFAULT NULL,
  `nalog_login` varchar(191) DEFAULT NULL,
  `nalog_password_encrypted` text DEFAULT NULL,
  `updated_by_user_id` int(11) DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `store_accesses_store_id_key` (`store_id`),
  KEY `store_accesses_updated_by_user_id_fkey` (`updated_by_user_id`),
  CONSTRAINT `store_accesses_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `store_accesses_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_accesses`
--

LOCK TABLES `store_accesses` WRITE;
/*!40000 ALTER TABLE `store_accesses` DISABLE KEYS */;
INSERT INTO `store_accesses` VALUES
(1,1,'123 456 789','SSv5I7AZMiMBkM0q.FDiJ99FqOFTvRItAfKcFRg==.7DekEooVNqXDBYhh0Q==','https://example.com','demo-ofd','zc3kvYyZKK4gO9Lt.F0sCODg1VL/e/k4zbjz7+w==.Sg5zcTU8Zx5M8g==','https://www.nalog.gov.ru','demo-nalog','cYQLD0SBuP/8uFHA.sgxegc6yQjNMyDw7KDEVFA==.88Z+faWEmCSz1GG8',2,'2026-09-25 16:56:46.939');
/*!40000 ALTER TABLE `store_accesses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stores`
--

DROP TABLE IF EXISTS `stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `address` varchar(191) NOT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `status` enum('PENDING','ACTIVE','REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `stores_user_id_idx` (`user_id`),
  KEY `stores_status_idx` (`status`),
  CONSTRAINT `stores_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stores`
--

LOCK TABLES `stores` WRITE;
/*!40000 ALTER TABLE `stores` DISABLE KEYS */;
INSERT INTO `stores` VALUES
(1,2,'????-???????','?. ??????, ??. ????????, 1','+7 999 000-00-02','ACTIVE',NULL,'2026-09-25 16:56:46.609','2026-09-25 16:56:46.609'),
(2,5,'точка','Shevchenka Blvd, 27, Donetsk, Donetsk Oblast, 83000','+79999','ACTIVE',NULL,'2026-09-25 17:17:43.440','2026-09-25 17:17:58.743'),
(3,6,'точка 2','Shevchenka Blvd, 27, Donetsk, Donetsk Oblast, 83000',NULL,'ACTIVE',NULL,'2026-09-25 20:54:16.968','2026-09-25 20:54:54.251');
/*!40000 ALTER TABLE `stores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `role` enum('CLIENT','ADMIN') NOT NULL DEFAULT 'CLIENT',
  `status` enum('PENDING','ACTIVE','REJECTED','BLOCKED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'ЦТО БАЗИС','admin@bazis.ru','$2b$12$fx0zr.K6ECrb9AsEzHyyk.8ttmotpbB3CPCYKxtfh29NaZwWfBE6C','+7 000 000-00-00','ADMIN','ACTIVE',NULL,'2026-09-25 16:55:40.356','2026-09-28 09:25:27.831'),
(2,'ИП Демо','user@bazis.ru','$2b$12$IkYM0mVye0fDMI1UPG3KY.4XYVuifSVgrEURtokpfYgK/PwJV6Q7a','+7 999 000-00-01','CLIENT','ACTIVE',NULL,'2026-09-25 16:56:46.609','2026-09-28 09:25:27.970'),
(5,'ИП иванов2','afvergo@gmail.com','$2b$12$lfzNIQmXaTkavtw0YAhMiOTzzzc9LgbSaqNGRcnXWD.VVfqxW39UC','+79999','CLIENT','ACTIVE',NULL,'2026-09-25 17:17:43.440','2026-09-25 17:17:58.700'),
(6,'asdasdasdasd','afvergo99@gmail.com','$2b$12$s5ZOIyC1caTU0OZZkfGxIOy1cbCzOMe0.gqbT621RwG.f3Z1r7EaS','+7 (949) 317-39-70','CLIENT','ACTIVE',NULL,'2026-09-25 20:54:16.968','2026-09-25 20:54:54.229');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-09-30  7:06:09
