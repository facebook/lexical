/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AIMessage} from '../types';

export interface ContextManagerConfig {
  maxContextTokens: number;
  reservedForResponse: number;
  recentTurnsToKeep: number;
}

export const DEFAULT_CONTEXT_CONFIG: ContextManagerConfig = {
  maxContextTokens: 128_000,
  recentTurnsToKeep: 4,
  reservedForResponse: 4_096,
};

export interface ManagedContext {
  messages: AIMessage[];
  compactedTurns: number;
  estimatedTokens: number;
}

const CHARS_PER_TOKEN = 3.5;
const SAFETY_MARGIN = 1.1;

export function estimateTokens(text: string): number {
  return Math.ceil((text.length / CHARS_PER_TOKEN) * SAFETY_MARGIN);
}

export function estimateMessageTokens(message: AIMessage): number {
  let total = estimateTokens(message.content);

  if (message.toolCalls != null) {
    for (const tc of message.toolCalls) {
      total += estimateTokens(tc.name);
      total += estimateTokens(JSON.stringify(tc.input));
      total += 20;
    }
  }

  if (message.toolResults != null) {
    for (const tr of message.toolResults) {
      total += estimateTokens(tr.result);
      total += 15;
    }
  }

  total += 10;

  return total;
}

export function estimateMessagesTokens(messages: AIMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateMessageTokens(msg);
  }
  return total;
}

interface Turn {
  startIndex: number;
  endIndex: number;
  tokens: number;
}

function identifyTurns(messages: AIMessage[]): Turn[] {
  const turns: Turn[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === 'user') {
      const tokens = estimateMessageTokens(msg);
      turns.push({endIndex: i + 1, startIndex: i, tokens});
      i++;
    } else {
      let endIndex = i + 1;
      let tokens = estimateMessageTokens(msg);

      const nextMsg = endIndex < messages.length ? messages[endIndex] : null;
      if (
        nextMsg != null &&
        nextMsg.role === 'user' &&
        nextMsg.toolResults != null &&
        nextMsg.toolResults.length > 0
      ) {
        tokens += estimateMessageTokens(nextMsg);
        endIndex++;
      }

      turns.push({endIndex, startIndex: i, tokens});
      i = endIndex;
    }
  }

  return turns;
}

function compactTurns(
  messages: AIMessage[],
  turns: Turn[],
  turnCount: number,
): AIMessage {
  const lines: string[] = ['[Previous context — compacted]', 'Actions taken:'];

  for (let t = 0; t < turnCount; t++) {
    const turn = turns[t];
    const turnMessages = messages.slice(turn.startIndex, turn.endIndex);
    const turnLines: string[] = [];

    for (const msg of turnMessages) {
      if (msg.role === 'assistant') {
        if (msg.toolCalls != null) {
          for (const tc of msg.toolCalls) {
            const inputStr = JSON.stringify(tc.input);
            const truncatedInput =
              inputStr.length > 100 ? inputStr.slice(0, 100) + '...' : inputStr;
            turnLines.push(`  Called ${tc.name}(${truncatedInput})`);
          }
        }
        if (msg.content) {
          const truncated =
            msg.content.length > 200
              ? msg.content.slice(0, 200) + '...'
              : msg.content;
          turnLines.push(`  Response: ${truncated}`);
        }
      } else if (msg.role === 'user' && msg.toolResults != null) {
        for (const tr of msg.toolResults) {
          try {
            const parsed = JSON.parse(tr.result);
            const status = parsed.success ? 'OK' : 'FAILED';
            const resultMsg =
              typeof parsed.message === 'string'
                ? parsed.message.slice(0, 150)
                : '';
            turnLines.push(`  → ${status}: ${resultMsg}`);
          } catch {
            const truncated =
              tr.result.length > 150
                ? tr.result.slice(0, 150) + '...'
                : tr.result;
            turnLines.push(`  → ${truncated}`);
          }
        }
      }
    }

    if (turnLines.length > 0) {
      lines.push(`- Turn ${t + 1}:`);
      lines.push(...turnLines);
    }
  }

  return {
    content: lines.join('\n'),
    role: 'user',
  };
}

export function manageContext(
  allMessages: AIMessage[],
  config: ContextManagerConfig,
  systemPromptTokens: number,
  toolsTokens: number,
): ManagedContext {
  const budget = config.maxContextTokens - config.reservedForResponse;
  const fixedTokens = systemPromptTokens + toolsTokens;

  const totalTokens = fixedTokens + estimateMessagesTokens(allMessages);
  if (totalTokens <= budget) {
    return {
      compactedTurns: 0,
      estimatedTokens: totalTokens,
      messages: allMessages,
    };
  }

  const turns = identifyTurns(allMessages);

  if (turns.length <= 1) {
    return {
      compactedTurns: 0,
      estimatedTokens: totalTokens,
      messages: allMessages,
    };
  }

  let recentToKeep = Math.min(config.recentTurnsToKeep, turns.length - 1);

  while (recentToKeep >= 1) {
    const turnsToCompact = turns.length - recentToKeep;

    if (turnsToCompact <= 0) {
      recentToKeep--;
      continue;
    }

    const summary = compactTurns(allMessages, turns, turnsToCompact);
    const summaryTokens = estimateMessageTokens(summary);

    const recentStartIndex = turns[turnsToCompact].startIndex;
    const recentMessages = allMessages.slice(recentStartIndex);
    const recentTokens = estimateMessagesTokens(recentMessages);

    const managedTotal = fixedTokens + summaryTokens + recentTokens;

    if (managedTotal <= budget) {
      return {
        compactedTurns: turnsToCompact,
        estimatedTokens: managedTotal,
        messages: [summary, ...recentMessages],
      };
    }

    recentToKeep--;
  }

  const lastTurn = turns[turns.length - 1];
  const summary = compactTurns(allMessages, turns, turns.length - 1);
  const lastMessages = allMessages.slice(lastTurn.startIndex);

  const finalTokens =
    fixedTokens +
    estimateMessageTokens(summary) +
    estimateMessagesTokens(lastMessages);

  return {
    compactedTurns: turns.length - 1,
    estimatedTokens: finalTokens,
    messages: [summary, ...lastMessages],
  };
}
