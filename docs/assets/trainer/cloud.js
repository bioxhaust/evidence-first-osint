// MIT. Supabase REST adapter; no SDK, analytics, or research target data.
const MAX_BYTES = 128 * 1024;
const STATE_KEYS = ['version', 'completed', 'attempts', 'mistakes', 'activityDays', 'review', 'completedAt'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validId = id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id);
const validTime = time => typeof time === 'string' && time.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(time) && Number.isFinite(Date.parse(time));
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export class CloudError extends Error {
  constructor(code, message, status = 0) { super(message); this.name = 'CloudError'; this.code = code; this.status = status; }
}
const stateError = () => new CloudError('STATE', 'Не удалось проверить формат прогресса. Локальные данные сохранены.');

export function validateProgressState(value) {
  let encoded;
  try { encoded = JSON.stringify(value); } catch { throw stateError(); }
  if (typeof encoded !== 'string' || new TextEncoder().encode(encoded).length > MAX_BYTES) throw stateError();
  const state = JSON.parse(encoded);
  if (!object(state) || state.version !== 1 || Object.keys(state).length !== STATE_KEYS.length ||
      !STATE_KEYS.every(key => Object.hasOwn(state, key))) throw stateError();
  for (const key of ['completed', 'mistakes']) {
    if (!Array.isArray(state[key]) || state[key].length > 5000 || !state[key].every(validId)) throw stateError();
  }
  if (!Array.isArray(state.activityDays) || state.activityDays.length > 5000 || !state.activityDays.every(day =>
    typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) &&
    new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day)) throw stateError();
  for (const key of ['attempts', 'review', 'completedAt']) {
    if (!object(state[key]) || Object.keys(state[key]).length > 5000 || !Object.keys(state[key]).every(validId)) throw stateError();
  }
  if (!Object.values(state.attempts).every(n => Number.isSafeInteger(n) && n >= 0 && n <= 100000)) throw stateError();
  if (!Object.values(state.completedAt).every(validTime)) throw stateError();
  if (!Object.values(state.review).every(item => object(item) && Object.keys(item).length === 2 &&
    Object.hasOwn(item, 'at') && Object.hasOwn(item, 'needed') && validTime(item.at) && typeof item.needed === 'boolean')) throw stateError();
  return state;
}

function jwtPayload(token) {
  try {
    const raw = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, '=')));
  } catch { return null; }
}

function configuration(config) {
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) return null;
  try {
    const url = new URL(config.supabaseUrl);
    const key = config.supabasePublishableKey;
    const publicKey = typeof key === 'string' && (/^sb_publishable_[A-Za-z0-9_-]{10,200}$/.test(key) || jwtPayload(key)?.role === 'anon');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        !['', '/'].includes(url.pathname) || !publicKey) return null;
    return {url: url.origin, key};
  } catch { return null; }
}

