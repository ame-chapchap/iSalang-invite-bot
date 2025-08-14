# iSalang Invite Bot

特定の招待リンクから参加したメンバーに自動でロールを付与するDiscord Botです。

## 機能
- 招待リンク別の自動ロール付与
- ウェルカムDM送信
- Railway での無料ホスティング対応

## セットアップ
1. Discord Bot を作成してトークンを取得
2. 招待コードとロールIDを設定
3. Railway にデプロイ
4. 環境変数 `DISCORD_TOKEN` を設定

## 設定方法
`index.js` の `INVITE_ROLE_CONFIG` を編集して招待コードとロールIDを設定してください。

```javascript
const INVITE_ROLE_CONFIG = {
    'abc123': '1234567890123456789',  // 招待コード → ロールID
    'def456': '9876543210987654321',  // 別の招待コード → 別のロールID
};
