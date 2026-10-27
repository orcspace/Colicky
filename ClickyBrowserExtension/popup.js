import {createMark} from './mark.js';

const $ = id => document.getElementById(id);

// What the popup says in each of the background's connection states.
const STATES = {
  checking: {status: ['Checking', 'quiet checking'], line: 'Looking for HeyClicky on your Mac…', breathes: true},
  // Chrome sometimes installs an unpacked extension without starting its background worker; nothing answers
  // until the extension is reloaded.
  stalled: {status: ['Stuck', 'needs'], line: 'Chrome didn’t start HeyClicky’s helper. One click restarts it.', primary: 'Restart HeyClicky', restart: true},
  setup: {status: ['Set up', 'needs'], line: 'Almost there. In HeyClicky, open <strong>Settings → Integrations → Chrome</strong> and press Connect.', primary: 'Open HeyClicky', get: true},
  offline: {status: ['Offline', 'quiet'], line: 'HeyClicky isn’t open on your Mac. Open it and Chrome reconnects on its own.', primary: 'Open HeyClicky', get: true},
  profile: {status: ['Paused', 'needs'], line: 'HeyClicky is using another Chrome profile. You can switch it in <strong>Settings → Integrations → Chrome</strong>.', primary: 'Open HeyClicky settings'},
  connected: {status: ['Connected', 'ready'], line: 'Ready. Ask HeyClicky to do something on the web; its jobs work in tabs beside yours, only for what you ask.'},
  working: {working: true},
};

// The live line's glyph, in the app's hand (ClickyLiveLineGlyph), picked from what the line says.
const GLYPHS = {
  look: 'M6.2 3.6h7.6l3.8 3.8v4.4 M6.2 3.6v16.6h5.6 M9 9.3h4.6 M9 12.6h3 M16.3 13.4c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3Z M18.5 18.6l2.1 2',
  search: 'M10.4 4.3c3.5-.1 6.3 2.7 6.2 6.1-.1 3.3-2.9 6-6.2 5.9-3.4-.1-6-2.9-5.9-6.2.1-3.2 2.7-5.7 5.9-5.8Z M15.1 15.3l4.8 4.6',
  read: 'M3.4 6.3c2.9-.9 5.9-.6 8.6 1.2 2.7-1.8 5.7-2.1 8.6-1.2v11.8c-2.9-.8-5.9-.5-8.6 1.2-2.7-1.7-5.7-2-8.6-1.2Z M12 7.5v11.6',
  note: 'M4.6 19.4l1-4.1 9.9-9.9a1.9 1.9 0 0 1 2.7 0l.4.4a1.9 1.9 0 0 1 0 2.7l-9.9 9.9Z M13.7 7.2l3.1 3.1',
  file: 'M6.4 3.6h7.4l4 4v12.8H6.4Z M13.8 3.6v4h4 M9.2 12.4h5.6 M9.2 15.6h4',
  mac: 'M6.2 4.2l12 7.2-5.4 1.3 3 5.9-2.2 1.1-3-5.9-4.2 3.6Z',
};
function glyphFor(text) {
  const words = text.toLowerCase();
  if (/\b(search|searching|look(ing)? up|find|finding)\b/.test(words)) return GLYPHS.search;
  if (/\b(read|reading|review|reviewing|going through)\b/.test(words)) return GLYPHS.read;
  if (/\b(writ|draft|typ|fill|enter|reply|replying|compos)/.test(words)) return GLYPHS.note;
  if (/\b(download|upload|sav|file|pdf|attach)/.test(words)) return GLYPHS.file;
  if (/\b(click|press|select|choos|open|scroll|book|add)/.test(words)) return GLYPHS.mac;
  return GLYPHS.look;
}

const mark = createMark($('mark'), {width: 24, weight: 1.25});
setTimeout(() => mark.blink(), 380);

function liveLine(text) {
  const line = document.createElement('div');
  line.className = 'live';
  line.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path/></svg><span class="breath"><span class="rest"></span><span class="light" aria-hidden="true"></span></span>';
  line.querySelector('path').setAttribute('d', glyphFor(text));
  line.querySelector('.rest').textContent = text;
  line.querySelector('.light').textContent = text;
  return line;
}

