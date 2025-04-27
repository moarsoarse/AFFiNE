import {
  acceptInviteByInviteIdMutation,
  createInviteLinkMutation,
  getInviteInfoQuery,
  inviteByEmailMutation,
  WorkspaceInviteLinkExpireTime,
  WorkspaceMemberStatus,
} from '@affine/graphql';

import { Mockers } from '../../mocks';
import { app, e2e } from '../test';

async function createTeamWorkspace(quantity = 10) {
  const owner = await app.create(Mockers.User);

  const workspace = await app.create(Mockers.Workspace, {
    owner: { id: owner.id },
  });
  await app.create(Mockers.TeamWorkspace, {
    id: workspace.id,
    quantity,
  });

  return {
    owner,
    workspace,
  };
}

e2e(
  'should invite by link and send review request notification below quota limit',
  async t => {
    const { owner, workspace } = await createTeamWorkspace();

    await app.login(owner);
    const { createInviteLink } = await app.gql({
      query: createInviteLinkMutation,
      variables: {
        workspaceId: workspace.id,
        expireTime: WorkspaceInviteLinkExpireTime.OneDay,
      },
    });
    t.truthy(createInviteLink, 'failed to create invite link');
    const link = createInviteLink.link;
    const inviteId = link.split('/').pop()!;

    // accept invite by link
    await app.signup();
    const result = await app.gql({
      query: acceptInviteByInviteIdMutation,
      variables: {
        workspaceId: workspace.id,
        inviteId,
      },
    });
    t.truthy(result, 'failed to accept invite');
    const notification = app.queue.last(
      'notification.sendInvitationReviewRequest'
    );
    t.is(notification.payload.reviewerId, owner.id);
    t.truthy(notification.payload.inviteId);
  }
);

e2e(
  'should invite by link and send review request notification over quota limit',
  async t => {
    const { owner, workspace } = await createTeamWorkspace(1);

    await app.login(owner);
    const { createInviteLink } = await app.gql({
      query: createInviteLinkMutation,
      variables: {
        workspaceId: workspace.id,
        expireTime: WorkspaceInviteLinkExpireTime.OneDay,
      },
    });
    t.truthy(createInviteLink, 'failed to create invite link');
    const link = createInviteLink.link;
    const inviteId = link.split('/').pop()!;

    // accept invite by link
    await app.signup();
    const result = await app.gql({
      query: acceptInviteByInviteIdMutation,
      variables: {
        workspaceId: workspace.id,
        inviteId,
      },
    });
    t.truthy(result, 'failed to accept invite');
    const notification = app.queue.last(
      'notification.sendInvitationReviewRequest'
    );
    t.is(notification.payload.reviewerId, owner.id);
    t.truthy(notification.payload.inviteId);
  }
);

e2e(
  'should accept invitation by link directly if status is pending on team workspace',
  async t => {
    const { owner, workspace } = await createTeamWorkspace(2);
    const member = await app.create(Mockers.User);

    await app.login(owner);
    // create a pending invitation
    const invite = await app.gql({
      query: inviteByEmailMutation,
      variables: {
        email: member.email,
        workspaceId: workspace.id,
      },
    });
    t.truthy(invite, 'failed to create invitation');

    const { createInviteLink } = await app.gql({
      query: createInviteLinkMutation,
      variables: {
        workspaceId: workspace.id,
        expireTime: WorkspaceInviteLinkExpireTime.OneDay,
      },
    });
    t.truthy(createInviteLink, 'failed to create invite link');
    const link = createInviteLink.link;
    const inviteLinkId = link.split('/').pop()!;

    // member accept invitation by link
    await app.login(member);
    await app.gql({
      query: acceptInviteByInviteIdMutation,
      variables: {
        inviteId: inviteLinkId,
        workspaceId: workspace.id,
      },
    });

    const { getInviteInfo } = await app.gql({
      query: getInviteInfoQuery,
      variables: {
        inviteId: invite.invite,
      },
    });
    t.is(getInviteInfo.status, WorkspaceMemberStatus.Accepted);
  }
);
