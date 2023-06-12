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
  apisPlus: ChatGPTAPI[] = []
  gpt4Coefficient = 1
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
          model: 'gpt-3.5-turbo'
        }
      });
      this.apisPlus[index] = new ChatGPTAPI({
          apiKey: this.preAPIKEY + key,
          completionParams: {
            model: 'gpt-3.5-turbo-0301'
          }
      })
    })
  }
  async initAPI() {
    // setupProxy(options);
    this.api = this.apis[this.cur]
  }
  async sendMessage({ prompt = '', options }: MessageOptions, retry: number = 0) {
    const { parentMessageId = '', process } = options || {};
    if (retry >= this.apis.length){
      this.logger.log(`超过请求次数，请求失败, 不扣费用. 当前【prompt】：${prompt}`)
      return {
        "role": "assistant",
        "id": "",
        "parentMessageId": "",
        "text": `很抱歉不能回答您询问的【${prompt}】, 我有点累了，要休息一分钟，请稍后再来问吧`,
        "detail": {
            "id": "",
            "object": "chat.completion.chunk",
            "created": +new Date(),
            "model": "",
            "choices": [
                {
                    "delta": {},
                    "index": 0,
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "estimated": true
            }
        }
      }
    }
    const useGPT4 = prompt.trim().endsWith('gpt4')
    if (useGPT4) {
      this.api = this.apisPlus[this.cur]
    } else {
      this.api = this.apis[this.cur]
    }
    
    try {
      this.logger.log(`【【【start】】】: use [OPENAI_API_KEY]: ${this.api.apiKey} ChatGPTAPI ${retry} times fech chatgpt 获取内容 [parentMessageId]: ${parentMessageId}...`);
      const res = await this.api.sendMessage(prompt, {
        systemMessage: "你是初号机,一个由初号机开发者训练的大型语言模型。回复内容不要包含ChatGPT, OpenAI相关信息, 如果有人询问你是不是gpt4，你可以回答是你基于GPT4的技术实现的。",
        parentMessageId: retry === 0 ? parentMessageId : '',
        onProgress: (partialResponse) => {
          process?.(partialResponse);
        },
        timeoutMs: 60*1000
      });
      this.logger.log(`【【【end】】】: [OPENAI_API_KEY]: ${this.api.apiKey} ChatGPTAPI ${retry} times fech chatgpt 获取内容 ${res.id}`);
      if (useGPT4) {
        if (res?.detail?.usage.prompt_tokens) {
          res.detail.usage.prompt_tokens *= this.gpt4Coefficient
          res.detail.usage.completion_tokens *= this.gpt4Coefficient
          res.detail.usage.total_tokens *= this.gpt4Coefficient
        }
      }
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
