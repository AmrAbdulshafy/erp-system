<?php
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');

$employee_id = $_GET['employee_id'] ?? null;
$period_start = $_GET['period_start'] ?? null;
$period_end = $_GET['period_end'] ?? null;

if (!$employee_id || !$period_start || !$period_end) {
    jsonResponse([
        'status' => 'error',
        'message' => 'employee_id, period_start, and period_end are required'
    ], 400);
}

// 1. Fetch Employee Details
$empStmt = $conn->prepare("SELECT id, full_name, salary_type, salary_amount FROM employees WHERE id = ? AND deleted_at IS NULL");
$empStmt->bind_param("s", $employee_id);
$empStmt->execute();
$empRes = $empStmt->get_result();
$employee = $empRes->fetch_assoc();

if (!$employee) {
    jsonResponse([
        'status' => 'error',
        'message' => 'Employee not found'
    ], 404);
}

$salary_type = strtoupper($employee['salary_type'] ?? 'MONTHLY');
$salary_amount = floatval($employee['salary_amount'] ?? 0);

// 2. Fetch Attendance within period
$attStmt = $conn->prepare("SELECT id, work_date, status FROM attendance WHERE employee_id = ? AND work_date >= ? AND work_date <= ? AND deleted_at IS NULL");
$attStmt->bind_param("sss", $employee_id, $period_start, $period_end);
$attStmt->execute();
$attRes = $attStmt->get_result();

$present_count = 0;
$absent_count = 0;
$late_count = 0;
$leave_count = 0;

while ($row = $attRes->fetch_assoc()) {
    $st = strtoupper($row['status'] ?? '');
    if ($st === 'PRESENT') {
        $present_count++;
    } elseif ($st === 'ABSENT') {
        $absent_count++;
    } elseif ($st === 'LATE') {
        $late_count++;
    } elseif ($st === 'LEAVE') {
        $leave_count++;
    }
}

// Calculations based on salary_type:
// - MONTHLY: Base salary = salary_amount. Absent deduction = absent_count * (salary_amount / 30).
// - DAILY: Daily rate = salary_amount. Base salary = present_count * salary_amount. Deductions = 0.
// - WEEKLY: Daily rate = salary_amount / 6. Base salary = present_count * (salary_amount / 6). Deductions = 0.
// - PER_PIECE: Base salary = 0. Deductions = 0.
$late_factor = isset($_GET['late_factor']) ? floatval($_GET['late_factor']) : 0.5;
if ($late_factor < 0) $late_factor = 0.5;

$base_salary = 0.00;
$daily_rate = 0.00;
$absence_deduction = 0.00;

if ($salary_type === 'MONTHLY') {
    $base_salary = $salary_amount;
    $daily_rate = $salary_amount > 0 ? ($salary_amount / 30.0) : 0.0;
    $absence_deduction = round($absent_count * $daily_rate, 2);
} elseif ($salary_type === 'DAILY') {
    $daily_rate = $salary_amount;
    $base_salary = round(($present_count + $late_count) * $salary_amount, 2);
    $absence_deduction = 0.00;
} elseif ($salary_type === 'WEEKLY') {
    $daily_rate = $salary_amount > 0 ? ($salary_amount / 6.0) : 0.0;
    $base_salary = round(($present_count + $late_count) * $daily_rate, 2);
    $absence_deduction = 0.00;
} elseif ($salary_type === 'PER_PIECE') {
    $daily_rate = 0.00;
    $base_salary = 0.00;
    $absence_deduction = 0.00;
} else {
    // Default fallback to fixed
    $base_salary = $salary_amount;
    $daily_rate = $salary_amount > 0 ? ($salary_amount / 30.0) : 0.0;
    $absence_deduction = round($absent_count * $daily_rate, 2);
}

$late_deduction = round($late_count * ($daily_rate * $late_factor), 2);
$deductions = round($absence_deduction + $late_deduction, 2);

// 3. Fetch Employee Production within period
$prodStmt = $conn->prepare("SELECT COALESCE(SUM(quantity * rate_per_piece), 0) AS total_bonus, COUNT(*) as count FROM employee_production WHERE employee_id = ? AND production_date >= ? AND production_date <= ? AND deleted_at IS NULL");
$prodStmt->bind_param("sss", $employee_id, $period_start, $period_end);
$prodStmt->execute();
$prodRes = $prodStmt->get_result();
$prodData = $prodRes->fetch_assoc();

