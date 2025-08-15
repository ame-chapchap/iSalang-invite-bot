const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// ===== 設定セクション =====
// ここで招待コードとロールIDの対応を設定してください
const INVITE_ROLE_CONFIG = {
    'vGjbzGV2RB': '1372464651992039434',
    // 例：
    // 'abc123': '1234567890123456789',  // VIPメンバー用
    // 'def456': '9876543210987654321',  // 一般メンバー用
    
    // ⚠️ 下記を実際の招待コードとロールIDに置き換えてください ⚠️
    // 'YOUR_INVITE_CODE_1': 'YOUR_ROLE_ID_1',
    // 'YOUR_INVITE_CODE_2': 'YOUR_ROLE_ID_2',
};

// ===== Botクライアント初期化 =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

// 招待リンクのキャッシュ（サーバーごと）
const serverInvites = new Map();

// ===== Bot起動時の処理 =====
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} がオンラインになりました！`);
    console.log(`📊 ${client.guilds.cache.size} のサーバーに接続中`);
    
    // 全サーバーの招待リンクをキャッシュ
    for (const guild of client.guilds.cache.values()) {
        try {
            const invites = await guild.invites.fetch();
            const inviteMap = new Map();
            
            invites.forEach(invite => {
                inviteMap.set(invite.code, invite.uses || 0);
            });
            
            serverInvites.set(guild.id, inviteMap);
            console.log(`✅ ${guild.name}: ${invites.size}個の招待リンクをキャッシュ`);
            
        } catch (error) {
            console.error(`❌ ${guild.name} の招待リンク取得失敗:`, error.message);
        }
    }
    
    console.log('🚀 準備完了！新メンバーの参加を監視中...');
    console.log('📝 設定確認:', Object.keys(INVITE_ROLE_CONFIG).length, '個の招待コードが設定済み');
});

// ===== 新メンバー参加時の処理 =====
client.on('guildMemberAdd', async (member) => {
    console.log(`👋 ${member.user.tag} が ${member.guild.name} に参加しました`);
    
    try {
        const guild = member.guild;
        const cachedInvites = serverInvites.get(guild.id);
        
        if (!cachedInvites) {
            console.log('❌ キャッシュされた招待リンクが見つかりません');
            return;
        }
        
        // 現在の招待リンク一覧を取得
        const currentInvites = await guild.invites.fetch();
        
        // 使用回数が増えた招待リンクを特定
        let usedInviteCode = null;
        
        for (const [code, currentUses] of currentInvites) {
            const cachedUses = cachedInvites.get(code) || 0;
            
            if (currentUses > cachedUses) {
                usedInviteCode = code;
                console.log(`🔍 使用された招待コード: ${code} (${cachedUses} → ${currentUses})`);
                break;
            }
        }
        
        if (usedInviteCode) {
            // 招待コードに対応するロールを取得
            const roleId = INVITE_ROLE_CONFIG[usedInviteCode];
            
            if (roleId) {
                const role = guild.roles.cache.get(roleId);
                
                if (role) {
                    try {
                        await member.roles.add(role);
                        console.log(`✅ ${member.user.tag} に "${role.name}" ロールを付与しました`);
                        
                        // ウェルカムDM送信（オプション）
                        try {
                            await member.send(`🎉 **${guild.name}** へようこそ！\n自動的に **${role.name}** ロールを付与しました。`);
                            console.log(`📨 ${member.user.tag} にウェルカムメッセージを送信しました`);
                        } catch (dmError) {
                            console.log(`📨 ${member.user.tag} へのDM送信失敗（DMが無効の可能性）`);
                        }
                        
                    } catch (roleError) {
                        console.error(`❌ ロール付与失敗:`, roleError.message);
                    }
                } else {
                    console.log(`⚠️ ロールID "${roleId}" が見つかりません`);
                }
            } else {
                console.log(`ℹ️ 招待コード "${usedInviteCode}" にロールが設定されていません`);
            }
        } else {
            console.log('❓ 使用された招待リンクを特定できませんでした');
        }
        
        // キャッシュを更新
        const newInviteMap = new Map();
        currentInvites.forEach(invite => {
            newInviteMap.set(invite.code, invite.uses || 0);
        });
        serverInvites.set(guild.id, newInviteMap);
        
    } catch (error) {
        console.error('❌ メンバー参加処理エラー:', error);
    }
});

// ===== 招待リンク作成時のキャッシュ更新 =====
client.on('inviteCreate', (invite) => {
    const guildInvites = serverInvites.get(invite.guild.id) || new Map();
    guildInvites.set(invite.code, invite.uses || 0);
    serverInvites.set(invite.guild.id, guildInvites);
    console.log(`➕ 新しい招待リンク作成: ${invite.code}`);
});

// ===== 招待リンク削除時のキャッシュ更新 =====
client.on('inviteDelete', (invite) => {
    const guildInvites = serverInvites.get(invite.guild.id);
    if (guildInvites) {
        guildInvites.delete(invite.code);
        console.log(`➖ 招待リンク削除: ${invite.code}`);
    }
});

// ===== エラーハンドリング =====
client.on('error', (error) => {
    console.error('🚨 Discord.js エラー:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('🚨 未処理エラー:', error);
});

// ===== Bot起動 =====
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN が設定されていません！');
    console.error('💡 Railway の環境変数で DISCORD_TOKEN を設定してください');
    process.exit(1);
}

console.log('🔄 Discord Bot を起動中...');
client.login(process.env.DISCORD_TOKEN);
