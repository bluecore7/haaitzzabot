const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = 3000;

app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          code: code,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
        },
      },
    );

    const botToken = response.data.access_token;
    if (botToken) {
      console.log("New workspace installed! Bot Token:", botToken);

      res.send("haaitzzabot installed! You can close this tab.");
    } else {
      console.log("Slack response:", JSON.stringify(response.data));
      res.send("Token Error");
    }
  } catch (error) {
    res.send("OAuth failed: something went wrong");
  } 
});

app.listen(port, () => {
  console.log(`OAuth server running on port ${port}`);
});
