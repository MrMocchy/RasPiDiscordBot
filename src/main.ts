"use strict"

const schedule = require("node-schedule")

const { ForumStatistics } = require("./ForumStatistics")

// new ForumStatistics(
//     process.env.TESTBOT_TOKEN!,
//     [process.env.TESTGUILD_FORUMCHANNELID!],
//     process.env.TESTGUILD_BOTCHANNELID!
// ).run(true)


schedule.scheduleJob("55 17 * * 6", async () => {
    new ForumStatistics(
        process.env.OUCC_ECHAN_TOKEN!,
        [
            process.env.OUCC_PROJECT_FORUMCHANNELID!,
            process.env.OUCC_SHARE_FORUMCHANNELID!,
            process.env.OUCC_OFFTOPIC_FORUMCHANNELID!,
        ],
        process.env.OUCC_BOTCHANNELID!
    ).run()
})
