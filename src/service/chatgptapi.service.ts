/**
 * 使用chatgpt这个非官方的库进行上下文衔接对话
 * 与chatgpt.service不同
 */

import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ChatGPTAPI,ChatGPTError, ChatMessage } from 'chatgpt';
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
    this.init();
  }
  apis: ChatGPTAPI[] = []
  preAPIKEY = 'sk-'
  cur = 0
  init() {
    if (!process.env.OPENAI_API_KEYS) {
      this.logger.error(`process.env.OPENAI_API_KEYS donot exit`)
      return
    }
    const keys = process.env.OPENAI_API_KEYS.split(',') || []
    keys.forEach((key, index) => {
      this.apis[index] = new ChatGPTAPI({
        apiKey: this.preAPIKEY + key,
        debug: false,
        apiBaseUrl: "https://api.openai.com/v1",
        completionParams: {
          model: 'gpt-3.5-turbo-0301'
        }
      });
    })
  }
  async initAPI() {
    // setupProxy(options);
    this.api = this.apis[this.cur]
  }
  async sendMessage({ prompt = '', options }: MessageOptions, retry: number = 0) {
    const { parentMessageId = '', process } = options || {};
    if (retry >= this.apis.length){
      return {
        code: 50001,
        msg: `很抱歉不能回答您询问的"${prompt}", AI 累了，要休息一分钟，请稍后再问吧！`
      }
    }
    this.api = this.apis[this.cur]
    try {
      this.logger.log(`【【【start】】】: use [OPENAI_API_KEY]: ${this.api.apiKey} ChatGPTAPI ${retry} times fech chatgpt 获取内容 [parentMessageId]: ${parentMessageId}...`);
      const res = await this.api.sendMessage(prompt, {
        parentMessageId: retry === 0 ? parentMessageId : '',
        onProgress: (partialResponse) => {
          process?.(partialResponse);
        },
        timeoutMs: 3*1000
      });
      this.logger.log(`【【【start】】】: [OPENAI_API_KEY]: ${this.api.apiKey} ChatGPTAPI ${retry} times fech chatgpt 获取内容 ${res.id}`);
      return res;
    } catch (error) {
      this.logger.error(`[OPENAI_API_KEY]: ${this.api.apiKey} chatgpt sendMessage error`)
      console.log(error)
      // const code = this.handleGptSendMessageError(error)
      this.addCur()
      const data = await this.sendMessage({prompt, options}, retry+1)
      return data;
    }
  }
  addCur() {
    this.cur += 1
    if (this.cur == this.apis.length) {
     this.cur = 0
    }
  }
  handleGptSendMessageError(err: ChatGPTError) {
    this.addCur()
     // Too Many Requests
     if (err.statusCode == 429) {
      //  this.addCur()
       return err.statusCode
     }
     
     if (err.message.indexOf('OpenAI timed out waiting for response') > -1) {
        return 50002;
     }
     return 200;
  }
}
