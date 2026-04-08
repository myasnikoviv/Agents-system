import fs from 'fs';
import path from 'path';

type ChatResponse = {
  success: boolean;
  interrupted?: boolean;
  interrupt?: {
    reason?: string;
    agent?: string;
    stageId?: string;
    message?: string;
  };
  status?: string;
  threadId?: string;
  runId?: string;
  ticketId?: string | null;
  message?: string | null;
  observability?: {
    pipeline?: string;
    stage?: string;
    nextStage?: string;
    modeRequested?: string;
    modeApplied?: string;
    engine?: string;
  };
  gitContext?: {
    activeBranch?: string;
    worktreePath?: string;
    preflightToken?: string | null;
  };
  error?: string;
};

type ApproveResponse = {
  success: boolean;
  interrupted?: boolean;
  interrupt?: {
    reason?: string;
    agent?: string;
    stageId?: string;
    message?: string;
  };
  message?: string;
  finalState?: {
    status?: string;
    selected_pipeline?: string;
  };
};

type ThreadMessagesResponse = {
  success: boolean;
  threadId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: string;
  }>;
};

const BASE_URL = process.env.AGENT_SYSTEM_BASE_URL || 'http://127.0.0.1:3001';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  assert(res.ok, `HTTP ${res.status} for GET ${url}`);
  return (await res.json()) as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.CHAT_VERIFY_REQUEST_TIMEOUT_MS || 120000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    assert(res.ok, `HTTP ${res.status} for POST ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function runSingleChatCase(input: {
  name: string;
  threadId: string;
  ticketId: string;
  message: string;
  mode: 'mock' | 'linear' | 'multiple_agents';
}) {
  let chat = await postJson<ChatResponse>(`${BASE_URL}/api/chat`, {
    projectId: 'default',
    threadId: input.threadId,
    executionMode: input.mode,
    ticketId: input.ticketId,
    message: input.message,
  });

  let approvals = 0;
  while (chat.interrupted && approvals < 8) {
    const resumed = await postJson<ApproveResponse>(`${BASE_URL}/api/chat/approve`, {
      threadId: input.threadId,
      decision: 'approved',
    });
    approvals += 1;
    if (resumed.interrupted) {
      chat = { ...chat, interrupted: true, interrupt: resumed.interrupt };
      continue;
    }
    chat = {
      ...chat,
      interrupted: false,
      status: resumed.finalState?.status || 'completed',
      message: resumed.message || chat.message || null,
      observability: {
        pipeline: resumed.finalState?.selected_pipeline || chat.observability?.pipeline,
        stage: resumed.finalState?.status || chat.observability?.stage,
        nextStage: chat.observability?.nextStage,
        modeRequested: input.mode,
        modeApplied: input.mode,
        engine: chat.observability?.engine || 'pilot-unified-graph',
      },
    };
  }

  assert(chat.success, `${input.name}: /api/chat success=false ${chat.error || ''}`.trim());
  assert(!chat.interrupted, `${input.name}: remained interrupted after approvals`);
  assert(chat.threadId === input.threadId, `${input.name}: threadId mismatch`);
  assert(Boolean(chat.runId), `${input.name}: runId missing`);
  assert(chat.observability?.modeApplied === input.mode, `${input.name}: modeApplied mismatch`);
  assert(Boolean(chat.message), `${input.name}: assistant message missing in response`);

  const thread = await getJson<ThreadMessagesResponse>(
    `${BASE_URL}/api/cockpit/chains/${encodeURIComponent(input.threadId)}/messages`,
  );
  assert(thread.success, `${input.name}: messages endpoint success=false`);
  assert(thread.messages.some((m) => m.role === 'user'), `${input.name}: user message missing in thread`);
  assert(thread.messages.some((m) => m.role === 'agent'), `${input.name}: agent message missing in thread`);

  return {
    case: input.name,
    ticketId: input.ticketId,
    threadId: input.threadId,
    runId: chat.runId,
    responseStatus: chat.status || null,
    approvalsUsed: approvals,
    pipeline: chat.observability?.pipeline || null,
    modeRequested: chat.observability?.modeRequested || null,
    modeApplied: chat.observability?.modeApplied || null,
    engine: chat.observability?.engine || null,
    gitContext: chat.gitContext || null,
    threadMessages: thread.messages.length,
    hasAgentReply: thread.messages.some((m) => m.role === 'agent'),
  };
}

async function main() {
  const health = await getJson<{ success: boolean; status?: string }>(`${BASE_URL}/api/health`);
  assert(health.success, 'Backend health check failed');

  const ts = Date.now();
  const modes: Array<'linear' | 'multiple_agents'> = ['linear', 'multiple_agents'];
  const cases = [
    { suffix: 'hello', ticketId: 'AGSYS-510', message: 'Привіт. Це smoke test через api/chat. Відповідай коротко.' },
    { suffix: 'intake', ticketId: 'AGSYS-511', message: 'Зроби intake-qna-only і поверни статус виконання.' },
  ];
  const results = [];
  for (const mode of modes) {
    for (const testCase of cases) {
      const modeTicket = mode === 'linear' ? `${testCase.ticketId}0` : `${testCase.ticketId}1`;
      results.push(
        await runSingleChatCase({
          name: `chat-smoke-${testCase.suffix}-${mode}`,
          threadId: `thread_chat_flow_smoke_${testCase.suffix}_${mode}_${ts}`,
          ticketId: modeTicket,
          message: testCase.message,
          mode,
        }),
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    pass: true,
    cases: results,
  };

  const dir = path.resolve(process.cwd(), 'docs/process/runs/chat-flow');
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `report-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`CHAT_FLOW_PASS=true`);
  console.log(`REPORT=${outPath}`);
  console.log(`CASES=${results.length}`);
}

main().catch((error) => {
  console.error(`CHAT_FLOW_PASS=false`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
