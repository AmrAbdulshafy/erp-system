import { db } from '../db';
import { getCompanyProfile } from './companyProfile';
import { getApiHeaders } from './apiClient';

/**
 * Calculates payroll components (base_salary, production_bonus, deductions, net_pay)
 * for a specific employee and date range based on local Dexie IndexedDB records.
 *
 * @param {string} employeeId
 * @param {string} periodStart (YYYY-MM-DD)
 * @param {string} periodEnd (YYYY-MM-DD)
 * @returns {Promise<{
 *   base_salary: number,
 *   production_bonus: number,
 *   deductions: number,
 *   net_pay: number,
 *   details: object
 * }>}
 */
export async function calculatePayrollLocally(employeeId, periodStart, periodEnd) {
  if (!employeeId || !periodStart || !periodEnd) {
    return null;
  }

  // 1. Employee Info
  const employee = await db.employees.get(employeeId);
  if (!employee) return null;

  const salaryType = (employee.salary_type || 'MONTHLY').toUpperCase();
  const salaryAmount = Number(employee.salary_amount) || 0;

  // 2. Attendance within range
  const attendanceRecords = await db.attendance
    .filter(a => 
      !a.deleted_at &&
      a.employee_id === employeeId &&
      a.work_date >= periodStart &&
      a.work_date <= periodEnd
    )
    .toArray();

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;

  attendanceRecords.forEach(att => {
    const status = (att.status || '').toUpperCase();
    if (status === 'PRESENT') presentCount++;
    else if (status === 'ABSENT') absentCount++;
    else if (status === 'LATE') lateCount++;
    else if (status === 'LEAVE') leaveCount++;
  });

  // Calculate Base Salary & Deductions (Absence + Late Deduction)
  const profile = getCompanyProfile();
  const parsedLateFactor = profile?.late_deduction_days !== '' && profile?.late_deduction_days !== undefined && profile?.late_deduction_days !== null
    ? Number(profile.late_deduction_days)
    : 0.5;
  const lateFactor = Number.isFinite(parsedLateFactor) && parsedLateFactor >= 0 ? parsedLateFactor : 0.5;

  let baseSalary = 0;
  let dailyRate = 0;
  let absenceDeduction = 0;

  if (salaryType === 'MONTHLY') {
    baseSalary = salaryAmount;
    dailyRate = salaryAmount > 0 ? salaryAmount / 30.0 : 0;
    absenceDeduction = Math.round((absentCount * dailyRate) * 100) / 100;
  } else if (salaryType === 'DAILY') {
    dailyRate = salaryAmount;
    baseSalary = Math.round(((presentCount + lateCount) * salaryAmount) * 100) / 100;
    absenceDeduction = 0;
  } else if (salaryType === 'WEEKLY') {
    dailyRate = salaryAmount > 0 ? salaryAmount / 6.0 : 0;
    baseSalary = Math.round(((presentCount + lateCount) * dailyRate) * 100) / 100;
    absenceDeduction = 0;
  } else if (salaryType === 'PER_PIECE') {
    dailyRate = 0;
    baseSalary = 0;
    absenceDeduction = 0;
  } else {
    baseSalary = salaryAmount;
    dailyRate = salaryAmount > 0 ? salaryAmount / 30.0 : 0;
    absenceDeduction = Math.round((absentCount * dailyRate) * 100) / 100;
  }

  // Late deduction = lateCount * (dailyRate / 2) by default (configurable via late_deduction_days in settings)
  const lateDeduction = Math.round((lateCount * (dailyRate * lateFactor)) * 100) / 100;
  const deductions = Math.round((absenceDeduction + lateDeduction) * 100) / 100;

  // 3. Employee Production within range
  const productionRecords = await db.employee_production
    .filter(p =>
      !p.deleted_at &&
      p.employee_id === employeeId &&
      p.production_date >= periodStart &&
      p.production_date <= periodEnd
    )
    .toArray();

  const productionBonus = Math.round(
    productionRecords.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate_per_piece) || 0;
      return sum + (qty * rate);
    }, 0) * 100
  ) / 100;

  // 3.5. Employee Loans & Auto Deductions within range
  let loanDeductions = 0;
  const loanBreakdown = [];

  const activeLoans = db.employee_loans ? await db.employee_loans
    .filter(l => 
      !l.deleted_at &&
      l.employee_id === employeeId &&
      (l.status === 'ACTIVE' || !l.status) &&
      (!l.start_date || l.start_date <= periodEnd)
    )
    .toArray() : [];

  const periodDays = Math.max(1, Math.round((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 3600 * 24)) + 1);
  let availableForLoans = Math.max(0, baseSalary + productionBonus - deductions);

  for (const loan of activeLoans) {
    const loanAmount = Number(loan.loan_amount) || 0;
    const totalPaid = Number(loan.total_paid) || 0;
    const remaining = loan.remaining_amount !== undefined ? Number(loan.remaining_amount) : Math.max(0, loanAmount - totalPaid);
    if (remaining <= 0) continue;

    const installment = Number(loan.installment_amount) || remaining;
    const freq = (loan.deduction_frequency || 'MONTHLY').toUpperCase();
    let calculatedDeduction = 0;

    if (freq === 'DAILY') {
      const count = (salaryType === 'DAILY' && presentCount > 0) ? presentCount : Math.min(periodDays, 30);
      calculatedDeduction = installment * count;
    } else if (freq === 'WEEKLY') {
      const weeks = Math.max(1, Math.round(periodDays / 7));
      calculatedDeduction = installment * weeks;
    } else {
      // MONTHLY
      if (periodDays >= 20) {
        calculatedDeduction = installment;
      } else {
        calculatedDeduction = Math.round((installment * (periodDays / 30.0)) * 100) / 100;
      }
    }

    calculatedDeduction = Math.min(calculatedDeduction, remaining);
    calculatedDeduction = Math.min(calculatedDeduction, availableForLoans);
    calculatedDeduction = Math.round(calculatedDeduction * 100) / 100;

    if (calculatedDeduction > 0) {
      loanDeductions += calculatedDeduction;
      availableForLoans -= calculatedDeduction;
      loanBreakdown.push({
        loan_id: loan.id,
        loan_amount: loanAmount,
        installment_amount: installment,
        deduction_frequency: freq,
        deducted: calculatedDeduction,
        remaining_before: remaining,
        remaining_after: Math.max(0, remaining - calculatedDeduction),
        notes: loan.notes || ''
      });
    }
  }

  loanDeductions = Math.round(loanDeductions * 100) / 100;

  // 4. Net Pay
  const netPay = Math.round((baseSalary + productionBonus - deductions - loanDeductions) * 100) / 100;

  return {
    base_salary: baseSalary,
    production_bonus: productionBonus,
    deductions: deductions,
    loan_deductions: loanDeductions,
    net_pay: netPay,
    details: {
      salary_type: salaryType,
      salary_amount: salaryAmount,
      attendance: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        leave: leaveCount,
        total_records: attendanceRecords.length
      },
      daily_rate: Math.round(dailyRate * 100) / 100,
      absence_deduction: absenceDeduction,
      late_deduction: lateDeduction,
      late_deduction_factor: lateFactor,
      production_entries: productionRecords.length,
      loans: loanBreakdown,
      active_loans_count: activeLoans.length
    }
  };
}

