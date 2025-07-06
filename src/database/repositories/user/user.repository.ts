import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base/base.repository.interface';
import { Prisma, User } from 'generated/prisma';

@Injectable()
export class UserRepository
    extends BaseRepository<User> {

    protected model = 'user';

    async findByEmail(email: string): Promise<User | null> {
        return await this.prisma.user.findUnique({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return await this.prisma.user.findUnique({ where: { id } });
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {        
        return await this.prisma.user.create({ data });
    }

    async update(id: string, data: any): Promise<User> {
        return await this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<User> {
        return await this.prisma.user.delete({ where: { id } });
    }

}