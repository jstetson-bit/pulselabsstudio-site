/* ================= DEFINITIONS ================= */
// Thing types (Doom / Doom II numbering). cat drives the editor color + the Demo behavior.
const THINGS = {};
function defT(type, name, cat, r, h, spr, extra) { THINGS[type] = Object.assign({ type, name, cat, r, h, spr }, extra || {}); }
defT(1, 'Player 1 Start', 'player', 16, 56, null);
defT(2, 'Player 2 Start', 'player', 16, 56, null);
defT(3, 'Player 3 Start', 'player', 16, 56, null);
defT(4, 'Player 4 Start', 'player', 16, 56, null);
defT(11, 'Deathmatch Start', 'player', 16, 56, null);
defT(14, 'Teleport Destination', 'player', 16, 56, null);
// monsters: hp, spd, atk: 'hit' hitscan | 'proj' | 'melee', pellets, dmg [min,max], proj kind, drop
defT(3004, 'Zombieman', 'monster', 20, 56, 'zombie', { hp: 20, spd: 2.2, atk: 'hit', pellets: 1, dmg: [3, 15], pain: .78, drop: 2007 });
defT(9, 'Shotgun Guy', 'monster', 20, 56, 'sergeant', { hp: 30, spd: 2.4, atk: 'hit', pellets: 3, dmg: [3, 15], pain: .66, drop: 2001 });
defT(65, 'Heavy Weapon Dude', 'monster', 20, 56, 'chaingunner', { hp: 70, spd: 2.2, atk: 'hit', pellets: 1, burst: 4, dmg: [3, 15], pain: .66, drop: 2002 });
defT(3001, 'Imp', 'monster', 20, 56, 'imp', { hp: 60, spd: 2.2, atk: 'proj', proj: 'fire', dmg: [3, 24], melee: [3, 24], pain: .78 });
defT(3002, 'Demon', 'monster', 30, 56, 'demon', { hp: 150, spd: 4.4, atk: 'melee', melee: [4, 40], pain: .7 });
defT(58, 'Spectre', 'monster', 30, 56, 'demon', { hp: 150, spd: 4.4, atk: 'melee', melee: [4, 40], pain: .7, fuzz: 1 });
defT(3006, 'Lost Soul', 'monster', 16, 56, 'lostsoul', { hp: 100, spd: 5, atk: 'melee', melee: [3, 24], pain: 1, float: 1 });
defT(3005, 'Cacodemon', 'monster', 31, 56, 'caco', { hp: 400, spd: 2.8, atk: 'proj', proj: 'caco', dmg: [5, 40], melee: [10, 60], pain: .5, float: 1 });
defT(69, 'Hell Knight', 'monster', 24, 64, 'knight', { hp: 500, spd: 2.8, atk: 'proj', proj: 'baron', dmg: [8, 64], melee: [10, 80], pain: .2 });
defT(3003, 'Baron of Hell', 'monster', 24, 64, 'baron', { hp: 1000, spd: 2.8, atk: 'proj', proj: 'baron', dmg: [8, 64], melee: [10, 80], pain: .2 });
defT(68, 'Arachnotron', 'monster', 64, 64, 'arach', { hp: 500, spd: 3.6, atk: 'proj', proj: 'plasmam', dmg: [5, 40], pain: .5, burst: 3 });
defT(7, 'Spider Mastermind', 'monster', 128, 100, 'spider', { hp: 3000, spd: 3.6, atk: 'hit', pellets: 3, burst: 6, dmg: [3, 15], pain: .16 });
defT(16, 'Cyberdemon', 'monster', 40, 110, 'cyber', { hp: 4000, spd: 4, atk: 'proj', proj: 'rocketm', dmg: [20, 160], pain: .08, burst: 3 });
// weapons
defT(2001, 'Shotgun', 'weapon', 20, 16, 'shotgun', { give: { w: 3, shells: 8 } });
defT(82, 'Super Shotgun', 'weapon', 20, 16, 'ssg', { give: { w: 4, shells: 8 } });
defT(2002, 'Chaingun', 'weapon', 20, 16, 'chaingun', { give: { w: 5, bullets: 20 } });
defT(2003, 'Rocket Launcher', 'weapon', 20, 16, 'rl', { give: { w: 6, rockets: 2 } });
defT(2004, 'Plasma Rifle', 'weapon', 20, 16, 'plasma', { give: { w: 7, cells: 40 } });
defT(2006, 'BFG9000', 'weapon', 20, 16, 'bfg', { give: { w: 8, cells: 40 } });
defT(2005, 'Chainsaw', 'weapon', 20, 16, 'saw', { give: { w: 1 } });
// ammo
defT(2007, 'Clip', 'ammo', 20, 16, 'clip', { give: { bullets: 10 } });
defT(2048, 'Box of Bullets', 'ammo', 20, 16, 'bbox', { give: { bullets: 50 } });
defT(2008, '4 Shotgun Shells', 'ammo', 20, 16, 'shells', { give: { shells: 4 } });
defT(2049, 'Box of Shells', 'ammo', 20, 16, 'sbox', { give: { shells: 20 } });
defT(2010, 'Rocket', 'ammo', 20, 16, 'rocket', { give: { rockets: 1 } });
defT(2046, 'Box of Rockets', 'ammo', 20, 16, 'rbox', { give: { rockets: 5 } });
defT(2047, 'Energy Cell', 'ammo', 20, 16, 'cell', { give: { cells: 20 } });
defT(17, 'Energy Cell Pack', 'ammo', 20, 16, 'cpack', { give: { cells: 100 } });
defT(8, 'Backpack', 'ammo', 20, 16, 'backpack', { give: { backpack: 1, bullets: 10, shells: 4, rockets: 1, cells: 20 } });
// health / armor / powerups
defT(2011, 'Stimpack', 'health', 20, 16, 'stim', { give: { hp: 10, max: 100 } });
defT(2012, 'Medikit', 'health', 20, 16, 'medkit', { give: { hp: 25, max: 100 } });
defT(2014, 'Health Bonus', 'health', 20, 16, 'hbonus', { give: { hp: 1, max: 200 } });
defT(2013, 'Soulsphere', 'health', 20, 16, 'soul', { give: { hp: 100, max: 200 } });
defT(83, 'Megasphere', 'health', 20, 16, 'mega', { give: { hp: 200, max: 200, armor: 200, at: 2 } });
defT(2015, 'Armor Bonus', 'armor', 20, 16, 'abonus', { give: { armor: 1, amax: 200, at: 1 } });
defT(2018, 'Green Armor', 'armor', 20, 16, 'garmor', { give: { armor: 100, amax: 100, at: 1 } });
defT(2019, 'Blue Armor', 'armor', 20, 16, 'barmor', { give: { armor: 200, amax: 200, at: 2 } });
// keys
defT(5, 'Blue Keycard', 'key', 20, 16, 'bcard', { key: 'b' });
defT(6, 'Yellow Keycard', 'key', 20, 16, 'ycard', { key: 'y' });
defT(13, 'Red Keycard', 'key', 20, 16, 'rcard', { key: 'r' });
defT(40, 'Blue Skull Key', 'key', 20, 16, 'bskull', { key: 'b' });
defT(39, 'Yellow Skull Key', 'key', 20, 16, 'yskull', { key: 'y' });
defT(38, 'Red Skull Key', 'key', 20, 16, 'rskull', { key: 'r' });
// decorations
defT(2035, 'Exploding Barrel', 'decor', 10, 42, 'barrel', { solid: 1, hp: 20, barrel: 1 });
defT(2028, 'Floor Lamp', 'decor', 16, 48, 'lamp', { solid: 1, bright: 1 });
defT(48, 'Tall Techno Column', 'decor', 16, 128, 'column', { solid: 1 });
defT(30, 'Tall Green Pillar', 'decor', 16, 52, 'gpillar', { solid: 1 });
defT(46, 'Red Torch', 'decor', 16, 68, 'rtorch', { solid: 1, bright: 1 });
defT(44, 'Blue Torch', 'decor', 16, 68, 'btorch', { solid: 1, bright: 1 });
defT(34, 'Candle', 'decor', 20, 16, 'candle', { bright: 1 });
defT(35, 'Candelabra', 'decor', 16, 60, 'candelabra', { solid: 1, bright: 1 });
defT(10, 'Bloody Mess', 'decor', 20, 16, 'gore', {});
function thingName(t) { return THINGS[t] ? THINGS[t].name : 'Unknown ' + t; }
const CAT_COLOR = { player: '#3ec1ff', monster: '#ff3b3b', weapon: '#ffb000', ammo: '#d7c64a', health: '#40e070', armor: '#3bd6b0', key: '#ff66ff', decor: '#aaaaaa' };
const CAT_NAME = { player: 'Player starts', monster: 'Monsters', weapon: 'Weapons', ammo: 'Ammo', health: 'Health', armor: 'Armor', key: 'Keys', decor: 'Decorations' };

