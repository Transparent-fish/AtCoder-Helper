import * as https from "https";
import * as http from "http";
import * as stream from "stream";
import * as zlib from "zlib";
import * as net from "net";
import * as tls from "tls";
import { SubRecord } from "./types"


export class CfError extends Error {
	url: string;
	constructor(url: string) {
		super(`AtCoder 触发了 Cloudflare 验证，插件无法绕过。请在浏览器中直接访问 AtCoder。\nURL: ${url}`);
		this.name = "CfError";
		this.url = url;
	}
}

export class ProxyError extends Error {
	constructor() {
		super(
			`网络代理连接失败，无法访问 AtCoder。\n` +
			`可能原因：在 WSL 2 中，代理地址 127.0.0.1 指向 WSL 而非 Windows 宿主机。\n` +
			`解决方案：\n` +
			`  1. 在 WSL 中执行: export NO_PROXY=.atcoder.jp\n` +
			`  2. 或设置正确的宿主机 IP: export HTTPS_PROXY=http://$(hostname).local:7897\n` +
			`  3. 或连接 Windows 宿主机的 WSL 网关 IP（查看 /etc/resolv.conf）`
		);
		this.name = "ProxyError";
	}
}

export class LoginRequiredError extends Error {
	url: string;
	constructor(url: string) {
		super(
			`访问需要登录，请设置 AtCoder Cookie。\n` +
			`获取方法：\n` +
			`  1. 在浏览器中登录 https://atcoder.jp\n` +
			`  2. 按 F12 打开开发者工具 → Application → Cookies\n` +
			`  3. 找到 atcoder.jp 下的 REVEL_SESSION，复制其 Value\n` +
			`  4. 在插件设置中输入: REVEL_SESSION=复制的值`
		);
		this.name = "LoginRequiredError";
		this.url = url;
	}
}

const cfSpecific = [
	"Just a moment",
	"Checking your browser",
	"cf-challenge",
	"cf-browser-verification",
	"checking-browser",
	"cf-im-under-attack",
];

function isCfChallenge(body: string): boolean {
	const lower = body.toLowerCase();
	const matched = cfSpecific.find((p) => lower.includes(p));
	if (matched) {
		console.log(`[isCfChallenge] 匹配到 CF 特征: "${matched}"`);
	}
	return !!matched;
}

function isLoginPage(body: string): boolean {
	if (body.length < 500) {
		console.log(`[isLoginPage] body 过短 (${body.length}), 跳过`);
		return false;
	}
	const lower = body.toLowerCase();
	if (lower.includes("sign in") && lower.includes("password")) {
		console.log(`[isLoginPage] 匹配: sign in + password`);
		return true;
	}
	const loginForm = /<form[^>]*action\s*=\s*"\/login[^"]*"/i.test(body);
	const loginHref = /<a[^>]*href\s*=\s*"\/login[^"]*"/i.test(body);
	const hasLoginFields = /<input[^>]*(name\s*=\s*"(username|password|csrf_token)")/i.test(body);
	if (loginForm && (loginHref || hasLoginFields)) {
		console.log(`[isLoginPage] 匹配: login 表单 + 链接/输入框`);
		return true;
	}
	console.log(`[isLoginPage] 未匹配, body.preview=${body.substring(0, 200).replace(/\n/g, " ")}`);
	return false;
}

const BROWSER_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
	Accept:
		"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
	"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
	"Accept-Encoding": "gzip, deflate, br",
	"Cache-Control": "no-cache",
	Pragma: "no-cache",
	"Sec-Fetch-Dest": "document",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-Site": "none",
	"Sec-Fetch-User": "?1",
	"Upgrade-Insecure-Requests": "1",
};

let sessionCookie = "";

let staleCookieNotified = false;
let staleCookieHandler: (() => void) | null = null;

export function setStaleCookieHandler(handler: (() => void) | null): void {
	staleCookieHandler = handler;
}

function notifyStaleCookie(): void {
	if (staleCookieHandler && !staleCookieNotified) {
		staleCookieNotified = true;
		staleCookieHandler();
	}
}

export function setSessionCookie(cookie: string): void {
	console.log(`[setSessionCookie] 设置 Cookie: ${cookie ? cookie.substring(0, 40) + "..." : "清空"}`);
	sessionCookie = cookie;
	staleCookieNotified = false;
}

export function getSessionCookie(): string {
	return sessionCookie;
}

