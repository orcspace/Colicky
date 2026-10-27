import {BrowserBridge, ModelView} from './core.mjs';
// Startup steps that fail are reported to the popup instead of silently
// killing the worker; the message listener is registered before any of them.
const startupProblems = [];
const guard = (label, step) => { try { step(); } catch (error) { startupProblems.push(`${label}: ${error?.message ?? error}`); } };
chrome.runtime.onMessage.addListener((...args) => handleMessage(...args));
// Whose tabs are whose, saved for the browser session: Chrome stops this
// service worker once the app's connection drops, and a fresh one must still
// know which tabs and groups are the Clickys'.
const bridge = new BrowserBridge(chrome, undefined, {store: {
  load: async () => (await chrome.storage.session.get('clickyTabs')).clickyTabs ?? null,
  save: state => chrome.storage.session.set({clickyTabs: state}),
}});
const restored = bridge.restore();
// For the service worker's console and the Chrome for Testing fixtures; pages
// and other extensions can't reach a service worker's globals.
globalThis.heyclickyBridge = bridge;
// What the model reads: compact element lines, and only what changed after an action.
const modelView = new ModelView();
globalThis.heyclickyModelView = modelView;
const APP_LINK = 'heyclicky://settings/browser';
let connecting = false;
let port, connected = false, appReachable = false, heardFromHost = false, lastError = '';

async function connect() {
  if (port || connecting) return;
  connecting = true;
  try {
    await restored;
    const saved = await chrome.storage.local.get('profileId');
    const profileId = saved.profileId ?? crypto.randomUUID();
    await chrome.storage.local.set({profileId});
    const candidate = chrome.runtime.connectNative('com.heyclicky.browser'); port = candidate;
    candidate.onDisconnect.addListener(() => {
      lastError = chrome.runtime.lastError?.message ?? 'Open HeyClicky to reconnect.';
      if (port === candidate) { port = null; connected = false; appReachable = false; heardFromHost = false; void bridge.stop(`the connection to the HeyClicky app dropped (${lastError})`); }
      void updateAction();
    });
    candidate.onMessage.addListener(async message => {
      if (message.type === 'ready') {
        if (connected && !message.selected) { await bridge.stop(message.app === false ? 'the HeyClicky app stopped answering' : 'HeyClicky said this Chrome profile is no longer the selected one'); }
        connected = message.selected === true;
        // Older helpers only report `selected`; treat that as reachability.
        appReachable = message.app ?? connected;
        heardFromHost = true; lastError = '';
        void updateAction();
        return;
      }
      if (message.type === 'stop') { await bridge.stop('the HeyClicky app stopped browser access', true); void updateAction(); return; }
      if (message.type !== 'command') return;
      try { const result = modelView.forModel(await bridge.execute(message), message); if (port === candidate) candidate.postMessage({type:'result',id:message.id,result}); }
      catch (error) { if (port === candidate) candidate.postMessage({type:'result',id:message.id,error:String(error.message ?? error)}); }
      void updateAction();
    });
    candidate.postMessage({type:'hello',protocol:1,profileId});
  } catch (error) { port = null; lastError = String(error.message ?? error); }
  finally { connecting = false; void updateAction(); }
}

// One word for what the popup, welcome page and toolbar icon should show.
function connectionState() {
  if (connected) return bridge.tasks.size > 0 ? 'working' : 'connected';
  if (port && appReachable) return 'profile';
  if (port && heardFromHost) return 'offline';
  if (/not found|forbidden/i.test(lastError)) return 'setup';
  if (port || connecting) return 'checking';
  return lastError ? 'offline' : 'checking';
}

const ACTION = {
  working: {on: true, badge: ' ', title: 'HeyClicky: a Clicky is working in Chrome'},
  connected: {on: true, badge: '', title: 'HeyClicky: connected'},
  profile: {on: false, badge: '', title: 'HeyClicky: using another Chrome profile'},
  setup: {on: false, badge: '', title: 'HeyClicky: finish setup in the app'},
  offline: {on: false, badge: '', title: 'HeyClicky: open the app to connect'},
  checking: {on: false, badge: '', title: 'HeyClicky'},
};
let shownAction = '';
async function updateAction() {
  const state = connectionState();
  if (state === shownAction) return;
  shownAction = state;
  const look = ACTION[state];
  const suffix = look.on ? '' : '-off';
  await Promise.all([
    chrome.action.setIcon({path: {16: `icons/toolbar-16${suffix}.png`, 32: `icons/toolbar-32${suffix}.png`}}),
    chrome.action.setBadgeBackgroundColor({color: '#2f7bff'}),
    chrome.action.setBadgeText({text: look.badge}),
    chrome.action.setTitle({title: look.title}),
  ]).catch(() => {});
}

