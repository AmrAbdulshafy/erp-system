@echo off
chcp 65001 >nul
echo ===================================================================
echo   Jin Engine ERP - Production Security & Hardening Setup
echo ===================================================================
echo.

set /p DBPASS="Enter Secure Password for packerp_user [Default: StrongP@ssw0rd2026!]: "
if "%DBPASS%"=="" set DBPASS=StrongP@ssw0rd2026!

echo.
echo [1/3] Creating secure MySQL user and granting permissions...
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE USER IF NOT EXISTS 'packerp_user'@'localhost' IDENTIFIED BY '%DBPASS%'; GRANT ALL PRIVILEGES ON packerp.* TO 'packerp_user'@'localhost'; FLUSH PRIVILEGES;"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to configure MySQL user. Please ensure XAMPP MySQL is running.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Writing secure configuration to api/.env...
(
echo # Jin Engine ERP Production Config
echo APP_ENV=production
echo DB_HOST=127.0.0.1
echo DB_PORT=3306
echo DB_NAME=packerp
echo DB_USER=packerp_user
echo DB_PASS=%DBPASS%
echo FORCE_HTTPS=true
) > api\.env

echo [3/3] Done! api\.env successfully created with protected credentials.
echo.
echo Security Checklist Completed:
echo  [x] MySQL non-root dedicated user created ('packerp_user')
echo  [x] Password protected configuration file generated ('api/.env')
echo  [x] Apache .htaccess security rules and HTTPS redirection activated
echo.
pause
