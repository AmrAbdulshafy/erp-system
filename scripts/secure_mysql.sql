-- ===================================================================
-- Ultra Pack ERP - Production Database Hardening Script
-- ===================================================================

-- 1. Create a dedicated application user with restricted privileges (instead of using root)
CREATE USER IF NOT EXISTS 'packerp_user'@'localhost' IDENTIFIED BY 'StrongP@ssw0rd2026!';
CREATE USER IF NOT EXISTS 'packerp_user'@'127.0.0.1' IDENTIFIED BY 'StrongP@ssw0rd2026!';

-- 2. Grant full permissions ONLY to the packerp database
GRANT ALL PRIVILEGES ON packerp.* TO 'packerp_user'@'localhost';
GRANT ALL PRIVILEGES ON packerp.* TO 'packerp_user'@'127.0.0.1';

-- 3. Flush privileges to apply changes immediately
FLUSH PRIVILEGES;

-- 4. Verify privileges
SHOW GRANTS FOR 'packerp_user'@'localhost';
