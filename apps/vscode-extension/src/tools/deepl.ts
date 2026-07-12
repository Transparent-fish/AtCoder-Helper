import * as https from "https";

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
