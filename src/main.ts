"use strict"

const { ForumStatistics } = require("./ForumStatistics")

new ForumStatistics(
    process.env.TESTBOT_TOKEN!,
    [process.env.TESTGUILD_FORUMCHANNELID!],
    process.env.TESTGUILD_BOTCHANNELID!
).run()