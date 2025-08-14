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

// Botにログイン（詳細ログ版）
console.log('🚀 Discord Botログイン試行中...');

if (!TOKEN) {
    console.error('❌ DISCORD_TOKENが設定されていません！');
    process.exit(1);
}

// トークン形式チェック（修正版）
console.log(`🔑 トークン形式チェック: ${TOKEN.startsWith('MT') ? '✅ 正常' : '❌ 異常'}`);
console.log(`📏 トークン長: ${TOKEN.length}文字`);
console.log(`🔤 トークン先頭: ${TOKEN.substring(0, 15)}...`);

// ログイン試行（詳細エラーハンドリング）
client.login(TOKEN)
    .then(() => {
        console.log('🎉 Discord ログイン成功！');
    })
    .catch(error => {
        console.error('❌❌❌ Discord ログイン失敗 ❌❌❌');
        console.error('エラータイプ:', error.name);
        console.error('エラーメッセージ:', error.message);
        console.error('エラーコード:', error.code);
        console.error('ステータス:', error.status);
        console.error('レスポンス:', error.response);
        console.error('完全なエラー:', JSON.stringify(error, null, 2));
        
        // 一般的なエラーの原因を説明
        if (error.code === 'TOKEN_INVALID') {
            console.error('💡 解決方法: Discord Developer Portalでトークンを再生成してください');
        } else if (error.code === 'DISALLOWED_INTENTS') {
            console.error('💡 解決方法: Discord Developer PortalでPrivileged Gateway Intentsを有効にしてください');
        } else if (error.message && error.message.includes('401')) {
            console.error('💡 解決方法: Botトークンが無効です。新しいトークンを生成してください');
        } else if (error.message && error.message.includes('403')) {
            console.error('💡 解決方法: Bot権限またはアクセス権限に問題があります');
        }
    });

// 10秒後にログイン状態をチェック
setTimeout(() => {
    if (client.readyAt) {
        console.log('✅ Discord Bot正常稼働中');
    } else {
        console.log('❌ Discord Bot未接続（10秒経過）');
        console.log('🔍 デバッグ情報:');
        console.log(`- WebSocket状態: ${client.ws.status}`);
        console.log(`- Bot準備状態: ${client.readyAt ? '準備完了' : '未準備'}`);
    }
}, 10000);
