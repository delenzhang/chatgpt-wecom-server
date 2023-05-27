/**
 * 使用chatgpt这个非官方的库进行上下文衔接对话
 * 与chatgpt.service不同
 */

import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ChatGPTAPI, ChatMessage } from 'chatgpt';
// import { setupProxy } from './utils.js';

interface MessageOptions {
  prompt: string;
  options?: {
    model?: string;
    user?: string;
    // 上一个message的id
    parentMessageId?: string;
    process?: (partialResponse: ChatMessage) => void
  };
  completionParams?: {
    model?: string;
    temperature?: number;
    top_p?: number;
  };
}

@Injectable()
export class ChatGPTAPIService {
  api: ChatGPTAPI;

  private readonly logger = new Logger(ChatGPTAPIService.name);

  async onModuleInit() {
    await this.initAPI();
  }

  async initAPI() {
    const options = {
      // fetch: null,
    };
    // setupProxy(options);
    this.api = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
      debug: false,
      ...options,
    });
  }
  async sendMessage({ prompt = '', options }: MessageOptions, retry: number = 0) {
    const { parentMessageId = '', process } = options || {};
    if (retry > 3){
      throw  new HttpException(`[parentMessageId]:${options.parentMessageId}  [prompt]:"${prompt}", 请求三次报错`, 500);
    }
    try {
      this.logger.log(`start use ChatGPTAPI fech  chatgpt 获取内容 [parentMessageId]: ${parentMessageId}...`);
      const res = await this.api.sendMessage(prompt, {
        parentMessageId,
        onProgress: (partialResponse) => {
          process?.(partialResponse);
        },
        timeoutMs: 3*1000
      });
      this.logger.log(`end use ChatGPTAPI fech ${prompt} chatgpt 获取内容 ${res.id}`);
      return res;
    } catch (error) {
      this.logger.error(`chatgpt sendMessage error`, error)
      const data = await this.sendMessage({prompt, options}, retry+1)
      return data;
      
      // this.logger.error('请求出错');
      // this.logger.error(error);
      // return {
      //   response: error,
      //   content: '请求chatgpt错误',
      //   status: 500
      // };
    }
  }
}
