
require("dotenv").config();
const parseCLI=require("./CLIish.js");
const { App } = require("@slack/bolt");
const axios=require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

async function askOpenAI(modelName,prompt,chatTranscript){
  const body = {
    model: modelName,
    messages: [
      {
        role: "system",
        content: `INSTRUCTIONS: ${prompt}\n\nCRITICAL FORMATTING RULES: You are outputting to Slack. Do NOT use standard markdown. Use *single asterisks* for bold text. Do not use hashtags (#) for headers.`,
      },
      {
        role: "user",
        content: `CHAT TRANSCRIPT:\n${chatTranscript}`,
      },
    ],
  };
  const url = "https://api.openai.com/v1/chat/completions";
  const config = {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  };
  const aiResponse = await axios.post(url, body, config);
  return aiResponse.data.choices[0].message.content;
}

async function askGemini(modelName, prompt, chatTranscript) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const body = {
      contents: [
        {
          parts: [
            {
              text: `INSTRUCTIONS: ${prompt}\n\nCRITICAL FORMATTING RULES: You are outputting to Slack. Do NOT use standard markdown. Use *single asterisks* for bold text. Do not use hashtags (#) for headers.\n\nCHAT TRANSCRIPT:\n${chatTranscript} :\n\n${chatTranscript}`,
            },
          ],
        },
      ],
    };
    const aiResponse = await axios.post(url, body);
    const finalSummary = aiResponse.data.candidates[0].content.parts[0].text;

    return finalSummary;
  } catch (error) {
    console.log("AI Error: ", error.response?.data || error.message);

    return "AI failed to respond: " + error.message;
  }
}

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
app.command("/haaitzzabot-help", async ({ command, ack, respond }) => {
  await ack();
  await respond({
    text: `I am Bot.
    General Commnands:

    /haaitzzabot-ping : Check my existance and latency

    Utility Commands:

    /haaitzzabot-summarize : Summarize the messages in a channel.
     Usage: 
    /haaitzzabot-summarize -time <hours> -model <model_name> -prompt <prompt_text> -channel <channel_name> -join <yes/no>
    -time :Number of hours to  look back for messages. Default is 24 hours.
    -model :The AI model to use for summarization. Default is "gemini-3.1-flash-lite".(You can use any model available in the Gemini API)
    -prompt :The prompt to guide the AI in summarizing the messages. Default is "Summarize this:"
    -channel :The name of the channel to summarize. If not provided, it will summarize the current channel.
    -join :Whether to join the channel if not already a member. Use "yes" to join, "no" to skip. Default is "no".
    Example:
    /haaitzzabot-summarize -time 5 -model gemini-pro -prompt "hey, just pick the msgs that have some tech to grasp, dump everything else" -channel general -join yes
  `,
  });
});
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
      let finalSummary="";
      if(modelName.startsWith("gpt")|| modelName.startsWith("o1")){
        finalSummary=await askOpenAI(modelName,prompt,whole);
      }else{
      finalSummary = await askGemini(modelName, prompt, whole);}
      
      await respond({text: finalSummary});      
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
