import type { ZhDict } from "./zh";

export const en: Record<keyof ZhDict, string> = {
    "ext.judgeResult": "Judge result: {status}",
    "ext.judgeTimeout": "Judging timed out, please refresh later to check the result",
    "ext.promptDeeplKey": "Enter DeepL API Key",
    "ext.placeholderDeeplKey": "e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx",
    "ext.deeplKeySaved": "DeepL API Key saved",
    "ext.promptAiKey": "Enter AI API Key",
    "ext.placeholderAiKey": "e.g. sk-xxxxxxxxxxxxxxxx",
    "ext.aiKeySaved": "AI API Key saved",
    "ext.promptCookie": "Paste your AtCoder Cookie (REVEL_SESSION only)",
    "ext.placeholderCookie": "REVEL_SESSION=abcdef1234567890abcdef1234567890",
    "ext.cookieFormatWarn": "The Cookie format looks incorrect. Add the REVEL_SESSION= prefix?",
    "ext.autoFix": "Auto fix",
    "ext.cancel": "Cancel",
    "ext.cookieSavedFixed": "AtCoder Cookie saved with auto-fixed format",
    "ext.cookieSaved": "AtCoder Cookie saved",
    "ext.submissionPanelTitle": "Submission {id} - {contest}",

    "cmd.copied": "Copied to clipboard",
    "cmd.unknown": "Unknown command",

    "err.openInBrowser": "Open in Browser",
    "err.proxyFailedTitle": "Proxy connection failed, cannot reach AtCoder",
    "err.setNoProxy": "Set NO_PROXY",
    "err.viewWslDoc": "View WSL proxy docs",
    "load.contestTasks": "Fetching task list for {contest}...",
    "err.contestTasks": "Failed to fetch task list",
    "err.standingsParse": "Failed to parse standings data: {reason}",
    "load.translateItem": "Translating {name}...",
    "deepl.setKeyFirst": "Please set a DeepL API Key first",
    "deepl.setKey": "Set API Key",
    "deepl.noKey": "DeepL API Key is not set",
    "err.translate": "Translation failed",
    "load.problem": "Fetching statement for {contest}/{task}...",
    "err.problem": "Failed to fetch statement",
    "cookie.loaded": "✅ Cookie loaded, can access login-required problems",
    "cookie.notSet": "Cookie not set",
    "cookie.formatError": "❌ Invalid Cookie format, it must start with REVEL_SESSION=",
    "cookie.tooShort": "❌ Cookie value is too short, please make sure you copied the full REVEL_SESSION value",
    "cookie.saved": "AtCoder Cookie saved",
    "cookie.saveSuccess": "✅ Cookie saved",
    "cookie.cleared": "Cookie cleared",
    "load.register": "Registering for {contest} ...",
    "register.already": "Already registered, no need to register again",
    "register.failed": "Registration failed",
    "load.submitPage": "Fetching submit page for {contest}...",
    "submit.pageReady": "Submit page loaded",
    "submit.cfNeedBrowser": "Submitting to this contest requires Cloudflare verification, which cannot be automated. Please open the submit page in your browser to complete verification before submitting.",
    "submit.loginRequired": "Submission requires login. Please check whether your AtCoder Cookie is valid or expired; if the submit page triggers Cloudflare verification, open it in your browser to complete it.",
    "submit.loginRequiredNoCookie": "Submission requires login. Please set your AtCoder Cookie first.",
    "err.submitPage": "Failed to fetch submit page",
    "submit.paramsIncomplete": "Incomplete submission parameters",
    "load.submitting": "Submitting code...",
    "submit.successWaiting": "Code submitted, fetching judge result...",
    "err.submit": "Submission failed",
    "load.subHistory": "Fetching submission history for {contest}...",
    "err.subHistory": "Failed to fetch submission history",
    "load.subDetail": "Fetching details for submission {id}...",
    "err.subDetail": "Failed to fetch submission details",
    "load.standings": "Fetching standings for {contest}...",
    "err.standings": "Failed to fetch standings",
    "load.homepage": "Fetching AtCoder homepage contest list...",
    "err.homepage": "Failed to fetch contest list",
    "cph.exportSuccess": "success send to cph",
    "cph.exportFailed": "fail to send cph",

    "err.cf": "AtCoder triggered a Cloudflare verification that cannot be bypassed. Please open AtCoder in your browser.\nURL: {url}",
    "err.proxy":
        "Network proxy connection failed, cannot reach AtCoder.\n" +
        "Possible cause: In WSL 2, the proxy address 127.0.0.1 points to WSL itself, not the Windows host.\n" +
        "Solutions:\n" +
        "  1. Run in WSL: export NO_PROXY=.atcoder.jp\n" +
        "  2. Or set the correct host IP: export HTTPS_PROXY=http://$(hostname).local:7897\n" +
        "  3. Or connect to the Windows host via the WSL gateway IP (see /etc/resolv.conf)",
    "err.login":
        "Login is required, please set your AtCoder Cookie.\n" +
        "How to get it:\n" +
        "  1. Sign in at https://atcoder.jp in your browser\n" +
        "  2. Press F12 to open DevTools → Application → Cookies\n" +
        "  3. Find REVEL_SESSION under atcoder.jp and copy its Value\n" +
        "  4. Enter it in the extension settings as: REVEL_SESSION=<value>",
    "err.http403": "Access denied (403). The Cookie may be invalid or expired. Please sign in to AtCoder again and get a fresh REVEL_SESSION",
    "err.http404NoCookie": "Request failed (404). The problem may not exist or requires login. Please set your AtCoder Cookie first.",
    "err.http404BadCookie": "Request failed (404). The Cookie may be invalid or expired. Please sign in to AtCoder again and get a fresh REVEL_SESSION",
    "err.http404NotStarted": "Request failed (404). The contest \"{contest}\" has not started yet; the problems are not public. Please wait until it begins.",
    "err.httpStatus": "Request failed with status {status}",
    "err.network": "Network error: {msg}",

    "deepl.tooFrequent": "Too many translation requests, please try again later",
    "deepl.rateLimited": "DeepL translation is rate limited (HTTP 429), please try again later",
    "deepl.httpError": "Translation API error ({status})",
    "deepl.badResponse": "Translation API returned an unexpected response",
    "deepl.unexpectedStructure": "Translation API returned an unrecognized response structure",
    "deepl.timeout": "Translation request timed out",
    "deepl.failed": "Translation request failed: {msg}",
    "deepl.failedSimple": "Translation request failed",

    "ai.setKeyFirst": "Please set an AI API Key first",
    "ai.setKey": "Set API Key",
    "ai.noKey": "AI API Key is not set",
    "ai.rateLimited": "AI translation is rate limited (HTTP 429), please try again later",
    "ai.httpError": "AI translation API error ({status})",
    "ai.unexpectedStructure": "AI translation API returned an unrecognized response structure",
    "ai.timeout": "AI translation request timed out",

    "submit.pageFetchFailed": "Cannot fetch the submit page: the contest may have ended, or the submit page structure has changed.",
    "submit.noCsrf": "Cannot get CSRF Token, please check whether the Cookie is valid",
    "submit.success": "Code submitted successfully",
    "submit.failed": "Submission failed, please check whether the Cookie is valid",

    "register.success": "Registered successfully!",
    "register.failedBadCookie": "Registration failed, please check whether the Cookie is valid",
    "register.formIncomplete": "Registration was not successful: the register page returned a validation result. Please make sure all required fields (e.g. name, email, location) are filled in.",
    "register.alreadyDone": "Already registered",
    "register.closed": "Registration is closed or the registration info could not be fetched",
    "register.requestFailed": "Registration request failed",

    "md.statement": "### Problem Statement",
    "md.constraints": "### Constraints",
    "md.inputFormat": "### Input Format",
    "md.outputFormat": "### Output Format",
    "md.sample": "### Sample {index}",
    "md.inputLabel": "Input",
    "md.outputLabel": "Output",

    "cph.notRunning":
        "CPH extension not detected (no response on localhost:27121).\n" +
        "Please install and enable the Competitive Programming Helper extension and try again.",
    "cph.httpError": "CPH returned status code {status}",
    "cph.connectionFailed": "Failed to connect to CPH: {msg}",
};
