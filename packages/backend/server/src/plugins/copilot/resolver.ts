import {
  Args,
  Field,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Parent,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { SafeIntResolver } from 'graphql-scalars';

import { CurrentUser, Public } from '../../core/auth';
import { QuotaService } from '../../core/quota';
import { UserType } from '../../core/user';
import { PermissionService } from '../../core/workspaces/permission';
import {
  MutexService,
  PaymentRequiredException,
  TooManyRequestsException,
} from '../../fundamentals';
import { ChatSessionService, ListHistoriesOptions } from './session';
import {
  type AvailableModel,
  AvailableModels,
  type ChatHistory,
  type ChatMessage,
} from './types';

registerEnumType(AvailableModels, { name: 'CopilotModel' });

// ================== Input Types ==================

@InputType()
class CreateChatSessionInput {
  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  docId!: string;

  @Field(() => String, {
    description: 'An mark identifying which view to use to display the session',
    nullable: true,
  })
  action!: string | undefined;

  @Field(() => String, {
    description: 'The model to use for the session',
  })
  model!: AvailableModel;

  @Field(() => String, {
    description: 'The prompt name to use for the session',
  })
  promptName!: string;
}

@InputType()
class QueryChatHistoriesInput implements Partial<ListHistoriesOptions> {
  @Field(() => Boolean, { nullable: true })
  action: boolean | undefined;

  @Field(() => Number, { nullable: true })
  limit: number | undefined;

  @Field(() => Number, { nullable: true })
  skip: number | undefined;

  @Field(() => String, { nullable: true })
  sessionId: string | undefined;
}

// ================== Return Types ==================

@ObjectType('ChatMessage')
class ChatMessageType implements Partial<ChatMessage> {
  @Field(() => String)
  role!: 'system' | 'assistant' | 'user';

  @Field(() => String)
  content!: string;

  @Field(() => [String], { nullable: true })
  attachments!: string[];

  @Field(() => Date, { nullable: true })
  createdAt!: Date | undefined;
}

@ObjectType('CopilotHistories')
class CopilotHistoriesType implements Partial<ChatHistory> {
  @Field(() => String)
  sessionId!: string;

  @Field(() => String, {
    description: 'An mark identifying which view to use to display the session',
  })
  action!: string;

  @Field(() => Number, {
    description: 'The number of tokens used in the session',
  })
  tokens!: number;

  @Field(() => [ChatMessageType])
  messages!: ChatMessageType[];
}

@ObjectType('CopilotQuota')
class CopilotQuotaType {
  @Field(() => SafeIntResolver)
  limit!: number;

  @Field(() => SafeIntResolver)
  used!: number;
}

// ================== Resolver ==================

@ObjectType('Copilot')
export class CopilotType {
  @Field(() => ID)
  workspaceId!: string;
}

@Resolver(() => CopilotType)
export class CopilotResolver {
  constructor(
    private readonly permissions: PermissionService,
    private readonly quota: QuotaService,
    private readonly mutex: MutexService,
    private readonly chatSession: ChatSessionService
  ) {}

  @ResolveField(() => CopilotQuotaType, {
    name: 'quota',
    description: 'Get the quota of the user in the workspace',
    complexity: 2,
  })
  async getQuota(
    @Parent() copilot: CopilotType,
    @CurrentUser() user: CurrentUser,
    @Args('docId') docId: string
  ) {
    const quota = await this.quota.getUserQuota(user.id);
    const limit = quota.feature.copilotActionLimit;

    const actions = await this.chatSession.countSessions(
      user.id,
      copilot.workspaceId,
      {
        docId,
        action: true,
      }
    );
    const chats = await this.chatSession
      .listHistories(user.id, copilot.workspaceId, docId)
      .then(histories =>
        histories.reduce(
          (acc, h) => acc + h.messages.filter(m => m.role === 'user').length,
          0
        )
      );

    return { limit, used: actions + chats };
  }

  @ResolveField(() => [String], {
    description: 'Get the session list of chats in the workspace',
    complexity: 2,
  })
  async chats(
    @Parent() copilot: CopilotType,
    @CurrentUser() user: CurrentUser
  ) {
    return await this.chatSession.listSessions(user.id, copilot.workspaceId);
  }

  @ResolveField(() => [String], {
    description: 'Get the session list of actions in the workspace',
    complexity: 2,
  })
  async actions(
    @Parent() copilot: CopilotType,
    @CurrentUser() user: CurrentUser
  ) {
    return await this.chatSession.listSessions(user.id, copilot.workspaceId, {
      action: true,
    });
  }

  @ResolveField(() => [CopilotHistoriesType], {})
  async histories(
    @Parent() copilot: CopilotType,
    @CurrentUser() user: CurrentUser,
    @Args('docId', { nullable: true }) docId?: string,
    @Args({
      name: 'options',
      type: () => QueryChatHistoriesInput,
      nullable: true,
    })
    options?: QueryChatHistoriesInput
  ) {
    const workspaceId = copilot.workspaceId;
    if (docId) {
      await this.permissions.checkPagePermission(workspaceId, docId, user.id);
    } else {
      await this.permissions.checkWorkspace(workspaceId, user.id);
    }

    return await this.chatSession.listHistories(
      user.id,
      workspaceId,
      docId,
      options
    );
  }

  @Public()
  @Mutation(() => String, {
    description: 'Create a chat session',
  })
  async createCopilotSession(
    @CurrentUser() user: CurrentUser,
    @Args({ name: 'options', type: () => CreateChatSessionInput })
    options: CreateChatSessionInput
  ) {
    const lockFlag = `session:${user.id}:${options.workspaceId}`;
    await using lock = await this.mutex.lock(lockFlag);
    if (!lock) {
      return new TooManyRequestsException('Server is busy');
    }

    const { limit, used } = await this.getQuota(
      { workspaceId: options.workspaceId },
      user,
      options.docId
    );
    if (limit && Number.isFinite(limit) && used >= limit) {
      return new PaymentRequiredException(
        `You have reached the limit of actions in this workspace, please upgrade your plan.`
      );
    }

    const session = await this.chatSession.create({
      ...options,
      userId: user.id,
    });
    return session;
  }
}

@Resolver(() => UserType)
export class UserCopilotResolver {
  constructor(private readonly permissions: PermissionService) {}

  @ResolveField(() => CopilotType)
  async copilot(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    await this.permissions.checkWorkspace(workspaceId, user.id);
    return { workspaceId };
  }
}