export function getHeaders(withCookie = true): Record<string, string> {
	const headers: Record<string, string> = { ...BROWSER_HEADERS };
	if (withCookie && sessionCookie) {
		headers["Cookie"] = sessionCookie;
		console.log(`[getHeaders] 已注入 Cookie: ${sessionCookie.substring(0, 40)}...`);
	} else {
		console.log(`[getHeaders] 未注入 Cookie`);
	}
	return headers;
}

function isProxyError(err: Error): boolean {
	const msg = err.message.toLowerCase();
	return msg.includes("proxy") || msg.includes("connect") || msg.includes("econnrefused") || msg.includes("econnreset");
}

function getAgent(url: string): http.Agent | https.Agent {
	const isHttps = url.startsWith("https");
	const Agent = isHttps ? https.Agent : http.Agent;
	const agentOptions = {
		keepAlive: true,
		keepAliveMsecs: 1000,
		createConnection: (options: net.TcpSocketConnectOpts, callback?: (err: Error | null, socket: net.Socket) => void): void => {
			const hostname = options.host || "localhost";
			const port = options.port || (isHttps ? 443 : 80);
			const socket = net.connect(port, hostname, () => {
				if (isHttps) {
					callback?.(null, tls.connect({
						socket,
						host: hostname,
						servername: hostname,
					}));
				} else {
					callback?.(null, socket);
				}
			});
			socket.on("error", (err) => callback?.(err, undefined as unknown as net.Socket));
		},
	};
	return new (Agent as new (opts: Record<string, unknown>) => http.Agent | https.Agent)(agentOptions);
}

const directAgents = new Map<string, http.Agent | https.Agent>();

function getDirectAgent(url: string): http.Agent | https.Agent {
	const key = url.startsWith("https") ? "https" : "http";
	if (!directAgents.has(key)) {
		directAgents.set(key, getAgent(url));
	}
	return directAgents.get(key)!;
}

function saveProxyEnv() {
	const saved = {
		HTTP_PROXY: process.env.HTTP_PROXY,
		HTTPS_PROXY: process.env.HTTPS_PROXY,
		NO_PROXY: process.env.NO_PROXY,
		http_proxy: process.env.http_proxy,
		https_proxy: process.env.https_proxy,
		no_proxy: process.env.no_proxy,
	};
	delete process.env.HTTP_PROXY;
	delete process.env.HTTPS_PROXY;
	delete process.env.http_proxy;
	delete process.env.https_proxy;
	process.env.NO_PROXY = "*";
	process.env.no_proxy = "*";
	return saved;
}

function restoreProxyEnv(saved: Record<string, string | undefined>) {
	for (const [k, v] of Object.entries(saved)) {
		if (v === undefined) delete process.env[k];
		else process.env[k] = v;
	}
}

function extractContestFromUrl(url: string): string | null {
	const match = url.match(/\/contests\/([^/]+)/i);
	return match ? match[1] : null;
}

function isContestStarted(contest: string): Promise<boolean | null> {
	const url = `https://atcoder.jp/contests/${contest}`;
	return fetchTextOnce(url, false)
		.then((html) => {
			const match = html.match(/var startTime = moment\("([^"]+)"\)/i);
			if (!match) return null;
			const start = new Date(match[1]).getTime();
			if (Number.isNaN(start)) return null;
			return start <= Date.now();
		})
		.catch(() => null);
}

