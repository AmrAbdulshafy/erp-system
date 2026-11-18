<?php
require_once 'db.php';

// PHP notices/warnings must never leak into the JSON body — they break the app's parser.
ini_set('display_errors', '0');
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(["status" => "error", "message" => "Only POST allowed"], 405);
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
    jsonResponse(["status" => "error", "message" => "Invalid JSON payload: " . json_last_error_msg()], 400);
}
if (!is_array($data)) {
    $data = [];
}

// Temporarily disable FK checks during chunked sync so out-of-order chunks or optional relations do not fail
@$conn->query("SET FOREIGN_KEY_CHECKS = 0");

// Helper: ensure column exists on a table before preparing INSERT statements
function ensureColumn($conn, $table, $column, $definition) {
    $res = @$conn->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    if ($res && $res->num_rows === 0) {
        @$conn->query("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}

// ------------------------------------------------------------------
// Normalise incoming rows before any table block runs:
//  - map local field names onto MySQL column names (phone -> mobile_number)
//  - guarantee created_at / updated_at / deleted_at always exist
// Without this, missing keys raise warnings and abort the insert.
// ------------------------------------------------------------------
$nowSql = date('Y-m-d H:i:s');
foreach ($data as $tableName => $rows) {
    if (!is_array($rows)) {
        continue;
    }
    foreach ($rows as $idx => $row) {
        if (!is_array($row)) {
            continue;
        }
        if (!isset($row['mobile_number']) && isset($row['phone'])) {
            $row['mobile_number'] = $row['phone'];
        }
        if (!isset($row['mobile_number']) && isset($row['mobile'])) {
            $row['mobile_number'] = $row['mobile'];
        }
        // Line items: the app stores subtotal / material_id, MySQL expects total_price / raw_material_id
        if (!isset($row['total_price'])) {
            if (isset($row['subtotal'])) {
                $row['total_price'] = $row['subtotal'];
            } elseif (isset($row['total_amount'])) {
                $row['total_price'] = $row['total_amount'];
            } else {
                $row['total_price'] = (float)($row['quantity'] ?? 0) * (float)($row['unit_price'] ?? 0);
            }
        }
        if (!isset($row['raw_material_id']) && isset($row['material_id'])) {
            $row['raw_material_id'] = $row['material_id'];
        }
        if (!isset($row['account_balance'])) {
            $row['account_balance'] = 0;
        }
        if (empty($row['created_at'])) {
            $row['created_at'] = $nowSql;
        }
        if (empty($row['updated_at'])) {
            $row['updated_at'] = $row['created_at'];
        }
        if (!array_key_exists('deleted_at', $row)) {
            $row['deleted_at'] = null;
        }
        $data[$tableName][$idx] = $row;
    }
}

$syncedEmployees = 0;
$syncedProduction = 0;
$syncedAttendance = 0;
$syncedMaterials = 0;
$syncedCustomers = 0;
$syncedSalesOrders = 0;
$syncedSalesItems = 0;
$syncedExpenses = 0;
$syncedSuppliers = 0;
$syncedPurchaseOrders = 0;
$syncedUsers = 0;
$syncedPurchaseItems = 0;
$syncedQuotations = 0;
$syncedQuotationItems = 0;
$syncedWorkOrders = 0;
$syncedPayroll = 0;
$syncedShippingOrders = 0;
$syncedOwnerWithdrawals = 0;
$syncedEmployeeLoans = 0;
$syncedStockMovements = 0;
$syncedPaymentVouchers = 0;
$syncedIds = [];
$failedCount = 0;

if (isset($data['employees']) && is_array($data['employees'])) {
    ensureColumn($conn, 'employees', 'department', 'VARCHAR(100) NULL AFTER full_name');
    ensureColumn($conn, 'employees', 'job_title', 'VARCHAR(100) NULL AFTER department');

    $stmt = $conn->prepare("INSERT INTO employees (id, full_name, department, job_title, mobile_number, salary_amount, salary_type, shift_start_time, shift_end_time, is_active, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                full_name=VALUES(full_name), 
                                department=VALUES(department),
                                job_title=VALUES(job_title),
                                mobile_number=VALUES(mobile_number),
                                salary_amount=VALUES(salary_amount),
                                salary_type=VALUES(salary_type),
                                shift_start_time=VALUES(shift_start_time),
                                shift_end_time=VALUES(shift_end_time),
                                is_active=VALUES(is_active),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['employees'] as $emp) {
            $isActive = ($emp['is_active'] ?? true) ? 1 : 0;
            $deletedAt = !empty($emp['deleted_at']) ? date('Y-m-d H:i:s', strtotime($emp['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($emp['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($emp['updated_at']));

            $shiftStart = empty($emp['shift_start_time']) ? '08:00:00' : $emp['shift_start_time'];
            $shiftEnd = empty($emp['shift_end_time']) ? '17:00:00' : $emp['shift_end_time'];
            $dept = $emp['department'] ?? null;
            $jobTitle = $emp['job_title'] ?? null;

            $stmt->bind_param("sssssdsssisss", 
                $emp['id'], 
                $emp['full_name'], 
                $dept,
                $jobTitle,
                $emp['mobile_number'], 
                $emp['salary_amount'], 
                $emp['salary_type'], 
                $shiftStart,
                $shiftEnd,
                $isActive, 
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedEmployees++;
                $syncedIds['employees'][] = $emp['id'];
            } else {
                $failedCount++;
                error_log("Error syncing employee " . $emp['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['employees']);
    }
}

if (isset($data['employee_production']) && is_array($data['employee_production'])) {
    ensureColumn($conn, 'employee_production', 'work_order_id', 'VARCHAR(36) NULL AFTER employee_id');

    $stmt = $conn->prepare("INSERT INTO employee_production (id, employee_id, work_order_id, production_date, product_type, quantity, rate_per_piece, total_amount, notes, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                employee_id=VALUES(employee_id), 
                                work_order_id=VALUES(work_order_id),
                                production_date=VALUES(production_date),
                                product_type=VALUES(product_type),
                                quantity=VALUES(quantity),
                                rate_per_piece=VALUES(rate_per_piece),
                                total_amount=VALUES(total_amount),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['employee_production'] as $prod) {
            $deletedAt = !empty($prod['deleted_at']) ? date('Y-m-d H:i:s', strtotime($prod['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($prod['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($prod['updated_at']));
            $woId = !empty($prod['work_order_id']) ? $prod['work_order_id'] : null;

            $stmt->bind_param("sssssiddssss", 
                $prod['id'], 
                $prod['employee_id'], 
                $woId,
                $prod['production_date'], 
                $prod['product_type'], 
                $prod['quantity'], 
                $prod['rate_per_piece'],
                $prod['total_amount'],
                $prod['notes'],
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedProduction++;
                $syncedIds['employee_production'][] = $prod['id'];
            } else {
                $failedCount++;
                error_log("Error syncing production " . $prod['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['employee_production']);
    }
}

if (isset($data['attendance']) && is_array($data['attendance'])) {
    ensureColumn($conn, 'attendance', 'notes', 'TEXT NULL AFTER status');

    $stmt = $conn->prepare("INSERT INTO attendance (id, employee_id, work_date, check_in_time, check_out_time, status, notes, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                employee_id=VALUES(employee_id), 
                                work_date=VALUES(work_date),
                                check_in_time=VALUES(check_in_time),
                                check_out_time=VALUES(check_out_time),
                                status=VALUES(status),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['attendance'] as $att) {
            $deletedAt = !empty($att['deleted_at']) ? date('Y-m-d H:i:s', strtotime($att['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($att['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($att['updated_at']));

            $checkIn = empty($att['check_in_time']) ? null : $att['check_in_time'];
            $checkOut = empty($att['check_out_time']) ? null : $att['check_out_time'];
            $notes = $att['notes'] ?? null;

            $stmt->bind_param("ssssssssss", 
                $att['id'], 
                $att['employee_id'], 
                $att['work_date'], 
                $checkIn, 
                $checkOut, 
                $att['status'],
                $notes,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedAttendance++;
                $syncedIds['attendance'][] = $att['id'];
            } else {
                $failedCount++;
                error_log("Error syncing attendance " . $att['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['attendance']);
    }
}

if (isset($data['raw_materials']) && is_array($data['raw_materials'])) {
    ensureColumn($conn, 'raw_materials', 'supplier_id', 'VARCHAR(36) NULL AFTER material_name');
    ensureColumn($conn, 'raw_materials', 'unit_price', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER unit');
    ensureColumn($conn, 'raw_materials', 'sales_unit_price', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER unit_price');
    ensureColumn($conn, 'raw_materials', 'consumption_per_unit', 'DECIMAL(10, 4) NOT NULL DEFAULT 0.0000 AFTER sales_unit_price');
    ensureColumn($conn, 'raw_materials', 'stock_movements', 'LONGTEXT NULL AFTER min_stock_alert');

    $stmt = $conn->prepare("INSERT INTO raw_materials (id, category, material_name, supplier_id, size, thickness_gsm, color_print, unit, unit_price, sales_unit_price, consumption_per_unit, stock_quantity, min_stock_alert, stock_movements, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                category=VALUES(category),
                                material_name=VALUES(material_name), 
                                supplier_id=VALUES(supplier_id),
                                size=VALUES(size),
                                thickness_gsm=VALUES(thickness_gsm),
                                color_print=VALUES(color_print),
                                unit=VALUES(unit),
                                unit_price=VALUES(unit_price),
                                sales_unit_price=VALUES(sales_unit_price),
                                consumption_per_unit=VALUES(consumption_per_unit),
                                stock_quantity=VALUES(stock_quantity),
                                min_stock_alert=VALUES(min_stock_alert),
                                stock_movements=VALUES(stock_movements),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['raw_materials'] as $mat) {
            $deletedAt = !empty($mat['deleted_at']) ? date('Y-m-d H:i:s', strtotime($mat['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($mat['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($mat['updated_at']));
            $suppId = !empty($mat['supplier_id']) ? $mat['supplier_id'] : null;
            $unitPrice = floatval($mat['unit_price'] ?? 0);
            $salesUnitPrice = floatval($mat['sales_unit_price'] ?? 0);
            $consumption = floatval($mat['consumption_per_unit'] ?? 0);
            $movements = isset($mat['stock_movements']) ? (is_string($mat['stock_movements']) ? $mat['stock_movements'] : json_encode($mat['stock_movements'])) : null;

            $stmt->bind_param("ssssssssdddddssss", 
                $mat['id'], 
                $mat['category'],
                $mat['material_name'], 
                $suppId,
                $mat['size'],
                $mat['thickness_gsm'],
                $mat['color_print'],
                $mat['unit'], 
                $unitPrice,
                $salesUnitPrice,
                $consumption,
                $mat['stock_quantity'], 
                $mat['min_stock_alert'], 
                $movements,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedMaterials++;
                $syncedIds['raw_materials'][] = $mat['id'];
            } else {
                $failedCount++;
                error_log("Error syncing raw material " . $mat['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['raw_materials']);
    }
}

if (isset($data['customers']) && is_array($data['customers'])) {
    $stmt = $conn->prepare("INSERT INTO customers (id, customer_name, company_name, mobile_number, address, account_balance, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                customer_name=VALUES(customer_name),
                                company_name=VALUES(company_name), 
                                mobile_number=VALUES(mobile_number),
                                address=VALUES(address),
                                account_balance=VALUES(account_balance),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['customers'] as $cust) {
            $deletedAt = !empty($cust['deleted_at']) ? date('Y-m-d H:i:s', strtotime($cust['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($cust['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($cust['updated_at']));

            $stmt->bind_param("sssssdsss", 
                $cust['id'], 
                $cust['customer_name'],
                $cust['company_name'], 
                $cust['mobile_number'],
                $cust['address'],
                $cust['account_balance'], 
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedCustomers++;
                $syncedIds['customers'][] = $cust['id'];
            } else {
                $failedCount++;
                error_log("Error syncing customer " . $cust['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['customers']);
    }
}

if (isset($data['sales_orders']) && is_array($data['sales_orders'])) {
    ensureColumn($conn, 'sales_orders', 'employee_id', 'VARCHAR(36) NULL AFTER customer_id');
    ensureColumn($conn, 'sales_orders', 'quotation_id', 'VARCHAR(36) NULL AFTER employee_id');
    ensureColumn($conn, 'sales_orders', 'subtotal', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER order_date');
    ensureColumn($conn, 'sales_orders', 'discount_amount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER subtotal');
    ensureColumn($conn, 'sales_orders', 'discount_percent', 'DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER discount_amount');
    ensureColumn($conn, 'sales_orders', 'remaining_amount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER amount_paid');
    ensureColumn($conn, 'sales_orders', 'notes', 'TEXT NULL AFTER payment_status');

    $stmt = $conn->prepare("INSERT INTO sales_orders (id, customer_id, employee_id, quotation_id, order_date, subtotal, discount_amount, discount_percent, total_amount, amount_paid, remaining_amount, payment_status, notes, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                customer_id=VALUES(customer_id),
                                employee_id=VALUES(employee_id),
                                quotation_id=VALUES(quotation_id),
                                order_date=VALUES(order_date), 
                                subtotal=VALUES(subtotal),
                                discount_amount=VALUES(discount_amount),
                                discount_percent=VALUES(discount_percent),
                                total_amount=VALUES(total_amount),
                                amount_paid=VALUES(amount_paid),
                                remaining_amount=VALUES(remaining_amount),
                                payment_status=VALUES(payment_status),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['sales_orders'] as $order) {
            $deletedAt = !empty($order['deleted_at']) ? date('Y-m-d H:i:s', strtotime($order['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($order['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($order['updated_at']));
            $empId = !empty($order['employee_id']) ? $order['employee_id'] : null;
            $quoteId = !empty($order['quotation_id']) ? $order['quotation_id'] : null;
            $subtotal = floatval($order['subtotal'] ?? $order['total_amount'] ?? 0);
            $discAmt = floatval($order['discount_amount'] ?? 0);
            $discPct = floatval($order['discount_percent'] ?? 0);
            $totalAmt = floatval($order['total_amount'] ?? 0);
            $paidAmt = floatval($order['amount_paid'] ?? 0);
            $remAmt = isset($order['remaining_amount']) ? floatval($order['remaining_amount']) : max(0.0, $totalAmt - $paidAmt);
            $notes = $order['notes'] ?? null;

            $stmt->bind_param("sssssddddddsssss", 
                $order['id'], 
                $order['customer_id'],
                $empId,
                $quoteId,
                $order['order_date'], 
                $subtotal,
                $discAmt,
                $discPct,
                $totalAmt,
                $paidAmt,
                $remAmt,
                $order['payment_status'], 
                $notes,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedSalesOrders++;
                $syncedIds['sales_orders'][] = $order['id'];
            } else {
                $failedCount++;
                error_log("Error syncing sales order " . $order['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['sales_orders']);
    }
}

if (isset($data['sales_items']) && is_array($data['sales_items'])) {
    ensureColumn($conn, 'sales_order_items', 'raw_material_id', 'VARCHAR(36) NULL AFTER sales_order_id');
    ensureColumn($conn, 'sales_order_items', 'image_data', 'LONGTEXT NULL AFTER total_price');

    $stmt = $conn->prepare("INSERT INTO sales_order_items (id, sales_order_id, raw_material_id, product_name, quantity, unit_price, total_price, image_data, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                sales_order_id=VALUES(sales_order_id),
                                raw_material_id=VALUES(raw_material_id),
                                product_name=VALUES(product_name), 
                                quantity=VALUES(quantity),
                                unit_price=VALUES(unit_price),
                                total_price=VALUES(total_price),
                                image_data=VALUES(image_data),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['sales_items'] as $item) {
            $deletedAt = !empty($item['deleted_at']) ? date('Y-m-d H:i:s', strtotime($item['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($item['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($item['updated_at']));
            $matId = !empty($item['raw_material_id']) ? $item['raw_material_id'] : null;
            $imgData = $item['image_data'] ?? null;

            $stmt->bind_param("ssssdddssss", 
                $item['id'], 
                $item['sales_order_id'],
                $matId,
                $item['product_name'], 
                $item['quantity'],
                $item['unit_price'],
                $item['total_price'], 
                $imgData,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedSalesItems++;
                $syncedIds['sales_items'][] = $item['id'];
            } else {
                $failedCount++;
                error_log("Error syncing sales item " . $item['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['sales_items']);
    }
}

if (isset($data['expenses']) && is_array($data['expenses'])) {
    ensureColumn($conn, 'expenses', 'linked_type', 'VARCHAR(50) NULL AFTER recorded_by');
    ensureColumn($conn, 'expenses', 'linked_id', 'VARCHAR(64) NULL AFTER linked_type');
    ensureColumn($conn, 'expenses', 'payroll_id', 'VARCHAR(64) NULL AFTER linked_id');
    ensureColumn($conn, 'expenses', 'shipping_order_id', 'VARCHAR(64) NULL AFTER payroll_id');
    ensureColumn($conn, 'expenses', 'withdrawal_id', 'VARCHAR(64) NULL AFTER shipping_order_id');
    ensureColumn($conn, 'expenses', 'purchase_order_id', 'VARCHAR(64) NULL AFTER withdrawal_id');

    $stmt = $conn->prepare("INSERT INTO expenses (id, category, amount, expense_date, notes, recorded_by, linked_type, linked_id, payroll_id, shipping_order_id, withdrawal_id, purchase_order_id, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                category=VALUES(category),
                                amount=VALUES(amount), 
                                expense_date=VALUES(expense_date),
                                notes=VALUES(notes),
                                recorded_by=VALUES(recorded_by),
                                linked_type=VALUES(linked_type),
                                linked_id=VALUES(linked_id),
                                payroll_id=VALUES(payroll_id),
                                shipping_order_id=VALUES(shipping_order_id),
                                withdrawal_id=VALUES(withdrawal_id),
                                purchase_order_id=VALUES(purchase_order_id),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['expenses'] as $exp) {
            $deletedAt = !empty($exp['deleted_at']) ? date('Y-m-d H:i:s', strtotime($exp['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($exp['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($exp['updated_at']));
            $linkedType = $exp['linked_type'] ?? null;
            $linkedId = $exp['linked_id'] ?? null;
            $payrollId = $exp['payroll_id'] ?? null;
            $shippingId = $exp['shipping_order_id'] ?? null;
            $withdrawalId = $exp['withdrawal_id'] ?? null;
            $purchaseOrderId = $exp['purchase_order_id'] ?? null;

            $stmt->bind_param("ssdssssssssssss", 
                $exp['id'], 
                $exp['category'],
                $exp['amount'], 
                $exp['expense_date'],
                $exp['notes'],
                $exp['recorded_by'], 
                $linkedType,
                $linkedId,
                $payrollId,
                $shippingId,
                $withdrawalId,
                $purchaseOrderId,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedExpenses++;
                $syncedIds['expenses'][] = $exp['id'];
            } else {
                $failedCount++;
                error_log("Error syncing expense " . $exp['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['expenses']);
    }
}

if (isset($data['suppliers']) && is_array($data['suppliers'])) {
    ensureColumn($conn, 'suppliers', 'address', 'TEXT NULL AFTER mobile_number');

    $stmt = $conn->prepare("INSERT INTO suppliers (id, supplier_name, contact_person, mobile_number, address, account_balance, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                supplier_name=VALUES(supplier_name),
                                contact_person=VALUES(contact_person), 
                                mobile_number=VALUES(mobile_number),
                                address=VALUES(address),
                                account_balance=VALUES(account_balance),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['suppliers'] as $supp) {
            $deletedAt = !empty($supp['deleted_at']) ? date('Y-m-d H:i:s', strtotime($supp['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($supp['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($supp['updated_at']));
            $addr = $supp['address'] ?? null;

            $stmt->bind_param("sssssdsss", 
                $supp['id'], 
                $supp['supplier_name'],
                $supp['contact_person'], 
                $supp['mobile_number'],
                $addr,
                $supp['account_balance'], 
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedSuppliers++;
                $syncedIds['suppliers'][] = $supp['id'];
            } else {
                $failedCount++;
                error_log("Error syncing supplier " . $supp['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['suppliers']);
    }
}

if (isset($data['purchase_orders']) && is_array($data['purchase_orders'])) {
    ensureColumn($conn, 'purchase_orders', 'employee_id', 'VARCHAR(36) NULL AFTER supplier_id');
    ensureColumn($conn, 'purchase_orders', 'subtotal', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER order_date');
    ensureColumn($conn, 'purchase_orders', 'discount_amount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER subtotal');
    ensureColumn($conn, 'purchase_orders', 'discount_percent', 'DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER discount_amount');
    ensureColumn($conn, 'purchase_orders', 'remaining_amount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER amount_paid');
    ensureColumn($conn, 'purchase_orders', 'notes', 'TEXT NULL AFTER payment_status');

    $stmt = $conn->prepare("INSERT INTO purchase_orders (id, supplier_id, employee_id, order_date, subtotal, discount_amount, discount_percent, total_amount, amount_paid, remaining_amount, payment_status, notes, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                supplier_id=VALUES(supplier_id),
                                employee_id=VALUES(employee_id),
                                order_date=VALUES(order_date), 
                                subtotal=VALUES(subtotal),
                                discount_amount=VALUES(discount_amount),
                                discount_percent=VALUES(discount_percent),
                                total_amount=VALUES(total_amount),
                                amount_paid=VALUES(amount_paid),
                                remaining_amount=VALUES(remaining_amount),
                                payment_status=VALUES(payment_status),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['purchase_orders'] as $order) {
            $deletedAt = !empty($order['deleted_at']) ? date('Y-m-d H:i:s', strtotime($order['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($order['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($order['updated_at']));
            $empId = !empty($order['employee_id']) ? $order['employee_id'] : null;
            $subtotal = floatval($order['subtotal'] ?? $order['total_amount'] ?? 0);
            $discAmt = floatval($order['discount_amount'] ?? 0);
            $discPct = floatval($order['discount_percent'] ?? 0);
            $totalAmt = floatval($order['total_amount'] ?? 0);
            $paidAmt = floatval($order['amount_paid'] ?? 0);
            $remAmt = isset($order['remaining_amount']) ? floatval($order['remaining_amount']) : max(0.0, $totalAmt - $paidAmt);
            $notes = $order['notes'] ?? null;

            $stmt->bind_param("ssssddddddsssss", 
                $order['id'], 
                $order['supplier_id'],
                $empId,
                $order['order_date'], 
                $subtotal,
                $discAmt,
                $discPct,
                $totalAmt,
                $paidAmt,
                $remAmt,
                $order['payment_status'], 
                $notes,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedPurchaseOrders++;
                $syncedIds['purchase_orders'][] = $order['id'];
            } else {
                $failedCount++;
                error_log("Error syncing purchase order " . $order['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['purchase_orders']);
    }
}

if (isset($data['users']) && is_array($data['users'])) {
    ensureColumn($conn, 'users', 'permissions', 'LONGTEXT NULL AFTER pin_code');

    $stmt = $conn->prepare("INSERT INTO users (id, employee_id, username, password_hash, role, pin_code, permissions, is_active, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                employee_id=VALUES(employee_id),
                                username=VALUES(username), 
                                password_hash=VALUES(password_hash),
                                role=VALUES(role),
                                pin_code=VALUES(pin_code),
                                permissions=VALUES(permissions),
                                is_active=VALUES(is_active),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['users'] as $u) {
            $deletedAt = !empty($u['deleted_at']) ? date('Y-m-d H:i:s', strtotime($u['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($u['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($u['updated_at']));

            // Keep SHA-256 hex hashes intact so restoring backups back into IndexedDB does not break WebCrypto login
            $pwd = $u['password_hash'] ?? '';
            if ($pwd !== '' && !preg_match('/^[a-f0-9]{64}$/i', $pwd) && substr($pwd, 0, 4) !== '$2y$' && substr($pwd, 0, 4) !== '$2a$') {
                $pwd = hash('sha256', $pwd);
            }

            $isActive = ($u['is_active'] ?? true) ? 1 : 0;
            $empId = !empty($u['employee_id']) ? $u['employee_id'] : null;
            $perms = isset($u['permissions']) ? (is_string($u['permissions']) ? $u['permissions'] : json_encode($u['permissions'])) : null;

            $stmt->bind_param("sssssssisss", 
                $u['id'], 
                $empId,
                $u['username'], 
                $pwd,
                $u['role'],
                $u['pin_code'], 
                $perms,
                $isActive,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedUsers++;
                $syncedIds['users'][] = $u['id'];
            } else {
                $failedCount++;
                error_log("Error syncing user " . $u['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['users']);
    }
}

if (isset($data['purchase_items']) && is_array($data['purchase_items'])) {
    @$conn->query("ALTER TABLE purchase_order_items MODIFY COLUMN raw_material_id VARCHAR(36) NULL");
    ensureColumn($conn, 'purchase_order_items', 'product_name', 'VARCHAR(150) NULL AFTER raw_material_id');
    ensureColumn($conn, 'purchase_order_items', 'image_data', 'LONGTEXT NULL AFTER total_price');

    $stmt = $conn->prepare("INSERT INTO purchase_order_items (id, purchase_order_id, raw_material_id, product_name, quantity, unit_price, total_price, image_data, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                purchase_order_id=VALUES(purchase_order_id),
                                raw_material_id=VALUES(raw_material_id), 
                                product_name=VALUES(product_name),
                                quantity=VALUES(quantity),
                                unit_price=VALUES(unit_price),
                                total_price=VALUES(total_price),
                                image_data=VALUES(image_data),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['purchase_items'] as $item) {
            $deletedAt = !empty($item['deleted_at']) ? date('Y-m-d H:i:s', strtotime($item['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($item['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($item['updated_at']));
            $matId = !empty($item['raw_material_id']) ? $item['raw_material_id'] : null;
            $prodName = $item['product_name'] ?? null;
            $imgData = $item['image_data'] ?? null;

            $stmt->bind_param("ssssdddssss", 
                $item['id'], 
                $item['purchase_order_id'],
                $matId, 
                $prodName,
                $item['quantity'],
                $item['unit_price'],
                $item['total_price'], 
                $imgData,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedPurchaseItems++;
                $syncedIds['purchase_items'][] = $item['id'];
            } else {
                $failedCount++;
                error_log("Error syncing purchase order item " . $item['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['purchase_items']);
    }
}

if (isset($data['quotations']) && is_array($data['quotations'])) {
    ensureColumn($conn, 'quotations', 'employee_id', 'VARCHAR(36) NULL AFTER customer_id');
    ensureColumn($conn, 'quotations', 'subtotal', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER quote_date');
    ensureColumn($conn, 'quotations', 'discount_amount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER subtotal');
    ensureColumn($conn, 'quotations', 'discount_percent', 'DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER discount_amount');

    $stmt = $conn->prepare("INSERT INTO quotations (id, customer_id, employee_id, quote_date, subtotal, discount_amount, discount_percent, total_amount, status, notes, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                customer_id=VALUES(customer_id),
                                employee_id=VALUES(employee_id),
                                quote_date=VALUES(quote_date), 
                                subtotal=VALUES(subtotal),
                                discount_amount=VALUES(discount_amount),
                                discount_percent=VALUES(discount_percent),
                                total_amount=VALUES(total_amount),
                                status=VALUES(status),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['quotations'] as $quote) {
            $deletedAt = !empty($quote['deleted_at']) ? date('Y-m-d H:i:s', strtotime($quote['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($quote['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($quote['updated_at']));
            $empId = !empty($quote['employee_id']) ? $quote['employee_id'] : null;
            $subtotal = floatval($quote['subtotal'] ?? $quote['total_amount'] ?? 0);
            $discAmt = floatval($quote['discount_amount'] ?? 0);
            $discPct = floatval($quote['discount_percent'] ?? 0);
            $totalAmt = floatval($quote['total_amount'] ?? 0);
            $status = !empty($quote['status']) ? strval($quote['status']) : 'DRAFT';
            $notes = $quote['notes'] ?? null;

            $stmt->bind_param("ssssddddsssss", 
                $quote['id'], 
                $quote['customer_id'],
                $empId,
                $quote['quote_date'], 
                $subtotal,
                $discAmt,
                $discPct,
                $totalAmt,
                $status,
                $notes,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedQuotations++;
                $syncedIds['quotations'][] = $quote['id'];
            } else {
                $failedCount++;
                error_log("Error syncing quotation " . $quote['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['quotations']);
    }
}

if (isset($data['quotation_items']) && is_array($data['quotation_items'])) {
    ensureColumn($conn, 'quotation_items', 'raw_material_id', 'VARCHAR(36) NULL AFTER quotation_id');

    $stmt = $conn->prepare("INSERT INTO quotation_items (id, quotation_id, raw_material_id, product_name, quantity, unit_price, total_price, image_data, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                quotation_id=VALUES(quotation_id),
                                raw_material_id=VALUES(raw_material_id),
                                product_name=VALUES(product_name), 
                                quantity=VALUES(quantity),
                                unit_price=VALUES(unit_price),
                                total_price=VALUES(total_price),
                                image_data=VALUES(image_data),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['quotation_items'] as $item) {
            $deletedAt = !empty($item['deleted_at']) ? date('Y-m-d H:i:s', strtotime($item['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($item['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($item['updated_at']));
            $matId = !empty($item['raw_material_id']) ? $item['raw_material_id'] : null;

            $stmt->bind_param("ssssdddssss", 
                $item['id'], 
                $item['quotation_id'],
                $matId,
                $item['product_name'], 
                $item['quantity'],
                $item['unit_price'],
                $item['total_price'],
                $item['image_data'],
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedQuotationItems++;
                $syncedIds['quotation_items'][] = $item['id'];
            } else {
                $failedCount++;
                error_log("Error syncing quotation item " . $item['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['quotation_items']);
    }
}

if (isset($data['work_orders']) && is_array($data['work_orders'])) {
    @$conn->query("ALTER TABLE work_orders MODIFY COLUMN sales_order_id VARCHAR(36) NULL");
    @$conn->query("ALTER TABLE work_orders MODIFY COLUMN employee_1 VARCHAR(36) NULL");
    ensureColumn($conn, 'work_orders', 'product_name', 'VARCHAR(200) NULL AFTER sales_order_id');
    ensureColumn($conn, 'work_orders', 'item_name', 'VARCHAR(200) NULL AFTER product_name');
    ensureColumn($conn, 'work_orders', 'quantity', 'DECIMAL(10, 2) DEFAULT 1.00 AFTER item_name');
    ensureColumn($conn, 'work_orders', 'employee_1', 'VARCHAR(36) NULL');
    ensureColumn($conn, 'work_orders', 'employee_2', 'VARCHAR(36) NULL');
    ensureColumn($conn, 'work_orders', 'employee_3', 'VARCHAR(36) NULL');
    ensureColumn($conn, 'work_orders', 'employee_4', 'VARCHAR(36) NULL');
    ensureColumn($conn, 'work_orders', 'employee_5', 'VARCHAR(36) NULL');
    ensureColumn($conn, 'work_orders', 'employee_6', 'VARCHAR(36) NULL');
    ensureColumn($conn, 'work_orders', 'notes', 'TEXT NULL');
    ensureColumn($conn, 'work_orders', 'bom_deducted', 'BOOLEAN DEFAULT FALSE');
    ensureColumn($conn, 'work_orders', 'bom_units_produced', 'DECIMAL(10, 2) DEFAULT 0.00');
    ensureColumn($conn, 'work_orders', 'bom_movements', 'LONGTEXT NULL');

    $stmt = $conn->prepare("INSERT INTO work_orders (id, sales_order_id, product_name, item_name, quantity, employee_1, employee_2, employee_3, employee_4, employee_5, employee_6, status, start_date, end_date, notes, bom_deducted, bom_units_produced, bom_movements, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                sales_order_id=VALUES(sales_order_id),
                                product_name=VALUES(product_name),
                                item_name=VALUES(item_name),
                                quantity=VALUES(quantity),
                                employee_1=VALUES(employee_1),
                                employee_2=VALUES(employee_2),
                                employee_3=VALUES(employee_3),
                                employee_4=VALUES(employee_4),
                                employee_5=VALUES(employee_5),
                                employee_6=VALUES(employee_6),
                                status=VALUES(status), 
                                start_date=VALUES(start_date),
                                end_date=VALUES(end_date),
                                notes=VALUES(notes),
                                bom_deducted=VALUES(bom_deducted),
                                bom_units_produced=VALUES(bom_units_produced),
                                bom_movements=VALUES(bom_movements),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['work_orders'] as $wo) {
            $deletedAt = !empty($wo['deleted_at']) ? date('Y-m-d H:i:s', strtotime($wo['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($wo['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($wo['updated_at']));
            $soId = !empty($wo['sales_order_id']) ? $wo['sales_order_id'] : null;
            $prodName = $wo['product_name'] ?? $wo['item_name'] ?? null;
            $itemName = $wo['item_name'] ?? $wo['product_name'] ?? null;
            $qty = floatval($wo['quantity'] ?? 1);
            $e1 = !empty($wo['employee_1']) ? $wo['employee_1'] : null;
            $e2 = !empty($wo['employee_2']) ? $wo['employee_2'] : null;
            $e3 = !empty($wo['employee_3']) ? $wo['employee_3'] : null;
            $e4 = !empty($wo['employee_4']) ? $wo['employee_4'] : null;
            $e5 = !empty($wo['employee_5']) ? $wo['employee_5'] : null;
            $e6 = !empty($wo['employee_6']) ? $wo['employee_6'] : null;
            $startDate = !empty($wo['start_date']) ? $wo['start_date'] : null;
            $endDate = !empty($wo['end_date']) ? $wo['end_date'] : null;
            $notes = $wo['notes'] ?? null;
            $bomDeducted = !empty($wo['bom_deducted']) ? 1 : 0;
            $bomUnits = floatval($wo['bom_units_produced'] ?? 0);
            $bomMovements = isset($wo['bom_movements']) ? (is_string($wo['bom_movements']) ? $wo['bom_movements'] : json_encode($wo['bom_movements'])) : null;

            $stmt->bind_param("ssssdssssssssssidssss", 
                $wo['id'], 
                $soId,
                $prodName,
                $itemName,
                $qty,
                $e1,
                $e2,
                $e3,
                $e4,
                $e5,
                $e6,
                $wo['status'], 
                $startDate,
                $endDate,
                $notes,
                $bomDeducted,
                $bomUnits,
                $bomMovements,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedWorkOrders++;
                $syncedIds['work_orders'][] = $wo['id'];
            } else {
                $failedCount++;
                error_log("Error syncing work order " . $wo['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['work_orders']);
    }
}

if (isset($data['payroll']) && is_array($data['payroll'])) {
    ensureColumn($conn, 'payroll', 'loan_deductions', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER deductions');
    ensureColumn($conn, 'payroll', 'payment_status', "VARCHAR(20) DEFAULT 'UNPAID' AFTER status");
    ensureColumn($conn, 'payroll', 'payment_date', 'DATE NULL AFTER payment_status');
    ensureColumn($conn, 'payroll', 'notes', 'TEXT NULL AFTER payment_date');

    $stmt = $conn->prepare("INSERT INTO payroll (id, employee_id, period_start, period_end, base_salary, production_bonus, deductions, loan_deductions, net_pay, status, payment_status, payment_date, notes, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                employee_id=VALUES(employee_id),
                                period_start=VALUES(period_start), 
                                period_end=VALUES(period_end),
                                base_salary=VALUES(base_salary),
                                production_bonus=VALUES(production_bonus),
                                deductions=VALUES(deductions),
                                loan_deductions=VALUES(loan_deductions),
                                net_pay=VALUES(net_pay),
                                status=VALUES(status),
                                payment_status=VALUES(payment_status),
                                payment_date=VALUES(payment_date),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['payroll'] as $pay) {
            $deletedAt = !empty($pay['deleted_at']) ? date('Y-m-d H:i:s', strtotime($pay['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($pay['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($pay['updated_at']));
            $loanDed = isset($pay['loan_deductions']) ? floatval($pay['loan_deductions']) : 0.00;
            $payStatus = $pay['payment_status'] ?? $pay['status'] ?? 'UNPAID';
            $statusVal = $pay['status'] ?? $payStatus;
            $payDate = !empty($pay['payment_date']) ? $pay['payment_date'] : null;
            $notes = $pay['notes'] ?? null;

            $stmt->bind_param("ssssdddddsssssss", 
                $pay['id'], 
                $pay['employee_id'],
                $pay['period_start'], 
                $pay['period_end'],
                $pay['base_salary'],
                $pay['production_bonus'],
                $pay['deductions'],
                $loanDed,
                $pay['net_pay'],
                $statusVal,
                $payStatus,
                $payDate,
                $notes,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedPayroll++;
                $syncedIds['payroll'][] = $pay['id'];
            } else {
                $failedCount++;
                error_log("Error syncing payroll " . $pay['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['payroll']);
    }
}

if (isset($data['employee_loans']) && is_array($data['employee_loans'])) {
    $conn->query("CREATE TABLE IF NOT EXISTS `employee_loans` (
        `id` VARCHAR(64) PRIMARY KEY,
        `employee_id` VARCHAR(64) NOT NULL,
        `loan_date` DATE NOT NULL,
        `loan_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        `deduction_frequency` VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
        `installment_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        `total_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        `remaining_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        `start_date` DATE NOT NULL,
        `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        `notes` TEXT NULL,
        `sync_status` VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
        `created_at` DATETIME NULL,
        `updated_at` DATETIME NULL,
        `deleted_at` DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $stmt = $conn->prepare("INSERT INTO employee_loans (id, employee_id, loan_date, loan_amount, deduction_frequency, installment_amount, total_paid, remaining_amount, start_date, status, notes, sync_status, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                employee_id=VALUES(employee_id),
                                loan_date=VALUES(loan_date),
                                loan_amount=VALUES(loan_amount),
                                deduction_frequency=VALUES(deduction_frequency),
                                installment_amount=VALUES(installment_amount),
                                total_paid=VALUES(total_paid),
                                remaining_amount=VALUES(remaining_amount),
                                start_date=VALUES(start_date),
                                status=VALUES(status),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['employee_loans'] as $el) {
            $deletedAt = !empty($el['deleted_at']) ? date('Y-m-d H:i:s', strtotime($el['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($el['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($el['updated_at']));
            $syncStatus = 'SYNCED';

            $stmt->bind_param("sssdsdddsssssss", 
                $el['id'], 
                $el['employee_id'],
                $el['loan_date'], 
                $el['loan_amount'],
                $el['deduction_frequency'],
                $el['installment_amount'],
                $el['total_paid'],
                $el['remaining_amount'],
                $el['start_date'],
                $el['status'],
                $el['notes'],
                $syncStatus,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedEmployeeLoans++;
                $syncedIds['employee_loans'][] = $el['id'];
            } else {
                $failedCount++;
                error_log("Error syncing employee_loans " . $el['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['employee_loans']);
    }
}

$syncedShippingOrders = 0;
if (isset($data['shipping_orders']) && is_array($data['shipping_orders'])) {
    @$conn->query("ALTER TABLE shipping_orders MODIFY COLUMN sales_order_id VARCHAR(36) NULL");
    ensureColumn($conn, 'shipping_orders', 'bill_of_lading_number', 'VARCHAR(100) NULL AFTER vehicle_number');
    ensureColumn($conn, 'shipping_orders', 'notes', 'TEXT NULL AFTER shipping_cost');

    $stmt = $conn->prepare("INSERT INTO shipping_orders (id, sales_order_id, driver_name, vehicle_number, bill_of_lading_number, shipping_date, shipping_status, delivery_address, shipping_cost, notes, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                sales_order_id=VALUES(sales_order_id),
                                driver_name=VALUES(driver_name),
                                vehicle_number=VALUES(vehicle_number),
                                bill_of_lading_number=VALUES(bill_of_lading_number),
                                shipping_date=VALUES(shipping_date),
                                shipping_status=VALUES(shipping_status),
                                delivery_address=VALUES(delivery_address),
                                shipping_cost=VALUES(shipping_cost),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['shipping_orders'] as $shp) {
            $deletedAt = !empty($shp['deleted_at']) ? date('Y-m-d H:i:s', strtotime($shp['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($shp['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($shp['updated_at']));
            $soId = !empty($shp['sales_order_id']) ? $shp['sales_order_id'] : null;
            $bol = $shp['bill_of_lading_number'] ?? $shp['vehicle_number'] ?? null;
            $veh = $shp['vehicle_number'] ?? $shp['bill_of_lading_number'] ?? null;
            $notes = $shp['notes'] ?? null;

            $stmt->bind_param("ssssssssdssss", 
                $shp['id'], 
                $soId,
                $shp['driver_name'], 
                $veh,
                $bol,
                $shp['shipping_date'],
                $shp['shipping_status'],
                $shp['delivery_address'],
                $shp['shipping_cost'],
                $notes,
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedShippingOrders++;
                $syncedIds['shipping_orders'][] = $shp['id'];
            } else {
                $failedCount++;
                error_log("Error syncing shipping_orders " . $shp['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['shipping_orders']);
    }
}

if (isset($data['owner_withdrawals']) && is_array($data['owner_withdrawals'])) {
    $stmt = $conn->prepare("INSERT INTO owner_withdrawals (id, owner_name, amount, withdrawal_date, category, notes, created_at, updated_at, deleted_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                owner_name=VALUES(owner_name),
                                amount=VALUES(amount),
                                withdrawal_date=VALUES(withdrawal_date),
                                category=VALUES(category),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");
    
    if ($stmt) {
        foreach ($data['owner_withdrawals'] as $ow) {
            $deletedAt = !empty($ow['deleted_at']) ? date('Y-m-d H:i:s', strtotime($ow['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($ow['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($ow['updated_at']));

            $stmt->bind_param("ssdssssss", 
                $ow['id'], 
                $ow['owner_name'],
                $ow['amount'], 
                $ow['withdrawal_date'],
                $ow['category'],
                $ow['notes'],
                $createdAt, 
                $updatedAt, 
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedOwnerWithdrawals++;
                $syncedIds['owner_withdrawals'][] = $ow['id'];
            } else {
                $failedCount++;
                error_log("Error syncing owner_withdrawals " . $ow['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['owner_withdrawals']);
    }
}

if (isset($data['stock_movements']) && is_array($data['stock_movements'])) {
    $conn->query("CREATE TABLE IF NOT EXISTS `stock_movements` (
        `id` VARCHAR(64) PRIMARY KEY,
        `material_id` VARCHAR(64) NOT NULL,
        `raw_material_id` VARCHAR(64) NULL,
        `material_name` VARCHAR(200) NULL,
        `unit` VARCHAR(50) NULL,
        `movement_type` VARCHAR(50) NOT NULL,
        `source` VARCHAR(50) NULL,
        `direction` INT NOT NULL DEFAULT 1,
        `quantity` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
        `stock_before` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
        `stock_after` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
        `unit_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `total_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `reference_type` VARCHAR(50) NULL,
        `reference_id` VARCHAR(64) NULL,
        `movement_date` DATE NOT NULL,
        `notes` TEXT NULL,
        `sync_status` VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
        `created_at` DATETIME NULL,
        `updated_at` DATETIME NULL,
        `deleted_at` DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    ensureColumn($conn, 'stock_movements', 'material_id', "VARCHAR(64) NOT NULL DEFAULT '' AFTER id");
    ensureColumn($conn, 'stock_movements', 'source', "VARCHAR(50) NULL AFTER movement_type");
    ensureColumn($conn, 'stock_movements', 'stock_before', "DECIMAL(12, 4) NOT NULL DEFAULT 0.0000 AFTER quantity");
    ensureColumn($conn, 'stock_movements', 'stock_after', "DECIMAL(12, 4) NOT NULL DEFAULT 0.0000 AFTER stock_before");

    $stmt = $conn->prepare("INSERT INTO stock_movements (id, material_id, raw_material_id, material_name, unit, movement_type, source, direction, quantity, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id, movement_date, notes, sync_status, created_at, updated_at, deleted_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                material_id=VALUES(material_id),
                                raw_material_id=VALUES(raw_material_id),
                                material_name=VALUES(material_name),
                                unit=VALUES(unit),
                                movement_type=VALUES(movement_type),
                                source=VALUES(source),
                                direction=VALUES(direction),
                                quantity=VALUES(quantity),
                                stock_before=VALUES(stock_before),
                                stock_after=VALUES(stock_after),
                                unit_cost=VALUES(unit_cost),
                                total_cost=VALUES(total_cost),
                                reference_type=VALUES(reference_type),
                                reference_id=VALUES(reference_id),
                                movement_date=VALUES(movement_date),
                                notes=VALUES(notes),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");

    if ($stmt) {
        foreach ($data['stock_movements'] as $sm) {
            $deletedAt = !empty($sm['deleted_at']) ? date('Y-m-d H:i:s', strtotime($sm['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($sm['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($sm['updated_at']));
            $matId = strval($sm['material_id'] ?? $sm['raw_material_id'] ?? '');
            $matName = $sm['material_name'] ?? null;
            $unit = $sm['unit'] ?? null;
            $movType = strval($sm['movement_type'] ?? 'ADJUSTMENT');
            $source = $sm['source'] ?? $movType;
            $rawDir = $sm['direction'] ?? 1;
            $dir = ($rawDir === 'OUT' || $rawDir === -1 || $rawDir === '-1') ? -1 : 1;
            $qty = floatval($sm['quantity'] ?? 0);
            $stockBefore = floatval($sm['stock_before'] ?? $sm['previous_stock'] ?? 0);
            $stockAfter = floatval($sm['stock_after'] ?? $sm['new_stock'] ?? 0);
            $unitCost = floatval($sm['unit_cost'] ?? 0);
            $totalCost = floatval($sm['total_cost'] ?? ($qty * $unitCost));
            $refType = $sm['reference_type'] ?? null;
            $refId = !empty($sm['reference_id']) ? strval($sm['reference_id']) : null;
            $movDate = !empty($sm['movement_date']) ? substr(strval($sm['movement_date']), 0, 10) : date('Y-m-d');
            $notes = $sm['notes'] ?? null;
            $syncStatus = 'SYNCED';

            $stmt->bind_param("sssssssidddddssssssss",
                $sm['id'],
                $matId,
                $matId,
                $matName,
                $unit,
                $movType,
                $source,
                $dir,
                $qty,
                $stockBefore,
                $stockAfter,
                $unitCost,
                $totalCost,
                $refType,
                $refId,
                $movDate,
                $notes,
                $syncStatus,
                $createdAt,
                $updatedAt,
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedStockMovements++;
                $syncedIds['stock_movements'][] = $sm['id'];
            } else {
                $failedCount++;
                error_log("Error syncing stock_movements " . $sm['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['stock_movements']);
    }
}

if (isset($data['payment_vouchers']) && is_array($data['payment_vouchers'])) {
    $conn->query("CREATE TABLE IF NOT EXISTS `payment_vouchers` (
        `id` VARCHAR(64) PRIMARY KEY,
        `voucher_number` VARCHAR(50) NOT NULL,
        `voucher_type` VARCHAR(20) NOT NULL,
        `voucher_date` DATE NOT NULL,
        `entity_type` VARCHAR(20) NOT NULL,
        `entity_id` VARCHAR(64) NULL,
        `entity_name` VARCHAR(200) NULL,
        `reference_type` VARCHAR(50) NULL,
        `reference_id` VARCHAR(64) NULL,
        `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `payment_method` VARCHAR(30) NOT NULL DEFAULT 'CASH',
        `notes` TEXT NULL,
        `recorded_by` VARCHAR(100) NULL,
        `sync_status` VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
        `created_at` DATETIME NULL,
        `updated_at` DATETIME NULL,
        `deleted_at` DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    ensureColumn($conn, 'payment_vouchers', 'entity_type', "VARCHAR(20) NOT NULL DEFAULT 'customer' AFTER voucher_date");
    ensureColumn($conn, 'payment_vouchers', 'entity_id', "VARCHAR(64) NULL AFTER entity_type");
    ensureColumn($conn, 'payment_vouchers', 'entity_name', "VARCHAR(200) NULL AFTER entity_id");
    ensureColumn($conn, 'payment_vouchers', 'recorded_by', "VARCHAR(100) NULL AFTER notes");

    $stmt = $conn->prepare("INSERT INTO payment_vouchers (id, voucher_number, voucher_type, voucher_date, entity_type, entity_id, entity_name, reference_type, reference_id, amount, payment_method, notes, recorded_by, sync_status, created_at, updated_at, deleted_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                voucher_number=VALUES(voucher_number),
                                voucher_type=VALUES(voucher_type),
                                voucher_date=VALUES(voucher_date),
                                entity_type=VALUES(entity_type),
                                entity_id=VALUES(entity_id),
                                entity_name=VALUES(entity_name),
                                reference_type=VALUES(reference_type),
                                reference_id=VALUES(reference_id),
                                amount=VALUES(amount),
                                payment_method=VALUES(payment_method),
                                notes=VALUES(notes),
                                recorded_by=VALUES(recorded_by),
                                updated_at=VALUES(updated_at),
                                deleted_at=VALUES(deleted_at)");

    if ($stmt) {
        foreach ($data['payment_vouchers'] as $pv) {
            $deletedAt = !empty($pv['deleted_at']) ? date('Y-m-d H:i:s', strtotime($pv['deleted_at'])) : null;
            $createdAt = date('Y-m-d H:i:s', strtotime($pv['created_at']));
            $updatedAt = date('Y-m-d H:i:s', strtotime($pv['updated_at']));
            $vNum = strval($pv['voucher_number'] ?? $pv['id']);
            $vType = strval($pv['voucher_type'] ?? 'RECEIPT');
            $vDate = !empty($pv['voucher_date']) ? substr(strval($pv['voucher_date']), 0, 10) : date('Y-m-d');
            $eType = strval($pv['entity_type'] ?? $pv['party_type'] ?? 'customer');
            $eId = !empty($pv['entity_id']) ? strval($pv['entity_id']) : (!empty($pv['party_id']) ? strval($pv['party_id']) : null);
            $eName = $pv['entity_name'] ?? $pv['party_name'] ?? null;
            $refType = $pv['reference_type'] ?? null;
            $refId = !empty($pv['reference_id']) ? strval($pv['reference_id']) : null;
            $amt = floatval($pv['amount'] ?? 0);
            $method = strval($pv['payment_method'] ?? 'CASH');
            $notes = $pv['notes'] ?? null;
            $recBy = $pv['recorded_by'] ?? null;
            $syncStatus = 'SYNCED';

            $stmt->bind_param("sssssssssdsssssss",
                $pv['id'],
                $vNum,
                $vType,
                $vDate,
                $eType,
                $eId,
                $eName,
                $refType,
                $refId,
                $amt,
                $method,
                $notes,
                $recBy,
                $syncStatus,
                $createdAt,
                $updatedAt,
                $deletedAt
            );

            if ($stmt->execute()) {
                $syncedPaymentVouchers++;
                $syncedIds['payment_vouchers'][] = $pv['id'];
            } else {
                $failedCount++;
                error_log("Error syncing payment_vouchers " . $pv['id'] . ": " . $stmt->error);
            }
        }
        $stmt->close();
    } else {
        $failedCount += count($data['payment_vouchers']);
    }
}

@$conn->query("SET FOREIGN_KEY_CHECKS = 1");

jsonResponse([
    "status" => $failedCount === 0 ? "success" : "partial", 
    "message" => $failedCount === 0 ? "Sync complete" : "Sync completed with $failedCount failed record(s)",
    "failed_count" => $failedCount,
    "synced_ids" => $syncedIds,
    "data" => [
        "employees_synced" => $syncedEmployees,
        "production_synced" => $syncedProduction,
        "attendance_synced" => $syncedAttendance,
        "materials_synced" => $syncedMaterials,
        "customers_synced" => $syncedCustomers,
        "sales_orders_synced" => $syncedSalesOrders,
        "sales_items_synced" => $syncedSalesItems,
        "expenses_synced" => $syncedExpenses,
        "suppliers_synced" => $syncedSuppliers,
        "purchase_orders_synced" => $syncedPurchaseOrders,
        "users_synced" => $syncedUsers,
        "purchase_items_synced" => $syncedPurchaseItems,
        "quotations_synced" => $syncedQuotations,
        "quotation_items_synced" => $syncedQuotationItems,
        "work_orders_synced" => $syncedWorkOrders,
        "payroll_synced" => $syncedPayroll,
        "employee_loans_synced" => $syncedEmployeeLoans,
        "shipping_orders_synced" => $syncedShippingOrders,
        "owner_withdrawals_synced" => $syncedOwnerWithdrawals,
        "stock_movements_synced" => $syncedStockMovements,
        "payment_vouchers_synced" => $syncedPaymentVouchers
    ]
]);
?>
