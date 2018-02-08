let Discord = require('discord.io');
let logger = require('winston');
let fs = require('fs');
let auth = require('./auth.json');
let request = require('request');
let _ = require('lodash');
let aliases = JSON.parse(fs.readFileSync('./data/aliases.txt', 'utf8'));

function getKeyByValue(object, value)
{
  return _.findKey(object, function(v){return v == value});
}
function isValueInDict(object, value)
{
    for (const k in object) {
    if (object[k] == value) {
        return true;
    }
}
}

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console,
{
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
let bot = new Discord.Client(
{
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt)
{
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.setPresence({ status: 'online', game: { name: 'use !elobot' } });
bot.on('message', function (user, userID, channelID, message, evt)
{
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 7) == '!elobot')
    {
        let args = message.substring(8).split(' ');
        let cmd = args[0];
        if (!cmd.trim().length) {cmd = 'help'};
        switch(cmd)
        {
            // !elobot ping
            case 'ping':
                bot.sendMessage(
                {
                    to: channelID,
                    message:  '<@!' + userID + '> pong!'
                });
                break;
            case 'alias':
                if (args.length < 3)
                {
                    bot.sendMessage(
                    {
                        to: channelID,
                        message: '<@!' + userID + '> I didn\'t understand that! Add one word aliases by typing in `!elobot alias [nickname] [username]`.'
                    });
                }
                else
                {
                    let uname = "";
                    for (var i = 2; i < args.length; i++)
                    {
                        uname += args[i] + " "
                    }
                    let nickname = args[1];
                    if (!(nickname in aliases)) // If nobody has this nickname
                    {
                        if (isValueInDict(aliases, uname)) // If the user already has a nickname, overwrite
                        {
                            if (nickname !== getKeyByValue(aliases, uname))
                            {
                                Object.defineProperty(aliases, nickname,
                                    Object.getOwnPropertyDescriptor(aliases, getKeyByValue(aliases, uname)));
                                delete aliases[getKeyByValue(aliases, uname)];
                            }
                                fs.writeFile('./data/aliases.txt', JSON.stringify(aliases), function (err)
                                {
                                    if (err) throw err
                                    logger.info('Aliases has been updated.');
                                });

                                bot.sendMessage(
                                {
                                    to: channelID,
                                    message: '<@!' + userID + '> Alias for `' + aliases[nickname] + '` successfully updated to `' + nickname + '`.'
                                });
                        }
                        else // Just add it in normally
                        {
                            aliases[nickname] = uname;
                            fs.writeFile('./data/aliases.txt', JSON.stringify(aliases), function (err)
                            {
                                if (err) throw err
                                logger.info('Aliases has been updated.');
                            });

                            bot.sendMessage(
                            {
                                to: channelID,
                                message: '<@!' + userID + '> Alias successfully added! You can now use `' + nickname + '` whenever you want to use `' + aliases[nickname] + '` in a command.'
                            });
                        }
                    }
                    else // Error!
                    {
                        bot.sendMessage(
                        {
                            to: channelID,
                            message: '<@!' + userID + '> That nickname is already taken by `' + aliases[nickname] + '`! If you want to use `' + nickname + '`, you must first change the alias of `' + aliases[nickname] + '` to something else.'
                        });
                    }

                }
                break;
            case 'list':
                let aliasList = 'Here\'s a list of the current aliases I know:\n';
                for (nickname in aliases)
                {
                    aliasList += '`' + nickname + '` is a nickname for `' + aliases[nickname] + '`\n'
                }
                bot.sendMessage(
                {
                    to: channelID,
                    message: aliasList
                });
                break;
            case 'rank':
                var summoner = '';
                var whomst = '';
                if (args[1] in aliases)
                {
                    summoner = aliases[args[1]]
                    whomst = args[1];
                }else {
                    for (var i = 1; i < args.length; i++)
                    {
                        summoner += args[i] + ' ';
                    }
                    whomst = summoner;
                }
                var rankInfo;
                request.get({url:'http://na.op.gg/summoner/userName=' + encodeURIComponent(summoner)}, function (err, res, body)
                {
                    if (err) { return logger.error(err); }
                    var heads = body.substring(0, 1000).split('\n');
                    rankInfo = (heads[17].split('/'))[1];
                    if ( !rankInfo.trim().length )
                    {
                        rankInfo = 'Unranked';
                    }
                    bot.sendMessage(
                    {
                        to: channelID,
                        message: 'BEEP BOOP ' + whomst.toUpperCase() + ' ELO: '+ rankInfo +' BEEP BOOP'
                    });
                });

                break;
            case 'help':
                let helpMessage = 'Here\'s what I can do!\n'
                helpMessage += '- Use `!elobot alias [nickname] [username]` to alias usernames with easier to remember nicknames.\n'
                helpMessage += '- Use `!elobot list` to view all of the current aliases saved.\n'
                helpMessage += '- Use `!elobot rank [name]` to get the Solo/Duo rank and LP for a person. You may use that person\'s actual username or their alias.\n'
                helpMessage += '- Use `!elobot ping` to play some ping pong with me!\n'
                helpMessage += '- Finally, use `!elobot help` to bring this message up again.\n'
                helpMessage += '- If you want anything else, ask <@!118538456522555394> to do it.'
                bot.sendMessage(
                {
                    to: channelID,
                    message: helpMessage
                });
                break;
         }
     }
});
