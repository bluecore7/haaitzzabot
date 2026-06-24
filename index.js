
require("dotenv").config();
const parseCLI=require("./CLIish.js");
const { App } = require("@slack/bolt");
const axios=require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

app.command("/haaitzzabot-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

app.command("/haaitzzabot-summarize", async({command,ack,respond,client})=>{
    await ack();
    const currentTime=Math.floor(Date.now()/1000);
    let parsed=parseCLI(command.text,["time","model","prompt"]);
    if(parsed.errors.length!=0){
      respond({text: "Oops! I don't recognize thse flags"+` -${parsed.errors.join(",-")}`})
    }else{
    let hour=parseInt(parsed.commands.time)||24; // default to 1day 
    let channel=command.channel_id;
    let init_hour=currentTime-(hour*3600);
    let prompt=parsed.commands.prompt|| "Sumarize this:"
    await respond({text: `Fetching messages from the last ${hour} hours`})
    try {
      const result = await client.conversations.history({
        channel: channel,
        oldest: init_hour.toString(),
      });
      //console.log(result.messages);
      const textArray=result.messages.map(msg=> msg.text);
      //console.log(textArray);
      const whole=textArray.join("\n");
      await respond({text: "Reading the chat and grinding ..."});
      try {
        const url =`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const body={
          "contents":[{"parts" : [ { text :`${prompt}+":"+"\n\n"+${whole}`}]
          }]
        } 
        const aiResponse=await axios.post(url,body);
        const finalSummary=aiResponse.data.candidates[0].content.parts[0].text;
        await respond({text:finalSummary});
        } catch (error) {
          console.log("AI Error: ",error.resp)
          await respond({text: "API error"})
        
      }
      
    } catch (error) {
      console.error("Error fetching messages:", error.response?.data || error.message);
    }}
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();