function handleResponse(
	url: string,
	res: http.IncomingMessage,
	restoreSaved: Record<string, string | undefined>,
	resolve: (value: string | PromiseLike<string>) => void,
	reject: (reason: unknown) => void,
	redirectFetcher: (url: string) => Promise<string>,
	logPrefix: string = "[fetchText]",
) {
	console.log(`${logPrefix} 收到响应:`, url, `status=${res.statusCode}`);

	if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
		const redirectUrl = new URL(res.headers.location, url).href;
		console.log(`${logPrefix} 重定向:`, res.statusCode, `->`, redirectUrl);
		restoreProxyEnv(restoreSaved);
		if (redirectUrl.includes("/login")) {
			console.log(`${logPrefix} 检测到登录重定向`);
			reject(new LoginRequiredError(redirectUrl));
			return;
		}
		resolve(redirectFetcher(redirectUrl));
		return;
	}

	const encoding = res.headers["content-encoding"] || "";
	let readableStream: stream.Readable = res;
	if (encoding.includes("br")) {
		readableStream = res.pipe(zlib.createBrotliDecompress());
	} else if (encoding.includes("gzip")) {
		readableStream = res.pipe(zlib.createGunzip());
	} else if (encoding.includes("deflate")) {
		readableStream = res.pipe(zlib.createInflate());
	}

	const chunks: Buffer[] = [];
	readableStream.on("data", (chunk: Buffer) => {
		chunks.push(chunk);
	});
	readableStream.on("end", () => {
		const body = Buffer.concat(chunks).toString("utf8");
		console.log(`${logPrefix} 响应体:`, url, `status=${res.statusCode}`, `body.length=${body.length}`);

		restoreProxyEnv(restoreSaved);

		if (isCfChallenge(body)) {
			console.log(`${logPrefix} 检测到 Cloudflare 挑战`);
			reject(new CfError(url));
			return;
		}
		if (res.statusCode === 403) {
			const broad = ["Cloudflare", "challenge", "attention required"].some((p) => body.toLowerCase().includes(p));
			if (broad) {
				console.log(`${logPrefix} 403 + 泛化 CF 特征，判定为 Cloudflare 挑战`);
				reject(new CfError(url));
			} else {
				console.log(`${logPrefix} 403 但非 CF，可能 Cookie 无效`);
				reject(new Error(`访问被拒绝 (403)。Cookie 可能无效或已过期，请重新登录 AtCoder 获取新的 REVEL_SESSION`));
			}
			return;
		}
		if (isLoginPage(body)) {
			console.log(`${logPrefix} 检测到登录页面`);
			reject(new LoginRequiredError(url));
			return;
		}
		if (res.statusCode !== 200) {
			if (res.statusCode === 404) {
				if (!sessionCookie) {
					console.log(`${logPrefix} 404 且无 Cookie，需要登录`);
					reject(new Error(`访问失败 (404)。题目不存在或需要登录，请先设置 AtCoder Cookie。`));
					return;
				}
				const rejectCookieInvalid = () => {
					console.log(`${logPrefix} 404 但有 Cookie，可能 Cookie 无效`);
					reject(new Error(`访问失败 (404)。Cookie 可能无效或已过期，请重新登录 AtCoder 获取新的 REVEL_SESSION`));
				};
				const contest = extractContestFromUrl(url);
				if (!contest) {
					rejectCookieInvalid();
					return;
				}
				void isContestStarted(contest).then((started) => {
					if (started === false) {
						console.log(`${logPrefix} 404 且比赛未开始，题目未公开: ${url}`);
						reject(new Error(`访问失败 (404)。比赛「${contest}」尚未开始，题目还未公开，请等待开赛后再试。`));
					} else {
						rejectCookieInvalid();
					}
				});
				return;
			}
			console.log(`${logPrefix} 非 200 状态码:`, res.statusCode);
			reject(new Error(`Request failed with status ${res.statusCode}`));
			return;
		}

		console.log(`${logPrefix} 请求成功:`, url, `body.length=${body.length}`);
		resolve(body);
	});
	readableStream.on("error", (err: Error) => {
		restoreProxyEnv(restoreSaved);
		reject(err);
	});
}

export function fetchText(url: string, opts?: { withCookie?: boolean }): Promise<string> {
	const withCookie = opts?.withCookie ?? true;
	if (withCookie && sessionCookie) {
		return fetchTextOnce(url, true).catch((error) => {
			if (error instanceof CfError) {
				console.log(`[fetchText] 带 Cookie 请求触发 Cloudflare，改用无 Cookie 重试: ${url}`);
				return fetchTextOnce(url, false).then((body) => {
					notifyStaleCookie();
					return body;
				});
			}
			throw error;
		});
	}
	return fetchTextOnce(url, withCookie);
}

function fetchTextOnce(url: string, withCookie: boolean): Promise<string> {
	const logPrefix = `[fetchText]`;

	const savedProxy = saveProxyEnv();

	function restoreProxy() { restoreProxyEnv(savedProxy); }

	console.log(`${logPrefix} 开始请求`, url, withCookie ? `Cookie: ${sessionCookie ? sessionCookie.substring(0, 25) + "..." : "无"}` : "无 Cookie(降级)");
	return new Promise((resolve, reject) => {
		const client = url.startsWith("https") ? https : http;
		const req = client.get(
			url,
			{
				headers: getHeaders(withCookie),
				agent: getDirectAgent(url),
			},
			(res) => {
				handleResponse(url, res, savedProxy, resolve, reject, (u) => fetchTextOnce(u, withCookie), logPrefix);
			}
		);
		req.on("error", (err: Error) => {
			restoreProxy();
			console.log(`${logPrefix} 请求错误:`, url, err.message);
			if (isProxyError(err)) {
				reject(new ProxyError());
				return;
			}
			reject(new Error(`网络错误: ${err.message}`));
		});
	});
}

