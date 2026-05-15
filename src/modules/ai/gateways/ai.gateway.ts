import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { UserService } from 'src/modules/user/user.service';
import { AiChatDto } from '../dto/ai-chat.dto';
import { AiService } from '../services/ai.service';

@WebSocketGateway({
    namespace: '/ai',
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})
export class AiGateway {
    @WebSocketServer()
    server: Namespace;

    private readonly logger = new Logger(AiGateway.name);

    constructor(
        private readonly aiService: AiService,
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const user = await this.authenticateClient(client);
            this.logger.log(`AI client connected: ${client.id} (${user.id})`);
            client.emit('ai-ready', { connected: true });
        } catch (error: any) {
            this.logger.warn(`Unauthorized AI socket ${client.id}: ${error.message}`);
            client.emit('ai-error', { message: 'Unauthorized AI connection' });
            client.disconnect(true);
        }
    }

    @SubscribeMessage('ai-chat')
    async handleAiChat(@MessageBody() data: AiChatDto & { requestId?: string }, @ConnectedSocket() client: Socket) {
        const requestId = data.requestId || `ai_${Date.now()}`;
        try {
            const user = await this.authenticateClient(client);
            const stream = this.aiService.streamChat(user.id, data);
            let quota: any;
            while (true) {
                const next = await stream.next();
                if (next.done) {
                    quota = next.value;
                    break;
                }
                client.emit('ai-chunk', { requestId, chunk: next.value.chunk });
            }
            client.emit('ai-done', { requestId, quota });
        } catch (error: any) {
            const fromHttp = typeof error?.getResponse === 'function' ? error.getResponse() : undefined;
            const httpBody =
                fromHttp && typeof fromHttp === 'object' && fromHttp !== null
                    ? (fromHttp as { message?: string; errorCode?: string })
                    : undefined;
            client.emit('ai-error', {
                requestId,
                message:
                    httpBody?.message ||
                    error?.response?.message ||
                    error?.message ||
                    'AI isteği başarısız oldu.',
                code: httpBody?.errorCode || error?.response?.errorCode || error?.code || 'AI_ERROR',
            });
        }
    }

    private async authenticateClient(client: Socket): Promise<any> {
        if (client.data?.user) return client.data.user;

        const authToken = client.handshake.auth?.token;
        const header = client.handshake.headers?.authorization;
        const headerToken = typeof header === 'string' && header.startsWith('Bearer ')
            ? header.slice(7)
            : undefined;
        const token = authToken || headerToken;

        if (!token) {
            throw new Error('Missing token');
        }

        const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
        const user = await this.userService.findById(payload.sub);
        client.data.user = user;
        return user;
    }
}
