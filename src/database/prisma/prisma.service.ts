/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/database/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    const isProduction = configService.get<string>('NODE_ENV') === 'production';

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: isProduction 
        ? ['error'] 
        : ['warn', 'error'],
      errorFormat: 'pretty',
    });

    // Query loglama için middleware
    this.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();
      
      this.logger.debug(`Query ${params.model}.${params.action} took ${after - before}ms`);
      return result;
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🔌 Database disconnected successfully');
    } catch (error) {
      this.logger.error('❌ Database disconnection failed', error);
    }
  }


  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  async getDatabaseInfo() {
    try {
      const result = await this.$queryRaw`SELECT version()` as any[];
      return {
        version: result[0]?.version || 'Unknown',
        status: 'connected'
      };
    } catch (error) {
      return {
        version: 'Unknown',
        status: 'disconnected',
        error: error.message
      };
    }
  }

  executeTransaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>
  ): Promise<T> {
    return this.$transaction(fn);
  }

  async bulkCreate<T>(
    model: string,
    data: any[],
    batchSize: number = 1000
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResults = await this[model].createMany({
        data: batch,
        skipDuplicates: true,
      });
      results.push(...batchResults);
    }
    
    return results;
  }

  // Soft delete helper
  softDelete(model: string, where: any) {
    return this[model].update({
      where,
      data: {
        deletedAt: new Date(),
        isDeleted: true,
      },
    });
  }

  // Pagination helper
  async findManyWithPagination<T>(
    model: string,
    params: {
      skip?: number;
      take?: number;
      where?: any;
      orderBy?: any;
      include?: any;
      select?: any;
    }
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { skip = 0, take = 10, where, orderBy, include, select } = params;

    const [data, total] = await Promise.all([
      this[model].findMany({
        skip,
        take,
        where,
        orderBy,
        include,
        select,
      }),
      this[model].count({ where }),
    ]);

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);

    return {
      data,
      total,
      page,
      limit: take,
      totalPages,
    };
  }

  // Search helper (full-text search için)
  async searchWithPagination<T>(
    model: string,
    searchFields: string[],
    searchTerm: string,
    params: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
      select?: any;
    } = {}
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { skip = 0, take = 10, orderBy, include, select } = params;

    const where = {
      OR: searchFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      })),
    };

    return this.findManyWithPagination(model, {
      skip,
      take,
      where,
      orderBy,
      include,
      select,
    });
  }

  // Cache helper (Redis ile birlikte kullanılabilir)
  private cache = new Map<string, { data: any; expiry: number }>();

  async findWithCache<T>(
    key: string,
    query: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const data = await query();
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000),
    });

    return data;
  }

  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // Database seeding helper
  async seed(seedFunction: (prisma: PrismaService) => Promise<void>) {
    try {
      this.logger.log('🌱 Starting database seeding...');
      await seedFunction(this);
      this.logger.log('✅ Database seeding completed');
    } catch (error) {
      this.logger.error('❌ Database seeding failed', error);
      throw error;
    }
  }

  // Backup helper (PostgreSQL için)
  createBackup(backupName?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = backupName || `backup-${timestamp}.sql`;
    
    // Bu örnekte sadece log atıyoruz, gerçek backup için pg_dump kullanılmalı
    this.logger.log(`📦 Creating backup: ${fileName}`);
    
    return fileName;
  }

  // Connection pool bilgileri
  getConnectionInfo() {
    return {
      // Bu bilgiler Prisma'nın internal API'si üzerinden alınabilir
      // Ancak public API'de mevcut değil, bu yüzden mock data
      activeConnections: 'N/A',
      maxConnections: 'N/A',
      databaseName: this.configService.get('DATABASE_URL')?.split('/').pop()?.split('?')[0] || 'Unknown',
    };
  }

  // Raw query executor with error handling
  async executeRawQuery<T = any>(query: string, parameters?: any[]): Promise<T> {
    try {
      this.logger.debug(`Executing raw query: ${query}`);
      return await this.$queryRawUnsafe(query, ...(parameters || []));
    } catch (error) {
      this.logger.error(`Raw query failed: ${query}`, error);
      throw error;
    }
  }

  // Prisma schema introspection helper
  async getTableNames(): Promise<string[]> {
    try {
      const result = await this.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      ` as { table_name: string }[];
      
      return result.map(row => row.table_name);
    } catch (error) {
      this.logger.error('Failed to get table names', error);
      return [];
    }
  }

  // Migration status checker
  async getMigrationStatus() {
    try {
      const result = await this.$queryRaw`
        SELECT migration_name, finished_at, rolled_back_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC
      ` as any[];
      
      return result;
    } catch (error) {
      this.logger.warn('Could not fetch migration status', error);
      return [];
    }
  }

  // Deadlock retry helper
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Deadlock veya connection error kontrolü
        if (
          (error.code === 'P2034' || error.code === 'P1001') &&
          attempt < maxRetries
        ) {
          this.logger.warn(`Retry attempt ${attempt}/${maxRetries} for operation`);
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }
}