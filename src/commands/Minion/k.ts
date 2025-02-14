import { MessageAttachment } from 'discord.js';
import {
	calcPercentOfNum,
	calcWhatPercent,
	increaseNumByPercent,
	objectKeys,
	reduceNumByPercent,
	round,
	Time,
	uniqueArr
} from 'e';
import { CommandStore, KlasaMessage, KlasaUser } from 'klasa';
import { Bank, Monsters } from 'oldschooljs';
import { MonsterAttribute } from 'oldschooljs/dist/meta/monsterData';
import Monster from 'oldschooljs/dist/structures/Monster';

import { Eatables } from '../../lib/data/eatables';
import { getSimilarItems } from '../../lib/data/similarItems';
import { checkUserCanUseDegradeableItem, degradeItem } from '../../lib/degradeableItems';
import { GearSetupType } from '../../lib/gear';
import {
	boostCannon,
	boostCannonMulti,
	boostIceBarrage,
	boostIceBurst,
	cannonMultiConsumables,
	cannonSingleConsumables,
	CombatCannonItemBank,
	CombatOptionsEnum,
	iceBarrageConsumables,
	iceBurstConsumables,
	SlayerActivityConstants
} from '../../lib/minions/data/combatConstants';
import killableMonsters from '../../lib/minions/data/killableMonsters';
import { Favours, gotFavour } from '../../lib/minions/data/kourendFavour';
import { minionNotBusy, requiresMinion } from '../../lib/minions/decorators';
import { AttackStyles, resolveAttackStyles } from '../../lib/minions/functions';
import calculateMonsterFood from '../../lib/minions/functions/calculateMonsterFood';
import reducedTimeFromKC from '../../lib/minions/functions/reducedTimeFromKC';
import removeFoodFromUser from '../../lib/minions/functions/removeFoodFromUser';
import { Consumable, KillableMonster } from '../../lib/minions/types';
import { calcPOHBoosts } from '../../lib/poh';
import { trackLoot } from '../../lib/settings/prisma';
import { ClientSettings } from '../../lib/settings/types/ClientSettings';
import { UserSettings } from '../../lib/settings/types/UserSettings';
import { SkillsEnum } from '../../lib/skilling/types';
import { SlayerTaskUnlocksEnum } from '../../lib/slayer/slayerUnlocks';
import { determineBoostChoice, getUsersCurrentSlayerInfo } from '../../lib/slayer/slayerUtil';
import { BotCommand } from '../../lib/structures/BotCommand';
import { MonsterActivityTaskOptions } from '../../lib/types/minions';
import {
	addArrayOfNumbers,
	convertAttackStyleToGearSetup,
	formatDuration,
	formatMissingItems,
	isWeekend,
	itemNameFromID,
	randomVariation,
	updateBankSetting
} from '../../lib/util';
import addSubTaskToActivityTask from '../../lib/util/addSubTaskToActivityTask';
import findMonster from '../../lib/util/findMonster';
import getOSItem from '../../lib/util/getOSItem';
import itemID from '../../lib/util/itemID';

const validMonsters = killableMonsters.map(mon => mon.name).join('\n');
const invalidMonsterMsg = (prefix: string) =>
	`That isn't a valid monster.\n\nFor example, \`${prefix}minion kill 5 zulrah\`` +
	`\n\nTry: \`${prefix}k --monsters\` for a list of killable monsters.`;

const { floor } = Math;

const degradeableItemsCanUse = [
	{
		item: getOSItem('Sanguinesti staff'),
		attackStyle: 'mage',
		charges: (_killableMon: KillableMonster, _monster: Monster, totalHP: number) => totalHP / 25,
		boost: 6
	},
	{
		item: getOSItem('Abyssal tentacle'),
		attackStyle: 'melee',
		charges: (_killableMon: KillableMonster, _monster: Monster, totalHP: number) => totalHP / 20,
		boost: 3
	}
];

function applySkillBoost(user: KlasaUser, duration: number, styles: AttackStyles[]): [number, string] {
	const skillTotal = addArrayOfNumbers(styles.map(s => user.skillLevel(s)));

	let newDuration = duration;
	let str = '';
	let percent = round(calcWhatPercent(skillTotal, styles.length * 99), 2);

	if (percent < 50) {
		percent = 50 - percent;
		newDuration = increaseNumByPercent(newDuration, percent);
		str = `-${percent.toFixed(2)}% for low stats`;
	} else {
		percent = Math.min(15, percent / 6.5);
		newDuration = reduceNumByPercent(newDuration, percent);
		str = `${percent.toFixed(2)}% for stats`;
	}

	return [newDuration, str];
}

