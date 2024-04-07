

const Discord = require("discord.js")

const { get_all_messages } = require("./bot_utils.js")

class ForumStatistics {

    constructor(token, channelIds, botchannelId) {

        this.token = token;
        this.channelIds = channelIds;
        this.botchannelId = botchannelId;

        this.client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] })

        this.client.once(Discord.Events.ClientReady, readyClient => {

            (async () => {
                const statistics_data = await this.create_statistics();
                // console.dir(statistics_data, { depth: null });
                const embed = this.create_embed(statistics_data);
                // console.dir(embed, { depth: null });
                await this.send_embed(embed);
            })();

            console.log(`Ready! Logged in as ${readyClient.user.tag}`);
        })
    }


    count_letters(messages) {
        return messages.reduce((acc, message) => acc + message.content.length, 0)
    }

    async create_statistics() {
        const channels = this.client.channels.cache.filter(channel => this.channelIds.includes(channel.id));

        const data = {}

        for (const [channelId, channel] of channels) {
            const channelData = {}
            for (const [snowflake, thread] of channel.threads.cache) {
                const allMessages = await get_all_messages(thread)
                const weekMessages = allMessages.filter(message => message.createdTimestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)

                const threadData = {
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
            data[channel.name] = channelData
        }

        return data
    }

    create_embed(data) {
        const embed = new Discord.EmbedBuilder()
            .setTitle("📊Forum Statistics📊")
            .setColor("#0000ff")

        for (const [channelName, threads] of Object.entries(data)) {
            embed.addFields([{ name: channelName, value: " ", inline: false }]);
            for (const [threadName, threadData] of Object.entries(threads)) {
                let value = ""
                value += `Message Count: ${threadData.counts.week}/${threadData.counts.all}\n`
                value += `Letter Count: ${threadData.letters.week}/${threadData.letters.all}\n`
                embed.addFields({ name: threadName, value: value, inline: true });
            }
        }
        
        return embed
    }

    async send_embed(embed) {
        const channel = await this.client.channels.cache.get(this.botchannelId)
        await channel.send({ embeds: [embed] })
    }

    run() {
        this.client.login(this.token);
    }

}

module.exports = { ForumStatistics }
