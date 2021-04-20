// Steam Client

const { EMachineIDType } = require( "steam-user" )
const SteamUser = require("steam-user")
const readline = require("readline")
require("dotenv").config()

const Discord = require("discord.js-selfbot")
const sharp = require( "sharp" )
const DClient = new Discord.Client()
const request = require('request').defaults({encoding: null})

var localAvatar = null
var doTheMeme

const userInterface = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

var User = new SteamUser({
	autoRelogin: true,
	machineIdType: EMachineIDType.AccountNameGenerated
})

User.on('steamGuard', (domain, callback) => {
	userInterface.question("Steam Guard code required!\n> ", (code) => {
		callback(code)
		userInterface.close()
	})
})

var userAvailable, steamID = false, undefined
User.on("disconnected", (err, msg) => {
	userAvailable = false
})

// The discord avatar is stored here.
// After Steam inits, initialize the discord bot.
User.on("loggedOn", (details, parental) => {
	userAvailable = true

	steamID = details.client_supplied_steamid

	console.log("Sandbox Bot logged in to Steam!");

	if(!DClient.user){
		DClient.login(process.env.DISCORD_TOKEN).then(() => {
			console.log(`Discord Bot logged in as ${DClient.user.username + "#" + DClient.user.discriminator}!`);
		
		
			if (localAvatar == null){
				request( DClient.user.displayAvatarURL(), (err, res, body) => {
					localAvatar = body
		
					console.log("Downloaded user avatar!");
					doTheMeme()
				})
			}
		})
	}
})

User.on("error", (err) => {
	console.log(err);
})

User.logOn({
	accountName: process.env.STEAM_USER,
	password: process.env.STEAM_PASS
})

// Every 5 minutes, query the steam for game ownership 
var successfullChecks = 0
var key = null
function doTheMeme(){
	if (userAvailable === false)
		return

	if (!DClient)
		return;

	User.getUserOwnedApps(steamID, {
		filterAppids: [
			590830
		]
	}, async (err, response) => {
		if(err){
			console.log(err);
			return;
		}
		successfullChecks++
		console.log(`Game Count: ${response.app_count} (Check: #${successfullChecks} in the past hour)`);

		const test = Buffer.from(
			`<svg viewBox="0 0 348 348">
				<text x="6" y="12" font-size="12" fill="#FF0000">Hourly Check: #${successfullChecks}</text>
				<text x="6" y="24" font-size="12" fill="#FF0000">Garry, the user ${User.accountInfo.name} (${steamID})</text>
				<text x="6" y="36" font-size="12" fill="#FF0000" textLength="50">does not have the Sandbox key, please amend this error</text>

				<text x="6" y="308" font-size="10" fill="white">This message is sent out once every ${process.env.INTERVAL ?? 5} minutes</text>
				<text x="6" y="320" font-size="10" fill="white">Please don't ban, @ me if I am breaking any rules and to stop, thanks xoxoxo</text>
				<text x="6" y="340" font-size="18" fill="#FF0000">Check date: ${new Date().toLocaleString()}</text>
			</svg>`
		)

		if(key == null){
			key = await sharp("key.png")
				.resize(64, 64)
				.toBuffer()
		}

		const generatedImage = await sharp("troll.png")
			.flip(successfullChecks % 2 == 0)
			.resize(348, 348)
			.composite([
				{
					input: test
				},
				{
					input: "garry.png",
					left: 10,
					top: 348 * .5 - 128 * .5
				},
				{
					input: localAvatar,
					left: 348 - 10 - 128,
					top: 348 * .5 - 128 * .5
				},
				{
					input: key
				}
			])
			.png()
			.toBuffer()

		const channel = await DClient.channels.fetch(process.env.CHANNEL)
		
		await channel.send("please garry :(", {
			files: [
				{
					attachment: generatedImage,
					name: "alittlebitoftrolling.png"
				}
			]
		})
	})
}
setInterval(doTheMeme, 60 * 1000 * (process.env.INTERVAL ?? 5))

// Reset the hourly counter
setInterval(() => {
	successfullChecks = 0
}, (60 * 1000) * 60)
