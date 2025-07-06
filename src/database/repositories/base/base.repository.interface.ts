import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { BaseRepositoryInterface } from './base.repository';

@Injectable()
export abstract class BaseRepository<T> implements BaseRepositoryInterface<T> {
  protected abstract model: string;

  constructor(protected readonly prisma: PrismaService) {}

  async create(data: any): Promise<T> {
    return await this.prisma[this.model].create({ data });
  }

  async findById(id: string): Promise<T | null> {
    return await this.prisma[this.model].findUnique({ where: { id } });
  }

  async findMany(params?: any): Promise<T[]> {
    return await this.prisma[this.model].findMany(params);
  }

  async update(id: string, data: any): Promise<T> {
    return await this.prisma[this.model].update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<T> {
    return await this.prisma[this.model].delete({ where: { id } });
  }

  async count(where?: any): Promise<number> {
    return await this.prisma[this.model].count({ where });
  }
}