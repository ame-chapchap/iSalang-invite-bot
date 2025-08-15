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
    
    // 🔍 設定されている招待コードを詳細表示
    console.log('\n⚙️ === 設定確認 ===');
    console.log(`📝 設定されている招待コード数: ${Object.keys(INVITE_ROLE_CONFIG).length}個`);
    
    if (Object.keys(INVITE_ROLE_CONFIG).length > 0) {
        console.log('📋 招待コード→ロール設定一覧:');
        for (const [inviteCode, roleId] of Object.entries(INVITE_ROLE_CONFIG)) {
            console.log(`  🔗 招待コード: ${inviteCode} → ロールID: ${roleId}`);
            console.log(`     招待リンク: https://discord.gg/${inviteCode}`);
        }
    } else {
        console.log('⚠️ 招待コードが設定されていません！');
    }
    
    console.log('\n🔍 === サーバー別招待リンク情報 ===');
    
    // 全サーバーの招待リンクをキャッシュ
    for (const guild of client.guilds.cache.values()) {
        try {
            console.log(`\n📋 サーバー: ${guild.name} (ID: ${guild.id})`);
            
            const invites = await guild.invites.fetch();
            const inviteMap = new Map();
            
            if (invites.size === 0) {
                console.log('  ❌ 招待リンクが存在しません');
            } else {
                console.log(`  ✅ ${invites.size}個の招待リンクを発見:`);
                
                invites.forEach(invite => {
                    inviteMap.set(invite.code, invite.uses || 0);
                    
                    // 招待リンクの詳細情報を表示
                    const isConfigured = INVITE_ROLE_CONFIG[invite.code] ? '🎯 設定済み' : '⚪ 未設定';
                    const channelName = invite.channel ? invite.channel.name : '不明';
                    const inviterName = invite.inviter ? invite.inviter.tag : '不明';
                    const maxUses = invite.maxUses === 0 ? '無制限' : invite.maxUses;
                    const expiresAt = invite.expiresAt ? invite.expiresAt.toLocaleString('ja-JP') : '無期限';
                    
                    console.log(`    ${isConfigured} コード: ${invite.code}`);
                    console.log(`      📊 使用回数: ${invite.uses || 0}/${maxUses}`);
                    console.log(`      🌐 リンク: https://discord.gg/${invite.code}`);
                    console.log(`      📺 チャンネル: #${channelName}`);
                    console.log(`      👤 作成者: ${inviterName}`);
                    console.log(`      ⏰ 期限: ${expiresAt}`);
                    
                    // 設定されているコードかチェック
                    if (INVITE_ROLE_CONFIG[invite.code]) {
                        const roleId = INVITE_ROLE_CONFIG[invite.code];
                        const role = guild.roles.cache.get(roleId);
                        if (role) {
                            console.log(`      🎭 付与ロール: "${role.name}" (ID: ${roleId})`);
                        } else {
                            console.log(`      ❌ ロールエラー: ID "${roleId}" が見つかりません`);
                        }
                    }
                    console.log(''); // 空行
                });
            }
            
            serverInvites.set(guild.id, inviteMap);
            
            // 設定されているが存在しない招待コードをチェック
            console.log('  🔍 設定チェック:');
            let configuredButMissing = [];
            for (const configuredCode of Object.keys(INVITE_ROLE_CONFIG)) {
                if (!inviteMap.has(configuredCode)) {
                    configuredButMissing.push(configuredCode);
                }
            }
            
            if (configuredButMissing.length > 0) {
                console.log(`  ⚠️ 設定されているが存在しない招待コード: ${configuredButMissing.join(', ')}`);
            } else if (Object.keys(INVITE_ROLE_CONFIG).length > 0) {
                console.log('  ✅ 設定されている招待コードは全て存在します');
            }
            
        } catch (error) {
            console.error(`❌ ${guild.name} の招待リンク取得失敗:`, error.message);
        }
    }
    
    console.log('\n🚀 準備完了！新メンバーの参加を監視中...');
    console.log('=' .repeat(50));
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
        
        // 🔍 デバッグ: キャッシュされた招待リンク一覧を表示
        console.log('📋 キャッシュされた招待リンク:');
        cachedInvites.forEach((uses, code) => {
            console.log(`  - ${code}: ${uses}回`);
        });
        
        // 現在の招待リンク一覧を取得
        const currentInvites = await guild.invites.fetch();
        
        // 🔍 デバッグ: 現在の招待リンク一覧を表示
        console.log('📋 現在の招待リンク:');
        currentInvites.forEach(invite => {
            console.log(`  - ${invite.code}: ${invite.uses || 0}回`);
        });
        
        // 🔍 デバッグ: 設定されている招待コードを表示
        console.log('⚙️ 設定されている招待コード:', Object.keys(INVITE_ROLE_CONFIG));
        
        // 使用回数が増えた招待リンクを特定
        let usedInviteCode = null;
        
        console.log('🔍 招待リンクの使用回数をチェック中...');
        
        // 🛠️ 修正: 正しいループ処理
        currentInvites.forEach(invite => {
            const code = invite.code;
            const currentUses = invite.uses || 0;
            const cachedUses = cachedInvites.get(code) || 0;
            
            console.log(`  - ${code}: キャッシュ=${cachedUses}, 現在=${currentUses}, 変化=${currentUses > cachedUses ? 'あり' : 'なし'}`);
            
            if (currentUses > cachedUses) {
                usedInviteCode = code;
                console.log(`🎯 使用された招待コード特定: ${code} (${cachedUses} → ${currentUses})`);
            }
        });
        
        if (usedInviteCode) {
            console.log(`✅ 使用された招待コード: ${usedInviteCode}`);
            
            // 招待コードに対応するロールを取得
            const roleId = INVITE_ROLE_CONFIG[usedInviteCode];
            console.log(`🔍 設定確認: ${usedInviteCode} → ロールID: ${roleId}`);
            
            if (roleId) {
                const role = guild.roles.cache.get(roleId);
                console.log(`🔍 ロール検索結果:`, role ? `"${role.name}"` : 'ロールが見つかりません');
                
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
            console.log('💡 すべての招待リンクで使用回数の変化が検出されませんでした');
        }
        
        // キャッシュを更新
        const newInviteMap = new Map();
        currentInvites.forEach(invite => {
            newInviteMap.set(invite.code, invite.uses || 0);
        });
        serverInvites.set(guild.id, newInviteMap);
        
        // 🔍 デバッグ: 更新後のキャッシュを表示
        console.log('🔄 キャッシュ更新完了:');
        newInviteMap.forEach((uses, code) => {
            console.log(`  - ${code}: ${uses}回`);
        });
        
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
