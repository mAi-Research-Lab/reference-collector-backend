/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filter/http-exception.filter';
import { SocketIoApiPathAdapter } from './common/adapters/socket-io-api-path.adapter';
import { API_GLOBAL_PREFIX } from './common/constants/api';

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new SocketIoApiPathAdapter(app));
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableCors({
    origin: '*'
  })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter())

  const config = new DocumentBuilder()
    .setTitle('Reference Collector Platform API')
    .setDescription('Reference Collector platform API description')
    .setVersion('1.0') 
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(API_GLOBAL_PREFIX, app, document);

  await app.listen(process.env.PORT ?? 3000);
  
}
bootstrap();