function tabRow(tab) {
  const button = document.createElement('button');
  button.className = 'tab';
  const icon = tab.favIconUrl?.startsWith('https://')
    ? Object.assign(document.createElement('img'), {src: tab.favIconUrl, alt: ''})
    : Object.assign(document.createElement('i'), {className: 'globe'});
  icon.addEventListener?.('error', () => icon.replaceWith(Object.assign(document.createElement('i'), {className: 'globe'})));
  const title = Object.assign(document.createElement('span'), {className: 'title', textContent: tab.title || tab.url});
  const go = Object.assign(document.createElement('span'), {className: 'go', textContent: 'Show'});
  button.append(icon, title, go);
  button.title = tab.url ?? '';
  button.setAttribute('aria-label', `Show the tab ${tab.title || tab.url}`);
  button.addEventListener('click', () => chrome.runtime.sendMessage({type: 'focusTab', tabId: tab.id}));
  return button;
}

// Cards are kept by name and updated in place, so the breathing words and the spinner don't restart every second.
const cards = new Map();
function renderCards(clickys) {
  const seen = new Set();
  clickys.forEach((clicky, index) => {
    const key = clicky.name || `clicky-${index}`;
    seen.add(key);
    let card = cards.get(key);
    if (!card) {
      card = {element: document.createElement('div'), doing: null, tabsKey: null};
      card.element.className = 'card';
      const head = document.createElement('div');
      head.className = 'head';
      head.append(Object.assign(document.createElement('span'), {className: 'spinner'}),
        Object.assign(document.createElement('b'), {textContent: clicky.name || 'A job'}));
      card.element.append(head);
      cards.set(key, card);
    }
    const doing = clicky.doing?.trim() || '';
    if (doing !== card.doing) {
      card.element.querySelector('.live, .waiting')?.remove();
      const line = doing ? liveLine(doing) : Object.assign(document.createElement('div'), {className: 'waiting', textContent: 'Getting started…'});
      card.element.querySelector('.head').after(line);
      card.doing = doing;
    }
    const tabs = clicky.tabs ?? [];
    const tabsKey = JSON.stringify(tabs.map(tab => [tab.id, tab.title, tab.favIconUrl]));
    if (tabsKey !== card.tabsKey) {
      card.element.querySelector('.tabs')?.remove();
      card.element.querySelector('.more')?.remove();
      if (tabs.length) {
        const list = Object.assign(document.createElement('div'), {className: 'tabs'});
        list.append(...tabs.slice(0, 3).map(tabRow));
        card.element.append(list);
        if (tabs.length > 3) card.element.append(Object.assign(document.createElement('div'), {className: 'more', textContent: `+${tabs.length - 3} more ${tabs.length - 3 === 1 ? 'tab' : 'tabs'}`}));
      }
      card.tabsKey = tabsKey;
    }
  });
  for (const [key, card] of cards) if (!seen.has(key)) { card.element.remove(); cards.delete(key); }
  // Only new cards go in (and fade in once); moving one that is already shown would replay its arrival.
  const work = $('work');
  let previous = null;
  for (const key of seen) {
    const element = cards.get(key).element;
    if (element.parentNode !== work) work.insertBefore(element, previous ? previous.nextSibling : work.firstChild);
    previous = element;
  }
}

let stoppedUntil = 0;
let lastKey = '';
let currentState = 'checking';

function setLine(html, {breathes = false, tick = false} = {}) {
  const line = $('line');
  line.className = 'line' + (tick ? ' with-glyph' : '');
  if (breathes) {
    line.innerHTML = '<span class="breath on-black"><span class="rest"></span><span class="light" aria-hidden="true"></span></span>';
    line.querySelector('.rest').textContent = html;
    line.querySelector('.light').textContent = html;
  } else {
    line.innerHTML = (tick ? '<span class="tick" aria-hidden="true"></span><span></span>' : '<span></span>');
    line.lastChild.innerHTML = html;
  }
}

function gelButton(label, kind, onClick) {
  const button = document.createElement('button');
  button.className = `gel wide ${kind}`.trim();
  if (kind === 'white') button.innerHTML = '<span class="square" aria-hidden="true"></span>';
  button.append(Object.assign(document.createElement('span'), {textContent: label}));
  button.addEventListener('click', onClick);
  return button;
}

