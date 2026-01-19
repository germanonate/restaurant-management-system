import type { Reservation, Table } from '@/types/models';
import { parseISO, differenceInMinutes, isSameDay } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

export type KPIStatus = 'green' | 'yellow' | 'red';

export interface KPIValue {
  value: number;
  formatted: string;
  status: KPIStatus;
  title: string;
  description: string;
  unit?: string;
}

export interface KPIData {
  capacityUtilization: KPIValue;
  noShowRate: KPIValue;
  pendingConfirmations: KPIValue;
  averagePartySize: KPIValue;
  seatingEfficiency: KPIValue;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCapacityStatus(percentage: number): KPIStatus {
  if (percentage < 70) return 'green';
  if (percentage <= 90) return 'yellow';
  return 'red';
}

function getNoShowStatus(percentage: number): KPIStatus {
  if (percentage < 5) return 'green';
  if (percentage <= 15) return 'yellow';
  return 'red';
}

function getPendingStatus(count: number): KPIStatus {
  if (count <= 5) return 'green';
  if (count <= 15) return 'yellow';
  return 'red';
}

function getPartySizeStatus(avg: number): KPIStatus {
  if (avg >= 4.0) return 'green';
  if (avg >= 2.5) return 'yellow';
  return 'red';
}

function getEfficiencyStatus(minutes: number): KPIStatus {
  if (minutes >= 15 && minutes <= 30) return 'green';
  if (minutes > 30 && minutes <= 45) return 'yellow';
  return 'red';
}

// ============================================================================
// Main Calculation Function
// ============================================================================

export function calculateKPIs(
  reservations: Reservation[],
  tables: Table[],
  selectedDate: Date
): KPIData {
  // Filter reservations for selected date
  const dayReservations = reservations.filter((r) =>
    isSameDay(parseISO(r.startTime), selectedDate)
  );

  // Exclude cancelled reservations for most calculations
  const activeReservations = dayReservations.filter((r) => r.status !== 'CANCELLED');

  // 1. Capacity Utilization
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity.max, 0);
  const totalReservedSeats = activeReservations.reduce((sum, r) => sum + r.partySize, 0);
  const capacityUtilization = totalCapacity > 0 ? (totalReservedSeats / totalCapacity) * 100 : 0;

  // 2. No-Show Rate
  const completedOrNoShow = dayReservations.filter(
    (r) => r.status === 'FINISHED' || r.status === 'NO_SHOW' || r.status === 'SEATED'
  );
  const noShows = dayReservations.filter((r) => r.status === 'NO_SHOW');
  const noShowRate = completedOrNoShow.length > 0
    ? (noShows.length / completedOrNoShow.length) * 100
    : 0;

  // 3. Pending Confirmations
  const pendingCount = dayReservations.filter((r) => r.status === 'PENDING').length;

  // 4. Average Party Size
  const avgPartySize = activeReservations.length > 0
    ? activeReservations.reduce((sum, r) => sum + r.partySize, 0) / activeReservations.length
    : 0;

  // 5. Seating Efficiency (average gap between reservations on same table)
  const gapMinutes = calculateAverageGap(activeReservations);

  return {
    capacityUtilization: {
      value: capacityUtilization,
      formatted: `${capacityUtilization.toFixed(1)}%`,
      status: getCapacityStatus(capacityUtilization),
      title: 'Capacity Utilization',
      description: '% of total seats reserved. Green <70% | Yellow 70-90% | Red >90%',
      unit: '%',
    },
    noShowRate: {
      value: noShowRate,
      formatted: `${noShowRate.toFixed(1)}%`,
      status: getNoShowStatus(noShowRate),
      title: 'No-Show Rate',
      description: "% of reservations that didn't show up. Green <5% | Yellow 5-15% | Red >15%",
      unit: '%',
    },
    pendingConfirmations: {
      value: pendingCount,
      formatted: pendingCount.toString(),
      status: getPendingStatus(pendingCount),
      title: 'Pending Confirmations',
      description: 'Number of reservations awaiting confirmation. Green 0-5 | Yellow 6-15 | Red >15',
    },
    averagePartySize: {
      value: avgPartySize,
      formatted: avgPartySize.toFixed(1),
      status: getPartySizeStatus(avgPartySize),
      title: 'Average Party Size',
      description: 'Average guests per reservation. Green ≥4.0 | Yellow 2.5-3.9 | Red <2.5',
    },
    seatingEfficiency: {
      value: gapMinutes,
      formatted: `${Math.round(gapMinutes)} min`,
      status: getEfficiencyStatus(gapMinutes),
      title: 'Seating Efficiency',
      description: 'Average gap time between reservations on same table. Green 15-30min | Yellow 30-45min | Red >45min or <15min',
      unit: 'min',
    },
  };
}

function calculateAverageGap(reservations: Reservation[]): number {
  // Group reservations by table
  const byTable = new Map<string, Reservation[]>();
  for (const res of reservations) {
    const list = byTable.get(res.tableId) || [];
    list.push(res);
    byTable.set(res.tableId, list);
  }

  const gaps: number[] = [];

  for (const tableReservations of byTable.values()) {
    if (tableReservations.length < 2) continue;

    // Sort by start time
    const sorted = [...tableReservations].sort(
      (a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
    );

    // Calculate gaps between consecutive reservations
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = parseISO(sorted[i - 1].endTime);
      const currStart = parseISO(sorted[i].startTime);
      const gap = differenceInMinutes(currStart, prevEnd);
      if (gap >= 0) {
        gaps.push(gap);
      }
    }
  }

  if (gaps.length === 0) return 30; // Default to optimal if no data
  return gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
}