// Linedef actions (Doom format)
const LINE_SPECIALS = [
  [0, 'None'],
  [1, 'DR Door open-wait-close'], [26, 'DR Door (Blue key)'], [27, 'DR Door (Yellow key)'], [28, 'DR Door (Red key)'],
  [31, 'D1 Door open, stay'], [32, 'D1 Door stay (Blue key)'], [33, 'D1 Door stay (Red key)'], [34, 'D1 Door stay (Yellow key)'],
  [117, 'DR Door fast'], [118, 'D1 Door fast, stay'],
  [2, 'W1 Open tagged door, stay'], [103, 'S1 Open tagged door, stay'], [29, 'S1 Tagged door open-wait-close'], [63, 'SR Tagged door open-wait-close'], [90, 'WR Tagged door open-wait-close'], [86, 'WR Open tagged door, stay'], [61, 'SR Open tagged door, stay'],
  [62, 'SR Lift lower-wait-raise'], [88, 'WR Lift lower-wait-raise'], [10, 'W1 Lift lower-wait-raise'], [21, 'S1 Lift lower-wait-raise'], [120, 'WR Lift fast'], [123, 'SR Lift fast'],
  [18, 'S1 Floor raise to next higher'], [23, 'S1 Floor lower to lowest'], [38, 'W1 Floor lower to lowest'], [82, 'WR Floor lower to lowest'], [5, 'W1 Floor raise to lowest ceiling'], [101, 'S1 Floor raise to lowest ceiling'], [19, 'W1 Floor lower to highest neighbor'], [102, 'S1 Floor lower to highest neighbor'],
  [97, 'WR Teleport'], [39, 'W1 Teleport'],
  [35, 'W1 Light to 35'], [13, 'W1 Light to 255'],
  [11, 'S1 Exit level'], [52, 'W1 Exit level'], [51, 'S1 Secret exit'], [124, 'W1 Secret exit'],
  [48, 'Scrolling wall (left)']
];
const SPECIAL_NAME = Object.fromEntries(LINE_SPECIALS);
const DOOR_SPECIALS = new Set([1, 26, 27, 28, 31, 32, 33, 34, 117, 118]);
const TAG_SPECIALS = new Set([2, 103, 29, 63, 90, 86, 61, 62, 88, 10, 21, 120, 123, 18, 23, 38, 82, 5, 101, 19, 102, 97, 39, 35, 13]);
const SECTOR_SPECIALS = [[0, 'Normal'], [1, 'Light blinks (random)'], [2, 'Light blinks (0.5s)'], [3, 'Light blinks (1s)'], [8, 'Light glows'], [12, 'Light blinks 1s (sync)'], [13, 'Light blinks 0.5s (sync)'], [17, 'Light flickers'], [7, 'Damage 5% (slime)'], [5, 'Damage 10% (nukage)'], [16, 'Damage 20% (super)'], [4, 'Damage 20% + blink'], [9, 'Secret area'], [11, 'Damage 20%, exit at 11%'], [10, 'Door closes after 30s'], [14, 'Door opens after 5 min']];

