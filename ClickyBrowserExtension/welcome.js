import {createMark} from './mark.js';
import {makeBubble} from './bubble.js';

const $ = id => document.getElementById(id);

makeBubble($('ask'), {outgoing: true});
makeBubble($('answer'));
const mark = createMark($('speaker'), {width: 17, weight: 1.35});
setTimeout(() => mark.blink(), 900);

const CONNECT = {
  checking: ['Connecting to HeyClicky…', 'Looking for the app on your Mac.', 'working', false],
  setup: ['Finish in HeyClicky', 'Open HeyClicky → Settings → Integrations → Chrome and press Connect. This page updates by itself.', 'warn', true],
  offline: ['Open HeyClicky', 'The app isn’t running right now. Open it and Chrome reconnects on its own.', 'warn', true],
  profile: ['Connected to another profile', 'HeyClicky is using a different Chrome profile. Switch it in Settings → Integrations → Chrome.', 'warn', true],
  connected: ['Connected to HeyClicky', 'HeyClicky can reach Chrome now.', 'done', false],
  working: ['Connected to HeyClicky', 'A job is already working in Chrome.', 'done', false],
};

async function refresh() {
  let status = {state: 'checking'};
  try { status = await chrome.runtime.sendMessage({type: 'status'}); } catch {}
  const [title, detail, tone, showActions] = CONNECT[status.state] ?? CONNECT.checking;
  $('step-connect').className = `step ${tone}`;
  $('connect-title').textContent = title;
  $('connect-detail').textContent = detail;
  $('connect-actions').hidden = !showActions;

  const settings = await chrome.action.getUserSettings().catch(() => ({}));
  const pinned = settings.isOnToolbar === true;
  $('step-pin').className = `step${pinned ? ' done' : ''}`;
  $('pin-title').textContent = pinned ? 'Pinned' : 'Pin HeyClicky';
  $('pin-detail').textContent = pinned
    ? 'HeyClicky’s button is in your toolbar. It shows when a job is working and stops it in one click.'
    : 'Click the puzzle piece in Chrome’s toolbar, then the pin beside HeyClicky. Its button shows when a job is working and stops it in one click.';
}

$('open-app').addEventListener('click', () => chrome.runtime.sendMessage({type: 'openApp'}));
chrome.runtime.sendMessage({type: 'connect'}).catch(() => {});
void refresh();
setInterval(refresh, 1000);
