"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const fs_1 = __importDefault(require("fs"));
const schedule = require("node-schedule");
function get_all_messages(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("loading all messages in " + channel.name);
        var messages = [];
        let lastMessageId = undefined;
        // +1 represents the first message when the thread was created
        for (let i = 0; i < channel.messages.cache.size + 1; i += 10) {
            messages.push(...((yield channel.messages.fetch({ limit: 10, before: lastMessageId })).map(m => m)));
            lastMessageId = messages[messages.length - 1].id;
        }
        return messages;
    });
}
class ForumStatistics {
    constructor(token, forumChannelIds, botChannelId) {
        this.debug = false;
        this.token = token;
        this.forumChannelIds = forumChannelIds;
        this.botchannelId = botChannelId;
        this.client = new discord_js_1.default.Client({ intents: [discord_js_1.default.GatewayIntentBits.Guilds] });
        this.client.once(discord_js_1.default.Events.ClientReady, readyClient => {
            // console.log(`Ready! Logged in as ${readyClient.user.tag}`);
            (() => __awaiter(this, void 0, void 0, function* () {
                const statistics_data = yield this.create_statistics();
                // console.dir(statistics_data, { depth: null });
                const embed = this.create_embed(statistics_data);
                // console.dir(embed, { depth: null });
                if (this.debug) {
                    yield this.send_embed(embed);
                }
                schedule.scheduleJob("0 18 * * 6", () => __awaiter(this, void 0, void 0, function* () {
                    yield this.send_embed(embed);
                }));
            }))();
        });
    }
    count_letters(messages) {
        return messages.reduce((acc, message) => acc + message.content.length, 0);
    }
    create_statistics() {
        return __awaiter(this, void 0, void 0, function* () {
            const channels = this.client.channels.cache.filter(channel => this.forumChannelIds.includes(channel.id)).map(c => c);
            const data = {};
            for (const channel of channels) {
                const channelData = {};
                for (const [snowflake, thread] of channel.threads.cache) {
                    const allMessages = yield get_all_messages(thread);
                    const weekMessages = allMessages.filter(message => message.createdTimestamp > Date.now() - 7 * 24 * 60 * 60 * 1000);
                    if (weekMessages.length === 0) {
                        continue;
                    }
                    const threadData = {
                        counts: {
                            all: allMessages.length,
                            week: weekMessages.length
                        },
                        letters: {
                            all: this.count_letters(allMessages),
                            week: this.count_letters(weekMessages)
                        }
                    };
                    channelData[thread.name] = threadData;
                }
                if (Object.keys(channelData).length > 0) {
                    data[channel.name] = channelData;
                }
            }
            return data;
        });
    }
    create_embed(data) {
        const embed = new discord_js_1.default.EmbedBuilder()
            .setTitle("📊 Forum Statistics 📊")
            .setColor("#0000ff");
        for (const [channelName, threads] of Object.entries(data)) {
            embed.addFields([{ name: channelName, value: " ", inline: false }]);
            for (const [threadName, threadData] of Object.entries(threads)) {
                let value = "";
                value += `メッセージ数: ${threadData.counts.week}/${threadData.counts.all}\n`;
                value += `文字数: ${threadData.letters.week}/${threadData.letters.all}\n`;
                embed.addFields({ name: threadName, value: value, inline: true });
            }
        }
        return embed;
    }
    send_embed(embed) {
        return __awaiter(this, void 0, void 0, function* () {
            const channel = yield this.client.channels.cache.get(this.botchannelId);
            if (this.debug) {
                console.dir(embed, { depth: null });
            }
            else {
                const content = fs_1.default.readFileSync("./ForumStatisticsMessageContent.txt").toString();
                yield channel.send({ content: content, embeds: [embed] });
            }
        });
    }
    run(debug = false) {
        this.debug = debug;
        this.client.login(this.token);
    }
}
// new ForumStatistics(
//     process.env.TESTBOT_TOKEN!,
//     [process.env.TESTGUILD_FORUMCHANNELID!],
//     process.env.TESTGUILD_BOTCHANNELID!
// ).run(true)
new ForumStatistics(process.env.OUCC_ECHAN_TOKEN, [
    process.env.OUCC_PROJECT_FORUMCHANNELID,
    process.env.OUCC_SHARE_FORUMCHANNELID,
    process.env.OUCC_OFFTOPIC_FORUMCHANNELID,
], process.env.OUCC_BOTCHANNELID).run();
console.log("ForumStatistics is Active!");
