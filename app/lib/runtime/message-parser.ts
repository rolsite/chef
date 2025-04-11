import type { ActionType, BoltAction, BoltActionData, FileAction } from '~/types/actions';
import type { BoltArtifactData } from '~/types/artifact';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { PartId } from '~/lib/stores/artifacts';
import { getRelativePath } from '~/lib/stores/files';

const ARTIFACT_TAG_OPEN = '<boltArtifact';
const ARTIFACT_TAG_CLOSE = '</boltArtifact>';
const ARTIFACT_ACTION_TAG_OPEN = '<boltAction';
const ARTIFACT_ACTION_TAG_CLOSE = '</boltAction>';

const logger = createScopedLogger('MessageParser');

export interface ArtifactCallbackData extends BoltArtifactData {
  partId: PartId;
}

export interface ActionCallbackData {
  artifactId: string;
  partId: PartId;
  actionId: string;
  action: BoltAction;
}

export type ArtifactCallback = (data: ArtifactCallbackData) => void;
export type ActionCallback = (data: ActionCallbackData) => void;

interface ParserCallbacks {
  onArtifactOpen?: ArtifactCallback;
  onArtifactClose?: ArtifactCallback;
  onActionOpen?: ActionCallback;
  onActionStream?: ActionCallback;
  onActionClose?: ActionCallback;
}

interface ElementFactoryProps {
  partId: PartId;
}

type ElementFactory = (props: ElementFactoryProps) => string;

interface StreamingMessageParserOptions {
  callbacks?: ParserCallbacks;
  artifactElement?: ElementFactory;
}

interface MessageState {
  position: number;
  insideArtifact: boolean;
  insideAction: boolean;
  currentArtifact?: BoltArtifactData;
  currentAction: BoltActionData;
  actionId: number;
}

function cleanoutMarkdownSyntax(content: string) {
  const codeBlockRegex = /^\s*```\w*\n([\s\S]*?)\n\s*```\s*$/;
  const match = content.match(codeBlockRegex);

  // console.log('matching', !!match, content);

  if (match) {
    return match[1]; // Remove common leading 4-space indent
  } else {
    return content;
  }
}