export default class extends BotCommand {
	public constructor(store: CommandStore, file: string[], directory: string) {
		super(store, file, directory, {
			altProtection: true,
			oneAtTime: true,
			cooldown: 1,
			usage: '[quantity:int{1}|name:...string] [name:...string] [cannon|burst|barrage|none]',
			usageDelim: ' ',
			description: 'Sends your minion to kill monsters.'
		});
	}

	@requiresMinion
	@minionNotBusy
	async run(msg: KlasaMessage, [quantity, name = '', method = '']: [null | number | string, string, string]) {
		const { minionName } = msg.author;

		const boosts = [];
		let messages: string[] = [];

		if (typeof quantity === 'string') {
			name = quantity;
			quantity = null;
		}

		if (msg.flagArgs.monsters) {
			return msg.channel.send({
				files: [new MessageAttachment(Buffer.from(validMonsters), 'validMonsters.txt')]
			});
		}
		if (!name) return msg.channel.send(invalidMonsterMsg(msg.cmdPrefix));
		const monster = findMonster(name);
		if (!monster) return msg.channel.send(invalidMonsterMsg(msg.cmdPrefix));

		const usersTask = await getUsersCurrentSlayerInfo(msg.author.id);
		const isOnTask =
			usersTask.assignedTask !== null &&
			usersTask.currentTask !== null &&
			usersTask.assignedTask.monsters.includes(monster.id);

		if (monster.slayerOnly && !isOnTask) {
			return msg.channel.send(`You can't kill ${monster.name}, because you're not on a slayer task.`);
		}

		// Set chosen boost based on priority:
		const myCBOpts = msg.author.settings.get(UserSettings.CombatOptions);
		const boostChoice = determineBoostChoice({
			cbOpts: myCBOpts as CombatOptionsEnum[],
			msg,
			monster,
			method: method ?? 'none',
			isOnTask
		});

		// Check requirements
		const [hasReqs, reason] = msg.author.hasMonsterRequirements(monster);
		if (!hasReqs) throw reason;

		const [hasFavour, requiredPoints] = gotFavour(msg.author, Favours.Shayzien, 100);
		if (!hasFavour && monster.id === Monsters.LizardmanShaman.id) {
			return msg.channel.send(
				`${msg.author.minionName} needs ${requiredPoints}% Shayzien Favour to kill Lizardman shamans.`
			);
		}

		let [timeToFinish, percentReduced] = reducedTimeFromKC(monster, msg.author.getKC(monster.id));

		const [, osjsMon, attackStyles] = resolveAttackStyles(msg.author, {
			monsterID: monster.id,
			boostMethod: boostChoice
		});
		const [newTime, skillBoostMsg] = applySkillBoost(msg.author, timeToFinish, attackStyles);

		timeToFinish = newTime;
		boosts.push(skillBoostMsg);

		if (percentReduced >= 1) boosts.push(`${percentReduced}% for KC`);

		if (monster.pohBoosts) {
			const [boostPercent, messages] = calcPOHBoosts(await msg.author.getPOH(), monster.pohBoosts);
			if (boostPercent > 0) {
				timeToFinish = reduceNumByPercent(timeToFinish, boostPercent);
				boosts.push(messages.join(' + '));
			}
		}

		for (const [itemID, boostAmount] of Object.entries(msg.author.resolveAvailableItemBoosts(monster))) {
			timeToFinish *= (100 - boostAmount) / 100;
			boosts.push(`${boostAmount}% for ${itemNameFromID(parseInt(itemID))}`);
		}

		const monsterHP = osjsMon?.data.hitpoints ?? 100;
		const estimatedQuantity = floor(msg.author.maxTripLength('MonsterKilling') / timeToFinish);
		const totalMonsterHP = monsterHP * estimatedQuantity;

		/**
		 *
		 * Degradeable Items
		 *
		 */
		const degItemBeingUsed = [];
		for (const degItem of degradeableItemsCanUse) {
			const isUsing =
				monster.attackStyleToUse &&
				convertAttackStyleToGearSetup(monster.attackStyleToUse) === degItem.attackStyle &&
				msg.author.getGear(degItem.attackStyle).hasEquipped(degItem.item.id);
			if (isUsing) {
				const estimatedChargesNeeded = degItem.charges(monster, osjsMon!, totalMonsterHP);
				await checkUserCanUseDegradeableItem({
					item: degItem.item,
					chargesToDegrade: estimatedChargesNeeded,
					user: msg.author
				});
				degItemBeingUsed.push(degItem);
			}
		}

		// Removed vorkath because he has a special boost.
		if (monster.name.toLowerCase() !== 'vorkath' && osjsMon?.data?.attributes?.includes(MonsterAttribute.Dragon)) {
			if (
				msg.author.hasItemEquippedOrInBank('Dragon hunter lance') &&
				!attackStyles.includes(SkillsEnum.Ranged) &&
				!attackStyles.includes(SkillsEnum.Magic)
			) {
				timeToFinish = reduceNumByPercent(timeToFinish, 15);
				boosts.push('15% for Dragon hunter lance');
			} else if (
				msg.author.hasItemEquippedOrInBank('Dragon hunter crossbow') &&
				attackStyles.includes(SkillsEnum.Ranged)
			) {
				timeToFinish = reduceNumByPercent(timeToFinish, 15);
				boosts.push('15% for Dragon hunter crossbow');
			}
		}

		// Black mask and salve don't stack.
		const salveBoost = boosts.join('').toLowerCase().includes('salve amulet');
		if (!salveBoost) {
			// Add 15% slayer boost on task if they have black mask or similar
			if (attackStyles.includes(SkillsEnum.Ranged) || attackStyles.includes(SkillsEnum.Magic)) {
				if (isOnTask && msg.author.hasItemEquippedOrInBank('Black mask (i)')) {
					timeToFinish = reduceNumByPercent(timeToFinish, 15);
					boosts.push('15% for Black mask (i) on non-melee task');
				}
			} else if (
				isOnTask &&
				(msg.author.hasItemEquippedOrInBank('Black mask') ||
					msg.author.hasItemEquippedOrInBank('Black mask (i)'))
			) {
				timeToFinish = reduceNumByPercent(timeToFinish, 15);
				boosts.push('15% for Black mask on melee task');
			}
		}

		// Initialize consumable costs before any are calculated.
		const consumableCosts: Consumable[] = [];

		// Calculate Cannon and Barrage boosts + costs:
		let usingCannon = false;
		let cannonMulti = false;
		let burstOrBarrage = 0;
		const hasCannon = msg.author.owns(CombatCannonItemBank);
		if ((msg.flagArgs.burst || msg.flagArgs.barrage) && !monster!.canBarrage) {
			return msg.channel.send(`${monster!.name} cannot be barraged or burst.`);
		}
		if (msg.flagArgs.cannon && !hasCannon) {
			return msg.channel.send("You don't own a Dwarf multicannon, so how could you use one?");
		}
		if (msg.flagArgs.cannon && !monster!.canCannon) {
			return msg.channel.send(`${monster!.name} cannot be killed with a cannon.`);
		}
		if (boostChoice === 'barrage' && msg.author.skillLevel(SkillsEnum.Magic) < 94) {
			return msg.channel.send(
				`You need 94 Magic to use Ice Barrage. You have ${msg.author.skillLevel(SkillsEnum.Magic)}`
			);
		}
		if (boostChoice === 'burst' && msg.author.skillLevel(SkillsEnum.Magic) < 70) {
			return msg.channel.send(
				`You need 70 Magic to use Ice Burst. You have ${msg.author.skillLevel(SkillsEnum.Magic)}`
			);
		}

		if (boostChoice === 'barrage' && attackStyles.includes(SkillsEnum.Magic) && monster!.canBarrage) {
			consumableCosts.push(iceBarrageConsumables);
			timeToFinish = reduceNumByPercent(timeToFinish, boostIceBarrage);
			boosts.push(`${boostIceBarrage}% for Ice Barrage`);
			burstOrBarrage = SlayerActivityConstants.IceBarrage;
		} else if (boostChoice === 'burst' && attackStyles.includes(SkillsEnum.Magic) && monster!.canBarrage) {
			consumableCosts.push(iceBurstConsumables);
			timeToFinish = reduceNumByPercent(timeToFinish, boostIceBurst);
			boosts.push(`${boostIceBurst}% for Ice Burst`);
			burstOrBarrage = SlayerActivityConstants.IceBurst;
		} else if (boostChoice === 'cannon' && hasCannon && monster!.cannonMulti) {
			usingCannon = true;
			cannonMulti = true;
			consumableCosts.push(cannonMultiConsumables);
			timeToFinish = reduceNumByPercent(timeToFinish, boostCannonMulti);
			boosts.push(`${boostCannonMulti}% for Cannon in multi`);
		} else if (boostChoice === 'cannon' && hasCannon && monster!.canCannon) {
			usingCannon = true;
			consumableCosts.push(cannonSingleConsumables);
			timeToFinish = reduceNumByPercent(timeToFinish, boostCannon);
			boosts.push(`${boostCannon}% for Cannon in singles`);
		}

		const maxTripLength = msg.author.maxTripLength('MonsterKilling');

		// If no quantity provided, set it to the max.
		if (quantity === null) {
			if ([Monsters.Skotizo.id].includes(monster.id)) {
				quantity = 1;
			} else {
				quantity = floor(maxTripLength / timeToFinish);
			}
		}
		if (typeof quantity !== 'number') quantity = parseInt(quantity);
		if (isOnTask) {
			let effectiveQtyRemaining = usersTask.currentTask!.quantity_remaining;
			if (
				monster.id === Monsters.KrilTsutsaroth.id &&
				usersTask.currentTask!.monster_id !== Monsters.KrilTsutsaroth.id
			) {
				effectiveQtyRemaining = Math.ceil(effectiveQtyRemaining / 2);
			} else if (
				monster.id === Monsters.Kreearra.id &&
				usersTask.currentTask!.monster_id !== Monsters.Kreearra.id
			) {
				effectiveQtyRemaining = Math.ceil(effectiveQtyRemaining / 4);
			} else if (
				monster.id === Monsters.GrotesqueGuardians.id &&
				msg.author.settings.get(UserSettings.Slayer.SlayerUnlocks).includes(SlayerTaskUnlocksEnum.DoubleTrouble)
			) {
				effectiveQtyRemaining = Math.ceil(effectiveQtyRemaining / 2);
			}
			quantity = Math.min(quantity, effectiveQtyRemaining);
		}

		quantity = Math.max(1, quantity);
		let duration = timeToFinish * quantity;
		if (quantity > 1 && duration > maxTripLength) {
			return msg.channel.send(
				`${minionName} can't go on PvM trips longer than ${formatDuration(
					maxTripLength
				)}, try a lower quantity. The highest amount you can do for ${monster.name} is ${floor(
					maxTripLength / timeToFinish
				)}.`
			);
		}

		const totalCost = new Bank();
		const lootToRemove = new Bank();
		let pvmCost = false;

		if (monster.itemCost) {
			consumableCosts.push(monster.itemCost);
		}

		const infiniteWaterRunes = msg.author.hasItemEquippedAnywhere(getSimilarItems(itemID('Staff of water')));
		const perKillCost = new Bank();
		// Calculate per kill cost:
		if (consumableCosts.length > 0) {
			for (const cc of consumableCosts) {
				let consumable = cc;
				if (consumable.alternativeConsumables && !msg.author.owns(consumable.itemCost)) {
					for (const c of consumable.alternativeConsumables) {
						if (msg.author.owns(c.itemCost)) {
							consumable = c;
							break;
						}
					}
				}

				let itemMultiple = consumable.qtyPerKill ?? consumable.qtyPerMinute ?? null;
				if (itemMultiple) {
					if (consumable.isRuneCost) {
						// Free casts for kodai + sotd
						if (msg.author.hasItemEquippedAnywhere('Kodai wand')) {
							itemMultiple = Math.ceil(0.85 * itemMultiple);
						} else if (msg.author.hasItemEquippedAnywhere('Staff of the dead')) {
							itemMultiple = Math.ceil((6 / 7) * itemMultiple);
						}
					}

					let multiply = itemMultiple;

					// Calculate the duration for 1 kill and check how much will be used in 1 kill
					if (consumable.qtyPerMinute) multiply = (timeToFinish / Time.Minute) * itemMultiple;

					// Calculate supply for 1 kill
					const oneKcCost = consumable.itemCost.clone().multiply(multiply);
					// Can't use Bank.add() because it discards < 1 qty.
					for (const [itemID, qty] of Object.entries(oneKcCost.bank)) {
						if (perKillCost.bank[itemID]) perKillCost.bank[itemID] += qty;
						else perKillCost.bank[itemID] = qty;
					}
				}
			}
			// This will be replaced with a generic function in another PR
			if (infiniteWaterRunes) perKillCost.remove('Water rune', perKillCost.amount('Water rune'));
			// Calculate how many monsters can be killed with that cost:
			const fits = msg.author.bank({ withGP: true }).fits(perKillCost);
			if (fits < Number(quantity)) {
				duration = Math.floor(duration * (fits / Number(quantity)));
				quantity = fits;
			}
			const { bank } = perKillCost.clone().multiply(Number(quantity));
			// Ceil cost QTY to avoid fractions
			for (const [item, qty] of Object.entries(bank)) {
				bank[item] = Math.ceil(qty);
			}

			pvmCost = true;
			lootToRemove.add(bank);
		}
		if (pvmCost) {
			if (quantity === 0 || !msg.author.owns(lootToRemove)) {
				return msg.channel.send(
					`You don't have the items needed to kill any amount of ${
						monster.name
					}, you need: ${formatMissingItems(consumableCosts, timeToFinish)} per kill.`
				);
			}
		}
		// Check food
		let foodStr: string = '';
		if (monster.healAmountNeeded && monster.attackStyleToUse && monster.attackStylesUsed) {
			const [healAmountNeeded, foodMessages] = calculateMonsterFood(monster, msg.author);
			foodStr += foodMessages;

			let gearToCheck: GearSetupType = convertAttackStyleToGearSetup(monster.attackStyleToUse);
			if (monster.wildy) gearToCheck = 'wildy';

			const { foodRemoved, reductions } = await removeFoodFromUser({
				client: this.client,
				user: msg.author,
				totalHealingNeeded: healAmountNeeded * quantity,
				healPerAction: Math.ceil(healAmountNeeded / quantity),
				activityName: monster.name,
				attackStylesUsed: monster.wildy
					? ['wildy']
					: uniqueArr([...objectKeys(monster.minimumGearRequirements ?? {}), gearToCheck]),
				learningPercentage: percentReduced
			});

			if (foodRemoved.length === 0) {
				boosts.push('4% for no food');
				duration = reduceNumByPercent(duration, 4);
			} else {
				for (const [item, qty] of foodRemoved.items()) {
					const eatable = Eatables.find(e => e.id === item.id);
					if (!eatable) continue;

					const healAmount =
						typeof eatable.healAmount === 'number' ? eatable.healAmount : eatable.healAmount(msg.author);
					const amountHealed = qty * healAmount;
					if (amountHealed < calcPercentOfNum(75, healAmountNeeded * quantity)) continue;
					const boost = eatable.pvmBoost;
					if (boost) {
						if (boost < 0) {
							boosts.push(`${boost}% for ${eatable.name}`);
							duration = increaseNumByPercent(duration, Math.abs(boost));
						} else {
							boosts.push(`${boost}% for ${eatable.name}`);
							duration = reduceNumByPercent(duration, boost);
						}
					}
					break;
				}
			}

			totalCost.add(foodRemoved);
			if (reductions.length > 0) {
				foodStr += `, ${reductions.join(', ')}`;
			}
			foodStr += `, **Removed ${foodRemoved}**`;
		}

		// Boosts that don't affect quantity:
		duration = randomVariation(duration, 3);

		for (const degItem of degItemBeingUsed) {
			const chargesNeeded = degItem.charges(monster, osjsMon!, monsterHP * quantity);
			await degradeItem({
				item: degItem.item,
				chargesToDegrade: chargesNeeded,
				user: msg.author
			});
			boosts.push(`${degItem.boost}% for ${degItem.item.name}`);
			duration = reduceNumByPercent(duration, degItem.boost);
		}

		if (isWeekend()) {
			boosts.push('10% for Weekend');
			duration *= 0.9;
		}

		if (lootToRemove.length > 0) {
			updateBankSetting(this.client, ClientSettings.EconomyStats.PVMCost, lootToRemove);
			await msg.author.removeItemsFromBank(lootToRemove);
			totalCost.add(lootToRemove);
		}

		if (totalCost.length > 0) {
			await trackLoot({
				id: monster.name,
				cost: totalCost,
				type: 'Monster',
				changeType: 'cost'
			});
		}

		await addSubTaskToActivityTask<MonsterActivityTaskOptions>({
			monsterID: monster.id,
			userID: msg.author.id,
			channelID: msg.channel.id,
			quantity,
			duration,
			type: 'MonsterKilling',
			usingCannon: !usingCannon ? undefined : usingCannon,
			cannonMulti: !cannonMulti ? undefined : cannonMulti,
			burstOrBarrage: !burstOrBarrage ? undefined : burstOrBarrage
		});
		let response = `${minionName} is now killing ${quantity}x ${monster.name}, it'll take around ${formatDuration(
			duration
		)} to finish. Attack styles used: ${attackStyles.join(', ')}.`;

		if (pvmCost) {
			response += ` Removed ${lootToRemove}.`;
		}

		if (boosts.length > 0) {
			response += `\n**Boosts:** ${boosts.join(', ')}.`;
		}

		if (messages.length > 0) {
			response += `\n**Messages:** ${messages.join(', ')}.`;
		}

		if (foodStr) {
			response += `\n**Food:** ${foodStr}\n`;
		}

		return msg.channel.send(response);
	}
}
