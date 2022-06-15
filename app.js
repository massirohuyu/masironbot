import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';
import {
  CHALLENGE_COMMAND,
  TEST_COMMAND,
  UKETSUKE_COMMAND,
  HasGuildCommands,
} from './commands.js';
import {
  AddRole,
  GetRoles,
} from './role.js'
import {
  Authorize,
} from './googleAuth.js'
import {
  FetchSheet,
  FindSheetRowIndex,
  GetRoleByRowIndex,
  CheckAcceptancedTo,
} from './spreadsheet.js'

let gRoles;

(async () => {
  // discordサーバーのロールを取ってくる
  const rolesRes = await GetRoles(process.env.GUILD_ID);
  gRoles = await rolesRes.json()
  
  // google認証
  await Authorize();
  // Sheetsの情報取得
  await FetchSheet();
})()
  
// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/' + process.env.ENDPOINT_PATH, async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;
  
  console.log(req.body);

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" guild command
    if (name === '受付') {
      const acceptanced = req.body.data.options[0];
      const acceptancedNumber = acceptanced?.value;
      const discriminator = req.body.member.user.discriminator;
      const userId = req.body.member.user.id;
      
      const rowIndex = FindSheetRowIndex(acceptancedNumber, discriminator);
      const roleName = GetRoleByRowIndex(rowIndex);
      
      // TODO: すでに受付ずみの場合はじく
      
      if (rowIndex > -1) {
        await AddRole(gRoles, process.env.GUILD_ID, userId, roleName);
        await CheckAcceptancedTo(rowIndex);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: '受付けました ' + getRandomEmoji(),
          },
        });
        
        
      } else {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: '該当の受付番号が登録されていません 😢',
          },
        });
      }
      
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);

  // Check if guild commands from commands.json are installed (if not, install them)
  HasGuildCommands(process.env.APP_ID, process.env.GUILD_ID, [
    UKETSUKE_COMMAND,
  ]);
});