function cleanEscapedTags(content: string) {
  return content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
export class StreamingMessageParser {
  #messages = new Map<string, MessageState>();

  constructor(private _options: StreamingMessageParserOptions = {}) {}

  parse(partId: PartId, input: string) {
    let state = this.#messages.get(partId);

    if (!state) {
      state = getInitialMessageState();

      this.#messages.set(partId, state);
    }
    const output = parse({
      partId,
      state,
      input,
      callbacks: this._options.callbacks,
      renderCallbacks: {
        renderActionContent: () => {
          return '';
        },
        renderArtifactStart: (partId: PartId) => {
          return createArtifactElement({ partId });
        },
        renderArtifactEnd: () => {
          return '';
        },
        renderPlainText: (content: string) => {
          return content;
        },
      },
    });

    return output;
  }

  reset() {
    this.#messages.clear();
  }
}

function parseActionBeginTag(input: string, actionOpenIndex: number, actionEndIndex: number): FileAction {
  const actionTag = input.slice(actionOpenIndex, actionEndIndex + 1);

  const actionType = extractAttribute(actionTag, 'type') as ActionType;

  const actionAttributes = {
    type: actionType,
    content: '',
  };

  if (actionType === 'file') {
    const filePath = extractAttribute(actionTag, 'filePath') as string;

    if (!filePath) {
      logger.debug('File path not specified');
    }

    (actionAttributes as FileAction).filePath = getRelativePath(filePath);
  } else {
    logger.warn(`Unknown action type '${actionType}'`);
  }

  return actionAttributes as FileAction;
}

function extractAttribute(tag: string, attributeName: string): string | undefined {
  const match = tag.match(new RegExp(`${attributeName}="([^"]*)"`, 'i'));
  return match ? match[1] : undefined;
}

const createArtifactElement: ElementFactory = (props) => {
  const elementProps = [
    'class="__boltArtifact__"',
    ...Object.entries(props).map(([key, value]) => {
      return `data-${camelToDashCase(key)}=${JSON.stringify(value)}`;
    }),
  ];

  return `<div ${elementProps.join(' ')}></div>`;
};

function camelToDashCase(input: string) {
  return input.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function getInitialMessageState(): MessageState {
  return {
    position: 0,
    insideArtifact: false,
    insideAction: false,
    currentAction: { content: '' },
    actionId: 0,
  };
}

/**
 * Parses the input string and returns the output string.
 *
 * Mutates `state`
 */
export function parse(args: {
  partId: PartId;
  state: MessageState;
  input: string;
  callbacks?: ParserCallbacks;
  renderCallbacks: {
    renderActionContent: (boltAction: BoltAction) => void;
    renderArtifactStart: (partId: PartId, data: BoltArtifactData) => void;
    renderArtifactEnd: () => void;
    renderPlainText: (content: string) => void;
  };
}) {
  const { partId, state, input, callbacks, renderCallbacks } = args;

  let output = '';
  let i = state.position;
  let earlyBreak = false;

  while (i < input.length) {
    if (state.insideArtifact) {
      const currentArtifact = state.currentArtifact;

      if (currentArtifact === undefined) {
        unreachable('Artifact not initialized');
      }

      if (state.insideAction) {
        const closeIndex = input.indexOf(ARTIFACT_ACTION_TAG_CLOSE, i);

        const currentAction = state.currentAction;
        const isFileAction = 'type' in currentAction && currentAction.type === 'file';

        if (closeIndex !== -1) {
          currentAction.content += input.slice(i, closeIndex);

          let content = currentAction.content.trim();

          if (isFileAction) {
            // Remove markdown code block syntax if present and file is not markdown
            if (!currentAction.filePath.endsWith('.md')) {
              content = cleanoutMarkdownSyntax(content);
              content = cleanEscapedTags(content);
            }

            content += '\n';
          }

          currentAction.content = content;

          callbacks?.onActionClose?.({
            artifactId: currentArtifact.id,
            partId,

            /**
             * We decrement the id because it's been incremented already
             * when `onActionOpen` was emitted to make sure the ids are
             * the same.
             */
            actionId: String(state.actionId - 1),

            action: currentAction as BoltAction,
          });

          output += renderCallbacks.renderActionContent(currentAction as BoltAction);

          state.insideAction = false;
          state.currentAction = { content: '' };

          i = closeIndex + ARTIFACT_ACTION_TAG_CLOSE.length;
        } else {
          // We're in the middle of an action, so if it's a file action, stream its content
          if (isFileAction) {
            let content = input.slice(i);

            if (!currentAction.filePath.endsWith('.md')) {
              content = cleanoutMarkdownSyntax(content);
              content = cleanEscapedTags(content);
            }
            callbacks?.onActionStream?.({
              artifactId: currentArtifact.id,
              partId,
              actionId: String(state.actionId - 1),
              action: {
                ...(currentAction as FileAction),
                content,
                filePath: currentAction.filePath,
              },
            });
          }

          break;
        }
      } else {
        const actionOpenIndex = input.indexOf(ARTIFACT_ACTION_TAG_OPEN, i);
        const artifactCloseIndex = input.indexOf(ARTIFACT_TAG_CLOSE, i);

        // We're in an artifact, and have an action open tag before the end of the artifact
        if (actionOpenIndex !== -1 && (artifactCloseIndex === -1 || actionOpenIndex < artifactCloseIndex)) {
          const actionEndIndex = input.indexOf('>', actionOpenIndex);

          // We found the end of the action tag
          if (actionEndIndex !== -1) {
            state.insideAction = true;
            const fileAction = parseActionBeginTag(input, actionOpenIndex, actionEndIndex);

            state.currentAction = fileAction;

            callbacks?.onActionOpen?.({
              artifactId: currentArtifact.id,
              partId,
              actionId: String(state.actionId++),
              action: state.currentAction as BoltAction,
            });

            i = actionEndIndex + 1;
          } else {
            break;
          }
        } else if (artifactCloseIndex !== -1) {
          callbacks?.onArtifactClose?.({ partId, ...currentArtifact });

          state.insideArtifact = false;
          state.currentArtifact = undefined;

          i = artifactCloseIndex + ARTIFACT_TAG_CLOSE.length;

          output += renderCallbacks.renderArtifactEnd();
        } else {
          break;
        }
      }
    } else if (input[i] === '<' && input[i + 1] !== '/') {
      // This is the open tag for something
      let j = i;
      let potentialTag = '';

      while (j < input.length && potentialTag.length < ARTIFACT_TAG_OPEN.length) {
        potentialTag += input[j];

        if (potentialTag === ARTIFACT_TAG_OPEN) {
          const nextChar = input[j + 1];

          if (nextChar && nextChar !== '>' && nextChar !== ' ') {
            output += input.slice(i, j + 1);
            i = j + 1;
            break;
          }

          const openTagEnd = input.indexOf('>', j);

          if (openTagEnd !== -1) {
            const artifactTag = input.slice(i, openTagEnd + 1);

            const artifactTitle = extractAttribute(artifactTag, 'title') as string;
            const type = extractAttribute(artifactTag, 'type') as string;
            const artifactId = extractAttribute(artifactTag, 'id') as string;

            if (!artifactTitle) {
              logger.warn('Artifact title missing');
            }

            if (!artifactId) {
              logger.warn('Artifact id missing');
            }

            state.insideArtifact = true;

            const currentArtifact = {
              id: artifactId,
              title: artifactTitle,
              type,
            } satisfies BoltArtifactData;

            state.currentArtifact = currentArtifact;

            callbacks?.onArtifactOpen?.({ partId, ...currentArtifact });

            output += renderCallbacks.renderArtifactStart(partId, currentArtifact);

            i = openTagEnd + 1;
          } else {
            // break out of the outer loop
            earlyBreak = true;
          }

          break;
        } else if (!ARTIFACT_TAG_OPEN.startsWith(potentialTag)) {
          output += input.slice(i, j + 1);
          i = j + 1;
          break;
        }

        j++;
      }

      if (j === input.length && ARTIFACT_TAG_OPEN.startsWith(potentialTag)) {
        break;
      }
    } else {
      // We're outside of an artifact, so just add the character to the output
      output += renderCallbacks.renderPlainText(input[i]);
      i++;
    }

    if (earlyBreak) {
      break;
    }
  }

  state.position = i;

  return output;
}
