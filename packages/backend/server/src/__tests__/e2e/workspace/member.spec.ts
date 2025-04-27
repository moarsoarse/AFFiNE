import { getMembersByWorkspaceIdQuery } from '@affine/graphql';
import { faker } from '@faker-js/faker';

import { Mockers } from '../../mocks';
import { app, e2e } from '../test';

e2e(
  'should search members by name and email support case insensitive',
  async t => {
    const owner = await app.create(Mockers.User);
    const workspace = await app.create(Mockers.Workspace, {
      owner: { id: owner.id },
    });
    const user1 = await app.create(Mockers.User, {
      name: faker.internet.displayName({ firstName: 'Lucy' }),
    });
    const user2 = await app.create(Mockers.User, {
      email: faker.internet.email({
        firstName: 'Jeanne',
        lastName: 'Doe',
      }),
    });
    await app.create(Mockers.WorkspaceUser, {
      workspaceId: workspace.id,
      userId: user1.id,
    });
    await app.create(Mockers.WorkspaceUser, {
      workspaceId: workspace.id,
      userId: user2.id,
    });

    await app.login(owner);
    let result = await app.gql({
      query: getMembersByWorkspaceIdQuery,
      variables: {
        workspaceId: workspace.id,
        query: 'lucy',
      },
    });
    t.is(result.workspace.memberCount, 3);
    t.is(result.workspace.members.length, 1);
    t.is(result.workspace.members[0].name, user1.name);

    result = await app.gql({
      query: getMembersByWorkspaceIdQuery,
      variables: {
        workspaceId: workspace.id,
        query: 'LUCY',
      },
    });
    t.is(result.workspace.memberCount, 3);
    t.is(result.workspace.members.length, 1);
    t.is(result.workspace.members[0].name, user1.name);

    result = await app.gql({
      query: getMembersByWorkspaceIdQuery,
      variables: {
        workspaceId: workspace.id,
        query: 'jeanne_doe',
      },
    });
    t.is(result.workspace.memberCount, 3);
    t.is(result.workspace.members.length, 1);
    t.is(result.workspace.members[0].email, user2.email);
  }
);
