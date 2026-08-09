export const zh = {
    "ext.judgeResult": "评测结果: {status}",
    "ext.judgeTimeout": "评测超时，请稍后手动刷新查看结果",
    "ext.promptDeeplKey": "请输入 DeepL API Key",
    "ext.placeholderDeeplKey": "例如 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx",
    "ext.deeplKeySaved": "DeepL API Key 已保存",
    "ext.promptCookie": "粘贴 AtCoder 的 Cookie（仅需 REVEL_SESSION）",
    "ext.placeholderCookie": "REVEL_SESSION=abcdef1234567890abcdef1234567890",
    "ext.cookieFormatWarn": "Cookie 格式似乎不正确，是否添加 REVEL_SESSION= 前缀？",
    "ext.autoFix": "自动修复",
    "ext.cancel": "取消",
    "ext.cookieSavedFixed": "AtCoder Cookie 已保存并自动修复格式",
    "ext.cookieSaved": "AtCoder Cookie 已保存",
    "ext.submissionPanelTitle": "提交 {id} - {contest}",

    "cmd.copied": "已复制到剪贴板",
    "cmd.unknown": "未知命令",

    "err.openInBrowser": "在浏览器中打开",
    "err.proxyFailedTitle": "代理连接失败，无法访问 AtCoder",
    "err.setNoProxy": "设置 NO_PROXY",
    "err.viewWslDoc": "查看 WSL 代理说明",
    "load.contestTasks": "正在抓取 {contest} 的题目列表...",
    "err.contestTasks": "抓取题目失败",
    "err.standingsParse": "排行榜数据解析失败: {reason}",
    "load.translateItem": "正在翻译 {name}...",
    "deepl.setKeyFirst": "请先设置 DeepL API Key",
    "deepl.setKey": "设置 API Key",
    "deepl.noKey": "未设置 DeepL API Key",
    "err.translate": "翻译失败",
    "load.problem": "正在抓取 {contest}/{task} 的题面...",
    "err.problem": "抓取题面失败",
    "cookie.loaded": "✅ Cookie 已加载，可访问需要登录的题目",
    "cookie.notSet": "未设置 Cookie",
    "cookie.formatError": "❌ Cookie 格式错误，请以 REVEL_SESSION= 开头",
    "cookie.tooShort": "❌ Cookie 值过短，请确认已完整复制 REVEL_SESSION 的值",
    "cookie.saved": "AtCoder Cookie 已保存",
    "cookie.saveSuccess": "✅ Cookie 保存成功",
    "cookie.cleared": "Cookie 已清除",
    "load.register": "正在报名 {contest} ...",
    "register.already": "已报名，无需重复操作",
    "register.failed": "报名失败",
    "load.submitPage": "正在获取 {contest} 提交页面信息...",
    "submit.pageReady": "已获取提交页面信息",
    "submit.cfNeedBrowser": "该比赛提交需要 Cloudflare 验证，插件无法自动完成。请在浏览器中打开提交页完成验证后提交。",
    "submit.loginRequired": "提交需要登录，请检查 AtCoder Cookie 是否有效或已过期；若提交页触发 Cloudflare 验证，请用浏览器打开完成验证。",
    "submit.loginRequiredNoCookie": "提交需要登录，请先设置 AtCoder Cookie 后再试。",
    "err.submitPage": "获取提交页面失败",
    "submit.paramsIncomplete": "提交参数不完整",
    "load.submitting": "正在提交代码...",
    "submit.successWaiting": "代码提交成功，正在获取评测结果...",
    "err.submit": "提交失败",
    "load.subHistory": "正在获取 {contest} 提交记录...",
    "err.subHistory": "获取提交记录失败",
    "load.subDetail": "正在获取提交 {id} 的详细信息...",
    "err.subDetail": "获取提交详情失败",
    "load.standings": "正在获取 {contest} 排行榜...",
    "err.standings": "获取排行榜失败",
    "load.homepage": "正在抓取 AtCoder 首页比赛列表...",
    "err.homepage": "获取比赛列表失败",
    "cph.exportSuccess": "success send to cph",
    "cph.exportFailed": "fail to send cph",

    "err.cf": "AtCoder 触发了 Cloudflare 验证，插件无法绕过。请在浏览器中直接访问 AtCoder。\nURL: {url}",
    "err.proxy":
        "网络代理连接失败，无法访问 AtCoder。\n" +
        "可能原因：在 WSL 2 中，代理地址 127.0.0.1 指向 WSL 而非 Windows 宿主机。\n" +
        "解决方案：\n" +
        "  1. 在 WSL 中执行: export NO_PROXY=.atcoder.jp\n" +
        "  2. 或设置正确的宿主机 IP: export HTTPS_PROXY=http://$(hostname).local:7897\n" +
        "  3. 或连接 Windows 宿主机的 WSL 网关 IP（查看 /etc/resolv.conf）",
    "err.login":
        "访问需要登录，请设置 AtCoder Cookie。\n" +
        "获取方法：\n" +
        "  1. 在浏览器中登录 https://atcoder.jp\n" +
        "  2. 按 F12 打开开发者工具 → Application → Cookies\n" +
        "  3. 找到 atcoder.jp 下的 REVEL_SESSION，复制其 Value\n" +
        "  4. 在插件设置中输入: REVEL_SESSION=复制的值",
    "err.http403": "访问被拒绝 (403)。Cookie 可能无效或已过期，请重新登录 AtCoder 获取新的 REVEL_SESSION",
    "err.http404NoCookie": "访问失败 (404)。题目不存在或需要登录，请先设置 AtCoder Cookie。",
    "err.http404BadCookie": "访问失败 (404)。Cookie 可能无效或已过期，请重新登录 AtCoder 获取新的 REVEL_SESSION",
    "err.http404NotStarted": "访问失败 (404)。比赛「{contest}」尚未开始，题目还未公开，请等待开赛后再试。",
    "err.httpStatus": "Request failed with status {status}",
    "err.network": "网络错误: {msg}",

    "deepl.tooFrequent": "翻译请求过于频繁，请稍后再试",
    "deepl.httpError": "翻译接口错误 ({status})",
    "deepl.badResponse": "翻译接口返回异常",
    "deepl.timeout": "翻译请求超时",
    "deepl.failed": "翻译请求失败: {msg}",
    "deepl.failedSimple": "翻译请求失败",

    "submit.pageFetchFailed": "无法获取提交页面：比赛可能已结束，或提交页面结构发生了变化。",
    "submit.noCsrf": "无法获取 CSRF Token，请检查 Cookie 是否有效",
    "submit.success": "代码提交成功",
    "submit.failed": "提交失败，请检查 Cookie 是否有效",

    "register.success": "报名成功！",
    "register.failedBadCookie": "报名失败，请检查 Cookie 是否有效",
    "register.formIncomplete": "报名未成功：注册页返回校验结果，请确认表单必填信息（如姓名、邮箱、居住地等）填写完整",
    "register.alreadyDone": "已报名",
    "register.closed": "报名已截止或无法获取报名信息",
    "register.requestFailed": "报名请求失败",

    "md.statement": "### 题目描述",
    "md.constraints": "### 约束",
    "md.inputFormat": "### 输入格式",
    "md.outputFormat": "### 输出格式",
    "md.sample": "### 样例 {index}",
    "md.inputLabel": "输入",
    "md.outputLabel": "输出",

    "cph.notRunning":
        "未检测到 CPH 插件（localhost:27121 无响应）。\n" +
        "请安装并启用 Competitive Programming Helper 扩展后重试。",
    "cph.httpError": "CPH 返回状态码 {status}",
    "cph.connectionFailed": "连接 CPH 失败: {msg}",
};

export type ZhDict = typeof zh;
