import { Controller, Get, Post, HttpCode, Logger, Body, Query, HttpException } from '@nestjs/common';
import { AppService } from '../service/app.service.js';

import { IRequestData } from '../types/index.js';
import { ChatGPTAPIService } from '../service/chatgptapi.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly chatGPTAPI: ChatGPTAPIService
    ) {
   
  }
  private readonly logger = new Logger(AppController.name);

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

   /**
   * @description: 使用chatgpt 的另一个api进行回复，支持上下文回复
   */
  @Post('message')
  @HttpCode(200)
  async getMessage(@Body() data:IRequestData, @Query() query) {
    // const data = await this.appService.getMessage(query, xmlData);
    // const { message = '', touser = '' } = data;
    if (!data.question || !data.user) {
      this.logger.error(" >>>>>>>>>> post data error ", data)
      throw  new HttpException('body params error', 500);
    }
    const {parentMessageId, question, user } = data;

    // this.replyUserV2({ message, touser });
    // 这里怎么返回都行，只要 http 的状态码返回 200 就行了
    this.logger.log(`>>>>【start】将【${user}】的问题 【question】:【${question}】 , 询问 chatgpt 内容 . 使用上一次问题的[parentMessageId]:【${parentMessageId||'-'}】`)
    const response = await this.chatGPTAPI.sendMessage({
      prompt: question,
      options: {
        parentMessageId,
      },
    }, user);
    this.logger.log(`>>>> 【end】将【${user}】的问题 【question】:【${question}】, [parentMessageId]:${parentMessageId}, [response]:`, response)
    return response;
  }
}
