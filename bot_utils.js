
// channel: Discord.Channel
// return: [Discord.Message] (order : new -> old)
async function get_all_messages(channel) {
    const messages = []
    let lastMessageId = null
    // +1 はスレッド作成時のメッセージ分
    for (let i = 0; i < channel.messageCount + 1; i += 10) {
        messages.push(...(await channel.messages.fetch({ limit: 10, before: lastMessageId })))
        lastMessageId = messages[messages.length - 1][0]
    }
    return messages.map(m => m[1])
}

module.exports = {
    get_all_messages
}