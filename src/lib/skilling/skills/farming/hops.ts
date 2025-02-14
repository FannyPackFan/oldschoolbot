import { resolveNameBank } from '../../../util';
import itemID from '../../../util/itemID';
import { Plant } from '../../types';

const hopsPlants: Plant[] = [
	{
		level: 3,
		plantXp: 8.5,
		checkXp: 0,
		harvestXp: 9.5,
		inputItems: resolveNameBank({ 'Barley seed': 4 }),
		outputCrop: itemID('Barley'),
		name: 'Barley',
		aliases: ['barley'],
		petChance: 112_416,
		seedType: 'hops',
		growthTime: 40,
		numOfStages: 4,
		chance1: 154,
		chance99: 183,
		chanceOfDeath: 25,
		protectionPayment: resolveNameBank({ Compost: 3 }),
		needsChopForHarvest: false,
		fixedOutput: false,
		givesLogs: false,
		givesCrops: true,
		defaultNumOfPatches: 4,
		canPayFarmer: true,
		canCompostPatch: true,
		canCompostandPay: true,
		// [QP, Patches Gained]
		additionalPatchesByQP: [],
		// [Farm Lvl, Patches Gained]
		additionalPatchesByFarmLvl: [],
		additionalPatchesByFarmGuildAndLvl: [],
		timePerPatchTravel: 20,
		timePerHarvest: 20
	},
	{
		level: 4,
		plantXp: 9,
		checkXp: 0,
		harvestXp: 10,
		inputItems: resolveNameBank({ 'Hammerstone seed': 4 }),
		outputCrop: itemID('Hammerstone hops'),
		name: 'Hammerstone hops',
		aliases: ['hammerstone hops', 'hammerstone', 'hammer'],
		petChance: 112_416,
		seedType: 'hops',
		growthTime: 40,
		numOfStages: 4,
		chance1: 154,
		chance99: 183,
		chanceOfDeath: 25,
		protectionPayment: resolveNameBank({ Marigolds: 1 }),
		needsChopForHarvest: false,
		fixedOutput: false,
		givesLogs: false,
		givesCrops: true,
		defaultNumOfPatches: 4,
		canPayFarmer: true,
		canCompostPatch: true,
		canCompostandPay: true,
		// [QP, Patches Gained]
		additionalPatchesByQP: [],
		// [Farm Lvl, Patches Gained]
		additionalPatchesByFarmLvl: [],
		additionalPatchesByFarmGuildAndLvl: [],
		timePerPatchTravel: 20,
		timePerHarvest: 20
	},
	{
		level: 8,
		plantXp: 10.9,
		checkXp: 0,
		harvestXp: 12,
		inputItems: resolveNameBank({ 'Asgarnian seed': 4 }),
		outputCrop: itemID('Asgarnian hops'),
		name: 'Asgarnian hops',
		aliases: ['asgarnian hops', 'asgarnian', 'asgar'],
		petChance: 112_416,
		seedType: 'hops',
		growthTime: 50,
		numOfStages: 5,
		chance1: 154,
		chance99: 183,
		chanceOfDeath: 25,
		protectionPayment: resolveNameBank({ 'Onions(10)': 1 }),
		needsChopForHarvest: false,
		fixedOutput: false,
		givesLogs: false,
		givesCrops: true,
		defaultNumOfPatches: 4,
		canPayFarmer: true,
		canCompostPatch: true,
		canCompostandPay: true,
		// [QP, Patches Gained]
		additionalPatchesByQP: [],
		// [Farm Lvl, Patches Gained]
		additionalPatchesByFarmLvl: [],
		additionalPatchesByFarmGuildAndLvl: [],
		timePerPatchTravel: 20,
		timePerHarvest: 20
	},
	{
		level: 13,
		plantXp: 13,
		checkXp: 0,
		harvestXp: 14.5,
		inputItems: resolveNameBank({ 'Jute seed': 3 }),
		outputCrop: itemID('Jute fibre'),
		name: 'Jute',
		aliases: ['jute', 'jute fibre'],
		petChance: 89_933,
		seedType: 'hops',
		growthTime: 50,
		numOfStages: 5,
		chance1: 154,
		chance99: 183,
		chanceOfDeath: 25,
		protectionPayment: resolveNameBank({ 'Barley malt': 6 }),
		needsChopForHarvest: false,
		fixedOutput: false,
		givesLogs: false,
		givesCrops: true,
		defaultNumOfPatches: 4,
		canPayFarmer: true,
		canCompostPatch: true,
		canCompostandPay: true,
		// [QP, Patches Gained]
		additionalPatchesByQP: [],
		// [Farm Lvl, Patches Gained]
		additionalPatchesByFarmLvl: [],
		additionalPatchesByFarmGuildAndLvl: [],
		timePerPatchTravel: 20,
		timePerHarvest: 20
	},
	{
		level: 16,
		plantXp: 14.5,
		checkXp: 0,
		harvestXp: 16,
		inputItems: resolveNameBank({ 'Yanillian seed': 4 }),
		outputCrop: itemID('Yanillian hops'),
		name: 'Yanillian hops',
		aliases: ['yanillian hops', 'yanillian', 'yan'],
		petChance: 74_944,
		seedType: 'hops',
		growthTime: 40,
		numOfStages: 4,
		chance1: 154,
		chance99: 183,
		chanceOfDeath: 25,
		protectionPayment: resolveNameBank({ 'Tomatoes(5)': 200 }),
		needsChopForHarvest: false,
		fixedOutput: false,
		givesLogs: false,
		givesCrops: true,
		defaultNumOfPatches: 4,
		canPayFarmer: true,
		canCompostPatch: true,
		canCompostandPay: true,
		// [QP, Patches Gained]
		additionalPatchesByQP: [],
		// [Farm Lvl, Patches Gained]
		additionalPatchesByFarmLvl: [],
		additionalPatchesByFarmGuildAndLvl: [],
		timePerPatchTravel: 20,
		timePerHarvest: 20
	},
	{
		level: 21,
		plantXp: 17.5,
		checkXp: 0,
		harvestXp: 19.5,
		inputItems: resolveNameBank({ 'Krandorian seed': 4 }),
		outputCrop: itemID('Krandorian hops'),
		name: 'Krandorian hops',
		aliases: ['krandorian hops', 'krandorian', 'kran'],
		petChance: 64_238,
		seedType: 'hops',
		growthTime: 40,
		numOfStages: 4,
		chance1: 154,
		chance99: 183,
		chanceOfDeath: 25,
		protectionPayment: resolveNameBank({ 'Cabbages(10)': 3 }),
		needsChopForHarvest: false,
		fixedOutput: false,
		givesLogs: false,
		givesCrops: true,
		defaultNumOfPatches: 4,
		canPayFarmer: true,
		canCompostPatch: true,
		canCompostandPay: true,
		// [QP, Patches Gained]
		additionalPatchesByQP: [],
		// [Farm Lvl, Patches Gained]
		additionalPatchesByFarmLvl: [],
		additionalPatchesByFarmGuildAndLvl: [],
		timePerPatchTravel: 20,
		timePerHarvest: 20
	},
	{
		level: 28,
		plantXp: 23,
		checkXp: 0,
		harvestXp: 26,
		inputItems: resolveNameBank({ 'Wildblood seed': 4 }),
		outputCrop: itemID('Wildblood hops'),
		name: 'Wildblood hops',
		aliases: ['wildblood hops', 'wildblood', 'wild'],
		petChance: 56_208,
		seedType: 'hops',
		growthTime: 40,
		numOfStages: 4,
		chance1: 154,
		chance99: 183,
		chanceOfDeath: 25,
		protectionPayment: resolveNameBank({ Nasturtiums: 1 }),
		needsChopForHarvest: false,
		fixedOutput: false,
		givesLogs: false,
		givesCrops: true,
		defaultNumOfPatches: 4,
		canPayFarmer: true,
		canCompostPatch: true,
		canCompostandPay: true,
		// [QP, Patches Gained]
		additionalPatchesByQP: [],
		// [Farm Lvl, Patches Gained]
		additionalPatchesByFarmLvl: [],
		additionalPatchesByFarmGuildAndLvl: [],
		timePerPatchTravel: 20,
		timePerHarvest: 20
	}
];

export default hopsPlants;
