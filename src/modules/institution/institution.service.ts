import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { InstitutionResponse } from './dto/institution.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { INSTUTION_MESSAGES } from './constants/institution.messages';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class InstitutionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService
    ) { }

    async create(data: CreateInstitutionDto): Promise<InstitutionResponse> {
        const institution = await this.prisma.institution.findUnique({ where: { domain: data.domain } })

        if (institution) {
            throw new CustomHttpException(INSTUTION_MESSAGES.INSTITUTION_ALREADY_EXISTS, 400, INSTUTION_MESSAGES.INSTITUTION_ALREADY_EXISTS);
        }

        return this.prisma.institution.create({ data });
    }

    async getAll(): Promise<InstitutionResponse[]> {
        return this.prisma.institution.findMany();
    }

    async getInstitutionByDomain(domain: string): Promise<InstitutionResponse> {
        const institution = await this.prisma.institution.findUnique({ where: { domain } });

        if (!institution) {
            throw new CustomHttpException(INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND, 404, INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND);
        }

        return institution;
    }

    async getInstitutionById(id: string): Promise<InstitutionResponse> {
        const institution = await this.prisma.institution.findUnique({ where: { id: id } })

        if (!institution) {
            throw new CustomHttpException(INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND, 404, INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND);
        }

        return institution;
    }

    async update(id: string, data: UpdateInstitutionDto): Promise<InstitutionResponse> {
        const institution = await this.prisma.institution.findUnique({ where: { id: id } })

        if (!institution) {
            throw new CustomHttpException(INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND, 404, INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND);
        }

        return await this.prisma.institution.update({ where: { id: id }, data });
    }

    async delete(id: string): Promise<{ message: string }> {
        const institution = await this.prisma.institution.findUnique({ where: { id: id } })

        if (!institution) {
            throw new CustomHttpException(INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND, 404, INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND);
        }

        await this.prisma.institution.delete({ where: { id: id } });

        return { message: INSTUTION_MESSAGES.INSTITUTION_DELETED_SUCCESSFULLY };
    }
}
