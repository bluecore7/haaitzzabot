
require("dotenv").config();
const parseCLI=require("./CLIish.js");
const { App } = require("@slack/bolt");
const axios=require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

function errorHandler(func){
  return async ({command,ack,respond,client})=>{
    try{
      await func({command,ack,respond,client});

    }
    catch(error){
      console.error(error);
      await respond ({text: `${error.response?.code || "Oops! Something is off"}`})
    }
  }
}
app.command("/haaitzzabot-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

app.command("/haaitzzabot-summarize", errorHandler(async({command,ack,respond,client})=>{
    await ack();
    const currentTime=Math.floor(Date.now()/1000);
    let parsed=parseCLI(command.text,["time","model","prompt","channel","join"]);
    if(parsed.errors.length!=0){
      respond({text: "Oops! I don't recognize thse flags"+` -${parsed.errors.join(",-")}`})
    }else{
    let hour=parseInt(parsed.commands.time)||24; // default to 1day 
    let init_hour=currentTime-(hour*3600);
    let prompt=parsed.commands.prompt|| "Sumarize this:"
    let targetChannel=parsed.commands.channel?.trim();
    let channel=command.channel_id;
    if(targetChannel){
      await respond({text :`Looking up the ID for #${targetChannel}...`});
      const channelList = await client.conversations.list({limit:2000});
      const foundChannelID=channelList.channels.find((c)=>c.name==targetChannel);
      if(foundChannelID){
        channel=foundChannelID.id;
      }
      else{
        console.log(channelList);
        await respond({text: `Oops! I counldn't find ${targetChannel}`});
        return;
      }
    }
    let modelName=parsed.commands.model || "gemini-3.1-flash-lite";
    await respond({text: `Fetching messages from the last ${hour} hours`})
    if(parsed.commands.join==="yes"){
      await respond({text: "Let me enter the channel ..."});
      await client.conversations.join({channel:channel});
    }
    try {
      const result = await client.conversations.history({
        channel: channel,
        oldest: init_hour.toString(),
      });
      //console.log(result.messages);
      const textArray=result.messages.map(msg=> msg.text);
      //console.log(textArray);
      const whole=textArray.join("\n");
      if(whole.trim()===""){
        await respond({text:`There are no messages in this channel for ${hour} hours`})
        return;
      }
      await respond({text: "Reading the chat and grinding ..."});
      try {
        const url =`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const body = {
          contents: [
            {
              parts: [
                {
                  text: `INSTRUCTIONS: ${prompt}\n\nCRITICAL FORMATTING RULES: You are outputting to Slack. Do NOT use standard markdown. Use *single asterisks* for bold text. Do not use hashtags (#) for headers.\n\nCHAT TRANSCRIPT:\n${whole} :\n\n${whole}`,
                },
              ],
            },
          ],
        }; 
        const aiResponse=await axios.post(url,body);
        const finalSummary=aiResponse.data.candidates[0].content.parts[0].text;
        await respond({text:finalSummary});
        } catch (error) {
          console.log("AI Error: ",error.response?.data || error.message);
          await respond({text: 'AI failed to  repond : ${error.message}'});
          return;
        
      }
      
    } catch (error) {
      if(error.data?.error==="not_in_channel"){
        await respond({text:`Oops! I can't access ${targetChannel} .Run your command again with "-join yes" `});
        return;
      }
      console.log(error)
      await respond({ text: "Error fetching messages" });
      return;

    }}
}));

(async () => {
  await app.start();
  console.log("bot is running!");
})();
