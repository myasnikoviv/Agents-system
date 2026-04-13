import { UnifiedMemoryApiService } from '../memory/UnifiedMemoryApiService';
import { MeetingArtifact } from './ArtifactValidationEngine';
import { MeetingSpec } from './MeetingSpec';
import { RoundState } from './RoundEngine';

export class MeetingMemoryIntegration {
  constructor(private readonly memoryApi: UnifiedMemoryApiService) {}

  async persistMeetingOutputs(input: {
    spec: MeetingSpec;
    roundState: RoundState;
    artifacts: MeetingArtifact[];
    workspaceId: string;
    author?: string;
  }): Promise<{ decisionEntityId?: string; discussionEntityIds: string[]; relationIds: string[] }> {
    const author = input.author || input.spec.moderator || 'moderator';
    const discussionEntityIds: string[] = [];
    const relationIds: string[] = [];

    // Persist discussion turns as message nodes in shared memory.
    for (let r = 1; r <= input.roundState.currentRound; r += 1) {
      for (const item of input.roundState.byRound[r] || []) {
        const src = String(item.payload ?? '');
        const result = await this.memoryApi.promoteMemory(
          {
            id: `meeting-discussion-r${r}-${item.participant}-${Date.now()}`,
            type: 'message',
            content: src || `Round ${r} contribution by ${item.participant}`,
            metadata: {
              author: item.participant,
              timestamp: Date.now(),
              workspace_id: input.workspaceId,
              tags: ['meeting', 'discussion'],
              memory_scope: 'shared',
            },
          },
          true,
          item.participant,
        );
        if (result?.promotedEntityId) discussionEntityIds.push(result.promotedEntityId);
      }
    }

    // Persist decision artifact as decision node.
    const decisionArtifact = input.artifacts.find((a) => a.name === 'decision');
    let decisionEntityId: string | undefined;
    if (decisionArtifact) {
      const decision = await this.memoryApi.promoteMemory(
        {
          id: `meeting-decision-${Date.now()}`,
          type: 'decision',
          content: JSON.stringify(decisionArtifact.payload),
          metadata: {
            author,
            timestamp: Date.now(),
            workspace_id: input.workspaceId,
            tags: ['meeting', 'decision'],
            memory_scope: 'shared',
          },
        },
        true,
        author,
      );
      decisionEntityId = decision?.promotedEntityId;
    }

    if (decisionEntityId) {
      for (const msgId of discussionEntityIds) {
        const links = await this.memoryApi.linkMemory({
          sourceEntityId: msgId,
          targetEntityId: decisionEntityId,
          sourceScope: 'shared',
          targetScope: 'shared',
        });
        relationIds.push(links.forward.id, links.backward.id);
      }
    }

    return { decisionEntityId, discussionEntityIds, relationIds };
  }
}

