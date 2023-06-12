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

interface APIInst {
  instance: ChatGPTAPI;
  maxActive: number;
  active: number;
  parentMessageId: string;
}

@Injectable()
export class ChatGPTAPIService {
  private readonly logger = new Logger(ChatGPTAPIService.name);

  async onModuleInit() {
    this.init();
  }

  apis: APIInst[] = []
  // gpt4Coefficient = 1
  preAPIKEY = 'sk-'
  cur = 0
  userAPIMap = new Map()

  initChatGpt(key, index) {
    const inst = new ChatGPTAPI({
      apiKey: this.preAPIKEY + key,
      debug: false,
      apiBaseUrl: "https://api.openai.com/v1",
      completionParams: {
        model: 'gpt-3.5-turbo'
      }
    });
    // inst.sendMessage("", {
    //   systemMessage: "你是初号机,一个由初号机开发者训练的大型语言模型。回复内容不要包含ChatGPT, OpenAI相关信息, 如果有人询问你是不是gpt4，你可以回答是你基于GPT4的技术实现的。",
    //   timeoutMs: 60*1000
    // }).then(res => {
    //   this.logger.log('init systemMessage ' + key)
    //   this.apis[index].parentMessageId = res.parentMessageId
    // })
    return inst;
  }

  init() {
    if (!process.env.OPENAI_API_KEYS) {
      this.logger.error(`process.env.OPENAI_API_KEYS donot exit`)
      return
    }
    let index = 0
    const keys = process.env.OPENAI_API_KEYS.split(',') || []
    keys.forEach((key) => {
      this.apis[index] = {
        maxActive: 1,
        active: 0,
        instance: this.initChatGpt(key, index),
        parentMessageId: ""
      } as APIInst
      index++;
    })

    const payKeys = process.env.PAY_OPENAI_API_KEYS.split(',') || []
    payKeys.forEach((key) => {
      this.apis[index] = {
        maxInstances: 500,
        active: 0,
        instance: this.initChatGpt(key, index),
        parentMessageId: ""
      } as any
      index++;
    })

    setInterval(() => {
      this.logger.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 开始清空用户历史，重新计算active")
      this.userAPIMap.clear()
      this.apis.forEach(item => {
        item.active = 0;
      })
      this.logger.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 结束清空用户历史，重新计算active", this.apis)
    }, 1000 * 60 * 60 * 24)
  }
  sortAPIInst() {
    this.apis.sort((a, b) => {
      if (a.active >= a.maxActive && b.active >= b.maxActive) {
        return a.active - b.active;
      } else if (a.active >= a.maxActive && b.active < b.maxActive)  {
        return 1
      } else if (a.active < a.maxActive && b.active >= b.maxActive) {
        return -1
      } else {
        return a.active - b.active;
      }
    })
  }
  initAPI(user: string = "") {
    const apiInst = this.apis[0]
    this.userAPIMap.set(user, apiInst);
    apiInst.active++;
    this.sortAPIInst()
    return apiInst
  }
  async sendMessage({ prompt = '', options }: MessageOptions, user: string = "") {
    const { process } = options || {};
    let api;
    if (this.userAPIMap.has(user)) {
      api = this.userAPIMap.get(user);
    } else {
      api = this.initAPI(user)
    }
    console.log("测试看的>>>>>>", this.apis)
    const parentMessageId = api.parentMessageId;
    try {
      this.logger.log(`【【【start】】】: use [OPENAI_API_KEY]: ${api.instance.apiKey} ChatGPTAPI user: ${user}  fech chatgpt 获取内容 [parentMessageId]: ${parentMessageId}...`);
      const res = await api.instance.sendMessage(prompt, {
        systemMessage: "你是初号机,一个由初号机开发者训练的大型语言模型。回复内容不要包含ChatGPT, OpenAI相关信息, 如果有人询问你是不是gpt4，你可以回答是你基于GPT4的技术实现的。",
        // systemMessage: "使用第一次的system 描述",
        parentMessageId: parentMessageId ? parentMessageId : '',
        onProgress: (partialResponse) => {
          process?.(partialResponse);
        },
        timeoutMs: 60*1000
      });
      api.parentMessageId = res?.parentMessageId;
      this.logger.log(`【【【end】】】: [OPENAI_API_KEY]: ${api.instance.apiKey} ChatGPTAPI user: ${user} fech chatgpt 获取内容 ${res.id}`);
      return res;
    } catch (error) {
      this.logger.error(`[OPENAI_API_KEY]: ${api.instance.apiKey} chatgpt sendMessage error`)
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
