<?php
/**
 * Ultra Pack ERP - Save and Test Online Server Credentials API
 */
require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    jsonResponse(["status" => "error", "message" => "No JSON payload provided"], 400);
}

$host = trim($input['host'] ?? 'localhost');
$dbName = trim($input['database'] ?? 'packerp');
$user = trim($input['user'] ?? 'root');
$pass = (string)($input['password'] ?? '');
$port = (int)($input['port'] ?? 3306);
$action = $input['action'] ?? 'test'; // 'test' | 'save'

// 1. Test connection with provided credentials
mysqli_report(MYSQLI_REPORT_OFF);
$newConn = @new mysqli($host, $user, $pass, '', $port);

if ($newConn->connect_error) {
    jsonResponse([
        "status" => "error",
        "message" => "فشل الاتصال بخادم MySQL: " . $newConn->connect_error
    ], 400);
}

$newConn->set_charset("utf8mb4");
$dbExists = $newConn->select_db($dbName);

if ($action !== 'save') {
    $versionRes = $newConn->query("SELECT VERSION() as ver");
    $ver = $versionRes ? $versionRes->fetch_assoc()['ver'] : 'Unknown';

    jsonResponse([
        "status" => "success",
        "message" => $dbExists
            ? "تم الاتصال بالسيرفر وقاعدة البيانات بنجاح"
            : "تم الاتصال بالسيرفر، لكن قاعدة البيانات \"$dbName\" غير موجودة (ستُنشأ عند الحفظ)",
        "server" => [
            "host" => $host,
            "port" => $port,
            "mysql_version" => $ver,
            "database" => $dbName,
            "database_exists" => (bool)$dbExists,
        ],
    ]);
}

// action === 'save': create the database when missing, then persist credentials
if (!$dbExists) {
    if (!$newConn->query("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")) {
        jsonResponse([
            "status" => "error",
            "message" => "تعذر إنشاء أو الوصول لقاعدة البيانات ($dbName): " . $newConn->error
        ], 400);
    }
    $newConn->select_db($dbName);
}

$versionRes = $newConn->query("SELECT VERSION() as ver");
$ver = $versionRes ? $versionRes->fetch_assoc()['ver'] : 'Unknown';

// 2. If action is 'save', write to api/.env file safely while preserving ERP_API_KEY
if ($action === 'save') {
    $envPath = __DIR__ . '/.env';
    $currentApiKey = getenv('ERP_API_KEY') ?: (isset($_ENV['ERP_API_KEY']) ? $_ENV['ERP_API_KEY'] : '');
    
    $envContent = "# Ultra Pack ERP - Online Database Configuration\n";
    $envContent .= "# Auto-generated at " . date('Y-m-d H:i:s') . "\n";
    $envContent .= "APP_ENV=production\n";
    $envContent .= "DB_HOST=" . addslashes($host) . "\n";
    $envContent .= "DB_PORT=" . $port . "\n";
    $envContent .= "DB_NAME=" . addslashes($dbName) . "\n";
    $envContent .= "DB_USER=" . addslashes($user) . "\n";
    $envContent .= "DB_PASS=" . addslashes($pass) . "\n";
    if (!empty($currentApiKey)) {
        $envContent .= "ERP_API_KEY=" . addslashes($currentApiKey) . "\n";
    }

    if (@file_put_contents($envPath, $envContent) === false) {
        jsonResponse([
            "status" => "error",
            "message" => "فشل حفظ ملف الإعدادات api/.env. يرجى التحقق من أذونات الكتابة."
        ], 500);
    }
}

jsonResponse([
    "status" => "success",
    "message" => "تم حفظ إعدادات السيرفر الأونلاين واختبار الاتصال بنجاح!",
    "server" => [
        "host" => $host,
        "database" => $dbName,
        "user" => $user,
        "port" => $port,
        "mysql_version" => $ver,
        "saved" => true
    ]
]);
?>
