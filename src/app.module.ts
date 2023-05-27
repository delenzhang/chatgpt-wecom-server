import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './controller/app.controller.js';
import { AppService } from './service/app.service.js';
import { ChatGPTAPIService } from './service/chatgptapi.service.js'


@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [
    AppController,
  ],
  providers: [AppService, ChatGPTAPIService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // consumer.apply().forRoutes({
    //   path: 'chat/*',
    //   method: RequestMethod.POST,
    // });
  }
}