function render(status) {
  currentState = status.state;
  const view = STATES[status.state] ?? STATES.checking;
  const clickys = view.working ? status.clickys ?? [] : [];
  const stopped = Date.now() < stoppedUntil && !view.working;
  const key = JSON.stringify([status.state, stopped, clickys.map(c => [c.name, c.doing, c.tabs?.map(t => [t.id, t.title])]), status.startupProblems]);
  if (key === lastKey) return;
  const stateChanged = !lastKey || JSON.parse(lastKey)[0] !== status.state || JSON.parse(lastKey)[1] !== stopped;
  lastKey = key;

  // The status, and the mark: still at rest, shape-shifting while Clickys work.
  const [label, tone] = view.working
    ? [clickys.length > 1 ? `${clickys.length} working` : 'Working', 'working']
    : stopped ? ['Connected', 'ready'] : view.status;
  $('status').className = `status ${tone}`;
  $('status-label').textContent = label;
  mark.setWorking(Boolean(view.working && clickys.length), clickys.length);

  if (stateChanged || view.working) {
    if (view.working) {
      setLine(clickys.length > 1
        ? `<strong>${clickys.length} jobs</strong> are working in Chrome, each in a blue tab group beside yours.`
        : clickys.length ? 'A job is working in Chrome, in a blue tab group beside yours.' : 'Stopping…');
    } else if (stopped) {
      setLine('Stopped. HeyClicky won’t use Chrome again until you ask it to.', {tick: true});
    } else {
      setLine(view.line, {breathes: view.breathes});
    }
  }

  renderCards(clickys);

  if (stateChanged || view.working) {
    const actions = [];
    if (view.primary) {
      actions.push(gelButton(view.primary, '', async () => {
        if (STATES[currentState]?.restart) { chrome.runtime.reload(); return; }
        await chrome.runtime.sendMessage({type: 'openApp'});
        window.close();
      }));
    }
    if (view.working && clickys.length) {
      const stop = gelButton(clickys.length > 1 ? 'Stop the jobs' : 'Stop the job', 'white', async () => {
        stop.disabled = true;
        await chrome.runtime.sendMessage({type: 'stop'});
        stoppedUntil = Date.now() + 4000;
        lastKey = '';
        await refresh();
      });
      stop.setAttribute('aria-label', 'Stop browser access for every Clicky');
      actions.push(stop);
    }
    if (view.get) {
      actions.push(Object.assign(document.createElement('a'), {className: 'quiet', href: 'https://heyclicky.com', target: '_blank', rel: 'noopener', textContent: 'Don’t have HeyClicky yet? Get it free'}));
    }
    // Keep a focused button focused across the once-a-second refresh.
    const focusedLabel = document.activeElement?.closest?.('.actions') ? document.activeElement.textContent : null;
    $('actions').replaceChildren(...actions);
    if (focusedLabel) [...$('actions').children].find(child => child.textContent === focusedLabel)?.focus();
  }

  if (status.startupProblems?.length) {
    $('diagnostic').textContent = status.startupProblems.join(' · ');
    $('diagnostic').hidden = false;
  } else if (status.state !== 'stalled') {
    $('diagnostic').hidden = true;
  }
}

// A worker that never started doesn't reject the message; it never answers.
const askBackground = message => Promise.race([
  chrome.runtime.sendMessage(message),
  new Promise((_, reject) => setTimeout(() => reject(new Error('no answer')), 1500)),
]);
let unanswered = 0, refreshing = false;
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try { render(await askBackground({type: 'status'})); unanswered = 0; }
  catch { unanswered += 1; render({state: unanswered >= 2 ? 'stalled' : 'checking'}); if (unanswered === 2) void describeWorker(); }
  finally { refreshing = false; }
}

// When the background never answers, show Chrome's own view of it so the cause is visible in a screenshot.
async function describeWorker() {
  let detail;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    detail = registrations.length === 0
      ? 'chrome has no background worker registered for me.'
      : registrations.map(r => `worker: ${r.active?.state ?? 'not active'}${r.installing ? ', installing' : ''}${r.waiting ? ', waiting' : ''}`).join('; ');
  } catch (error) { detail = `can't read my worker: ${error.message}`; }
  for (const file of ['background.js', 'core.mjs']) {
    try {
      const response = await fetch(file);
      detail += ` · ${file} ${response.status} ${response.headers.get('content-type') ?? 'no type'}`;
    } catch (error) { detail += ` · ${file} fetch failed: ${error.message}`; }
  }
  try { await import('./core.mjs'); detail += ' · core loads'; }
  catch (error) { detail += ` · core import failed: ${error.message}`; }
  $('diagnostic').textContent = `${detail} · chrome ${navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? '?'}`;
  $('diagnostic').hidden = false;
}

// The cursor that shows where a Clicky clicks and types (on by default).
const cursorToggle = $('cursor-toggle');
chrome.storage.local.get('cursorOverlay').then(saved => { cursorToggle.checked = saved.cursorOverlay !== false; }).catch(() => {});
cursorToggle.addEventListener('change', () => { void chrome.storage.local.set({cursorOverlay: cursorToggle.checked}); });

chrome.runtime.sendMessage({type: 'connect'}).catch(() => {});
void refresh();
setInterval(refresh, 1000);
