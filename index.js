// 一番上に追加（環境変数チェックの前）
console.log('🔍 Discord API接続テスト開始...');

// A. Gateway接続テスト
const https = require('https');
https.get("https://discord.com/api/v10/gateway", (res) => {
    console.log("✅ GATEWAY到達成功:", res.statusCode);
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => console.log("📊 GATEWAY応答:", data));
}).on("error", (e) => console.error("❌ GATEWAY到達失敗:", e.message));

// B. Bot Gateway接続テスト（環境変数取得後に移動）
setTimeout(() => {
    const token = process.env.DISCORD_TOKEN;
    if (token) {
        const req = https.request(
            "https://discord.com/api/v10/gateway/bot",
            { method: "GET", headers: { Authorization: `Bot ${token}` } },
            (res) => {
                console.log("✅ BOT GATEWAY到達成功:", res.statusCode);
                let data = "";
                res.on("data", (c) => (data += c));
                res.on("end", () => console.log("📊 BOT GATEWAY応答:", data));
            }
        );
        req.on("error", (e) => console.error("❌ BOT GATEWAY到達失敗:", e.message));
        req.end();
    }
}, 2000);

// DNS解決をIPv4優先に設定（Render環境対策）
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Express サーバーを作成（Renderのポート要件のため）
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 iSalang招待ロールBot is running!');
});

app.listen(PORT, () => {
    console.log(`🌐 HTTP server is running on port ${PORT}`);
});

// 環境変数の確認（デバッグ用）
console.log('🔍 環境変数チェック:');
console.log(`- DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? '設定済み (' + process.env.DISCORD_TOKEN.substring(0, 10) + '...)' : '❌ 未設定'}`);
console.log(`- GUILD_ID: ${process.env.GUILD_ID || '❌ 未設定'}`);
console.log(`- ROLE_ID: ${process.env.ROLE_ID || '❌ 未設定'}`);
console.log(`- INVITE_CODE: ${process.env.INVITE_CODE || '❌ 未設定'}`);

// Discord Bot部分
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

// 環境変数から取得
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const INVITE_CODE = process.env.INVITE_CODE;

// 招待情報を保存する変数
let cachedInvites = new Map();

// ===== ここに詳細ログを追加 =====
// プロセスエラーハンドリング
process.on("unhandledRejection", (e) => console.error("🚨 UNHANDLED REJECTION:", e));
process.on("uncaughtException", (e) => console.error("🚨 UNCAUGHT EXCEPTION:", e));

// Discord.js 詳細ログ
client.on("shardError", (e, id) => console.error("🚨 SHARD ERROR", id, e));
client.on("debug", (m) => console.log("🔍 [discord.js]", m));
// ===== 詳細ログ追加終了 =====