const WALL_TEX = ['STARTAN3', 'STARTAN2', 'STARGR1', 'STARBR2', 'BROWN1', 'BROWN96', 'BROWNGRN', 'BRICK1', 'BRICK7', 'COMPTALL', 'COMPUTE2', 'COMPBLUE', 'TEKWALL1', 'TEKGREN2', 'METAL', 'METAL1', 'SUPPORT2', 'SUPPORT3', 'LITE3', 'LITE5', 'STONE2', 'STONE3', 'GRAY1', 'GRAY7', 'ICKWALL1', 'ROCKRED1', 'MARBLE1', 'SKIN2', 'WOOD1', 'WOOD5', 'ASHWALL2', 'GSTONE1', 'SP_HOT1', 'BIGDOOR1', 'BIGDOOR2', 'BIGDOOR4', 'DOOR1', 'DOOR3', 'DOORBLU', 'DOORRED', 'DOORYEL', 'DOORTRAK', 'PLAT1', 'SW1EXIT', 'SW1STRTN', 'SW1COMP', 'SW1BRN1', 'SW1GRAY', 'EXITSIGN', 'MIDGRATE', 'BRNBIGC', 'PIPE2', 'SKY1'];
const FLAT_TEX = ['FLOOR4_8', 'FLOOR5_1', 'FLOOR5_2', 'FLOOR7_1', 'FLOOR0_1', 'FLAT5_4', 'FLAT14', 'FLAT20', 'FLAT1', 'CEIL3_5', 'CEIL5_1', 'CEIL1_1', 'TLITE6_4', 'TLITE6_5', 'GRNROCK', 'RROCK01', 'MFLR8_1', 'GRASS1', 'NUKAGE1', 'FWATER1', 'LAVA1', 'BLOOD1', 'SLIME01', 'F_SKY1', 'STEP1', 'DEM1_5', 'GATE1'];
