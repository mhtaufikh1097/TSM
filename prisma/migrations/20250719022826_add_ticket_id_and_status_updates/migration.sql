/*
  Warnings:

  - The values [APPROVED_QC,REJECTED_QC,APPROVED_PM,REJECTED_PM] on the enum `incident_logs_newStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [APPROVED_QC,REJECTED_QC,APPROVED_PM,REJECTED_PM] on the enum `incident_logs_newStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `status` on the `incidents` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `Enum(EnumId(4))`.
  - A unique constraint covering the columns `[ticketId]` on the table `incidents` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ticketId` to the `incidents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `incident_logs` MODIFY `oldStatus` ENUM('OPEN', 'ON_HOLD', 'PENDING_QC', 'QC_APPROVED', 'QC_REJECTED', 'PENDING_PM', 'PM_APPROVED', 'PM_REJECTED', 'CLOSED') NULL,
    MODIFY `newStatus` ENUM('OPEN', 'ON_HOLD', 'PENDING_QC', 'QC_APPROVED', 'QC_REJECTED', 'PENDING_PM', 'PM_APPROVED', 'PM_REJECTED', 'CLOSED') NULL;

-- AlterTable
ALTER TABLE `incidents` ADD COLUMN `ticketId` VARCHAR(191) NOT NULL,
    MODIFY `status` ENUM('OPEN', 'ON_HOLD', 'PENDING_QC', 'QC_APPROVED', 'QC_REJECTED', 'PENDING_PM', 'PM_APPROVED', 'PM_REJECTED', 'CLOSED') NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE `whatsapp_messages` MODIFY `type` ENUM('INCIDENT_SUBMITTED', 'QC_APPROVED', 'QC_REJECTED', 'PM_APPROVED', 'PM_REJECTED', 'SYSTEM_NOTIFICATION', 'TEST') NOT NULL;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `incidentId` VARCHAR(191) NULL,
    `data` JSON NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `incidents_ticketId_key` ON `incidents`(`ticketId`);

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