/**
 * Uses local Dexie IndexedDB first (primary offline-first source of truth with unsynced records),
 * falling back to the online PHP API only if the employee record is not in local IndexedDB.
 */
export async function calculatePayroll(employeeId, periodStart, periodEnd) {
  const local = await calculatePayrollLocally(employeeId, periodStart, periodEnd);
  if (local) {
    local.details.source = 'offline_local';
    return local;
  }

  try {
    const profile = getCompanyProfile();
    const parsedLateFactor = profile?.late_deduction_days !== '' && profile?.late_deduction_days !== undefined && profile?.late_deduction_days !== null
      ? Number(profile.late_deduction_days)
      : 0.5;
    const lateFactor = Number.isFinite(parsedLateFactor) && parsedLateFactor >= 0 ? parsedLateFactor : 0.5;

    const res = await fetch(`/api/calculate_payroll.php?employee_id=${encodeURIComponent(employeeId)}&period_start=${encodeURIComponent(periodStart)}&period_end=${encodeURIComponent(periodEnd)}&late_factor=${encodeURIComponent(lateFactor)}`, {
      headers: getApiHeaders()
    });
    if (res.ok) {
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Response was not JSON (e.g. server error or HTML)
      }
      if (json && json.status === 'success' && json.data) {
        return {
          base_salary: json.data.base_salary,
          production_bonus: json.data.production_bonus,
          deductions: json.data.deductions,
          loan_deductions: json.data.loan_deductions || 0,
          net_pay: json.data.net_pay,
          details: {
            salary_type: json.data.salary_type,
            salary_amount: json.data.salary_amount,
            attendance: {
              present: json.data.attendance_stats.present_count,
              absent: json.data.attendance_stats.absent_count,
              late: json.data.attendance_stats.late_count,
              leave: json.data.attendance_stats.leave_count,
            },
            production_entries: json.data.production_stats.entries_count,
            loans: json.data.loans || [],
            source: 'online'
          }
        };
      }
    }
  } catch (e) {
    // offline or server unreachable
  }

  return null;
}