export function fetchTextPost(url: string, body: string): Promise<string> {
	const logPrefix = `[fetchTextPost]`;

	const savedProxy = saveProxyEnv();

	function restoreProxy() { restoreProxyEnv(savedProxy); }

	console.log(`${logPrefix} 开始请求`, url, `body=${body.substring(0, 100)}`);
	return new Promise((resolve, reject) => {
		const client = url.startsWith("https") ? https : http;
		const headers = {
			...getHeaders(),
			"Content-Type": "application/x-www-form-urlencoded",
		};
		const req = client.request(
			url,
			{
				method: "POST",
				headers,
				agent: getDirectAgent(url),
			},
			(res) => {
				handleResponse(url, res, savedProxy, resolve, (err) => {
					restoreProxy();
					reject(err);
				}, fetchText, logPrefix);
			}
		);
		req.write(body);
		req.end();
		req.on("error", (err: Error) => {
			restoreProxy();
			console.log(`${logPrefix} 请求错误:`, url, err.message);
			if (isProxyError(err)) {
				reject(new ProxyError());
				return;
			}
			reject(new Error(`网络错误: ${err.message}`));
		});
	});
}

export async function fetchSubStatus(contest: string): Promise<Map<string, string>> {
	const html = await fetchText(`https://atcoder.jp/contests/${contest}/submissions/me`);
	const now = new Map<string, string>();
	const reg = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
	let rowMatch: RegExpExecArray | null;
	for (; (rowMatch = reg.exec(html)) !== null;) {
		const rowHtml = rowMatch[1];
		const tasks = rowHtml.match(/href="\/contests\/[^/]+\/tasks\/([^"#?]+)"/i);
		if (!tasks || now.has(tasks[1])) continue;
		const statuMatch = rowHtml.match(
			/<span[^>]*class=(["'])[^"']*\blabel\b[^"']*\1[^>]*>([^<]+)<\/span>/i
		);
		if (!statuMatch) continue;
		now.set(tasks[1], statuMatch[2].trim());
	}
	return now;
}

function stripHtmlTags(value: string): string {
	return value
		.replace(/<[^>]+>/g, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/&nbsp;/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function splitRowCells(rowHtml: string): string[] {
	const cells: string[] = [];
	const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
	let match: RegExpExecArray | null;
	while ((match = cellRegex.exec(rowHtml)) !== null) {
		cells.push(match[1]);
	}
	return cells;
}

export async function fetchSubmitHistory(contest: string): Promise<SubRecord[]> {
	const html = await fetchText(`https://atcoder.jp/contests/${contest}/submissions/me`);
	const records: SubRecord[] = [];
	const reg = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
	let rowMatch: RegExpExecArray | null;
	for (; (rowMatch = reg.exec(html)) !== null;) {
		const rowHtml = rowMatch[1];
		const cells = splitRowCells(rowHtml);
		if (cells.length < 7) continue;

		const timeMatch = cells[0].match(/<time[^>]*>([^<]+)<\/time>/i);
		const time = timeMatch ? timeMatch[1].trim() : stripHtmlTags(cells[0]);
		if (!time) continue;

		const taskLinkMatch = cells[1].match(/href="[^"]*\/tasks\/([^"#?]+)"[^>]*>([\s\S]*?)<\/a>/i);
		if (!taskLinkMatch) continue;
		const taskScreenName = taskLinkMatch[1];
		const task = stripHtmlTags(taskLinkMatch[2]);

		const language = stripHtmlTags(cells[3]);

		const scoreMatch = cells[4].match(/(\d+)/);
		const score = scoreMatch ? scoreMatch[1] : "0";

		const statusMatch = cells[6].match(/<span[^>]*class=(["'])[^"']*\blabel\b[^'"]*\1[^>]*>\s*([^<]+)\s*<\/span>/i);
		if (!statusMatch) continue;
		const status = statusMatch[2].trim();

		const detailMatch = rowHtml.match(/href="\/contests\/[^/]+\/submissions\/(\d+)"/i);
		if (!detailMatch) continue;
		const id = detailMatch[1];

		records.push({ id, time, task, taskScreenName, language, score, status });
	}
	return records;
}