export function createCloud(config, options = {}) {
  const settings = configuration(config);
  const fetcher = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  const now = options.now || Date.now;
  let storage = options.storage;
  if (storage === undefined) { try { storage = globalThis.sessionStorage; } catch { storage = null; } }
  const storageKey = settings ? `evidence-first-auth:${settings.url}` : null;
  const pkceKey = storageKey ? `${storageKey}:pkce` : null;
  const authMethods = (Array.isArray(config?.authMethods) ? config.authMethods : ['github']).filter(method => ['github', 'email'].includes(method));
  let auth = null, revision = null, epoch = 0, refreshPromise = null, verifyPromise = null, timer = null, needsVerification = false;
  const listeners = new Set();
  const publicSession = () => auth ? {user: {id: auth.user.id, email: auth.user.email}, expiresAt: auth.expires_at} : null;
  const notify = () => { for (const listener of listeners) { try { listener(publicSession()); } catch { /* Consumer errors cannot change credentials. */ } } };
  const persist = () => { try { if (auth) storage?.setItem(storageKey, JSON.stringify(auth)); else if (storageKey) storage?.removeItem(storageKey); } catch { /* Keep memory session when browser storage is disabled. */ } };
  const assertConfigured = () => { if (!settings || !fetcher) throw new CloudError('NOT_CONFIGURED', 'Облачный вход ещё не подключён. Можно продолжать локально.'); };
  function clearSession() {
    epoch++; auth = null; revision = null; needsVerification = false;
    clearTimeout(timer); timer = null; persist(); notify();
    try { if (pkceKey) storage?.removeItem(pkceKey); } catch { /* Storage may be disabled. */ }
  }
  function parseSession(data) {
    const expires = Number.isFinite(data?.expires_at) ? data.expires_at : Math.floor(now() / 1000) + Number(data?.expires_in);
    if (!object(data) || typeof data.access_token !== 'string' || data.access_token.length > 16384 ||
        typeof data.refresh_token !== 'string' || !data.refresh_token || data.refresh_token.length > 4096 ||
        !uuid(data.user?.id) || jwtPayload(data.access_token)?.sub !== data.user.id || !Number.isFinite(expires)) {
      throw new CloudError('RESPONSE', 'Сервис вернул неожиданный ответ входа. Локальные данные сохранены.');
    }
    return {access_token: data.access_token, refresh_token: data.refresh_token, expires_at: expires,
      user: {id: data.user.id, email: typeof data.user.email === 'string' ? data.user.email.slice(0, 254) : ''}};
  }
  function scheduleRefresh() {
    clearTimeout(timer); timer = null;
    if (!auth || options.autoRefresh === false) return;
    const delay = Math.min(2147480000, Math.max(3000, auth.expires_at * 1000 - now() - 60000));
    timer = setTimeout(() => { refreshSession().catch(() => { /* A network failure keeps local progress and the cached session; next request can retry. */ }); }, delay);
    timer?.unref?.();
  }
  function installSession(data, newLogin = false) {
    const parsed = parseSession(data);
    if (newLogin) { epoch++; revision = null; }
    auth = parsed; needsVerification = false; persist(); scheduleRefresh(); notify();
    return publicSession();
  }
  if (settings) {
    try {
      const saved = storage?.getItem(storageKey);
      if (saved && saved.length < 24576) { auth = parseSession(JSON.parse(saved)); needsVerification = true; scheduleRefresh(); }
    } catch { auth = null; persist(); }
  }

  async function request(path, {method = 'GET', body, token} = {}) {
    assertConfigured();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); timeout?.unref?.();
    let response;
    try {
      response = await fetcher(`${settings.url}${path}`, {method, credentials: 'omit', cache: 'no-store',
        headers: {apikey: settings.key, ...(body !== undefined ? {'Content-Type': 'application/json'} : {}),
          ...(token ? {Authorization: `Bearer ${token}`} : {})},
        ...(body !== undefined ? {body: JSON.stringify(body)} : {}), signal: controller.signal});
      const text = await response.text();
      if (text.length > 512 * 1024) throw new CloudError('RESPONSE', 'Ответ сервиса слишком велик. Локальные данные сохранены.');
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { throw new CloudError('RESPONSE', 'Сервис вернул неожиданный ответ. Локальные данные сохранены.', response.status); }
      if (!response.ok) {
        if (data?.code === '40001' || response.status === 409) throw new CloudError('CONFLICT', 'Прогресс изменился на другом устройстве. Требуется повторное объединение.', response.status);
        if (['22023', '23514'].includes(data?.code)) throw stateError();
        if (['PGRST202', '42P01'].includes(data?.code)) throw new CloudError('SETUP', 'Хранилище прогресса ещё не настроено. Локальные данные сохранены.', response.status);
        if (response.status === 429) throw new CloudError('RATE_LIMIT', 'Слишком много запросов. Подождите и повторите позже.', response.status);
        const code = [400, 401, 403, 422].includes(response.status) ? 'AUTH' : 'SERVICE';
        throw new CloudError(code, code === 'AUTH' ? 'Не удалось подтвердить вход или разрешение. Проверьте данные и подтверждение почты.' : 'Сервис временно недоступен. Локальный прогресс сохранён.', response.status);
      }
      return data;
    } catch (error) {
      if (error instanceof CloudError) throw error;
      throw new CloudError('NETWORK', 'Нет связи с облаком. Локальный прогресс сохранён.');
    } finally { clearTimeout(timeout); }
  }

  async function refreshSession() {
    if (refreshPromise) return refreshPromise;
    if (!auth) throw new CloudError('AUTH_REQUIRED', 'Сначала войдите в аккаунт.');
    const started = epoch, refreshToken = auth.refresh_token;
    const pending = (async () => {
      try {
        const data = await request('/auth/v1/token?grant_type=refresh_token', {method: 'POST', body: {refresh_token: refreshToken}});
        if (epoch !== started || !auth) throw new CloudError('SESSION_CHANGED', 'Аккаунт изменился во время запроса.');
        if (data?.user?.id !== auth.user.id) throw new CloudError('RESPONSE', 'Неожиданный ответ обновления сессии.');
        return installSession(data);
      } catch (error) {
        if (epoch === started && error.code === 'AUTH') clearSession();
        throw error;
      }
    })();
    refreshPromise = pending;
    try { return await pending; } finally { if (refreshPromise === pending) refreshPromise = null; }
  }
  async function ensureSession() {
    assertConfigured();
    if (!auth) throw new CloudError('AUTH_REQUIRED', 'Сначала войдите в аккаунт.');
    if (auth.expires_at * 1000 <= now() + 60000) await refreshSession();
    if (needsVerification && !verifyPromise) {
      const started = epoch;
      verifyPromise = (async () => {
        let user;
        try { user = await request('/auth/v1/user', {token: auth.access_token}); }
        catch (error) { if (epoch === started && error.code === 'AUTH') clearSession(); throw error; }
        if (epoch !== started || !auth) throw new CloudError('SESSION_CHANGED', 'Аккаунт изменился во время запроса.');
        if (!uuid(user?.id) || user.id !== auth.user.id) { clearSession(); throw new CloudError('AUTH', 'Требуется повторный вход.'); }
        needsVerification = false;
      })().finally(() => { verifyPromise = null; });
    }
    if (verifyPromise) await verifyPromise;
    if (!auth) throw new CloudError('AUTH_REQUIRED', 'Сначала войдите в аккаунт.');
    return {token: auth.access_token, userId: auth.user.id, epoch};
  }
  function credentials(email, password, signup = false) {
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length < (signup ? 12 : 1) || password.length > 256) {
      throw new CloudError('INPUT', signup ? 'Введите email и пароль длиной от 12 до 256 символов.' : 'Введите email и пароль.');
    }
    return {email: email.trim(), password};
  }
  function checkCurrent(snapshot) {
    if (epoch !== snapshot.epoch || auth?.user.id !== snapshot.userId) throw new CloudError('SESSION_CHANGED', 'Аккаунт изменился во время запроса.');
  }
  const adapter = {
    configured: Boolean(settings && fetcher),
    authMethods,
    confirmationReturned: false,
    session: publicSession,
    onAuthChanged(callback) { listeners.add(callback); callback(publicSession()); return () => listeners.delete(callback); },
    async initialize() {
      // Confirmation can return an implicit auth fragment. Remove credentials from
      // history but do not accept a session injected through a link; ask for password login.
      const location = options.location || globalThis.location;
      const history = options.history || globalThis.history;
      const query = new URLSearchParams(location?.search || '');
      const clearCallback = () => {
        for (const key of ['code', 'error', 'error_code', 'error_description']) query.delete(key);
        history?.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}`);
      };
      if (query.has('error')) {
        clearCallback();
        try { storage?.removeItem(pkceKey); } catch { /* Clear URL even when storage is unavailable. */ }
        throw new CloudError('OAUTH_CANCELLED', 'Вход через GitHub не завершён. Можно попробовать ещё раз.');
      }
      if (query.has('code')) {
        const code = query.get('code');
        clearCallback();
        let flow;
        try { flow = JSON.parse(storage?.getItem(pkceKey) || 'null'); storage?.removeItem(pkceKey); } catch { flow = null; }
        if (!flow || typeof flow.verifier !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(flow.verifier) ||
            !Number.isFinite(flow.createdAt) || now() - flow.createdAt > 600000 || flow.createdAt > now() + 30000 ||
            flow.redirectTo !== location.origin + location.pathname || !uuid(code)) {
          throw new CloudError('OAUTH_STATE', 'Начните вход через GitHub заново в этой вкладке. Локальный прогресс сохранён.');
        }
        const started = epoch;
        const data = await request('/auth/v1/token?grant_type=pkce', {method: 'POST', body: {auth_code: code, code_verifier: flow.verifier}});
        if (started !== epoch) throw new CloudError('SESSION_CHANGED', 'Аккаунт изменился во время запроса.');
        return installSession(data, true);
      }
      if (location?.hash) {
        const params = new URLSearchParams(location.hash.slice(1));
        if (params.has('access_token') || params.has('refresh_token') || params.has('error_description')) {
          adapter.confirmationReturned = true;
          history?.replaceState(null, '', `${location.pathname}${location.search || ''}`);
        }
      }
      return auth ? adapter.getSession() : null;
    },
    async getSession() { if (!auth) return null; await ensureSession(); return publicSession(); },
    async signInWithGitHub() {
      assertConfigured();
      if (!authMethods.includes('github')) throw new CloudError('METHOD_DISABLED', 'Вход через GitHub не включён.');
      const crypto = options.crypto || globalThis.crypto;
      const location = options.location || globalThis.location;
      if (!crypto?.subtle || !location?.origin || !location?.pathname) throw new CloudError('UNSUPPORTED', 'Для входа нужен современный браузер и HTTPS.');
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const base64url = data => btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const verifier = base64url(bytes);
      const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      const flow = JSON.stringify({verifier, createdAt: now(), redirectTo: location.origin + location.pathname});
      try {
        storage?.setItem(pkceKey, flow);
        if (storage?.getItem(pkceKey) !== flow) throw new Error('Unavailable');
      } catch { throw new CloudError('STORAGE', 'Разрешите хранение данных этой вкладки, чтобы завершить безопасный вход.'); }
      const url = new URL(`${settings.url}/auth/v1/authorize`);
      url.search = new URLSearchParams({provider: 'github', redirect_to: location.origin + location.pathname,
        code_challenge: challenge, code_challenge_method: 's256'}).toString();
      return url.href;
    },
    async signUp(email, password) {
      if (!authMethods.includes('email')) throw new CloudError('METHOD_DISABLED', 'Вход по email не включён. Используйте GitHub.');
      const body = credentials(email, password, true);
      const location = options.location || globalThis.location;
      const redirect = location?.origin && location?.pathname ? `?redirect_to=${encodeURIComponent(location.origin + location.pathname)}` : '';
      const started = epoch;
      const data = await request(`/auth/v1/signup${redirect}`, {method: 'POST', body});
      if (started !== epoch) throw new CloudError('SESSION_CHANGED', 'Аккаунт изменился во время запроса.');
      const session = data?.access_token ? installSession(data, true) : null;
      return {requiresEmailConfirmation: !session, session};
    },
    async signIn(email, password) {
      if (!authMethods.includes('email')) throw new CloudError('METHOD_DISABLED', 'Вход по email не включён. Используйте GitHub.');
      const started = epoch;
      const data = await request('/auth/v1/token?grant_type=password', {method: 'POST', body: credentials(email, password)});
      if (started !== epoch) throw new CloudError('SESSION_CHANGED', 'Аккаунт изменился во время запроса.');
      return installSession(data, true);
    },
    async signOut() {
      const token = auth?.access_token;
      clearSession();
      if (token) await request('/auth/v1/logout?scope=local', {method: 'POST', token});
    },
    async pull() {
      const snapshot = await ensureSession();
      const rows = await request(`/rest/v1/trainer_progress?user_id=eq.${encodeURIComponent(snapshot.userId)}&select=state,revision`, {token: snapshot.token});
      checkCurrent(snapshot);
      if (!Array.isArray(rows) || rows.length > 1) throw new CloudError('RESPONSE', 'Неожиданный ответ прогресса. Локальные данные сохранены.');
      if (!rows.length) { revision = 0; return null; }
      if (!Number.isSafeInteger(rows[0].revision) || rows[0].revision < 1) throw new CloudError('RESPONSE', 'Неверная версия облачного прогресса.');
      const state = validateProgressState(rows[0].state);
      revision = rows[0].revision;
      return state;
    },
    async push(value) {
      const state = validateProgressState(value);
      const snapshot = await ensureSession();
      if (revision === null) throw new CloudError('PULL_REQUIRED', 'Перед сохранением загрузите и объедините облачный прогресс.');
      const expected = revision;
      const data = await request('/rest/v1/rpc/save_trainer_progress', {method: 'POST', token: snapshot.token,
        body: {p_state: state, p_expected_revision: expected}});
      checkCurrent(snapshot);
      if (!object(data) || !Number.isSafeInteger(data.revision) || data.revision !== expected + 1) throw new CloudError('RESPONSE', 'Не удалось подтвердить сохранённую версию. Повторно загрузите прогресс.');
      const saved = validateProgressState(data.state);
      revision = data.revision;
      return saved;
    },
    destroy() { clearTimeout(timer); listeners.clear(); },
  };
  return adapter;
}
