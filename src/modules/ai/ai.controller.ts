import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { User } from 'src/modules/user/decorators/user.decorator';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { AiService } from './services/ai.service';

@Controller('ai')
@ApiTags('AI')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('quota')
    async getQuota(@User() user: any): Promise<ResponseDto> {
        return {
            success: true,
            statusCode: 200,
            message: 'AI quota fetched successfully',
            data: await this.aiService.getQuota(user.id),
            timestamp: new Date().toISOString(),
        };
    }
}
