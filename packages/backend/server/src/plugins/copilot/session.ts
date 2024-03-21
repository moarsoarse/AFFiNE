import { Injectable } from '@nestjs/common';
import { encoding_for_model, Tiktoken, TiktokenModel } from 'tiktoken';

import { SessionCache } from '../../fundamentals';
import { PromptService } from './prompt';
import { ChatMessage } from './types';

const CHAT_SESSION_KEY = 'chat-session';
const CHAT_SESSION_TTL = 3600 * 12 * 1000; // 12 hours

export type ChatSessionState = {
  sessionId?: string;
  promptName: string;
  prompt?: ChatMessage[];
  messages: ChatMessage[];
};

export class ChatSession implements AsyncDisposable {
  private readonly encoder: Tiktoken;
  private readonly promptTokenSize: number;
  constructor(
    private readonly state: Required<ChatSessionState>,
    model: TiktokenModel,
    private readonly dispose?: (
      state: Required<ChatSessionState>
    ) => Promise<void>,
    private readonly maxTokenSize = 3840
  ) {
    this.encoder = encoding_for_model(model);
    this.promptTokenSize = this.encoder.encode_ordinary(
      state.prompt?.map(m => m.content).join('') || ''
    ).length;
  }

  push(message: ChatMessage) {
    this.state.messages.push(message);
  }

  pop() {
    this.state.messages.pop();
  }

  private takeMessages(): ChatMessage[] {
    const ret = [];
    const messages = [...this.state.messages];
    messages.reverse();
    let size = this.promptTokenSize;
    for (const message of messages) {
      const tokenSize = this.encoder.encode_ordinary(message.content).length;
      if (size + tokenSize > this.maxTokenSize) {
        break;
      }
      ret.push(message);
      size += tokenSize;
    }
    ret.reverse();
    return ret;
  }

  finish() {
    const messages = this.takeMessages();
    return [...(this.state.prompt || []), messages];
  }

  async [Symbol.asyncDispose]() {
    this.encoder.free();
    await this.dispose?.(this.state);
  }
}

@Injectable()
export class ChatSessionService {
  constructor(
    private readonly cache: SessionCache,
    private readonly prompt: PromptService
  ) {}

  private async set(
    sessionId: string,
    state: ChatSessionState
  ): Promise<Required<ChatSessionState>> {
    const { promptName, messages } = state;
    let { prompt } = state;
    if (!Array.isArray(prompt)) {
      prompt = await this.prompt.get(promptName);
    }
    const finalState: Required<ChatSessionState> = {
      sessionId,
      promptName,
      prompt,
      messages,
    };
    await this.cache.set(`${CHAT_SESSION_KEY}:${sessionId}`, finalState, {
      ttl: CHAT_SESSION_TTL,
    });
    return finalState;
  }

  private async get(
    sessionId: string,
    model: TiktokenModel
  ): Promise<ChatSession | null> {
    const state = await this.cache.get<Required<ChatSessionState>>(
      `${CHAT_SESSION_KEY}:${sessionId}`
    );
    if (state) {
      return new ChatSession(state, model, async state => {
        await this.set(sessionId, state);
      });
    }
    return null;
  }

  /**
   * usage:
   * ``` typescript
   * {
   *     // allocate a session, can be reused chat in about 12 hours with same session
   *     await using session = await session.getOrCreate(sessionId, promptName, model);
   *     session.push(message);
   *     copilot.generateText(session.finish(), model);
   * }
   * // session will be disposed after the block
   * @param sessionId session id
   * @param promptName prompt name
   * @param model model name, used to estimate token size
   * @returns
   */
  async getOrCreate(
    sessionId: string,
    promptName: string,
    model: TiktokenModel
  ): Promise<ChatSession> {
    const session = await this.get(sessionId, model);
    if (session) return session;

    const state = await this.set(sessionId, { promptName, messages: [] });
    return new ChatSession(state, model, async state => {
      await this.set(sessionId, state);
    });
  }
}