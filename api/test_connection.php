<?php
/**
 * Jin Engine ERP - Server Connection & Health Verification API
 */
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Check basic MySQL connection
    if ($conn->connect_error) {
        throw new Exception("Connection error: " . $conn->connect_error);
    }

    // Query server information
    $versionRes = $conn->query("SELECT VERSION() as ver, DATABASE() as current_db, NOW() as server_time");
    $info = $versionRes ? $versionRes->fetch_assoc() : [];

    // Query tables count
    $tablesRes = $conn->query("SHOW TABLES");
    $tableCount = $tablesRes ? $tablesRes->num_rows : 0;

    echo json_encode([
        "status" => "success",
        "message" => "Connected successfully to MySQL server",
        "server" => [
            "host" => $host,
            "database" => $db,
            "mysql_version" => $info['ver'] ?? 'Unknown',
            "server_time" => $info['server_time'] ?? date('Y-m-d H:i:s'),
            "tables_count" => $tableCount,
            "charset" => $conn->character_set_name()
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
