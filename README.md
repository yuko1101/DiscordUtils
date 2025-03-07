# discord-utils
JavaScript module for a discord bot (Supported discord.js v13)

## This module includes
 - Advanced Command Handler (Supporting Slash Commands)
 - Config File Manager (JSON)
 - Reaction Handler
 - Message Pages (Supporting Interaction such as Slash Command)

## Setup (index.js)
Run `npm install yuko1101/discord-utils` in terminal

``` js
const { Client, Intents } = require("discord.js");
const client = new Client({
    partials: ["CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION", "USER"],
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]
});

const utils = require("discord-utils");
const utilsClient = new utils.Client(client, ["!", "?"]); // (bot_client, prefixes, guildId?, debugMode?)

utilsClient.registerCommandsFromDir("commands") //load commands in "commands" folder

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  utilsClient.applyCommands(); // apply the commands which you registered
});

client.login("token"); // Your bot token goes here
```
## Adding Commands (commands/reply_command.js)
Creating a command file for both a Message Command and a Slash Command

``` js
const { Reaction } = require("discord-utils");
const { Message, Client } = require("discord.js");

module.exports = {
    name: "reply", //command name
    args: ["reply_text"], //arg names
    description: "replies to you!",
    options: [ //options for slash commands
        {
            name: "reply_text", //this should be arg names
            description: "reply text that you want to be replied", 
            type: 3 //string
        }
    ],
    /**
     * @param {Message} msg 
     * @param {*} args
     * @param {Client} client 
     */
    run: async (msg, args, client) => {
        return { content: "replying..." }; //send message to the channel
    },
    /**
     * @param {Message} msg 
     * @param {*} args
     * @param {Client} client 
     */
    runAfter: async (msg, sent, args, client) => {
        setTimeout(async () => {
            await sent.edit({ content: args["reply_text"] }); //edit to reply_text
            
            //Optional: ReactionHandler
            new Reaction(sent, "REPLY_MESSAGE").register(); //register sent message as a reactionable message, message type = "REPLY_MESSAGE"
            sent.react("✅");
            
        }, 2000); //edit the message (that you sent in run function) in 2sec
    }
}
```

## Using ReactionHandler (index.js) [Optional]
Reaction Handler is useful when you want to create
a typical reactionable message

```js
//...

//triggers on someone added a reaction from a message
utilsClient.on("reactionAdd", async (message_type, reaction, user) => {
  //message sent in reply_commands
  if (message_type === "REPLY_MESSAGE") {
    reaction.message.edit({ content: "reacted!" });
  }
});

//triggers on someone removed a reaction from a message
utilsClient.on("reactionRemove", async (message_type, reaction, user) => {
  //message sent in reply_commands
  if (message_type === "REPLY_MESSAGE") {
    reaction.message.edit({ content: "unreacted!" });
  }
});

//...
```


## Thanks for
  - [discord.js](https://github.com/discordjs/discord.js)
