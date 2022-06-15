import { DiscordRequest } from './utils.js';

export async function AddRole(roles, guildId, userId, roleName) {
  const roleId = roles.find((role) => role.name === roleName)?.id ?? '';
  console.log('add role:' + roleId)
  
  // API endpoint to get and post guild commands
  const endpoint = `guilds/${guildId}/members/${userId}/roles/${roleId}`;
  // install command
  try {
    await DiscordRequest(endpoint, { method: 'PUT' });
  } catch (err) {
    console.error(err);
  }
}

export async function GetRoles(guildId) {
  // API endpoint to get and post guild commands
  const endpoint = `guilds/${guildId}/roles`;
  // install command
  try {
    return await DiscordRequest(endpoint, { method: 'GET' });
  } catch (err) {
    console.error(err);
  }
}
