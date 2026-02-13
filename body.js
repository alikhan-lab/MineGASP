const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

const [mIP, mPort, mBotName, mUser, mKey] = process.argv.slice(2);
const genAI = new GoogleGenerativeAI(mKey);
const bot = mineflayer.createBot({ host: mIP, port: parseInt(mPort), username: mBotName, version: '1.20.1' });

bot.loadPlugin(pathfinder);
let attackTarget = null;

// --- ОГРОМНЫЙ АССОРТИМЕНТ (Словарь имен) ---
const nameMap = {
    // Мобы
    'свинья': 'pig', 'корова': 'cow', 'овца': 'sheep', 'курица': 'chicken', 'паук': 'spider',
    'зомби': 'zombie', 'скелет': 'skeleton', 'крипер': 'creeper', 'эндермен': 'enderman',
    'утопленник': 'drowned', 'слайм': 'slime', 'житель': 'villager', 'пчела': 'bee',
    // Еда / Ресурсы
    'свинина': 'porkchop', 'говядина': 'beef', 'курятина': 'chicken', 'яблоко': 'apple',
    'хлеб': 'bread', 'железо': 'iron_ingot', 'золото': 'gold_ingot', 'алмаз': 'diamond',
    'незерит': 'netherite_ingot', 'палка': 'stick', 'уголь': 'coal', 'медь': 'copper_ingot',
    // Блоки
    'дерево': 'log', 'дуб': 'oak_log', 'береза': 'birch_log', 'камень': 'stone',
    'булыжник': 'cobblestone', 'земля': 'dirt', 'песок': 'sand', 'гравий': 'gravel',
    'стекло': 'glass', 'трава': 'grass', 'руда': 'ore', 'алмазная_руда': 'diamond_ore',
    // Вещи
    'меч': 'sword', 'кирка': 'pickaxe', 'топор': 'axe', 'лопата': 'shovel', 'лук': 'bow',
    'щит': 'shield', 'элитры': 'elytra', 'шлем': 'helmet', 'нагрудник': 'chestplate',
    'штаны': 'leggings', 'ботинки': 'boots', 'факел': 'torch', 'кровать': 'bed'
};

// Список всех быстрых моделей 2026
const myModels = [
    "gemini-2.5-flash", 
    "gemini-2.5-flash-lite", 
    "gemini-2.5-flash-8b",
    "gemini-2.5-flash-lite-001",
    "gemini-2.0-flash", 
    "gemini-2.0-flash-lite", 
    "gemini-2.0-flash-001", 
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-thinking-exp", 
    "gemini-1.5-flash", 
    "gemini-1.5-flash-8b", 
    "gemini-1.5-flash-latest", 
    "gemini-1.5-flash-001", 
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-8b-001",
    "gemma-3-1b-it", 
    "gemma-3-4b-it", 
    "gemma-3-12b-it", 
    "gemma-3-27b-it",
    "gemma-3n-e2b-it", 
    "gemma-3n-e4b-it",
    "gemma-2-2b-it", 
    "gemma-2-9b-it", 
    "gemma-2-27b-it",
    "gemini-exp-1206", 
    "gemini-robotics-er-1.5-preview",
    "learnlm-1.5-pro-experimental",
    "gemini-flash-experimental",
    "gemini-2.0-flash-lite-preview"
];
let currentModelIndex = 0;

