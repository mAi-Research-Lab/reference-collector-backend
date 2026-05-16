import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplication } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import { SOCKET_IO_ENGINE_PATH } from '../constants/api';

export class SocketIoApiPathAdapter extends IoAdapter {
    constructor(app: INestApplication) {
        super(app);
    }

    createIOServer(port: number, options?: ServerOptions) {
        return super.createIOServer(port, {
            ...options,
            path: SOCKET_IO_ENGINE_PATH,
        });
    }
}
