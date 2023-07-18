const dotenv = require("dotenv");
dotenv.config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const puppeteer = require('puppeteer');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

async function captureScreenshot(url) {
  const launchOptions = {
    headless: true,
    args: [
      
      `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36`,
    ],
  };

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

   
    await page.waitForTimeout(6000);

    const buffer = await page.screenshot();
    await browser.close();

    return buffer;
  } catch (error) {
    console.error('Error capturing screenshot:', error.message);
    await browser.close();
    throw error;
  }
}

function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

client.on('ready', () => {
  console.log('Bot is ready');
  client.user.setActivity('With Orange', { type: 'PLAYING' });
});
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (message.content.startsWith('!token')) {
      const tokenAddress = message.content.split(' ')[1];

      if (!tokenAddress) {
        message.reply('You must provide a token address.');
        return;
      }

      console.log('Received command: !token', tokenAddress);

      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);

      if (!response.data) {
        message.reply('No data received from the API.');
        return;
      }

      const data = response.data;

      if (data.pairs.length === 0) {
        message.reply('No pairs found for the token address.');
        return;
      }

      const pair = data.pairs[0]; 
      const baseToken = pair.baseToken || {};
      const txns = pair.txns || {};
      const tokenURL = pair.url || `https://dexscreener.com/ethereum/${tokenAddress}`;
      const marketCap = pair.fdv || 'Not available';
      const dextoolsURL = `https://www.dextools.io/widget-chart/en/${pair.chainId === 'ethereum' ? 'ether' : pair.chainId}/pe-light/${pair.pairAddress}?theme=light&chartType=2&chartResolution=30&drawingToolbars=false`;

      const buffer = await captureScreenshot(dextoolsURL);

      const info = new EmbedBuilder()
        .setColor("DarkOrange")
        .setTitle(baseToken.name || 'Not available')
        .setDescription(baseToken.symbol || 'Not available')
        .setImage('attachment://chart.png') 
        .setFooter({
          text: 'i1n4r', 
          iconURL: 'https://media.discordapp.net/attachments/1129236917481918577/1130347033283276830/f4d28f04f343e307161a931a5080c440.png',
        }) // change to yours
        
        .addFields(
          { name: 'Symbol', value: `${baseToken.symbol || 'Not available'}`, inline: false },
          { name: 'Buys', value: `${txns.h24?.buys !== undefined ? `${txns.h24.buys.toLocaleString()}` : 'Not available'}`, inline: true },
          { name: 'Sells', value: `${txns.h24?.sells !== undefined ? `${txns.h24.sells.toLocaleString()}` : 'Not available'}`, inline: true },
          { name: 'Volume 24hrs', value: `${pair.volume?.h24 !== undefined ? `${pair.volume.h24.toLocaleString()}` : 'Not available'}`, inline: true },
          { name: 'Price Change 24hrs', value: `${pair.priceChange?.h24 !== undefined ? `${pair.priceChange.h24}%` : 'Not available'}`, inline: true },
          { name: 'Liquidity', value: `${pair.liquidity?.usd !== undefined ? `$${formatNumber(pair.liquidity.usd)}` : 'Not available'}`, inline: true },
          { name: 'Market Cap', value: `${marketCap !== 'Not available' ? `$${formatNumber(marketCap)}` : 'Not available'}`, inline: true }
        );

      const imageAttachment = new AttachmentBuilder(buffer, 'chart.png');
      const button = new ButtonBuilder()
        .setLabel(baseToken.name || 'Not available', "CHART")
        .setURL(tokenURL)
        .setStyle(ButtonStyle.Link);

      const buttonTrade = new ButtonBuilder()
        .setLabel('Trade')
        .setURL(`https://app.uniswap.org/#/swap?outputCurrency=${tokenAddress}&chain=ethereum`)
        .setStyle(ButtonStyle.Link);

      const buttonOrange = new ButtonBuilder()
        .setLabel('ORANGE') // change to yours
        .setStyle(ButtonStyle.Success)
        .setCustomId('orange_button'); 

      const actionRow = new ActionRowBuilder()
        .addComponents(button)
        .addComponents(buttonTrade)
        .addComponents(buttonOrange);

      message.reply({ embeds: [info], files: [imageAttachment], components: [actionRow] });

    } else if (message.content.startsWith("!rarity")) {
      const args = message.content.split(" ");
      if (args.length !== 3) {
        message.reply("Please use the command as follows: !rarity contract_address token_id");
        return;
      }

      const contractAddress = args[1];
      const tokenId = args[2];

      const response = await axios.get(`https://eth-mainnet.g.alchemy.com/nft/v3/docs-demo/computeRarity?tokenId=${tokenId}`);

      if (!response.data) {
        message.reply('No data received from the API.');
        return;
      }

      const rarity = response.data;
      message.channel.send(`NFT Rarity Info for Contract ${contractAddress}, Token ID ${tokenId}:\n${JSON.stringify(rarity, null, 2)}`);
    } else if (message.content.startsWith("!fp")) {
      const contractAddress = message.content.slice(4);

      const floorPrice = await alchemy.nft.getFloorPrice(contractAddress);
      console.log("Floor Price:", floorPrice);

      if (floorPrice?.openSea?.floorPrice) {
        message.reply(
          `The floor price  on OpenSea is ${floorPrice.openSea.floorPrice} ${floorPrice.openSea.priceCurrency}. Check it out: ${floorPrice.openSea.collectionUrl}`
        );
      } else {
        message.reply(`No NFT floor price found for contract address ${contractAddress}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    message.reply('An error occurred while processing your request.');
  }
});

client.login(DISCORD_BOT_TOKEN);
 //By discord @lorangel