function log(type, msg) { console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`); }

const ACTIONS = {
    async execute(tag, arg, sender) {
        const targetPlayer = bot.players[sender]?.entity;
        const cleanArg = arg ? arg.toLowerCase().trim() : "";
        const finalArg = nameMap[cleanArg] || cleanArg;
        log("ACTION", `Команда: ${tag} | Аргумент: ${finalArg}`);

        try {
            // [HIT] или [KILL]
            if (tag === "[HIT]" || tag === "[KILL]") {
                const entity = bot.nearestEntity(e => 
                    (e.name?.toLowerCase().includes(finalArg) || e.type?.toLowerCase().includes(finalArg) || e.username?.toLowerCase().includes(finalArg)) &&
                    e.username !== bot.username && (tag === "[KILL]" ? e.username !== mUser : true) &&
                    e.position.distanceTo(bot.entity.position) < 30
                );

                if (entity) {
                    if (tag === "[HIT]") {
                        await bot.lookAt(entity.position.offset(0, 1.5, 0));
                        bot.attack(entity);
                    } else {
                        attackTarget = entity;
                        bot.pathfinder.setGoal(new goals.GoalFollow(entity, 1), true);
                    }
                } else if (tag === "[HIT]") {
                    const block = bot.findBlock({ matching: b => b.name.includes(finalArg), maxDistance: 5 });
                    if (block) { await bot.lookAt(block.position); await bot.dig(block); }
                }
            }

            // [GIVE]
            if (tag === "[GIVE]" && targetPlayer) {
                const item = bot.inventory.items().find(i => i.name.includes(finalArg) || i.displayName.toLowerCase().includes(finalArg));
                if (item) {
                    await bot.pathfinder.goto(new goals.GoalNear(targetPlayer.position.x, targetPlayer.position.y, targetPlayer.position.z, 1.2));
                    await bot.tossStack(item);
                }
            }

            // Остальные команды
            if (tag === "[LOOT]") {
                const chest = bot.findBlock({ matching: b => b.name.includes('chest') || b.name.includes('shulker'), maxDistance: 5 });
                if (chest) { const c = await bot.openChest(chest); for (const i of c.containerItems()) await c.withdraw(i.type, null, i.count); c.close(); }
            }
            if (tag === "[EQUIP]") {
                const item = bot.inventory.items().find(i => i.name.includes(finalArg));
                if (item) await bot.equip(item, 'hand');
            }
            if (tag === "[STOP]") { bot.pathfinder.setGoal(null); attackTarget = null; }
            if (tag === "[FOLLOW]" && targetPlayer) bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer, 2), true);
            if (tag === "[JUMP]") { bot.setControlState('jump', true); setTimeout(() => bot.setControlState('jump', false), 400); }
            if (tag === "[SLEEP]") { const bed = bot.findBlock({ matching: b => bot.isABed(b), maxDistance: 5 }); if (bed) await bot.sleep(bed); }

        } catch (e) { log("ERROR", `Ошибка в ${tag}: ${e.message}`); }
    }
};

bot.on('physicsTick', () => {
    if (attackTarget && attackTarget.isValid) {
        if (bot.entity.position.distanceTo(attackTarget.position) < 3.8) {
            bot.lookAt(attackTarget.position.offset(0, 1.5, 0));
            bot.attack(attackTarget);
        }
    } else if (attackTarget) { attackTarget = null; bot.pathfinder.setGoal(null); }
});

async function think(user, message) {
    const inv = bot.inventory.items().map(i => `${i.count}x ${i.name}`).join(', ');
    const invStatus = inv ? `Твой инвентарь: ${inv}.` : "Инвентарь пуст.";

    for (let attempt = 0; attempt < myModels.length; attempt++) {
        const modelName = myModels[currentModelIndex];
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                systemInstruction: `Ты SmaG. Напарник: ${mUser}. 
                ${invStatus}
                Стиль: дерзкий, саркастичный, черный юмор, но без жести и мата.
                ИСПОЛЬЗУЙ ТЕГИ В КОНЦЕ: [HIT:имя], [KILL:имя], [GIVE:предмет], [LOOT], [EQUIP:предмет], [STOP], [FOLLOW], [JUMP].
                Если просят дерево - пиши [HIT:дерево], если свинью - [HIT:свинья].`
            });

            const result = await model.generateContent(`${user}: ${message}`);
            let res = result.response.text().trim();
            
            log("AI", `Ответ от ${modelName}`);

            const matches = res.match(/\[([A-Z]+)(?::([^\]]+))?\]/gi);
            if (matches) {
                matches.forEach(m => {
                    const parts = m.replace(/[\[\]]/g, '').split(':');
                    ACTIONS.execute(`[${parts[0].toUpperCase()}]`, parts[1] || "", user);
                });
                res = res.replace(/\[.*?\]/gi, '').trim();
            }
            if (res) bot.chat(res);
            currentModelIndex = (currentModelIndex + 1) % myModels.length;
            return;
        } catch (e) {
            log("WARN", `Модель ${modelName} сбоит, пробую следующую...`);
            currentModelIndex = (currentModelIndex + 1) % myModels.length;
        }
    }
}

bot.on('chat', (u, m) => { if (u !== bot.username) think(u, m); });
bot.on('spawn', () => { 
    const mcData = require('minecraft-data')(bot.version);
    const moves = new Movements(bot, mcData);
    moves.allowParkour = true; moves.canDig = true;
    bot.pathfinder.setMovements(moves);
    log("SYSTEM", "SmaG запущен с полным арсеналом!"); 
});