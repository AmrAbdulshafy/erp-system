<?php
/**
 * Jin Engine ERP - Secure Database Connector & Production Configuration
 */

// 1. Production Security Headers & CORS Lockdown
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');

    // If served over HTTPS, enforce HTTP Strict Transport Security (HSTS)
    $isHttps = (
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443) ||
        (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    );

    if ($isHttps) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

// 2. Load Environment Variables from api/.env or root .env if present
function loadEnvFile($path) {
    if (file_exists($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || $line[0] === '#') continue;
            if (strpos($line, '=') !== false) {
                list($key, $val) = explode('=', $line, 2);
                $key = trim($key);
                $val = trim($val);
                // Strip quotes if present
                $val = trim($val, "'\"");
                if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
                    putenv("$key=$val");
                    $_ENV[$key] = $val;
                    $_SERVER[$key] = $val;
                }
            }
        }
    }
}

// Check api/.env first, then root .env
loadEnvFile(__DIR__ . '/.env');
loadEnvFile(dirname(__DIR__) . '/.env');
loadEnvFile(dirname(__DIR__) . '/.env.local');

// 3. Mandatory API Authentication Guard
function requireApiAuth() {
    $configuredKey = getenv('ERP_API_KEY') ?: (isset($_ENV['ERP_API_KEY']) ? $_ENV['ERP_API_KEY'] : null);
    
    // If an API key is configured, strictly enforce it on all requests
    if (!empty($configuredKey)) {
        $providedKey = null;

        // Check X-API-KEY header (case-insensitive in Apache/FastCGI)
        if (!empty($_SERVER['HTTP_X_API_KEY'])) {
            $providedKey = $_SERVER['HTTP_X_API_KEY'];
        } elseif (!empty($_SERVER['REDIRECT_HTTP_X_API_KEY'])) {
            $providedKey = $_SERVER['REDIRECT_HTTP_X_API_KEY'];
        } elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, 'X-API-KEY') === 0 || strcasecmp($k, 'Authorization') === 0) {
                    $providedKey = preg_replace('/^Bearer\s+/i', '', trim($v));
                    break;
                }
            }
        }

        // Also check query param fallback for direct GET downloads (e.g. backup export)
        if (empty($providedKey) && !empty($_GET['api_key'])) {
            $providedKey = $_GET['api_key'];
        }

        if (empty($providedKey) || !hash_equals($configuredKey, $providedKey)) {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                "status" => "error",
                "message" => "Unauthorized: Valid X-API-KEY header required"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

// Run auth guard automatically on all API endpoints
requireApiAuth();

// 4. Database Credentials (Prioritize ENV, fallback to secure dev defaults)
$host = getenv('DB_HOST') ?: (isset($_ENV['DB_HOST']) ? $_ENV['DB_HOST'] : 'localhost');
$db   = getenv('DB_NAME') ?: (isset($_ENV['DB_NAME']) ? $_ENV['DB_NAME'] : 'packerp');
$user = getenv('DB_USER') ?: (isset($_ENV['DB_USER']) ? $_ENV['DB_USER'] : 'root');
$pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : (isset($_ENV['DB_PASS']) ? $_ENV['DB_PASS'] : '');
$port = getenv('DB_PORT') ? (int)getenv('DB_PORT') : 3306;

// 5. Connect to MySQL with mysqli
mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli($host, $user, $pass, '', $port);

if ($conn->connect_error) {
    // Hide internal credentials in production response
    $isProd = (getenv('APP_ENV') === 'production');
    $errMsg = $isProd 
        ? "Database connection failed. Please check server configuration." 
        : "Connection failed: " . $conn->connect_error;
    
    http_response_code(500);
    header('Content-Type: application/json');
    die(json_encode(["status" => "error", "message" => $errMsg]));
}

// 6. Ensure UTF8MB4 charset for full Arabic & Unicode support
$conn->set_charset("utf8mb4");

// 7. Select / Create Database
$conn->query("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$conn->select_db($db);

/**
 * Standard JSON API response helper
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