// The jobs working in Chrome right now, each with what it last said it's
// doing and its tabs: tabs a running turn is attached to or took over, and the
// tabs its job owns (opened this turn, or kept from an earlier one).
async function workingClickys() {
  const running = task => bridge.tasks.has(task) && !bridge.stopped.has(task);
  const tabsByTask = new Map();
  const seen = new Set();
  const note = (id, task) => {
    if (seen.has(id)) return;
    seen.add(id);
    if (!tabsByTask.has(task)) tabsByTask.set(task, []);
    tabsByTask.get(task).push(id);
  };
  for (const [id, state] of bridge.tabs) if (running(state.task)) note(id, state.task);
  for (const [id, claim] of bridge.claims) if (running(claim.task)) note(id, claim.task);
  for (const [id, owner] of bridge.ownedTabs) {
    const task = [...bridge.tasks].find(task => running(task) && bridge.owner(task) === owner);
    if (task) note(id, task);
  }
  for (const task of bridge.tasks) if (running(task) && !tabsByTask.has(task)) tabsByTask.set(task, []);
  const clickys = [];
  for (const [task, ids] of tabsByTask) {
    const tabs = [];
    for (const id of ids.slice(0, 4)) {
      try {
        const tab = await chrome.tabs.get(id);
        tabs.push({id, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl});
      } catch {}
    }
    clickys.push({name: bridge.labels.get(task) ?? '', doing: bridge.says.get(task) ?? '', tabs});
  }
  return clickys.slice(0, 3);
}

async function openApp() {
  // The helper opens the exact HeyClicky build it belongs to, with no
  // Chrome "open this app?" prompt. Without a helper, fall back to the link.
  if (port && heardFromHost) { port.postMessage({type: 'openApp'}); return; }
  const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
  if (tab?.id !== undefined && /^https?:/.test(tab.url ?? '')) await chrome.tabs.update(tab.id, {url: APP_LINK});
  else await chrome.tabs.create({url: APP_LINK});
}

function handleMessage(message, sender, reply) {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  if (message.type === 'status') {
    void workingClickys().then(clickys => reply({state: connectionState(), connected, lastError, active: clickys.length > 0, clickys, startupProblems}));
    return true;
  }
  if (message.type === 'connect') { void connect().then(()=>reply({ok:true})); return true; }
  if (message.type === 'openApp') { void openApp().then(()=>reply({ok:true})); return true; }
  if (message.type === 'focusTab' && Number.isInteger(message.tabId)) {
    void chrome.tabs.update(message.tabId, {active: true})
      .then(tab => chrome.windows.update(tab.windowId, {focused: true}))
      .catch(() => {}).then(() => reply({ok: true}));
    return true;
  }
  if (message.type === 'stop') {
    const current = port;
    void bridge.stop('the user pressed Stop in the extension', true).then(() => {
      current?.postMessage({type:'stop'}); void updateAction(); reply({ok:true});
    }); return true;
  }
}
const mainFrames = new Map();
guard('debugger events', () => {
  chrome.debugger.onEvent.addListener((source,method,params) => {
    // Only the main frame's navigation expires references; an ad iframe
    // reloading must not make every ref on the page stale.
    if (method === 'Page.frameNavigated' && !params?.frame?.parentId) { mainFrames.set(source.tabId, params?.frame?.id); bridge.invalidate(source.tabId); }
    if (method === 'Page.navigatedWithinDocument' && [undefined, params?.frameId].includes(mainFrames.get(source.tabId))) bridge.invalidate(source.tabId);
    if (method === 'Page.javascriptDialogOpening') bridge.dialogOpened(source.tabId, params);
    if (method === 'Page.javascriptDialogClosed') bridge.dialogClosed(source.tabId);
    if (method === 'Page.fileChooserOpened') bridge.fileChooserOpened(source.tabId, params);
    // Saves (fetch/XHR) an action starts; settle waits for them before answering.
    if (method.startsWith('Network.')) bridge.network(source.tabId, method, params);
  });
  chrome.debugger.onDetach.addListener((source, reason) => { mainFrames.delete(source.tabId); bridge.detached(source.tabId, reason); void updateAction(); });
});
guard('tab events', () => {
  chrome.tabs.onUpdated.addListener((id,change) => { if (change.url || change.status === 'loading') bridge.invalidate(id); });
  chrome.tabs.onRemoved.addListener(id => bridge.removed(id));
});
guard('download events', () => {
  // Only files a Clicky asked for are renamed into Downloads/HeyClicky/<task>/;
  // every other download keeps Chrome's own choice.
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    const name = bridge.determineFilename(item);
    if (name) suggest(name); else suggest();
  });
  chrome.downloads.onCreated.addListener(item => bridge.downloadStarted(item));
});
guard('cursor setting', () => {
  // On unless the user turned it off in the popup.
  void chrome.storage.local.get('cursorOverlay').then(saved => { bridge.cursor = saved.cursorOverlay !== false; });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'cursorOverlay' in changes) bridge.cursor = changes.cursorOverlay.newValue !== false;
  });
});
guard('reconnect alarm', () => {
  chrome.alarms.onAlarm.addListener(() => void connect());
  void chrome.alarms.create('reconnect',{periodInMinutes:0.5})?.catch?.(error => startupProblems.push(`alarm: ${error.message}`));
});
guard('lifecycle events', () => {
  chrome.runtime.onStartup.addListener(() => void connect());
  chrome.runtime.onInstalled.addListener(details => {
    void connect();
    if (details.reason === 'install') void chrome.tabs.create({url: 'welcome.html'});
  });
});
void updateAction();
void connect();
