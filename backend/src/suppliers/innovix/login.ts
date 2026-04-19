import axios from 'axios'

const BASE_URL = 'https://www.innovixmarketplace.com'
const LOGIN_URL = `${BASE_URL}/login`

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

function parseCookies(setCookieHeaders: string[]): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const c of setCookieHeaders) {
    const m = c.match(/^([^=]+)=([^;]*)/)
    if (m) cookies[m[1].trim()] = m[2].trim()
  }
  return cookies
}

function serializeCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
}

/** Extract all input fields from a chunk of HTML */
function extractInputs(html: string): Record<string, string> {
  const inputs: Record<string, string> = {}
  const re = /<input([^>]*)>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1]
    const name  = attrs.match(/name=["']([^"']+)["']/)?.[1]
    const value = attrs.match(/value=["']([^"']*)["']/)?.[1] ?? ''
    if (name) inputs[name] = value
  }
  return inputs
}

/** Extract the form action from HTML */
function extractFormAction(html: string): string {
  const m = html.match(/<form[^>]+action=["']([^"']+)["']/i)
  return m ? m[1] : LOGIN_URL
}

export async function innovixLogin(username: string, password: string): Promise<string> {
  // ── Step 1: GET login page ──────────────────────────────────────────────
  console.log('[Innovix] Fetching login page...')
  const pageResp = await axios.get(LOGIN_URL, {
    headers: BROWSER_HEADERS,
    maxRedirects: 5,
    validateStatus: () => true,
  })

  const setCookieRaw: string[] = ([] as string[]).concat(pageResp.headers['set-cookie'] || [])
  const cookies = parseCookies(setCookieRaw)
  const html: string = typeof pageResp.data === 'string' ? pageResp.data : JSON.stringify(pageResp.data)

  console.log(`[Innovix] Login page status: ${pageResp.status}`)
  console.log(`[Innovix] Initial cookies: ${Object.keys(cookies).join(', ') || 'none'}`)

  // ── Step 2: Parse the form ──────────────────────────────────────────────
  const allInputs = extractInputs(html)
  const formAction = extractFormAction(html)
  const absoluteAction = formAction.startsWith('http') ? formAction : `${BASE_URL}${formAction.startsWith('/') ? '' : '/'}${formAction}`

  console.log(`[Innovix] Form action: ${absoluteAction}`)
  console.log(`[Innovix] Found form inputs: ${Object.keys(allInputs).join(', ') || 'none (JS-rendered form?)'}`)

  if (html.includes('g-recaptcha') || html.includes('recaptcha')) {
    console.warn('[Innovix] reCAPTCHA widget detected on login page')
  }

  // ── Step 3: Build submission — start with all hidden fields ─────────────
  const form = new URLSearchParams()

  for (const [k, v] of Object.entries(allInputs)) {
    const type = html.match(new RegExp(`name=["']${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*type=["']([^"']+)["']`))?.[1]
      ?? html.match(new RegExp(`type=["']([^"']+)["'][^>]*name=["']${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`))?.[1]
      ?? 'hidden'
    if (type === 'hidden' || type === 'submit') continue // keep hidden, skip submit buttons
    // Include all hidden tokens
  }

  // Re-add only hidden inputs (CSRF tokens etc.)
  for (const [k, v] of Object.entries(allInputs)) {
    const isHidden = html.includes(`name="${k}"`) &&
      (html.match(new RegExp(`name=["']${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*type=["']hidden["']`)) ||
       html.match(new RegExp(`type=["']hidden["'][^>]*name=["']${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`)))
    if (isHidden) {
      form.set(k, v)
      console.log(`[Innovix] Hidden field: ${k}=${v.slice(0, 20)}`)
    }
  }

  // Try both capitalisation variants for username/password
  // We'll detect which names exist in the form, falling back to known variants
  const userField  = Object.keys(allInputs).find(k => /user|login|email/i.test(k)) ?? 'Username'
  const passField  = Object.keys(allInputs).find(k => /pass/i.test(k))             ?? 'Password'

  console.log(`[Innovix] Using fields: ${userField} / ${passField}`)

  form.set(userField, username)
  form.set(passField, password)

  // ── Step 4: POST ────────────────────────────────────────────────────────
  console.log(`[Innovix] Posting to ${absoluteAction}`)
  const loginResp = await axios.post(absoluteAction, form.toString(), {
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: serializeCookies(cookies),
      Referer: LOGIN_URL,
      Origin: BASE_URL,
    },
    maxRedirects: 5,
    validateStatus: () => true,
  })

  const respSetCookie: string[] = ([] as string[]).concat(loginResp.headers['set-cookie'] || [])
  const respCookies = parseCookies(respSetCookie)
  const allCookies  = { ...cookies, ...respCookies }
  const finalUrl: string = loginResp.request?.res?.responseUrl || loginResp.config?.url || ''
  const finalHtml: string = typeof loginResp.data === 'string' ? loginResp.data : ''

  console.log(`[Innovix] POST status: ${loginResp.status}, final URL: ${finalUrl}`)
  console.log(`[Innovix] Response cookies: ${Object.keys(respCookies).join(', ') || 'none'}`)

  // ── Step 5: Detect result ────────────────────────────────────────────────
  if (finalHtml.includes('g-recaptcha-response') || finalHtml.includes('reCAPTCHA')) {
    throw new Error('reCAPTCHA is enforced server-side. Use the manual cookie method instead.')
  }

  if (finalUrl.includes('/login') && loginResp.status !== 302) {
    // Still on login page — wrong credentials or blocked
    const errMatch = finalHtml.match(/class="[^"]*(?:alert|error|message)[^"]*"[^>]*>([\s\S]{0,300}?)<\//i)
    const errText  = errMatch ? errMatch[1].replace(/<[^>]+>/g, '').trim() : `HTTP ${loginResp.status} — check credentials`
    throw new Error(`Login failed: ${errText}`)
  }

  const sessid = allCookies['PHPSESSID']
  if (sessid) {
    console.log(`[Innovix] Got PHPSESSID — login successful`)
    return sessid
  }

  throw new Error('Login appeared to succeed but no PHPSESSID cookie was returned.')
}
