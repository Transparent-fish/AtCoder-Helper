import * as https from "https";

let freeDeeplID = 1;

function getDeepLTimestamp(text: string): number {
    const ts = Date.now(), count = text.split('i').length;
    if (count > 0) return ts - (ts % count) + count; //从油猴插件上搬的
    return ts;
}

function formatDeeplJson(date: object, id: number): string {
    let json = JSON.stringify(date);
    if ((id + 5) % 29 === 0 || (id + 3) % 13 === 0) json = json.replace('"method":"', '"method" : "');
    else json = json.replace('"method":"', '"method": "');
    return json;
}

export async function translateTextFree(text: string, lang: string): Promise<string> {
    const id = freeDeeplID++;
    const postData = formatDeeplJson({
        jsonrpc: "2.0",
        method: "LMT_handle_texts",
        id,
        params: {
            splitting: "newlines",
            lang: {
                source_lang_user_selected: "auto",
                target_lang: lang === "ZH" ? "ZH" : lang,
            },
            texts: [{ text, requestAlternatives: 3 }],
            timestamp: getDeepLTimestamp(text),
        },
    }, id);

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: "www2.deepl.com",
                path: "/jsonrpc",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Host": "www2.deepl.com",
                    "Origin": "https://www.deepl.com",
                    "Referer": "https://www.deepl.com/",
                },
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        if (json?.result?.texts?.[0]?.text) {
                            resolve(json.result.texts[0].text);
                        } else {
                            reject(new Error("翻译接口返回异常"));
                        }
                    } catch {
                        reject(new Error("翻译接口返回异常"));
                    }
                });
            }
        );
        req.on("error", () => reject(new Error("翻译请求失败")));
        req.write(postData);
        req.end();
    });
}

export function translateTextRaw(text: string, targetLang: string, apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({ text, target_lang: targetLang });
        const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
        const req = https.request(
            {
                hostname: host,
                path: "/v2/translate",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `DeepL-Auth-Key ${apiKey}`,
                },
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(json.message || `翻译接口错误 (${res.statusCode})`));
                            return;
                        }
                        resolve(json.translations?.[0]?.text ?? text);
                    } catch {
                        reject(new Error("翻译接口返回异常"));
                    }
                });
            }
        );
        req.on("error", () => reject(new Error("翻译请求失败")));
        req.write(params.toString());
        req.end();
    });
}