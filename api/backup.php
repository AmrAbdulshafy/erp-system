<?php
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

// Map frontend IndexedDB table names => MySQL table names
$tableMap = [
    'customers' => 'customers',
    'raw_materials' => 'raw_materials',
    'suppliers' => 'suppliers',
    'employees' => 'employees',
    'attendance' => 'attendance',
    'sales_orders' => 'sales_orders',
    'sales_items' => 'sales_order_items',
    'expenses' => 'expenses',
    'users' => 'users',
    'purchase_orders' => 'purchase_orders',
    'purchase_items' => 'purchase_order_items',
    'quotations' => 'quotations',
    'quotation_items' => 'quotation_items',
    'work_orders' => 'work_orders',
    'employee_production' => 'employee_production',
    'payroll' => 'payroll',
    'employee_loans' => 'employee_loans',
    'shipping_orders' => 'shipping_orders',
    'owner_withdrawals' => 'owner_withdrawals',
    'stock_movements' => 'stock_movements',
    'payment_vouchers' => 'payment_vouchers'
];

$data = [
    '_meta' => [
        'app' => 'jin-engine',
        'version' => 20,
        'source' => 'online_mysql',
        'exported_at' => gmdate('Y-m-d\TH:i:s\Z')
    ]
];

foreach ($tableMap as $frontendKey => $mysqlTable) {
    $targetTable = $mysqlTable;
    $result = $conn->query("SHOW TABLES LIKE '$targetTable'");
    if ((!$result || $result->num_rows === 0) && $frontendKey !== $mysqlTable) {
        // Fallback if table was created under frontend name
        $alt = $conn->query("SHOW TABLES LIKE '$frontendKey'");
        if ($alt && $alt->num_rows > 0) {
            $targetTable = $frontendKey;
            $result = $alt;
        }
    }

    if ($result && $result->num_rows > 0) {
        $res = $conn->query("SELECT * FROM `$targetTable`");
        $records = [];
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                // Decode JSON columns back into arrays/objects for frontend compatibility
                foreach (['stock_movements', 'bom_movements', 'permissions'] as $jsonCol) {
                    if (isset($row[$jsonCol]) && is_string($row[$jsonCol]) && $row[$jsonCol] !== '') {
                        $decoded = json_decode($row[$jsonCol], true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $row[$jsonCol] = $decoded;
                        }
                    }
                }
                if ($frontendKey === 'shipping_orders' && empty($row['bill_of_lading_number']) && !empty($row['vehicle_number'])) {
                    $row['bill_of_lading_number'] = $row['vehicle_number'];
                }
                if ($frontendKey === 'stock_movements') {
                    if (empty($row['material_id']) && !empty($row['raw_material_id'])) {
                        $row['material_id'] = $row['raw_material_id'];
                    }
                    if (!isset($row['stock_before']) && isset($row['previous_stock'])) {
                        $row['stock_before'] = (float)$row['previous_stock'];
                    }
                    if (!isset($row['stock_after']) && isset($row['new_stock'])) {
                        $row['stock_after'] = (float)$row['new_stock'];
                    }
                }
                if ($frontendKey === 'payment_vouchers') {
                    if (empty($row['entity_type']) && !empty($row['party_type'])) {
                        $row['entity_type'] = strtolower($row['party_type']);
                    }
                    if (empty($row['entity_id']) && !empty($row['party_id'])) {
                        $row['entity_id'] = $row['party_id'];
                    }
                    if (empty($row['entity_name']) && !empty($row['party_name'])) {
                        $row['entity_name'] = $row['party_name'];
                    }
                }
                $records[] = $row;
            }
        }
        $data[$frontendKey] = $records;
    } else {
        $data[$frontendKey] = [];
    }
}

echo json_encode($data, JSON_UNESCAPED_UNICODE);
?>
