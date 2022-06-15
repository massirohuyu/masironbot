import {google} from 'googleapis';
import _ from 'lodash';

const sheets = google.sheets('v4');

const SHEET_ID = 0; // スプレットシートの対象のシートのID（スプレッドシートのURLの一番左のgid=?の番号）
const SHEET_ACCEPTANCED_NUMBER_COL = 0; // JaSST参加登録番号（Hk1-xxxxx）の列の位置
const SHEET_DISCORD_TAG_COL = 1; // DiscordID(ユーザー名#xxxx)の列の位置
const SHEET_ROLE_COL = 2; // Discordのロールの列の位置
const SHEET_ACCEPTANCED_CHECK_COL = 3; // 受付記録の列の位置
const SHEET_ACCEPTED_DATETIME_COL = 4; // 受付日時の列の位置
const SHEET_ACCEPTANCED_CHECK_VALUE = "true"; // 受付時、受付記録の列に挿入する文字列

let gSheetKeys = [];
let gSheet = [];

export async function FetchSheet() {
  const sheetsRes = await sheets.spreadsheets.values.batchGetByDataFilter({
    spreadsheetId: process.env.SPREADSHEET_ID,
    requestBody: {
      dataFilters: [{
        gridRange: {
          sheet_id: SHEET_ID,
          start_column_index: SHEET_ROLE_COL,
          end_column_index: SHEET_ROLE_COL+1,
        }
      },{
        gridRange: {
          sheet_id: SHEET_ID,
          start_column_index: SHEET_ACCEPTANCED_NUMBER_COL,
          end_column_index: SHEET_ACCEPTANCED_NUMBER_COL+1,
        }
      },{
        gridRange: {
          sheet_id: SHEET_ID,
          start_column_index: SHEET_DISCORD_TAG_COL,
          end_column_index: SHEET_DISCORD_TAG_COL+1,
        }
      }],
      majorDimension: 'COLUMNS'
    }
  });
  
  //整形
  const valueRanges = sheetsRes.data.valueRanges;
  gSheet = []; //初期化
  gSheetKeys = valueRanges.map((it) => {
    const values = it.valueRange.values[0];
    const key = values.shift();
    values.forEach((val, i) => {
      const data = gSheet[i] || {};
      data[key] = val;
      gSheet[i] = data;
    })
    return key
  });
  
  return gSheet;
}

export function FindSheetRowIndex(acceptancedNumber, discordTag) {
  return _.findIndex(gSheet, {
    ['number']: acceptancedNumber,
    ['discord tag']: discordTag,
  });
}

export function GetRoleByRowIndex(rowIndex) {
  const data = gSheet[rowIndex];
  
  return data && data['role'];
}

export async function CheckAcceptancedTo(rowIndex) {
  rowIndex ++; // 見出し行の１行分足す
  
  const sheetsRes = await sheets.spreadsheets.values.batchUpdateByDataFilter({
    spreadsheetId: process.env.SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [{
        dataFilter: {
          gridRange: {
            sheet_id: SHEET_ID,
            start_column_index: SHEET_ACCEPTANCED_CHECK_COL,
            end_column_index: SHEET_ACCEPTANCED_CHECK_COL+1,
            start_row_index: rowIndex,
            end_row_index: rowIndex+1,
          }
        },
        values: [[SHEET_ACCEPTANCED_CHECK_VALUE]]
      },{
        dataFilter: {
          gridRange: {
            sheet_id: SHEET_ID,
            start_column_index: SHEET_ACCEPTED_DATETIME_COL,
            end_column_index: SHEET_ACCEPTED_DATETIME_COL+1,
            start_row_index: rowIndex,
            end_row_index: rowIndex+1,
          }
        },
        values: [[(getJSTDateNow()).toJSON()]]
      }]
    }
  });
}

function getJSTDateNow () {
  return new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
}
