-- Create database
CREATE DATABASE IF NOT EXISTS tsm_wika;
USE tsm_wika;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  pin VARCHAR(60) NOT NULL,
  full_name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create verification_codes table for OTP
CREATE TABLE IF NOT EXISTS verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(15) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN role ENUM('inspector', 'qc', 'pm') DEFAULT 'inspector';
ALTER TABLE users ADD COLUMN upliner_id INT NULL;
ALTER TABLE users ADD CONSTRAINT fk_upliner FOREIGN KEY (upliner_id) REFERENCES users(id);

-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inspection_type VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  inspector_id INT NOT NULL,
  findings TEXT NOT NULL,
  action_required TEXT NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low',
  status ENUM('pending', 'qc_approved', 'pm_approved', 'rejected') NOT NULL DEFAULT 'pending',
  qc_approved_by INT NULL,
  qc_approved_at TIMESTAMP NULL,
  qc_comment TEXT NULL,
  pm_approved_by INT NULL,
  pm_approved_at TIMESTAMP NULL,
  pm_comment TEXT NULL,
  rejected_by INT NULL,
  rejected_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inspector FOREIGN KEY (inspector_id) REFERENCES users(id),
  CONSTRAINT fk_qc_approver FOREIGN KEY (qc_approved_by) REFERENCES users(id),
  CONSTRAINT fk_pm_approver FOREIGN KEY (pm_approved_by) REFERENCES users(id),
  CONSTRAINT fk_rejecter FOREIGN KEY (rejected_by) REFERENCES users(id)
);

-- Create inspection_files table for multiple file uploads
CREATE TABLE IF NOT EXISTS inspection_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inspection_id INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type ENUM('image', 'pdf') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inspection FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);