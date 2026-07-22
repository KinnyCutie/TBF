const accountAgeCache = new Map();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const BADGE_TYPES = {
  ONE_DAY: {
    label: '[!BOT] ',
    color: '#ff4f4f', 
    tooltip: 'Account created less than 24 hours ago'
  },
  ONE_WEEK: {
    label: '[?!BOT] ',
    color: '#ff9800', 
    tooltip: 'Account created less than 7 days ago'
  },
  THIRTY_DAYS: {
    label: '[?BOT] ',
    color: '#ffee55', 
    tooltip: 'Account created less than 30 days ago'
  }
};

async function getAccountCreatedAt(username) {
  const cleanUser = username.toLowerCase().trim();

  if (accountAgeCache.has(cleanUser)) {
    return accountAgeCache.get(cleanUser);
  }

  try {
    const response = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(cleanUser)}`);
    if (!response.ok) {
      accountAgeCache.set(cleanUser, null);
      return null;
    }

    const data = await response.json();
    if (!data || !data[0] || !data[0].createdAt) {
      accountAgeCache.set(cleanUser, null);
      return null;
    }

    const createdAt = new Date(data[0].createdAt).getTime();
    accountAgeCache.set(cleanUser, createdAt);
    return createdAt;
  } catch (err) {
    console.error(`[BotChecker] Error fetching data for ${cleanUser}:`, err);
    accountAgeCache.set(cleanUser, null);
    return null;
  }
}

function createBotBadge(badgeConfig) {
  const badge = document.createElement('span');
  badge.className = 'bot-badge-flag';
  badge.textContent = badgeConfig.label;
  badge.style.color = badgeConfig.color;
  badge.style.fontWeight = 'bold';
  badge.style.fontSize = '0.85em';
  badge.style.marginRight = '4px';
  badge.style.cursor = 'help';
  badge.title = badgeConfig.tooltip;
  return badge;
}

function getBadgeConfigForAge(createdAtMs) {
  if (!createdAtMs) return null;

  const ageMs = Date.now() - createdAtMs;

  if (ageMs < ONE_DAY_MS) {
    return BADGE_TYPES.ONE_DAY;
  } else if (ageMs < ONE_WEEK_MS) {
    return BADGE_TYPES.ONE_WEEK;
  } else if (ageMs < THIRTY_DAYS_MS) {
    return BADGE_TYPES.THIRTY_DAYS;
  }

  return null; 
}
 {
  if (messageNode.dataset.botChecked) return;
  messageNode.dataset.botChecked = "true";

  const userElement = messageNode.querySelector('.chat-author__display-name, [data-a-target="chat-message-username"]');
  if (!userElement) return;

  const username = userElement.textContent.trim();
  if (!username) return;

  const createdAt = await getAccountCreatedAt(username);
  const badgeConfig = getBadgeConfigForAge(createdAt);

  if (badgeConfig) {
    if (!messageNode.querySelector('.bot-badge-flag')) {
      const parentContainer = userElement.parentElement;
      if (parentContainer) {
        parentContainer.insertBefore(createBotBadge(badgeConfig), userElement);
      }
    }
  }
}

function observeChat() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches && node.matches('.chat-line__message')) {
            processChatMessage(node);
          } else {
            const chatLines = node.querySelectorAll ? node.querySelectorAll('.chat-line__message') : [];
            chatLines.forEach(processChatMessage);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeChat);
} else {
  observeChat();
}