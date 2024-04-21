
// channel: Discord.Channel

import Discord from 'discord.js'

// return: [Discord.Message] (order : new -> old)
export async function get_all_messages(channel: Discord.ThreadChannel): Promise<Discord.Message[]>{
    console.log("loading all messages in "+channel.name)
    var messages: Discord.Message[] = []
    let lastMessageId = undefined
    // +1 represents the first message when the thread was created
    for (let i = 0; i < channel.messages.cache.size + 1; i += 10) {
        messages.push(...((await channel.messages.fetch({limit: 10,before:lastMessageId})).map(m => m)))
        lastMessageId = messages[messages.length - 1].id
    }
    return messages
}
