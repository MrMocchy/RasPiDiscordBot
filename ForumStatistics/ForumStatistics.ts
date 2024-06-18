
import { debug } from "console"
import Discord from "discord.js"
import fs from "fs"

const schedule = require("node-schedule")

async function get_all_messages(channel: Discord.ThreadChannel): Promise<Discord.Message[]> {
    console.log("loading all messages in " + channel.name)
    var messages: Discord.Message[] = []
    let lastMessageId = undefined
    // +1 represents the first message when the thread was created
    for (let i = 0; i < channel.messages.cache.size + 1; i += 10) {
        messages.push(...((await channel.messages.fetch({ limit: 10, before: lastMessageId })).map(m => m)))
        lastMessageId = messages[messages.length - 1].id
    }
    return messages
}

class ForumStatistics {
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

            schedule.scheduleJob("55 17 * * 6", async () => {
                console.log(new Date())
                console.log("Scheduled time has come!")
                const statistics_data = await this.create_statistics();
                const embed = this.create_embed(statistics_data);
                
                const date_now = new Date();
                const date_send = new Date(date_now.getFullYear(), date_now.getMonth(), date_now.getDate(), 18, 0, 1, 0);
                const wait_time = (date_send.getTime() - date_now.getTime()) / 1000;
                console.log(date_now)
                console.log(`Waiting ${wait_time} seconds for the scheduled time...`)
                await new Promise(resolve => setTimeout(resolve, wait_time * 1000));
                
                console.log(new Date())
                await this.send_embed(embed);
                console.log("Sent the statistics!")
            })
        })
        
        this.client.on(Discord.Events.InteractionCreate, async interaction => {
            // console.log(interaction)
            if (interaction.isButton() && interaction.customId == "ForumStatisticsMessageEditButton") {
                this.on_message_edit_button(interaction)
            }
            if (interaction.isModalSubmit() && interaction.customId == "ForumStatisticsMessageEditModal") {
                this.on_message_edit_modal_submit(interaction)
            }
        })
        
        // Send Message Edit Button
        setTimeout(async () => {
            await this.send_edit_button()
            console.log("Sent the edit button!")
        }, 5000)
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
        const content = fs.readFileSync("./ForumStatistics/MessageContent.txt").toString()
        const message = {content:content, embeds: [embed] }
        if (this.debug) {
            console.dir(message, { depth: null });
        } else {
            await channel.send(message)
        }
    }
    
    async send_edit_button() {
        const channel = await this.client.channels.cache.get(this.botchannelId) as Discord.BaseGuildTextChannel
        const button = new Discord.ButtonBuilder()
            .setLabel("メッセージを編集")
            .setEmoji("📝")
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId("ForumStatisticsMessageEditButton")
        await channel.send({
            content: "ForumStatistics でなにを言うか、毎週悩んでるんだ。\nいつも定型文ってのも味気ないしね。\n次回になんて言うか、だれか教えて！",
            components: [new Discord.ActionRowBuilder().addComponents(button) as any]
        })
    }
    
    async on_message_edit_button(interaction: Discord.Interaction<Discord.CacheType>) {
        if (interaction.isButton()) {
            // console.log("Edit Button Clicked!")
            const currentMessage = fs.readFileSync("./ForumStatistics/MessageContent.txt").toString()
            const text = new Discord.TextInputBuilder()
                .setLabel("公序良俗に反することを E-chan に言わせないでください。")
                .setCustomId("ForumStatisticsMessageEditText")
                .setPlaceholder("Edit the message")
                .setStyle(Discord.TextInputStyle.Paragraph)
                .setValue(currentMessage)
                .setRequired(true)
            // console.log("text created")
            const row = new Discord.ActionRowBuilder()
                .addComponents(text)
            // console.log("row created")
            const modal = new Discord.ModalBuilder()
                .setTitle("次回のメッセージを教えて！")
                .setCustomId("ForumStatisticsMessageEditModal")
                .setComponents(row as any)
            // console.log("modal created")
            await interaction.showModal(modal)
            
            console.log("\x1b[34m" + interaction.user.displayName +"\x1b[0m Showed Message Edit Modal!")
        }
    }
    
    async on_message_edit_modal_submit(interaction: Discord.Interaction<Discord.CacheType>) {
        if (interaction.isModalSubmit()) {
            console.log("\x1b[34m" + interaction.user.displayName + "\x1b[0m Submitted Message Edit Modal!")
            const content = interaction.components[0].components[0].value
            console.log("\x1b[34m" +interaction.user.displayName + "\x1b[0m Changed the message to:")
            console.log("\x1b[32m"+content+"\x1b[0m")
            fs.writeFileSync("./ForumStatistics/MessageContent.txt", content)
            await interaction.reply("ありがとう！次回はそう言うね！")
        }
    }
    
    run(debug = false) {
        this.debug = debug;
        this.client.login(this.token);
    }

}


new ForumStatistics(
    process.env.TESTBOT_TOKEN!,
    [process.env.TESTGUILD_FORUMCHANNELID!],
    process.env.TESTGUILD_BOTCHANNELID!
).run(true)

// new ForumStatistics(
//     process.env.OUCC_ECHAN_TOKEN!,
//     [
//         process.env.OUCC_PROJECT_FORUMCHANNELID!,
//         process.env.OUCC_SHARE_FORUMCHANNELID!,
//         process.env.OUCC_OFFTOPIC_FORUMCHANNELID!,
//     ],
//     process.env.OUCC_BOTCHANNELID!
// ).run()

console.log("ForumStatistics is Active!")

