/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AIMessage} from '../types';

// ─── Configuration ───

export interface ContextManagerConfig {
  /** Total token budget for the context window. Default: 128_000 */
  maxContextTokens: number;
  /** Tokens reserved for the LLM response. Default: 4_096 */
  reservedForResponse: number;
  /** Minimum number of recent turns to keep intact. Default: 4 */
  recentTurnsToKeep: number;
}

export const DEFAULT_CONTEXT_CONFIG: ContextManagerConfig = {
  maxContextTokens: 128_000,
  recentTurnsToKeep: 4,
  reservedForResponse: 4_096,
};

export interface ManagedContext {
  /** Messages to send to the adapter (may include a compacted summary) */
  messages: AIMessage[];
  /** Number of turns that were compacted into a summary */
  compactedTurns: number;
  /** Estimated total tokens for the managed messages */
  estimatedTokens: number;
}

// ─── Token Estimation ───

const CHARS_PER_TOKEN = 3.5;
const SAFETY_MARGIN = 1.1;

/**
 * Estimate token count for a string using a character-based heuristic.
 * Uses chars / 3.5 — conservative for mixed English/JSON/code content.
 */
export function estimateTokens(text: string): number {
  return Math.ceil((text.length / CHARS_PER_TOKEN) * SAFETY_MARGIN);
}

/**
 * Estimate total tokens for a message, including content, tool calls,
 * and tool results.
 */
export function estimateMessageTokens(message: AIMessage): number {
  let total = estimateTokens(message.content);

  if (message.toolCalls != null) {
    for (const tc of message.toolCalls) {
      total += estimateTokens(tc.name);
      total += estimateTokens(JSON.stringify(tc.input));
      // Overhead for tool call structure (id, type markers)
      total += 20;
    }
  }

  if (message.toolResults != null) {
    for (const tr of message.toolResults) {
      total += estimateTokens(tr.result);
      // Overhead for tool result structure
      total += 15;
    }
  }

  // Per-message overhead (role, structure)
  total += 10;

  return total;
}

/**
 * Estimate total tokens for an array of messages.
 */
export function estimateMessagesTokens(messages: AIMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateMessageTokens(msg);
  }
  return total;
}

// ─── Turn Identification ───

interface Turn {
  /** Index range [start, end) in the messages array */
  startIndex: number;
  endIndex: number;
  /** Estimated tokens for this turn */
  tokens: number;
}

/**
 * Identify turn boundaries in the conversation.
 *
 * A "turn" is one of:
 * - A standalone user message (the initial prompt)
 * - An assistant message + optional following user message with tool results
 *
 * The first message (user prompt) is always its own turn.
 */
function identifyTurns(messages: AIMessage[]): Turn[] {
  const turns: Turn[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === 'user') {
      // Standalone user message (initial prompt or follow-up)
      const tokens = estimateMessageTokens(msg);
      turns.push({endIndex: i + 1, startIndex: i, tokens});
      i++;
    } else {
      // Assistant message — may be followed by a user message with tool results
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

// ─── Compaction ───

/**
 * Compact a range of turns into a single summary message.
 * Extracts tool names, key parameters, and results into a structured log.
 */
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
        // Extract tool call summaries
        if (msg.toolCalls != null) {
          for (const tc of msg.toolCalls) {
            const inputStr = JSON.stringify(tc.input);
            const truncatedInput =
              inputStr.length > 100 ? inputStr.slice(0, 100) + '...' : inputStr;
            turnLines.push(`  Called ${tc.name}(${truncatedInput})`);
          }
        }
        // Extract text response (truncated)
        if (msg.content) {
          const truncated =
            msg.content.length > 200
              ? msg.content.slice(0, 200) + '...'
              : msg.content;
          turnLines.push(`  Response: ${truncated}`);
        }
      } else if (msg.role === 'user' && msg.toolResults != null) {
        // Extract tool result summaries
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

// ─── Main Context Management ───

/**
 * Apply sliding window context management to the conversation history.
 *
 * Protected zones (never compressed):
 * - System prompt (accounted for via systemPromptTokens)
 * - Tool definitions (accounted for via toolsTokens)
 * - Recent turns (last recentTurnsToKeep turns)
 *
 * When the total estimated tokens exceed the budget, older turns are
 * compacted into a structured summary message.
 */
export function manageContext(
  allMessages: AIMessage[],
  config: ContextManagerConfig,
  systemPromptTokens: number,
  toolsTokens: number,
): ManagedContext {
  const budget = config.maxContextTokens - config.reservedForResponse;
  const fixedTokens = systemPromptTokens + toolsTokens;

  // Fast path: if everything fits, return as-is
  const totalTokens = fixedTokens + estimateMessagesTokens(allMessages);
  if (totalTokens <= budget) {
    return {
      compactedTurns: 0,
      estimatedTokens: totalTokens,
      messages: allMessages,
    };
  }

  const turns = identifyTurns(allMessages);

  // If only 0-1 turns, can't compact anything
  if (turns.length <= 1) {
    return {
      compactedTurns: 0,
      estimatedTokens: totalTokens,
      messages: allMessages,
    };
  }

  // Try compacting with decreasing recentTurnsToKeep until we fit
  let recentToKeep = Math.min(config.recentTurnsToKeep, turns.length - 1);

  while (recentToKeep >= 1) {
    const turnsToCompact = turns.length - recentToKeep;

    if (turnsToCompact <= 0) {
      recentToKeep--;
      continue;
    }

    // Build the compacted summary
    const summary = compactTurns(allMessages, turns, turnsToCompact);
    const summaryTokens = estimateMessageTokens(summary);

    // Collect the recent (preserved) messages
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

    // Still over budget — keep fewer recent turns
    recentToKeep--;
  }

  // Last resort: compact everything except the very last turn
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