// Bot起動時
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} でログインしました！`);
    console.log(`📊 Bot ID: ${client.user.id}`);
    console.log(`🏠 参加サーバー数: ${client.guilds.cache.size}`);
    
    // 既存の招待情報をキャッシュ
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        console.log(`🎯 対象サーバー見つかりました: ${guild.name}`);
        try {
            const invites = await guild.invites.fetch();
            invites.forEach(invite => cachedInvites.set(invite.code, invite.uses));
            console.log(`📊 招待情報をキャッシュしました: ${invites.size}個`);
            
            // 対象ロールの確認
            const targetRole = guild.roles.cache.get(ROLE_ID);
            if (targetRole) {
                console.log(`🎭 対象ロール見つかりました: ${targetRole.name}`);
            } else {
                console.log(`❌ 対象ロールが見つかりません: ${ROLE_ID}`);
                console.log(`📋 利用可能なロール一覧:`);
                guild.roles.cache.forEach(role => {
                    console.log(`  - ${role.name} (ID: ${role.id})`);
                });
            }
        } catch (error) {
            console.error('❌ 招待情報取得エラー:', error.message);
            console.error('💡 Botに「View Audit Log」または「Manage Server」権限が必要です');
        }
    } else {
        console.log(`❌ 対象サーバーが見つかりません: ${GUILD_ID}`);
        console.log(`📋 参加中のサーバー一覧:`);
        client.guilds.cache.forEach(guild => {
            console.log(`  - ${guild.name} (ID: ${guild.id})`);
        });
    }
});

// Discord接続エラーハンドリング（詳細版）
client.on('error', (error) => {
    console.error('❌ Discord Client エラー:', error);
});

client.on('warn', (warning) => {
    console.warn('⚠️ Discord Client 警告:', warning);
});

client.on('disconnect', () => {
    console.log('🔌 Discord接続が切断されました');
});

client.on('reconnecting', () => {
    console.log('🔄 Discord再接続中...');
});

// メンバー参加時
client.on('guildMemberAdd', async (member) => {
    console.log(`👋 新しいメンバーが参加: ${member.user.tag}`);
    
    if (member.guild.id !== GUILD_ID) {
        console.log(`ℹ️ 別のサーバーからの参加: ${member.guild.name}`);
        return;
    }

    try {
        // 現在の招待情報を取得
        const newInvites = await member.guild.invites.fetch();
        
        // 使用された招待コードを特定
        const usedInvite = newInvites.find(invite => {
            const cachedUses = cachedInvites.get(invite.code) || 0;
            return invite.uses > cachedUses;
        });

        if (usedInvite) {
            console.log(`🔗 使用された招待コード: ${usedInvite.code}`);
            console.log(`🎯 対象招待コード: ${INVITE_CODE}`);
            
            if (usedInvite.code === INVITE_CODE) {
                // 指定された招待コードの場合、ロールを付与
                const role = member.guild.roles.cache.get(ROLE_ID);
                if (role) {
                    await member.roles.add(role);
                    console.log(`✅ ${member.user.tag} に「${role.name}」ロールを付与しました！`);
                } else {
                    console.log(`❌ ロールが見つかりません: ${ROLE_ID}`);
                }
            } else {
                console.log(`ℹ️ ${member.user.tag} は別の招待コード（${usedInvite.code}）から参加しました`);
            }
        } else {
            console.log(`❓ 使用された招待コードを特定できませんでした`);
        }

        // キャッシュを更新
        newInvites.forEach(invite => cachedInvites.set(invite.code, invite.uses));

    } catch (error) {
        console.error('❌ メンバー参加処理エラー:', error);
    }
});

// Botにログイン（超詳細ログ版）
console.log('🚀 Discord Botログイン試行中...');

if (!TOKEN) {
    console.error('❌ DISCORD_TOKENが設定されていません！');
    process.exit(1);
}

// トークン形式チェック（修正版）
console.log(`🔑 トークン形式チェック: ${TOKEN.startsWith('MT') ? '✅ 正常' : '❌ 異常'}`);
console.log(`📏 トークン長: ${TOKEN.length}文字`);
console.log(`🔤 トークン先頭: ${TOKEN.substring(0, 15)}...`);

// 接続前のWebSocket状態
console.log(`🔌 接続前WebSocket状態: ${client.ws.status}`);

// ログイン処理にタイムアウトを設定
const loginTimeout = setTimeout(() => {
    console.error('⏰ ログイン処理がタイムアウトしました（30秒）');
    console.error('🔍 現在のWebSocket状態:', client.ws.status);
}, 30000);

// ログイン試行（超詳細エラーハンドリング）
console.log('🎯 client.login()を実行中...');

client.login(TOKEN)
    .then(() => {
        clearTimeout(loginTimeout);
        console.log('🎉 Discord ログイン処理完了！');
    })
    .catch(error => {
        clearTimeout(loginTimeout);
        console.error('❌❌❌ Discord ログイン失敗 ❌❌❌');
        console.error('エラータイプ:', error.name);
        console.error('エラーメッセージ:', error.message);
        console.error('エラーコード:', error.code);
        console.error('エラースタック:', error.stack);
        
        // ネットワーク関連のエラーチェック
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.error('💡 ネットワーク接続の問題です');
        } else if (error.code === 'TOKEN_INVALID') {
            console.error('💡 解決方法: Discord Developer Portalでトークンを再生成してください');
        }
    });

// 段階的な状態チェック
setTimeout(() => {
    console.log(`🔍 5秒後WebSocket状態: ${client.ws.status}`);
}, 5000);

setTimeout(() => {
    console.log(`🔍 15秒後WebSocket状態: ${client.ws.status}`);
    console.log(`🔍 Bot準備状態: ${client.readyAt ? '準備完了' : '未準備'}`);
}, 15000);

setTimeout(() => {
    if (client.readyAt) {
        console.log('✅ Discord Bot正常稼働中');
    } else {
        console.log('❌ Discord Bot未接続（25秒経過）');
        console.log('🔍 最終デバッグ情報:');
        console.log(`- WebSocket状態: ${client.ws.status}`);
        console.log(`- Bot準備状態: ${client.readyAt ? '準備完了' : '未準備'}`);
        console.log(`- ユーザー情報: ${client.user ? client.user.tag : '未取得'}`);
    }
}, 25000);
