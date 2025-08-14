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
    
    // 既存の招待情報をキャッシュ
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        const invites = await guild.invites.fetch();
        invites.forEach(invite => cachedInvites.set(invite.code, invite.uses));
        console.log(`📊 招待情報をキャッシュしました: ${invites.size}個`);
    }
});

// メンバー参加時
client.on('guildMemberAdd', async (member) => {
    console.log(`👋 新しいメンバーが参加: ${member.user.tag}`);
    
    if (member.guild.id !== GUILD_ID) return;

    try {
        // 現在の招待情報を取得
        const newInvites = await member.guild.invites.fetch();
        
        // 使用された招待コードを特定
        const usedInvite = newInvites.find(invite => {
            const cachedUses = cachedInvites.get(invite.code) || 0;
            return invite.uses > cachedUses;
        });

        if (usedInvite && usedInvite.code === INVITE_CODE) {
            // 指定された招待コードの場合、ロールを付与
            const role = member.guild.roles.cache.get(ROLE_ID);
            if (role) {
                await member.roles.add(role);
                console.log(`✅ ${member.user.tag} に「${role.name}」ロールを付与しました！`);
            } else {
                console.log(`❌ ロールが見つかりません: ${ROLE_ID}`);
            }
        } else {
            console.log(`ℹ️ ${member.user.tag} は別の招待から参加しました`);
        }

        // キャッシュを更新
        newInvites.forEach(invite => cachedInvites.set(invite.code, invite.uses));

    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
    }
});

// Botにログイン
client.login(TOKEN);