$production_bonus = round(floatval($prodData['total_bonus'] ?? 0), 2);
$production_entries_count = intval($prodData['count'] ?? 0);

// 4. Fetch Active Employee Loans within period
$loan_deductions = 0.00;
$loan_breakdown = [];
$active_loans_count = 0;

$checkLoanTable = $conn->query("SHOW TABLES LIKE 'employee_loans'");
if ($checkLoanTable && $checkLoanTable->num_rows > 0) {
    $loanStmt = $conn->prepare("SELECT id, loan_amount, installment_amount, deduction_frequency, total_paid, remaining_amount, start_date, notes FROM employee_loans WHERE employee_id = ? AND (status = 'ACTIVE' OR status IS NULL) AND (start_date IS NULL OR start_date <= ?) AND deleted_at IS NULL");
    if ($loanStmt) {
        $loanStmt->bind_param("ss", $employee_id, $period_end);
        $loanStmt->execute();
        $loanRes = $loanStmt->get_result();

        $pDays = max(1, round((strtotime($period_end) - strtotime($period_start)) / 86400) + 1);
        $available_for_loans = max(0.0, $base_salary + $production_bonus - $deductions);

        while ($loan = $loanRes->fetch_assoc()) {
            $active_loans_count++;
            $loan_amt = floatval($loan['loan_amount'] ?? 0);
            $total_paid = floatval($loan['total_paid'] ?? 0);
            $rem = isset($loan['remaining_amount']) ? floatval($loan['remaining_amount']) : max(0.0, $loan_amt - $total_paid);
            if ($rem <= 0) continue;

            $inst = floatval($loan['installment_amount'] ?? $rem);
            $freq = strtoupper($loan['deduction_frequency'] ?? 'MONTHLY');
            $calc_ded = 0.0;

            if ($freq === 'DAILY') {
                $count = ($salary_type === 'DAILY' && $present_count > 0) ? $present_count : min($pDays, 30);
                $calc_ded = $inst * $count;
            } elseif ($freq === 'WEEKLY') {
                $weeks = max(1, round($pDays / 7.0));
                $calc_ded = $inst * $weeks;
            } else {
                // MONTHLY
                if ($pDays >= 20) {
                    $calc_ded = $inst;
                } else {
                    $calc_ded = round($inst * ($pDays / 30.0), 2);
                }
            }

            $calc_ded = min($calc_ded, $rem);
            $calc_ded = min($calc_ded, $available_for_loans);
            $calc_ded = round($calc_ded, 2);

            if ($calc_ded > 0) {
                $loan_deductions += $calc_ded;
                $available_for_loans -= $calc_ded;
                $loan_breakdown[] = [
                    'loan_id' => $loan['id'],
                    'loan_amount' => $loan_amt,
                    'installment_amount' => $inst,
                    'deduction_frequency' => $freq,
                    'deducted' => $calc_ded,
                    'remaining_before' => $rem,
                    'remaining_after' => max(0.0, $rem - $calc_ded),
                    'notes' => $loan['notes'] ?? ''
                ];
            }
        }
        $loanStmt->close();
    }
}

$loan_deductions = round($loan_deductions, 2);

// 5. Net pay calculation
$net_pay = round($base_salary + $production_bonus - $deductions - $loan_deductions, 2);

jsonResponse([
    'status' => 'success',
    'data' => [
        'employee_id' => $employee_id,
        'employee_name' => $employee['full_name'],
        'salary_type' => $salary_type,
        'salary_amount' => $salary_amount,
        'period_start' => $period_start,
        'period_end' => $period_end,
        'attendance_stats' => [
            'present_count' => $present_count,
            'absent_count' => $absent_count,
            'late_count' => $late_count,
            'leave_count' => $leave_count
        ],
        'production_stats' => [
            'entries_count' => $production_entries_count
        ],
        'base_salary' => $base_salary,
        'production_bonus' => $production_bonus,
        'deductions' => $deductions,
        'loan_deductions' => $loan_deductions,
        'net_pay' => $net_pay,
        'loans' => $loan_breakdown,
        'active_loans_count' => $active_loans_count
    ]
]);
