import type { ZhDict } from "./zh";

export const ja: Record<keyof ZhDict, string> = {
    "ext.judgeResult": "判定結果: {status}",
    "ext.judgeTimeout": "判定がタイムアウトしました。しばらくしてから手動で更新して結果を確認してください",
    "ext.promptDeeplKey": "DeepL API Key を入力してください",
    "ext.placeholderDeeplKey": "例 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx",
    "ext.deeplKeySaved": "DeepL API Key を保存しました",
    "ext.promptCookie": "AtCoder の Cookie を貼り付けてください（REVEL_SESSION のみ）",
    "ext.placeholderCookie": "REVEL_SESSION=abcdef1234567890abcdef1234567890",
    "ext.cookieFormatWarn": "Cookie の形式が正しくないようです。REVEL_SESSION= の接頭辞を追加しますか？",
    "ext.autoFix": "自動修正",
    "ext.cancel": "キャンセル",
    "ext.cookieSavedFixed": "AtCoder Cookie を保存し、形式を自動修正しました",
    "ext.cookieSaved": "AtCoder Cookie を保存しました",
    "ext.submissionPanelTitle": "提出 {id} - {contest}",

    "cmd.copied": "クリップボードにコピーしました",
    "cmd.unknown": "不明なコマンド",

    "err.openInBrowser": "ブラウザで開く",
    "err.proxyFailedTitle": "プロキシ接続に失敗し、AtCoder にアクセスできません",
    "err.setNoProxy": "NO_PROXY を設定",
    "err.viewWslDoc": "WSL プロキシの説明を見る",
    "load.contestTasks": "{contest} の問題一覧を取得しています...",
    "err.contestTasks": "問題一覧の取得に失敗しました",
    "err.standingsParse": "順位表データの解析に失敗しました: {reason}",
    "load.translateItem": "{name} を翻訳しています...",
    "deepl.setKeyFirst": "先に DeepL API Key を設定してください",
    "deepl.setKey": "API Key を設定",
    "deepl.noKey": "DeepL API Key が設定されていません",
    "err.translate": "翻訳に失敗しました",
    "load.problem": "{contest}/{task} の問題文を取得しています...",
    "err.problem": "問題文の取得に失敗しました",
    "cookie.loaded": "✅ Cookie を読み込みました。ログインが必要な問題にアクセスできます",
    "cookie.notSet": "Cookie が設定されていません",
    "cookie.formatError": "❌ Cookie の形式が正しくありません。REVEL_SESSION= で始まる必要があります",
    "cookie.tooShort": "❌ Cookie の値が短すぎます。REVEL_SESSION の値を完全にコピーしたか確認してください",
    "cookie.saved": "AtCoder Cookie を保存しました",
    "cookie.saveSuccess": "✅ Cookie の保存に成功しました",
    "cookie.cleared": "Cookie を削除しました",
    "load.register": "{contest} に登録しています ...",
    "register.already": "すでに登録済みです。再登録の必要はありません",
    "register.failed": "登録に失敗しました",
    "load.submitPage": "{contest} の提出ページ情報を取得しています...",
    "submit.pageReady": "提出ページ情報を取得しました",
    "submit.cfNeedBrowser": "このコンテストへの提出には Cloudflare 認証が必要で、拡張機能では自動化できません。ブラウザで提出ページを開いて認証を完了してから提出してください。",
    "submit.loginRequired": "提出にはログインが必要です。AtCoder Cookie が有効か、期限切れでないか確認してください。提出ページで Cloudflare 認証が求められる場合は、ブラウザで開いて認証を完了してください。",
    "submit.loginRequiredNoCookie": "提出にはログインが必要です。先に AtCoder Cookie を設定してから再試行してください。",
    "err.submitPage": "提出ページの取得に失敗しました",
    "submit.paramsIncomplete": "提出パラメータが不完全です",
    "load.submitting": "コードを提出しています...",
    "submit.successWaiting": "コードの提出に成功しました。判定結果を取得しています...",
    "err.submit": "提出に失敗しました",
    "load.subHistory": "{contest} の提出履歴を取得しています...",
    "err.subHistory": "提出履歴の取得に失敗しました",
    "load.subDetail": "提出 {id} の詳細を取得しています...",
    "err.subDetail": "提出詳細の取得に失敗しました",
    "load.standings": "{contest} の順位表を取得しています...",
    "err.standings": "順位表の取得に失敗しました",
    "load.homepage": "AtCoder トップページのコンテスト一覧を取得しています...",
    "err.homepage": "コンテスト一覧の取得に失敗しました",
    "cph.exportSuccess": "success send to cph",
    "cph.exportFailed": "fail to send cph",

    "err.cf": "AtCoder が Cloudflare 認証を要求しました。拡張機能では回避できません。ブラウザで AtCoder に直接アクセスしてください。\nURL: {url}",
    "err.proxy":
        "ネットワークプロキシ接続に失敗し、AtCoder にアクセスできません。\n" +
        "考えられる原因: WSL 2 では、プロキシアドレス 127.0.0.1 は Windows ホストではなく WSL 自身を指します。\n" +
        "解決方法:\n" +
        "  1. WSL で実行: export NO_PROXY=.atcoder.jp\n" +
        "  2. または正しいホスト IP を設定: export HTTPS_PROXY=http://$(hostname).local:7897\n" +
        "  3. または Windows ホストの WSL ゲートウェイ IP に接続（/etc/resolv.conf を参照）",
    "err.login":
        "アクセスにはログインが必要です。AtCoder Cookie を設定してください。\n" +
        "取得方法:\n" +
        "  1. ブラウザで https://atcoder.jp にログイン\n" +
        "  2. F12 を押して開発者ツールを開く → Application → Cookies\n" +
        "  3. atcoder.jp の REVEL_SESSION を見つけ、その Value をコピー\n" +
        "  4. 拡張機能の設定で入力: REVEL_SESSION=コピーした値",
    "err.http403": "アクセスが拒否されました (403)。Cookie が無効か期限切れの可能性があります。AtCoder に再ログインして新しい REVEL_SESSION を取得してください",
    "err.http404NoCookie": "アクセスに失敗しました (404)。問題が存在しないか、ログインが必要です。先に AtCoder Cookie を設定してください。",
    "err.http404BadCookie": "アクセスに失敗しました (404)。Cookie が無効か期限切れの可能性があります。AtCoder に再ログインして新しい REVEL_SESSION を取得してください",
    "err.http404NotStarted": "アクセスに失敗しました (404)。コンテスト「{contest}」はまだ開始されておらず、問題は公開されていません。開始後にもう一度お試しください。",
    "err.httpStatus": "リクエストがステータス {status} で失敗しました",
    "err.network": "ネットワークエラー: {msg}",

    "deepl.tooFrequent": "翻訳リクエストが多すぎます。しばらくしてからもう一度お試しください",
    "deepl.rateLimited": "DeepL 翻訳がレート制限されました（HTTP 429）。しばらくしてからもう一度お試しください",
    "deepl.httpError": "翻訳 API エラー ({status})",
    "deepl.badResponse": "翻訳 API が異常な応答を返しました",
    "deepl.unexpectedStructure": "翻訳 API が異常な応答を返しました: レスポンス構造を認識できません",
    "deepl.timeout": "翻訳リクエストがタイムアウトしました",
    "deepl.failed": "翻訳リクエストに失敗しました: {msg}",
    "deepl.failedSimple": "翻訳リクエストに失敗しました",

    "submit.pageFetchFailed": "提出ページを取得できませんでした。コンテストが終了しているか、提出ページの構造が変更された可能性があります。",
    "submit.noCsrf": "CSRF Token を取得できませんでした。Cookie が有効か確認してください",
    "submit.success": "コードの提出に成功しました",
    "submit.failed": "提出に失敗しました。Cookie が有効か確認してください",

    "register.success": "登録に成功しました！",
    "register.failedBadCookie": "登録に失敗しました。Cookie が有効か確認してください",
    "register.formIncomplete": "登録に失敗しました: 登録ページが検証結果を返しました。必須項目（氏名、メールアドレス、居住地など）がすべて入力されているか確認してください",
    "register.alreadyDone": "登録済み",
    "register.closed": "登録は締め切られたか、登録情報を取得できません",
    "register.requestFailed": "登録リクエストに失敗しました",

    "md.statement": "### 問題文",
    "md.constraints": "### 制約",
    "md.inputFormat": "### 入力形式",
    "md.outputFormat": "### 出力形式",
    "md.sample": "### サンプル {index}",
    "md.inputLabel": "入力",
    "md.outputLabel": "出力",

    "cph.notRunning":
        "CPH 拡張機能が検出されませんでした（localhost:27121 が応答しません）。\n" +
        "Competitive Programming Helper 拡張機能をインストールして有効化してから再試行してください。",
    "cph.httpError": "CPH がステータスコード {status} を返しました",
    "cph.connectionFailed": "CPH への接続に失敗しました: {msg}",
};
