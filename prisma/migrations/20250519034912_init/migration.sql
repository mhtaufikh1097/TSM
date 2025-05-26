-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone_number` VARCHAR(191) NOT NULL,
    `pin` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `role` ENUM('inspector', 'qc', 'pm') NOT NULL DEFAULT 'inspector',
    `upliner_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_phone_number_key`(`phone_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone_number` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inspection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inspection_type` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `findings` VARCHAR(191) NOT NULL,
    `action_required` VARCHAR(191) NOT NULL,
    `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low',
    `status` ENUM('pending', 'qc_approved', 'pm_approved', 'rejected') NOT NULL DEFAULT 'pending',
    `inspector_id` INTEGER NOT NULL,
    `qc_approved_by` INTEGER NULL,
    `qc_approved_at` DATETIME(3) NULL,
    `qc_comment` VARCHAR(191) NULL,
    `pm_approved_by` INTEGER NULL,
    `pm_approved_at` DATETIME(3) NULL,
    `pm_comment` VARCHAR(191) NULL,
    `rejected_by` INTEGER NULL,
    `rejected_at` DATETIME(3) NULL,
    `rejection_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InspectionFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inspection_id` INTEGER NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `file_type` ENUM('image', 'document', 'video', 'other') NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_upliner_id_fkey` FOREIGN KEY (`upliner_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inspection` ADD CONSTRAINT `Inspection_inspector_id_fkey` FOREIGN KEY (`inspector_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inspection` ADD CONSTRAINT `Inspection_qc_approved_by_fkey` FOREIGN KEY (`qc_approved_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inspection` ADD CONSTRAINT `Inspection_pm_approved_by_fkey` FOREIGN KEY (`pm_approved_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inspection` ADD CONSTRAINT `Inspection_rejected_by_fkey` FOREIGN KEY (`rejected_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionFile` ADD CONSTRAINT `InspectionFile_inspection_id_fkey` FOREIGN KEY (`inspection_id`) REFERENCES `Inspection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
