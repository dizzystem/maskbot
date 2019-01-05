const Discord = require('discord.js');
const bot = new Discord.Client();
const config = require('./config.json');

var gameDatabase = {};
var players = {};

function gameDatum(channel){
  this.channel = channel;
  this.judge = null;
  this.target = null;
  this.imposter = null;
  this.judge_name = null;
  this.target_name = null;
  this.imposter_name = null;
  this.rand = 0;
  this.started = false;
}

bot.on('ready', function (evt) {
  bot.user.setActivity("!help");
  console.log("Starting up in "+bot.guilds.size+" servers. Ready.");
});

bot.on('error', console.error);

bot.on('message', async message => {
  var gameData;
  
  if (message.author.bot) 
    return;
  
  if (!players)
    players = {};
  if (!gameDatabase)
    gameDatabase = {};
  
  if (players[message.author.tag] && 
      (message.channel.type == "dm" || message.channel.id == gameDatabase[players[message.author.tag]].channel.id))
    gameData = gameDatabase[players[message.author.tag]];
  else if (message.channel.type != "dm")
    gameData = gameDatabase[message.channel.id];
  
  if (message.channel.type == "dm"){
    //Send on DMs to the server channel if the DM is from a player.
    if (gameData && gameData.started && gameData.channel){
      if (message.author.tag == gameData.target.tag){
        gameData.channel.send(gameData.target_name+" "+rand+": "+message.content);
        gameData.imposter.send(gameData.target_name+" "+rand+": "+message.content);
      }
      else if (message.author.tag == gameData.imposter.tag){
        gameData.channel.send(gameData.target_name+" "+(3-rand)+": "+message.content);
        gameData.target.send(gameData.target_name+" "+(3-rand)+": "+message.content);
      }
      return;
    }
  } else {
    if (gameData && gameData.started && gameData.channel && message.author.tag == gameData.judge.tag){
      //Send on channel messages to DMs if the channel message is from the judge.
      gameData.target.send(gameData.judge_name+": "+message.content);
      gameData.imposter.send(gameData.judge_name+": "+message.content);
    } else if (message.content.indexOf(config.prefix) != 0){
      //Ignore server messages that don't start with the prefix.
      return;
    }
  } 
  
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  //Listen in server for these commands.
  if (command == "help"){
      message.channel.send("Commands:\n\
!imposter/!target/!judge - join the game as that role\n\
!quit/!exit - quit the game, ending the game early if it's started\n\
!fake <name>/!real <name> - guess that <name> is fake or real\n\
!start - start the game!");
  } else if (command == "judge" || command == "target" || command == "imposter"){
    if (message.channel.type == "dm")
      return;
    if (!gameData || gameData.channel.id != message.channel.id){
      gameDatabase[message.channel.id] = new gameDatum(message.channel);
      gameData = gameDatabase[message.channel.id];
    }
    if (gameData.started){
      message.channel.send("The game is already in progress!");
      return;
    }
    if (gameData[command]){
      message.channel.send(gameData[command]+" is already the "+command+"!");
      return;
    } else if (gameData.judge && gameData.judge.tag == message.author.tag){
      message.channel.send("You are already the judge, "+message.author+"!");
      return;
    } else if (gameData.target && gameData.target.tag == message.author.tag){
      message.channel.send("You are already the target, "+message.author+"!");
      return;
    } else if (gameData.imposter && gameData.imposter.tag == message.author.tag){
      message.channel.send("You are already the imposter, "+message.author+"!");
      return;
    } else {
      if (players[message.author.tag] && players[message.author.tag] != gameData.channel.id){
        //They're already in the game on another server.  Wipe their old data.
        if (gameDatabase[players[message.author.tag]].judge == message.author.id){
          gameDatabase[players[message.author.tag]].judge = null;
          gameDatabase[players[message.author.tag]].started = false;
        }
        if (gameDatabase[players[message.author.tag]].target == message.author.id){
          gameDatabase[players[message.author.tag]].target = null;
          gameDatabase[players[message.author.tag]].started = false;
        }
        if (gameDatabase[players[message.author.tag]].imposter == message.author.id){
          gameDatabase[players[message.author.tag]].imposter = null;
          gameDatabase[players[message.author.tag]].started = false;
        }
      }
      players[message.author.tag] = gameData.channel.id;
      
      var start = "";
      gameData[command] = message.author;
      if (gameData.judge && gameData.target && gameData.imposter)
        start = "\nThe game is now ready to start. One of the players may do `!start` when ready!";
      message.channel.send(message.author+" joined the game as the "+command+"!"+start);
      if (command == "target")
        gameData.target_name = message.member.displayName;
      if (command == "judge")
        gameData.judge_name = message.member.displayName;
      if (command == "imposter")
        gameData.imposter_name = message.member.displayName;
      
    }
  } else if (command == "start"){
    if (message.channel.type == "dm")
      return;
    if (!gameData || (!gameData.judge && !gameData.target && !gameData.imposter)){
      message.channel.send("No players have joined the game yet.");
      return;
    }
    if (gameData.started){
      message.channel.send("The game is already in progress!");
      return;
    }
    if (!gameData.judge || !gameData.target || !gameData.imposter){
      var txt = "";
      for (var type of ["judge", "target", "imposter"]){
        var player = gameData[type];
        if (!player)
          txt += "nobody";
        else
          txt += player;
        txt += " as the "+type+", ";
      }
      txt = txt.slice(0, -2);
      message.channel.send("There aren't enough players to start the game.  Current players are: "+txt+".");
      return;
    }
    gameData.started = true;
    rand = Math.ceil(Math.random()*2);
    message.channel.send("The game is starting! Players, see your DMs.");
    //gameData.judge.send("");
    gameData.target.send("The game is starting! Messages you send to me here will be anonymized into the channel.");
    gameData.imposter.send("The game is starting! Messages you send to me here will be anonymized into the channel.");
    gameData.channel = message.channel;
  } else if (command == "real" || command == "fake"){
    if (message.author.tag != gameData.judge.tag){
      message.channel.send("You're not the judge, "+message.author+"!");
      return;
    }
    if (!gameData.started){
      message.channel.send("The game hasn't started yet!");
      return;
    }
    var choice;
    if (command == "real")
      choice = args[0];
    else
      choice = 3-args[0];
    if (choice == rand){
      message.channel.send("Correct! "+gameData.target_name+" "+rand+" was the real "+gameData.target+".");
    } else {
      message.channel.send("Wrong! "+gameData.target_name+" "+rand+" was the real "+gameData.target+".");
    }
    gameData.target.send("Game with "+gameData.target_name+" ("+gameData.target_name+" "+rand+") as target, \
"+gameData.imposter_name+" as imposter ("+gameData.target_name+" "+(3-rand)+"), and "+gameData.judge_name+" as judge, has ended.");
    gameData.imposter.send("Game with "+gameData.target_name+" ("+gameData.target_name+" "+rand+") as target, \
"+gameData.imposter_name+" as imposter ("+gameData.target_name+" "+(3-rand)+"), and "+gameData.judge_name+" as judge, has ended.");
    gameData.judge = null;
    gameData.target = null;
    gameData.imposter = null;
    gameData.started = false;
  } else if (command == "quit" || command == "exit"){
    if ((!gameData.judge || message.author.tag != gameData.judge.tag) && 
        (!gameData.target || message.author.tag != gameData.target.tag) && 
        (!gameData.imposter || message.author.tag != gameData.imposter.tag))
      message.channel.send("You're not playing, "+message.author+"!");
    else {
      gameData.judge = null;
      gameData.target = null;
      gameData.imposter = null;
      gameData.started = false;
      message.channel.send("The game has been reset.");
    }
  } else if (command == "data"){
    console.log(gameDatabase);
    console.log(players);
  } else
    return;
});

bot.login(config.token);