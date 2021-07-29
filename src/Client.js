const Discordrequire

module.exports = class Client {
    constructor(client, prefixes, debugGuild = undefined) {
        this.client = client
        this.prefixes = prefixes
        this.debugGuild = debugGuild
        this.registeredCommands = []
        this.commandApplied = false

        this.client.commands = new Discord.Collection()
        this.client.aliases = new Discord.Collection()
    }

    /**
     *  @param {command} DiscordUtils.Command
    */
    async registerCommand(command) {
        this.client.commands.set(command.name, command)
        if (command.aliases && command.aliases[0]) command.aliases.forEach(alias => this.client.aliases.set(alias, command))

        this.client.on("message", async msg => {
            if (msg.author.bot) return
            for (const prefix of this.prefixes) {
                if (!msg.content.startsWith(prefix.toLowerCase())) continue
                const args = msg.content.toLowerCase().replace(prefix.toLowerCase(), "").split(/ +/)
                if (this.debugMode && !args[0].endsWith("-debug")) return
                const cmd = args.shift().replace(/-debug$/, "")
                const argsObject = argsToObject(args, command.args)
                if (command.name && cmd.toLowerCase() !== command.name.toLowerCase()) return
                return await command.run({ ...msg, slashCommand: false }, argsObject, this.client)
            }
        })
        this.client.ws.on('INTERACTION_CREATE', async interaction => {
            if (interaction.type === 2) {
                if (this.debugGuild && !interaction.data.name.endsWith("-debug")) return
                this.debug(interaction)
                const cmd = this.debugGuild ? interaction.data.name.replace(/-debug$/, "").toLowerCase() : interaction.data.name.toLowerCase();
                const args = {}
                if (interaction.data.options) interaction.data.options.forEach(arg => args[arg.name] = arg.value);
                const channel = this.client.channels.cache.find(c => c.id === interaction.channel_id)
                if (!channel) return
                var command = this.client.commands.get(cmd)
                if (!command) command = this.client.commands.get(this.client.aliases.get(cmd))
                if (!command) return
                const callback = await command.run({ ...interaction, channel: channel }, args, this.client)
                if (callback == null) {
                    await this.client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: "\u200b"
                            }
                        }
                    })
                    return
                }
                var data = {
                    content: callback
                }
                if (typeof callback === "object") {
                    data = await createAPIMessage(interaction, callback)
                }
                await this.client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: data
                    }
                })
            }

        })
        if (command.options) this.registeredCommands.push(command)

    }
    async applyCommands() {
        if (this.commandApplied) return console.warn("[Discord Utils] Commands have already applied!")
        this.commandApplied = true
        if (this.client.readyTimestamp && this.client.readyTimestamp <= Date.now()) {
            registerSlashCommands(this.client, this.registeredCommands, this.debugGuild ? this.debugGuild : undefined)
        } else {
            this.client.on("ready", () => {
                registerSlashCommands(this.client, this.registeredCommands, this.debugGuild ? this.debugGuild : undefined)
            })
        }
    }
    debug(...args) {
        if (this.debugGuild) console.log(...args)
    }
}

async function registerSlashCommands(client, commands, debugGuild = undefined) {
    const legacy = await getApplications(client, debugGuild).commands.get()
    if (legacy[0]) {
        console.log("legacy", legacy)
        const deletes = legacy.filter(c => !commands.map(cmd => cmd.name).includes(c.name))
        for (const deleteCommand of deletes) {
            getApplications(client, debugGuild).commands(deleteCommand.id).delete()

        }
        const availables = legacy.filter(c => commands.map(cmd => cmd.name).includes(c.name))
        const updates = availables.filter(c => !objectEquals(c.options, commands.find(cmd => cmd.name === c.name).options))
        for (const updateCommand of updates) {
            await getApplications(client, debugGuild).commands(updateCommand.id).delete()
            getApplications(client, debugGuild).commands.post({
                data: {
                    name: updateCommand.name,
                    description: updateCommand.description ? updateCommand.description : "No Description",
                    options: [...(updateCommand.options)]
                }
            })
        }
        console.log("updates", updates)
        const news = commands.filter(cmd => !legacy.map(c => c.name).includes(cmd.name))
        for (const newCommand of news) {
            getApplications(client, debugGuild).commands.post({
                data: {
                    name: newCommand.name,
                    description: newCommand.description ? newCommand.description : "No Description",
                    options: [...(newCommand.options)]
                }
            })
        }

    } else if (commands[0]) {
        for (const cmd of commands) {
            getApplications(client, debugGuild).commands.post({
                data: {
                    name: cmd.name,
                    description: cmd.description ? cmd.description : "No Description",
                    options: [...(cmd.options)]
                }
            })
        }
    }

}

function getApplications(client, debugGuild) {
    return debugGuild ? client.api.applications(client.user.id).guilds(debugGuild) : client.api.applications(client.user.id)
}

function argsToObject(args, msgArgsOption) {
    const argObj = {}
    if (args.length <= msgArgsOption.length) {
        args.forEach((arg, i, array) => argObj[msgArgsOption[i]] = arg)
        return argObj
    } else if (args.length > msgArgsOption.length) {
        for (var i = 0; i < msgArgsOption.length; i++) {
            if (i === msgArgsOption.length - 1) {
                argObj[msgArgsOption[i]] = args.join(" ")
                break
            }
            argObj[msgArgsOption[i]] = args.shift()
        }
        return argObj
    }
    return argObj
}

async function createAPIMessage(interaction, content) {
    const { data, files } = await Discord.APIMessage.create(
        client.channels.resolve(interaction.channel_id),
        content
    ).resolveData().resolveFiles()

    return { ...data, ...files }
}

function objectEquals(obj1, obj2) {
    function objectSort(obj) {

        // ソートする
        const sorted = Object.entries(obj).sort();

        // valueを調べ、objectならsorted entriesに変換する
        for (let i in sorted) {
            const val = sorted[i][1];
            if (typeof val === "object") {
                sorted[i][1] = objectSort(val);
            }
        }

        return sorted;
    }

    const json1 = JSON.stringify(objectSort(obj1));
    const json2 = JSON.stringify(objectSort(obj2));

    return json1 === json2
}

