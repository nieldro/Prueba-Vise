import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface DayRow {
  day: string;
  entries: number;
  exits: number;
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
    const [products, stock, lowStockProducts, series, previous, latestMovements] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.aggregate({ _sum: { stock: true } }),
        this.prisma.product.count({ where: { stock: { lte: this.threshold } } }),
        this.dailySeries(days),
        this.periodTotals(days, days * 2),
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
      latestMovements,
    };
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
