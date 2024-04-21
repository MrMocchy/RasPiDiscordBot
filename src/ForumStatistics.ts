
import Discord from "discord.js"
import fs from "fs"

const schedule = require("node-schedule")
const {get_all_messages} = require("./bot_utils")

export class ForumStatistics {
    token: string;
    forumChannelIds: string[];
    botchannelId: string;
    client: Discord.Client;
    debug: boolean = false;
    
    constructor(token: string, forumChannelIds: string[], botChannelId:string) {

        this.token = token;
        this.forumChannelIds = forumChannelIds;
        this.botchannelId = botChannelId;

        this.client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] })

        this.client.once(Discord.Events.ClientReady, readyClient => {
            // console.log(`Ready! Logged in as ${readyClient.user.tag}`);

            (async () => {
                const statistics_data = await this.create_statistics();
                // console.dir(statistics_data, { depth: null });
                const embed = this.create_embed(statistics_data);
                // console.dir(embed, { depth: null });
                if (this.debug) {
                    await this.send_embed(embed);
                }
                schedule.scheduleJob("0 18 * * 6", async () => {
                    await this.send_embed(embed);
                })
            })();
        })
    }


    count_letters(messages: Discord.Message[]) {
        return messages.reduce((acc:number, message:Discord.Message) => acc + message.content.length, 0)
    }

    async create_statistics(): Promise<Record<string, Record<string, Record<string, Record<string, number>>>>>{
        const channels = this.client.channels.cache.filter(channel => this.forumChannelIds.includes(channel.id)).map(c => c) as Discord.ForumChannel[]

        const data: Record<string, Record<string, Record<string, Record<string, number>>>> = {}

        for (const channel of channels) {
            const channelData: Record<string, Record<string, Record<string, number>>> = {}
            for (const [snowflake, thread] of channel.threads.cache) {
                const allMessages:Discord.Message[] = await get_all_messages(thread)
                const weekMessages = allMessages.filter(message => message.createdTimestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
                if (weekMessages.length === 0) {
                    continue
                }
                
                const threadData: Record < string, Record < string, number >> = {
                    counts: {
                        all: allMessages.length,
                        week: weekMessages.length
                    },
                    letters: {
                        all: this.count_letters(allMessages),
                        week: this.count_letters(weekMessages)
                    }
                }

                channelData[thread.name] = threadData
            }
            if (Object.keys(channelData).length > 0) {
                data[channel.name] = channelData
            }
        }

        return data
    }

    create_embed(data: Record<string,Record<string, Record<string, Record<string, number>>>>) {
        const embed = new Discord.EmbedBuilder()
            .setTitle("📊 Forum Statistics 📊")
            .setColor("#0000ff")

        for (const [channelName, threads] of Object.entries(data)) {
            embed.addFields([{ name: channelName, value: " ", inline: false }]);
            for (const [threadName, threadData] of Object.entries(threads)) {
                let value = ""
                value += `メッセージ数: ${threadData.counts.week}/${threadData.counts.all}\n`
                value += `文字数: ${threadData.letters.week}/${threadData.letters.all}\n`
                embed.addFields({ name: threadName, value: value, inline: true });
            }
        }
        
        return embed
    }

    async send_embed(embed:Discord.EmbedBuilder) {
        const channel = await this.client.channels.cache.get(this.botchannelId) as Discord.BaseGuildTextChannel
        if (this.debug) {
            console.dir(embed, { depth: null });
        } else {
            const content = fs.readFileSync("./ForumStatisticsMessageContent.txt").toString()
            await channel.send({content:content, embeds: [embed] })
        }
    }

    run(debug = false) {
        this.debug = debug;
        this.client.login(this.token);
    }

}

