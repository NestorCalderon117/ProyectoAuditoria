-- AlterTable
ALTER TABLE `patients` ADD COLUMN `diagnosis_enc` TEXT NULL;

-- AlterTable
ALTER TABLE `refresh_tokens` ADD COLUMN `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
