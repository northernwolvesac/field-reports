/**
 * =====================================================================
 * GOOGLE APPS SCRIPT — Claude AI Summary Proxy
 * Northern Wolves AC Field Reporting
 * =====================================================================
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project (click "+ New project")
 * 3. Name it "NW AI Proxy" (owned by ruslan@northernwolvesac.com since 2026-09-25)
 * 4. Delete the default code and paste EVERYTHING below this comment block
 * 5. Replace 'YOUR_CLAUDE_API_KEY_HERE' with your Anthropic API key
 *    (Get one at https://console.anthropic.com/settings/keys)
 * 6. Click Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Click Deploy, authorize it, copy the URL
 * 8. Give me the URL and I'll add it to the app
 *
 * Cost: ~$0.003 per summary (less than 1 cent)
 * =====================================================================
 */

var CLAUDE_API_KEY = 'YOUR_CLAUDE_API_KEY_HERE';
var CLAUDE_MODEL = 'claude-sonnet-5';

// ---------------------------------------------------------------------------------------------
// NW AI Proxy v2 (2026-09-25) — only signed-in app users may use the AI.
// The app sends the user's Supabase access token (body.token); the proxy checks it with Supabase.
// Without a login only the short sign-in help chat (body.anon) is allowed: small answers, 40 per hour in total.
// ---------------------------------------------------------------------------------------------
var SB_URL = 'https://vrscvnebznmomkdlhooi.supabase.co';
var SB_PUBLIC_KEY = 'sb_publishable_7F9lDes97zMPVVrgdG2ggw_vdc6H3QE';   // public (publishable) key, same as in the app
var ANON_MAX_PROMPT = 6000, ANON_MAX_TOKENS = 600, ANON_PER_HOUR = 40;

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// signed-in app user for this access token (cached 5 minutes), or null
function userFromToken(token) {
  if (!token) return null;
  var cache = CacheService.getScriptCache();
  var key = 'tok:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  var hit = cache.get(key); if (hit) return JSON.parse(hit);
  var r = UrlFetchApp.fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_PUBLIC_KEY, Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  var u = JSON.parse(r.getContentText());
  if (!u || !u.id) return null;
  var user = { id: u.id, email: u.email || '' };
  try { cache.put(key, JSON.stringify(user), 300); } catch (e) {}
  return user;
}

// the sign-in help chat without a login: at most ANON_PER_HOUR requests per hour for everyone together
function anonAllowed() {
  var cache = CacheService.getScriptCache();
  var key = 'anon:' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  var n = Number(cache.get(key) || 0);
  if (n >= ANON_PER_HOUR) return false;
  cache.put(key, String(n + 1), 3700);
  return true;
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action !== 'generate_summary' && body.action !== 'support_chat') return json({ success: false, error: 'Unknown action' });
    var maxTokens = 4000;
    if (!userFromToken(body.token)) {
      if (!body.anon || String(body.prompt || '').length > ANON_MAX_PROMPT)
        return json({ success: false, error: 'Please sign in to the app to use the AI assistant.', auth: false });
      if (!anonAllowed()) return json({ success: false, error: 'AI help is busy right now — please sign in or try again later.', auth: false });
      maxTokens = ANON_MAX_TOKENS;
    }
    var text = callClaude(body.prompt, maxTokens);
    return json(body.action === 'support_chat' ? { success: true, reply: text } : { success: true, summary: text });
  } catch (err) {
    return json({ success: false, error: err.message || String(err) });
  }
}

function doGet(e) {
  return json({ success: true, message: 'NW AI Proxy is running' });
}

function callClaude(prompt, maxTokens) {
  var payload = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens || 4000,
    messages: [{ role: 'user', content: String(prompt || '') }]
  };
  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode(), text = response.getContentText();
  if (code !== 200) throw new Error('Claude API error (' + code + '): ' + text.substring(0, 300));
  var result = JSON.parse(text);
  if (result.content && result.content.length > 0) return result.content[0].text;
  throw new Error('No content in Claude response');
}

// run in Apps Script to check the Anthropic key
function testClaude() {
  Logger.log(callClaude('Say "Hello from Northern Wolves AC!" in one sentence.', 100));
}
