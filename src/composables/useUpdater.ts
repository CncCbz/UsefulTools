import { ref } from 'vue'
import { fetch } from '@tauri-apps/plugin-http'
import { openUrl } from '@tauri-apps/plugin-opener'
import { getVersion } from '@tauri-apps/api/app'

// ── 配置 ──────────────────────────────────────────────
const GITHUB_OWNER = 'cnccbz'
const GITHUB_REPO = 'usefultools'
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`
const GITHUB_RELEASES_LATEST_URL = `${GITHUB_REPO_URL}/releases/latest`

const AUTO_CHECK_COOLDOWN_MS = 6 * 60 * 60 * 1000
const LAST_CHECK_AT_KEY = 'usefultools-update-last-check-at'
const RATE_LIMITED_UNTIL_KEY = 'usefultools-update-rate-limited-until'

export interface UpdateInfo {
  version: string
  body: string
  url: string
}

// 全局单例状态
const updateAvailable = ref(false)
const updateInfo = ref<UpdateInfo | null>(null)
const checking = ref(false)
const currentVersion = ref('0.0.0')
const dismissed = ref(false)

function getStoredNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function setStoredNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // ignore storage write errors
  }
}

function clearStoredValue(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore storage write errors
  }
}

function shouldSkipAutoCheck(): boolean {
  const now = Date.now()
  const rateLimitedUntil = getStoredNumber(RATE_LIMITED_UNTIL_KEY)
  if (rateLimitedUntil && now < rateLimitedUntil) return true

  const lastCheckAt = getStoredNumber(LAST_CHECK_AT_KEY)
  return Boolean(lastCheckAt && now - lastCheckAt < AUTO_CHECK_COOLDOWN_MS)
}

function extractVersionFromTagUrl(url: string): string | null {
  const match = url.match(/\/releases\/tag\/v?([^/?#]+)/i)
  if (!match) return null
  const decoded = decodeURIComponent(match[1]).trim()
  return decoded.replace(/^v/, '')
}

function parseRateLimitReset(headers: Headers): number {
  const resetRaw = headers.get('x-ratelimit-reset')
  const resetSeconds = Number(resetRaw)
  if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
    return resetSeconds * 1000
  }
  return Date.now() + 10 * 60 * 1000
}

function isRateLimitedResponse(status: number, headers: Headers): boolean {
  if (status !== 403) return false
  const remaining = headers.get('x-ratelimit-remaining')
  return remaining === '0' || remaining === null
}

async function fetchLatestReleaseFromPage(): Promise<UpdateInfo | null> {
  const resp = await fetch(GITHUB_RELEASES_LATEST_URL, { method: 'GET' })
  if (!resp.ok) return null

  const fromFinalUrl = extractVersionFromTagUrl(resp.url)
  if (fromFinalUrl) {
    return {
      version: fromFinalUrl,
      body: '',
      url: resp.url,
    }
  }

  const html = await resp.text()
  const linkMatch = html.match(/href="([^"]*\/releases\/tag\/[^"]+)"/i)
  if (!linkMatch) return null
  const releaseUrl = linkMatch[1].startsWith('http')
    ? linkMatch[1]
    : `https://github.com${linkMatch[1]}`
  const version = extractVersionFromTagUrl(releaseUrl)
  if (!version) return null

  return {
    version,
    body: '',
    url: releaseUrl,
  }
}

async function fetchLatestRelease(): Promise<UpdateInfo | null> {
  const resp = await fetch(GITHUB_API, {
    method: 'GET',
    headers: { Accept: 'application/vnd.github.v3+json' },
  })

  if (resp.ok) {
    clearStoredValue(RATE_LIMITED_UNTIL_KEY)
    const data = await resp.json() as { tag_name: string; body?: string; html_url: string }
    return {
      version: data.tag_name.replace(/^v/, ''),
      body: data.body || '',
      url: data.html_url,
    }
  }

  if (isRateLimitedResponse(resp.status, resp.headers)) {
    const resetAt = parseRateLimitReset(resp.headers)
    setStoredNumber(RATE_LIMITED_UNTIL_KEY, resetAt)
    return fetchLatestReleaseFromPage()
  }

  return null
}

/**
 * 比较语义化版本号，返回 true 表示 remote 比 local 新
 */
function isNewer(remote: string, local: string): boolean {
  const r = remote.replace(/^v/, '').split('.').map(Number)
  const l = local.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true
    if ((r[i] || 0) < (l[i] || 0)) return false
  }
  return false
}

async function checkForUpdate(forceNotify = false) {
  if (checking.value) return
  if (!forceNotify && shouldSkipAutoCheck()) return
  checking.value = true
  try {
    currentVersion.value = await getVersion()
    if (!forceNotify) {
      setStoredNumber(LAST_CHECK_AT_KEY, Date.now())
    }
    const latest = await fetchLatestRelease()
    if (!latest) return
    const remoteVersion = latest.version
    if (isNewer(remoteVersion, currentVersion.value)) {
      updateInfo.value = {
        version: latest.version,
        body: latest.body,
        url: latest.url,
      }
      if (forceNotify || !dismissed.value) {
        updateAvailable.value = true
      }
    }
  } catch {
    // 网络错误静默忽略
  } finally {
    checking.value = false
  }
}

function openReleasePage() {
  if (updateInfo.value?.url) {
    openUrl(updateInfo.value.url)
  }
  dismissUpdate()
}

function openRepositoryPage() {
  openUrl(GITHUB_REPO_URL)
}

function dismissUpdate() {
  updateAvailable.value = false
  dismissed.value = true
}

export function useUpdater() {
  return {
    updateAvailable,
    updateInfo,
    checking,
    currentVersion,
    repositoryUrl: GITHUB_REPO_URL,
    checkForUpdate,
    openReleasePage,
    openRepositoryPage,
    dismissUpdate,
  }
}
