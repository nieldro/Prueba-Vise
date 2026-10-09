import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MovementReason, MovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface DayRow {
  day: string;
  entries: number;
  exits: number;
}

export interface CalendarDay {
  day: string;
  movements: number;
  entries: number;
  exits: number;
}

export interface CalendarResult {
  month: string;
  days: CalendarDay[];
}

export interface DashboardSummary {
  days: number;
  totals: {
    products: number;
    unitsInStock: number;
    lowStockProducts: number;
    entries: number;
    exits: number;
    previousEntries: number;
    previousExits: number;
  };
  series: DayRow[];
  /** Unidades que salieron en el periodo, agrupadas por motivo (venta, dañado, pérdida...). */
  exitsByReason: Array<{ reason: MovementReason | null; units: number }>;
  latestMovements: Array<{
    id: number;
    type: MovementType;
    quantity: number;
    createdAt: Date;
    product: { id: number; name: string };
  }>;
}

@Injectable()
export class DashboardService {
  private readonly threshold: number;
  private readonly timezone: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.threshold = config.get<number>('LOW_STOCK_THRESHOLD', 10);
    this.timezone = config.get<string>('TZ_NAME', 'America/Bogota');
  }

  async summary(days: number): Promise<DashboardSummary> {
    const [products, stock, lowStockProducts, series, previous, exitsByReason, latestMovements] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.aggregate({ _sum: { stock: true } }),
        this.prisma.product.count({ where: { stock: { lte: this.threshold } } }),
        this.dailySeries(days),
        this.periodTotals(days, days * 2),
        this.exitsByReason(days),
        this.prisma.movement.findMany({
          take: 5,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            type: true,
            quantity: true,
            createdAt: true,
            product: { select: { id: true, name: true } },
          },
        }),
      ]);

    return {
      days,
      totals: {
        products,
        unitsInStock: stock._sum.stock ?? 0,
        lowStockProducts,
        entries: series.reduce((acc, d) => acc + d.entries, 0),
        exits: series.reduce((acc, d) => acc + d.exits, 0),
        previousEntries: previous.entries,
        previousExits: previous.exits,
      },
      series,
      exitsByReason,
      latestMovements,
    };
  }

  /** Actividad por día de un mes (AAAA-MM), para pintar el calendario del tablero. */
  async calendar(month?: string): Promise<CalendarResult> {
    const target = month ?? this.currentMonth();
    const days = await this.prisma.$queryRaw<CalendarDay[]>`
      WITH r AS (
        SELECT (to_date(${target} || '-01', 'YYYY-MM-DD')::timestamp AT TIME ZONE ${this.timezone}) AT TIME ZONE 'UTC' AS s,
               ((to_date(${target} || '-01', 'YYYY-MM-DD') + interval '1 month')::timestamp AT TIME ZONE ${this.timezone}) AT TIME ZONE 'UTC' AS e
      )
      SELECT to_char((m.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${this.timezone})::date, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS movements,
             COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'ENTRADA'), 0)::int AS entries,
             COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'SALIDA'), 0)::int AS exits
      FROM movements m, r
      WHERE m.created_at >= r.s AND m.created_at < r.e
      GROUP BY 1
      ORDER BY 1`;
    return { month: target, days };
  }

  private currentMonth(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}`;
  }

  /** Una fila por día (incluso sin movimientos) en la zona horaria configurada. */
  private async dailySeries(days: number): Promise<DayRow[]> {
    return this.prisma.$queryRaw<DayRow[]>`
      WITH bounds AS (
        SELECT (now() AT TIME ZONE ${this.timezone})::date AS today
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'ENTRADA'), 0)::int AS entries,
             COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'SALIDA'), 0)::int AS exits
      FROM bounds b
      CROSS JOIN LATERAL generate_series(b.today - (${days}::int - 1), b.today, interval '1 day') AS d(day)
      LEFT JOIN movements m
        ON (m.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${this.timezone})::date = d.day::date
      GROUP BY d.day
      ORDER BY d.day`;
  }

  private async exitsByReason(days: number): Promise<DashboardSummary['exitsByReason']> {
    return this.prisma.$queryRaw<DashboardSummary['exitsByReason']>`
      WITH bounds AS (
        SELECT (now() AT TIME ZONE ${this.timezone})::date AS today
      )
      SELECT m.reason::text AS reason, SUM(m.quantity)::int AS units
      FROM bounds b
      JOIN movements m
        ON (m.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${this.timezone})::date
           BETWEEN b.today - (${days}::int - 1) AND b.today
      WHERE m.type = 'SALIDA'
      GROUP BY m.reason
      ORDER BY units DESC`;
  }

  /** Totales del periodo inmediatamente anterior, para mostrar la variacion. */
  private async periodTotals(fromDays: number, toDays: number) {
    const rows = await this.prisma.$queryRaw<Array<{ entries: number; exits: number }>>`
      WITH bounds AS (
        SELECT (now() AT TIME ZONE ${this.timezone})::date AS today
      )
      SELECT COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'ENTRADA'), 0)::int AS entries,
             COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'SALIDA'), 0)::int AS exits
      FROM bounds b
      JOIN movements m
        ON (m.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${this.timezone})::date
           BETWEEN b.today - (${toDays}::int - 1) AND b.today - ${fromDays}::int`;
    return rows[0] ?? { entries: 0, exits: 0 };
  }
}
