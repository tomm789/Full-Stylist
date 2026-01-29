/**
 * Shared outfit description → GenerationProgressModal message mapping.
 * Single source of truth for backend text (description, occasions, style_tags, season)
 * to modal message shape.
 */

export interface OutfitDescription {
  description: string;
  occasions: string[];
  styleTags: string[];
  season: string;
}

export interface GenerationMessage {
  id: string;
  kind: 'description' | 'contexts' | 'style' | 'versatility' | 'finalizing';
  text: string;
}

const DRIP_INTERVAL_MS = 1500;
const DRIP_INITIAL_DELAY_MS = 300;

/**
 * Map outfit description fields to GenerationMessage[] for modal drip-feed.
 */
export function outfitDescriptionToGenerationMessages(
  description: OutfitDescription
): GenerationMessage[] {
  const messages: GenerationMessage[] = [];

  if (description.description) {
    messages.push({
      id: 'msg-description',
      kind: 'description',
      text: description.description,
    });
  }

  if (description.occasions.length > 0) {
    messages.push({
      id: 'msg-contexts',
      kind: 'contexts',
      text: `Perfect for ${description.occasions.join(', ')}.`,
    });
  }

  if (description.styleTags.length > 0) {
    messages.push({
      id: 'msg-style',
      kind: 'style',
      text: `This outfit embodies ${description.styleTags.join(', ')} vibes.`,
    });
  }

  if (description.season && description.season !== 'all-season') {
    messages.push({
      id: 'msg-versatility',
      kind: 'versatility',
      text: `Best suited for ${description.season} weather.`,
    });
  } else {
    messages.push({
      id: 'msg-versatility',
      kind: 'versatility',
      text: `A versatile outfit that works year-round.`,
    });
  }

  return messages;
}

/**
 * Run 2s-interval drip of messages, then set phase to 'finalizing' and final message.
 * Purely decorative; must not block navigation or success return.
 */
export function runDescriptionMessageDrip(
  messages: GenerationMessage[],
  setActiveMessage: (m: GenerationMessage | null) => void,
  setPhase: (phase: 'items' | 'analysis' | 'finalizing') => void
): void {
  let currentIndex = 0;

  const showNext = () => {
    if (currentIndex < messages.length) {
      setActiveMessage(messages[currentIndex]);
      currentIndex++;
      setTimeout(showNext, DRIP_INTERVAL_MS);
    } else {
      setPhase('finalizing');
      setActiveMessage({
        id: 'msg-finalizing',
        kind: 'finalizing',
        text: 'Applying final touches to your outfit visualization...',
      });
    }
  };

  setTimeout(showNext, DRIP_INITIAL_DELAY_MS);
}
