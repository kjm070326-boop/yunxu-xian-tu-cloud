import type { Gate, State } from '../rules/types.js';

// ---------------------------------------------------------------------------
// 内容层（2026-11-12 补全）：与线上空间 yun-xu-xian-tu 的内容 canon 对齐——
// 8 章 beats 全文、9 位故人完整人设、6 位女主三段际遇全文、18 成就、
// 问天铺/任务/差事/对手/抉择/配方全量数据；另并入原站三位故人
// （宁砚秋/陆长汀/祁照夜）与坊市新品（回潮诀/无声步/霜魄刃/青玉佩/
// 金丝算盘/迷烟符/回春草）作为补充内容。整仓替换以此文件为内容基准。
// ---------------------------------------------------------------------------

export interface Chapter { id: number; name: string; stageGoal: string; beat: string; gates: Gate[]; rewards: { cultivation: number; stones: number }; heroines: string[]; }
export interface NPC { id: string; name: string; role: string; persona: string; relationshipLines: string[]; }
export interface BondStage { name: '初遇' | '交心' | '情缘深种'; gate: number; title: string; story: string; }
export interface HeroineBond { npcId: string; stages: BondStage[]; }
export interface Achievement { id: string; name: string; desc?: string; icon?: string; trigger: { type: string; value: number }; reward: { stones: number }; }
export interface CatalogEntry { id: string; name: string; price: number; effect: Record<string, number>; description: string; }

const layerGate = (id: string, description: string, minimum: number): Gate => ({ id, description, check: (state: State) => state.layer >= minimum });
const contributionGate = (id: string, description: string, minimum: number): Gate => ({ id, description, check: (state: State) => state.contribution >= minimum });
const realmGate = (id: string, description: string, minimum: number): Gate => ({ id, description, check: (state: State) => state.realm >= minimum });
const winsGate = (id: string, description: string, minimum: number): Gate => ({ id, description, check: (state: State) => state.wins >= minimum });
const bondGate = (id: string, description: string, minimum: number): Gate => ({ id, description, check: (state: State) => state.bond >= minimum });

export const chapters: Chapter[] = [
  { id: 1, name: '云墟山下', stageGoal: '平凡度日后下定决心踏上修行路', beat: '开局：主角在家乡/临渊城平凡度日，讲述出身日常与一个埋下伏笔的小事件（断剑异动、梦中呼唤、集市上的怪人等），最终下定决心踏上修行路。测灵台边要有一位红衣少女远远看他一眼、又有一位华服小姐在人群里多打量了他片刻，为日后埋下伏笔，但不点破。', gates: [], rewards: { cultivation: 18, stones: 8 }, heroines: ['楚红绫', '沈月华'] },
  { id: 2, name: '初入仙门', stageGoal: '抵达所选势力安顿下来，结识青云双璧并站稳脚跟', beat: '主角抵达所选势力并初步安顿，结识青云双璧——大师姐苏凝霜月下试剑、宗主之女姜雪衣当众下战书，遭遇第一次考验或刁难，展露心性并站稳脚跟。执法长老宁砚秋在入门仪程上多看了这个新弟子一眼，什么也没说。', gates: [layerGate('l2', '修为达到炼气2层', 2)], rewards: { cultivation: 18, stones: 8 }, heroines: ['苏凝霜', '姜雪衣'] },
  { id: 3, name: '临渊风波', stageGoal: '卷入临渊城风波，与苏凝霜并肩除妖，触及秘境线索', beat: '临渊城出现风波：妖兽伤人、散修失踪、坊市暗斗。主角被卷入其中，结识沈家嫡女沈月华与情报贩柳如烟，与苏凝霜并肩除妖，必须做出有代价的选择，开始触及云墟秘境的线索。云游剑客陆长汀恰在城中酒楼，远远地看了一场热闹。', gates: [layerGate('l3', '修为达到炼气3层', 3)], rewards: { cultivation: 18, stones: 8 }, heroines: ['沈月华', '柳如烟', '苏凝霜'] },
  { id: 4, name: '秘境开启', stageGoal: '深入云墟秘境历练，与楚红绫不打不相识，得知身世一角', beat: '云墟秘境开启，主角深入秘境历练，与魔道圣女楚红绫不打不相识、争夺机缘，落霞谷医修白芷随队救人，险境与机缘并存，得到关键之物或得知身世的一角，心境发生转变。', gates: [layerGate('l6', '修为达到炼气6层', 6), winsGate('b1', '斗法获胜 1 场', 1)], rewards: { cultivation: 18, stones: 8 }, heroines: ['楚红绫', '白芷'] },
  { id: 5, name: '商路与魔影', stageGoal: '沈家家变、白芷救毒、魔道暗流，多线交织下奔走抉择', beat: '商路与魔影：沈家商队在黑风岭遇袭、沈家家变，沈月华独撑门户；主角身中奇毒被白芷救回药庐；魔道暗流涌动，楚红绫的立场开始动摇。幽冥楼少主祁照夜的名字，开始在坊市的传闻里出现。多线交织，主角在几位女子之间奔走，情与义都要有重量。', gates: [realmGate('zj', '突破到筑基期', 1), bondGate('bd1', '与任意一位女主完成初遇际遇', 1)], rewards: { cultivation: 18, stones: 8 }, heroines: ['沈月华', '白芷', '楚红绫'] },
  { id: 6, name: '丹成之劫', stageGoal: '修为逼近金丹大关，心魔幻象中回收旧日伏笔', beat: '主角修为逼近金丹大关，心魔幻象中这一生遇见的人一一浮现，姜雪衣雪夜剖心、苏凝霜赠剑穗，一场大冲突爆发，旧日伏笔回收，主角付出真实代价后迎来结丹的契机。宁砚秋守在闭关洞府之外，替他挡下了一场不该来的问询。', gates: [realmGate('zj2r', '突破到筑基期', 1), contributionGate('c40', '门派贡献达到 40', 40)], rewards: { cultivation: 18, stones: 8 }, heroines: ['姜雪衣', '苏凝霜'] },
  { id: 7, name: '正魔之战', stageGoal: '血河宗压境逼圣女继位，整合人心迎战', beat: '正魔之战：血河宗压境，逼圣女楚红绫回山继位，正魔大战一触即发。苏凝霜的剑、沈月华的商路粮草、白芷的医毒、姜雪衣的冰锋、柳如烟的情报、祁照夜的暗线——众人的命运在此交汇，主角必须做出决定性的选择，整合人心迎战。', gates: [realmGate('jd', '结成金丹', 2), winsGate('b3', '斗法获胜 3 场', 3), bondGate('bd2', '与任意一位女主走到交心（好感 25）', 25)], rewards: { cultivation: 18, stones: 8 }, heroines: ['苏凝霜', '沈月华', '白芷', '楚红绫', '姜雪衣', '柳如烟'] },
  { id: 8, name: '婴啼云墟', stageGoal: '冲击元婴，天劫与心魔齐至，写成完整收束的结局', beat: '最终章：主角冲击元婴，天劫与心魔齐至，一生经历如走马灯，与他结下情缘的人都在劫云之外等他。最终元婴成就或与其擦肩——写成完整收束的结局篇章，要有余韵。', gates: [realmGate('jd2r', '结成金丹', 2), contributionGate('c120', '门派贡献达到 120', 120)], rewards: { cultivation: 18, stones: 8 }, heroines: ['苏凝霜', '沈月华', '白芷', '楚红绫', '姜雪衣', '柳如烟'] },
];

export const npcs: NPC[] = [
  { id: 'suning', name: '苏凝霜', role: '青云宗大师姐', persona: '青云宗大师姐苏凝霜，筑基后期，清冷寡言，外冷内热，剑术超群。与主角月下试剑结缘，起初只是例行指点，后来并肩除妖、替他挡过毒爪，渐渐多了几分藏不住的在意。说话简洁克制，偶尔流露关心又立刻收回，赠剑穗时先红了眼眶。', relationshipLines: ['月下演武场，主角撞见苏凝霜独自练剑。她破例停下，指点了主角三招，临走丢下一句：每月十五，月下再比。清冷的人，第一次对人破例。', '临渊城外妖兽伤人，苏凝霜与主角联手夜战。她替主角挡下一记毒爪，肩头见血，主角背着她一步步走回山门，她伏在他背上，轻声说了一句平时绝不会说的话。', '主角冲击大境界前夜，苏凝霜来访，赠他一枚亲手编的剑穗，只说了四个字：活着回来。说完先红了眼眶，转身时剑穗在风里轻轻晃。'] },
  { id: 'shenyuehua', name: '沈月华', role: '临渊沈家嫡女 · 丹商少东家', persona: '临渊城第一丹商沈家嫡女沈月华，年方十八已执掌半城药铺，算盘打得比剑还快。精明爽利、笑里藏锋，最恨别人当她是娇小姐。与主角初时是坊市里斗眼力的对手，后来商路遇袭背靠背撑到天亮，沈家家变时主角站在她身侧，从此她把沈家令牌都塞给了他。说话干脆利落，爱拿灵石开玩笑，认真时却比谁都护短。', relationshipLines: ['主角在沈家铺子差点被奸商做局，沈月华当众出手拆穿，又与主角对赌眼力：一局定胜负，输的请吃饭。不打不相识，她笑说这临渊城里，敢跟她对赌的人不多。', '沈家商队穿黑风岭遇袭，主角恰在护送之列。两人背靠背撑到援兵赶到，天亮时她收起惯常的算盘脸，第一次跟主角说了几句真心话。', '沈家家变，叔伯夺权，沈月华独撑门户，主角站到她身侧陪她走完最难的一夜。风波平后，她把沈家令牌塞进主角手里：沈家的门，从今往后为你开。'] },
  { id: 'baizhi', name: '白芷', role: '落霞谷医修 · 白衣毒手', persona: '落霞谷首席医修白芷，白衣胜雪，医毒双绝：左手能起死回生，右手能杀人无形。性子温温柔柔，下毒时也笑吟吟的，让人分不清真心假意。起初只当主角是难得的试药人，后来他中奇毒，她以自身精血为引相救；药庐深夜里，总多备一副碗筷。说话轻声细语，绵里藏针。', relationshipLines: ['白芷新炼了一味药，正缺试药人，笑吟吟地请主角帮忙。药性发作闹出不少笑话，她笑弯了腰，赔了他一瓶亲手炼的保命丹，说：下次还找你。', '主角受伤被白芷救回药庐，养伤数日。某个深夜，她难得收起笑意，说起自己学医的缘由与心底最怕的事——药庐的灯，那一夜亮到很晚。', '主角中了奇毒，命悬一线。白芷以自身精血为引解毒，昏睡三日才醒，醒来第一句话是问：他好不好。她腕上的伤，比她说的要深得多。'] },
  { id: 'chuhongling', name: '楚红绫', role: '魔道圣女 · 红绫剑主', persona: '出身魔道血河宗的圣女楚红绫，一身红衣，一柄软剑，行事全凭喜怒，江湖人称红绫罗刹。与主角在秘境中不打不相识，抢过他的机缘，也替他挡过一剑；血河宗逼她回山继位时，她站在正魔边界等主角一句话。亦正亦邪，快意恩仇，心底藏着一段不为人知的身世。说话张扬恣意，爱逗主角脸红，动了真情反而别扭。', relationshipLines: ['秘境深处，主角与楚红绫同时看上一株灵药。先动手为强，两人大战一场不分胜负，她抹去嘴角的血笑说：有意思，咱们各凭本事，再比一场。', '绝境之中，楚红绫替主角挡了一剑，嘴上却硬说是手滑。主角为她寻药疗伤、在山洞里守了她一夜，梁子就这么结成了交情。', '血河宗逼楚红绫回山继位，她站在正魔边界的风口等主角，只问他一句话。主角的回答，将决定这位魔道圣女今后的去留——这一段要写出她罕见的脆弱与倔强。'] },
  { id: 'jiangxueyi', name: '姜雪衣', role: '青云宗主之女 · 冰灵根天才', persona: '青云宗主之女姜雪衣，天生冰灵根，十六岁筑基，与苏凝霜并称青云双璧，性子却比苏凝霜更傲。视主角为头号竞争对手，处处要压他一头：比剑、比炼丹、比秘境收获，输了就冷脸三天。骄傲背后的心意藏得最深，雪夜里才肯卸下防备。说话简短带刺，夸人像骂人。', relationshipLines: ['姜雪衣当众给主角下战书：三月之后，演武场比剑。主角苦练备战，却发现她总「恰好」出现在他练剑的地方，冷着脸点评两句又走——来得比谁都勤。', '比剑之日，两人剑光如雪，打到最后一招才分胜负，无论谁赢都要写得有风度。赛后她破天荒地夸了主角一句，说完自己先别过脸去。', '大雪之夜，姜雪衣卸下所有骄傲，道出宗主之女的压力与孤独：所有人都看她的冰灵根，没人问她冷不冷。她把最软的一面，只给主角一个人看。'] },
  { id: 'liuruyan', name: '柳如烟', role: '临渊坊市情报贩 · 如烟姑娘', persona: '临渊城坊市里最灵通的情报贩子柳如烟，出身成谜，笑靥如花，谁的秘密都买得到，唯独她自己的卖多少钱都不说，与问天铺玄机子似有渊源。给主角的消息总比别人的准三分、便宜三分，问她为什么，只说看你顺眼；后来把关乎身家性命的旧物都托付给了他。说话妩媚机灵，真假掺半。', relationshipLines: ['柳如烟主动找上主角，半价卖他一条日后能救命的情报，只收一顿饭的价。问她为什么，她笑说：这叫投资潜力股，亏不了。', '她约主角夜游坊市，半真半假讲了三个版本的自己身世，让主角猜哪个是真。灯火里她的笑第一次有点不像假的——主角猜完，她却不肯公布答案。', '柳如烟难得收起笑脸，把一件关乎她身家性命的旧物托付主角保管，只说一句：这世上，我只信你一个。这一段写她罕见的认真与主角的郑重承诺。'] },
  { id: 'laodao', name: '玄机子', role: '问天铺掌柜', persona: '问天铺掌柜玄机子，来历成谜的老道，笑眯眯的，什么消息都卖，什么话都只说三分。爱打机锋，似乎知道许多关于云墟秘境和主角身世的秘密，但从不白说。', relationshipLines: ['玄机子在柜台后拨着算盘，头也不抬：小友面带劫气，近日宜静不宜动——听不听在你，卦钱照付。', '主角替问天铺跑了一趟腿，老道难得正色，把一枚旧铜钱推过来：拿着，日后自有用处。', '深夜打烊，玄机子望着云墟山的方向出神，只说了一句：这盘棋，下到你这一辈，怕是要收官了。'] },
  { id: 'tiehan', name: '赵铁山', role: '任务堂执事', persona: '任务堂执事赵铁山，炼气大圆满，嗓门洪亮的糙汉子，认钱也认人情。对肯吃苦的新人格外照顾，常偷偷把好任务留给主角。说话直来直去，带着江湖气。', relationshipLines: ['赵铁山把任务牌往柜台上一拍：新来的？先接个稳当的，活着回来，比什么都强。', '主角办砸了差事回来交账，赵铁山骂归骂，还是替他把窟窿补上了一半：下不为例。', '庆功酒喝到半酣，赵铁山拍着主角的肩膀：老子看人从没错过，你小子将来是要成事的。'] },
  { id: 'aqi', name: '阿绮', role: '落霞谷药童', persona: '落霞谷药童阿绮，十四五岁的少女，活泼话痨，认得全谷每一株草药。偷偷把自己炼的糖丸当丹药送人。把主角当亲哥哥一样黏着，总想拉着主角去谷后山看萤火虫。', relationshipLines: ['阿绮抱着药篓一头撞进主角怀里，献宝似的掏出一把糖丸：哥哥尝尝，我新炼的「丹药」！', '主角陪阿绮去后山采药，她一路念叨每株草的名字与脾气，比谷里的老药师还熟。', '萤火虫漫天的夜里，阿绮认真地说：等我长大了，也要像哥哥一样厉害，去很远的地方。'] },
  { id: 'ningyanqiu', name: '宁砚秋', role: '青云宗执法长老', persona: '青云宗执法长老宁砚秋，持律如山，面冷心正。掌宗门刑罚多年，得罪过的人能排满演武场，却也为无辜弟子担过不止一次责。说话惜字如金，句句落在证据与规矩上；对主角起初只是例行审视，后来几次旧案交锋里，渐渐把这个敢把真相放在宗门声誉之前的年轻人记在了心里。', relationshipLines: ['宁长老在执法堂给我一次申辩机会，提醒我证据比怒火更有分量。', '他将旧案卷宗交给我查阅，因为相信我会把真相放在宗门声誉之前。', '他在大战后替我承担问责，只说守住规矩不是为了让强者更强。'] },
  { id: 'luchangting', name: '陆长汀', role: '云游剑客', persona: '云游剑客陆长汀，洒脱豪迈，一壶酒一把剑走遍云墟。爱酒，更爱替朋友拔剑；看似什么都不放在心上，真到了生死关头却从不缺席。与主角在破庙里分过半壶酒，从此把这个年轻人的麻烦当成自己的麻烦。说话带着江湖人的爽利与自嘲，笑骂之间自有分寸。', relationshipLines: ['陆长汀在破庙分我半壶酒，听完我的困局便说朋友的麻烦就是自己的。', '他教我在逆风里收剑，笑称真正的剑客不靠胜负证明胆量。', '他把佩剑留在我手里远行，说等我归来时要用这把剑与我痛快一战。'] },
  { id: 'qizhaoye', name: '祁照夜', role: '幽冥楼少主', persona: '幽冥楼少主祁照夜，沉默多疑，常年戴着半张银面，守着黑暗里的一桩旧誓。正道中人提起幽冥楼无不皱眉，他却有自己的底线：不杀无辜，不卖恩人。与主角几次交锋都留了手，后来在月蚀之夜摘下面具，把退路与秘密都交了出来。说话阴冷简短，偶尔一句真心话比刀还直。', relationshipLines: ['祁照夜在巷口替我抹去追兵踪迹，只问我是否愿意听一个死人留下的秘密。', '他把幽冥楼的密钥交给我，承认自己第一次把退路交给旁人。', '他在月蚀之夜解开面具，说若世人皆怕黑暗，至少我可以与他一起看清它。'] },
];

export const heroineBonds: HeroineBond[] = npcs
  .filter((npc) => ['suning', 'shenyuehua', 'baizhi', 'chuhongling', 'jiangxueyi', 'liuruyan'].includes(npc.id))
  .map((npc) => ({
    npcId: npc.id,
    stages: (['初遇', '交心', '情缘深种'] as const).map((name, i) => ({
      name,
      gate: [0, 25, 55][i] ?? 0,
      title: npc.relationshipLines[i]?.slice(0, 6) ?? name,
      story: npc.relationshipLines[i] ?? '',
    })),
  }));

/** 红颜日常相处素材（走完三段后轮换取材，源自原关系线意象扩写口径）。 */
export const bondDaily: Record<string, string[]> = {
  suning: ['雪后校场，苏凝霜截住失控的剑气，只淡淡说了一句「站稳」，收剑时却把最难的剑诀批注塞进我手里。', '山门灯火下，她承认愿意把自己的退路与我放在同一处——说完先别过脸去看雪。'],
  shenyuehua: ['丹炉炸裂前她掀翻账册把我拽出火星，随后蹲下认真核算那一炉药材的损耗，嘴硬心软。', '商队夜灯下，她说只有把底牌交给我，才算真正的合伙人。'],
  baizhi: ['药谷诊脉，她替我挑出经脉里的寒毒，指尖沾血仍耐心解释每一步，温声里藏着锋刃。', '她把装着解药的银瓶挂到我腰间，说若我受伤，她会亲自来讨债。'],
  chuhongling: ['魔焰之中她收刀放我一条生路，挑眉问我敢不敢记住这份人情，赤绫在夜色里猎猎作响。', '暗河之上，她第一次说起圣女冠冕下的孤独，要求同行就别对她心软。'],
  jiangxueyi: ['冰湖边她一招封住妖兽，转身只要求我别把她当需要仰望的天才——并肩出手时不许慢半拍。', '飞雪里她向我低了半寸，承认此生最信任的对手与知己只有我。'],
  liuruyan: ['坊市人潮里，她用一枚铜钱换来我被跟踪的消息，转身又把铜钱塞回我掌心。', '她收起惯常的笑，承认最珍贵的消息从来不是价高者得，而是只想告诉我。'],
};

export const achievements: Achievement[] = [
  { id: 'first_breath', name: '引气入体', desc: '第一次将灵气引入丹田', icon: '🌬', trigger: { type: 'cultivation', value: 1 }, reward: { stones: 0 } },
  { id: 'join_faction', name: '有门有派', desc: '拜入门派或加入散修盟', icon: '🏯', trigger: { type: 'contribution', value: 10 }, reward: { stones: 20 } },
  { id: 'first_task', name: '初入江湖', desc: '完成第一个任务堂任务', icon: '📜', trigger: { type: 'task', value: 1 }, reward: { stones: 0 } },
  { id: 'rich', name: '腰缠万贯', desc: '灵石达到 200', icon: '💰', trigger: { type: 'stones', value: 200 }, reward: { stones: 0 } },
  { id: 'foundation', name: '筑基成功', desc: '突破至筑基期', icon: '⚡', trigger: { type: 'cultivation', value: 100 }, reward: { stones: 60 } },
  { id: 'golden', name: '金丹大道', desc: '结成金丹', icon: '🔮', trigger: { type: 'cultivation', value: 360 }, reward: { stones: 0 } },
  { id: 'yuanying', name: '元婴老祖', desc: '修成元婴，抵达主线结局', icon: '🌟', trigger: { type: 'cultivation', value: 980 }, reward: { stones: 0 } },
  { id: 'kind', name: '善名远扬', desc: '善缘达到 30', icon: '🕊', trigger: { type: 'karma', value: 30 }, reward: { stones: 0 } },
  { id: 'ruthless', name: '心狠手辣', desc: '善缘低至 -30', icon: '🗡', trigger: { type: 'karma', value: -30 }, reward: { stones: 0 } },
  { id: 'chatty', name: '故人', desc: '与任意角色累计聊满 10 句', icon: '🍵', trigger: { type: 'chat', value: 10 }, reward: { stones: 0 } },
  { id: 'first_bond', name: '红颜初遇', desc: '完成第一段红颜际遇', icon: '🌸', trigger: { type: 'bond', value: 1 }, reward: { stones: 15 } },
  { id: 'deep_bond', name: '情缘深种', desc: '与一位女主走完三段际遇', icon: '💞', trigger: { type: 'bond', value: 55 }, reward: { stones: 80 } },
  { id: 'many_bonds', name: '故人满座', desc: '与三位女主都结下情缘', icon: '🎐', trigger: { type: 'bond', value: 9 }, reward: { stones: 100 } },
  { id: 'shopper', name: '问天常客', desc: '在问天铺消费 3 次', icon: '🛒', trigger: { type: 'shop', value: 3 }, reward: { stones: 0 } },
  { id: 'survivor', name: '命悬一线', desc: '气血低于 20 后恢复到 80 以上', icon: '🩹', trigger: { type: 'hp', value: 80 }, reward: { stones: 0 } },
  { id: 'chapter5', name: '风云际会', desc: '主线推进到第五章', icon: '📖', trigger: { type: 'chapter', value: 5 }, reward: { stones: 0 } },
  { id: 'hoarder', name: '百宝囊', desc: '行囊中有 5 件物品', icon: '🎒', trigger: { type: 'items', value: 5 }, reward: { stones: 0 } },
  { id: 'longlife', name: '修行十载', desc: '在游戏中度过 10 年', icon: '🕰', trigger: { type: 'years', value: 10 }, reward: { stones: 0 } },
  { id: 'veteran', name: '百战余生', desc: '斗法累计获胜 10 场', icon: '⚔', trigger: { type: 'duel', value: 10 }, reward: { stones: 50 } },
  { id: 'nine_layers', name: '九层圆满', desc: '修为达到炼气 9 层', icon: '🗻', trigger: { type: 'layer', value: 9 }, reward: { stones: 50 } },
  { id: 'wanderer', name: '云游四方', desc: '在探索抉择中做出 3 次抉择', icon: '🧭', trigger: { type: 'event', value: 3 }, reward: { stones: 30 } },
];

export const catalog: { items: CatalogEntry[]; skills: CatalogEntry[]; artifacts: CatalogEntry[]; pills: CatalogEntry[] } = {
  items: [
    { id: 'bichen', name: '避尘符', price: 12, effect: { flee: 1 }, description: '下一次行动免于受伤' },
    { id: 'smoke_talisman', name: '迷烟符', price: 25, effect: { flee: 1 }, description: '捏碎后放出遮蔽神识的青烟，斗法脱身或遇险时保命' },
    { id: 'healing_herb', name: '回春草', price: 8, effect: { hp: 15 }, description: '山野常见的疗伤灵草，入口微苦却能止血，休整时服用恢复更多气血' },
  ],
  skills: [
    { id: 'tuna', name: '吐纳真经', price: 60, effect: { power: 10 }, description: '功法 · 装备后修炼速度 +10%' },
    { id: 'qingyun_jianjue', name: '青云剑诀', price: 110, effect: { power: 16 }, description: '功法 · 装备后修炼 +16%，施法更利' },
    { id: 'returning_tide', name: '回潮诀', price: 140, effect: { power: 18, cultivation: 3 }, description: '功法 · 借水势回转灵力，装备后修炼 +18%，攻守之间留有余地' },
    { id: 'shadow_step', name: '无声步', price: 120, effect: { power: 8, dodge: 15 }, description: '功法 · 坊市秘传身法，装备后修炼 +8%，脚步落地不惊尘，斗法更易脱身' },
  ],
  artifacts: [
    { id: 'qingfeng', name: '青锋剑', price: 45, effect: { power: 14 }, description: '法宝 · 攻击凌厉，任务与斗法皆宜' },
    { id: 'xuantie_dun', name: '玄铁重盾', price: 70, effect: { power: 12, defense: 8 }, description: '法宝 · 装备后斗法减伤' },
    { id: 'liuguang', name: '流光飞梭', price: 95, effect: { power: 15 }, description: '法宝 · 装备后攻击与遁速大涨' },
    { id: 'frost_blade', name: '霜魄刃', price: 170, effect: { power: 28 }, description: '法宝 · 冰灵力凝成的短刃，出鞘便结霜，攻击凌厉异常' },
    { id: 'jade_pearl', name: '青玉佩', price: 85, effect: { power: 10, defense: 8 }, description: '法宝 · 温润玉佩能替主人挡下暗劲，装备后斗法更稳' },
    { id: 'merchant_abacus', name: '金丝算盘', price: 100, effect: { power: 6, stones: 5 }, description: '法宝 · 沈家商队信物，拨动算珠便能洞察货路，装备后眼力过人' },
  ],
  pills: [
    { id: 'qi_pill', name: '聚气丹', price: 20, effect: { cultivation: 10 }, description: '打坐时服用，修为大涨' },
    { id: 'healing_pill', name: '回春丹', price: 15, effect: { hp: 30 }, description: '恢复气血 40' },
    { id: 'foundation_pill', name: '筑基丹', price: 80, effect: { breakthrough: 10 }, description: '突破筑基时成功率大增' },
    { id: 'yuanying_pill', name: '凝婴丹', price: 150, effect: { breakthrough: 10 }, description: '突破元婴时成功率大增' },
  ],
};

export const tasks = [
  { title: '采摘月光草', desc: '后山悬崖边的月光草只在月圆夜舒展叶片，落霞谷急需三株入药。', base: 34, stones: 12, risk: 0.15 },
  { title: '护送商队', desc: '一支凡人商队要穿过黑风岭，近来岭中有低阶妖兽出没，需要修士随行。', base: 40, stones: 18, risk: 0.3 },
  { title: '清理矿洞妖鼠', desc: '灵石矿洞深处闹起了噬金鼠，再不清理，这个月的矿脉产量就要泡汤。', base: 38, stones: 15, risk: 0.25 },
  { title: '寻回走失灵兽', desc: '一位师姐的寻宝貂跑进了迷雾林，活要见貂，死……最好别死。', base: 30, stones: 14, risk: 0.1 },
  { title: '镇守药园三夜', desc: '药园的凝血花将熟，夜里总有东西在篱笆外徘徊，需要有人守上三夜。', base: 36, stones: 16, risk: 0.2 },
  { title: '押送执法卷宗', desc: '执法堂一批旧案卷宗要送往临渊城存档，宁砚秋亲自交代：卷宗比命金贵，路上不许离手。', base: 42, stones: 20, risk: 0.2 },
  { title: '坊市夜巡', desc: '坊市近来夜里不太平，摊主们凑了灵石请修士巡上三夜，柳如烟说巡到城西废庙时多留个心眼。', base: 36, stones: 17, risk: 0.25 },
] as const;

export const sectTasks = [
  { title: '巡山守夜', brief: '替门派巡守山门一夜，山风穿林、星子满天，也可能撞见不该出现的东西。', contribution: 9, stones: 6, cultivation: 6 },
  { title: '药圃除害', brief: '门派药圃闹了噬灵虫，要在不伤灵药的前提下把虫害除净，是个考验耐心的细致活。', contribution: 8, stones: 5, cultivation: 8 },
  { title: '押运灵石矿', brief: '随队把新采的灵石矿押回山门，路不算远，但惦记这批货的人不少。', contribution: 12, stones: 10, cultivation: 5 },
  { title: '演武场陪练', brief: '给新入门的弟子当陪练，喂招拆招，一天下来嗓子哑了、胳膊酸了，心里却通透了几分。', contribution: 10, stones: 4, cultivation: 10 },
  { title: '抄录藏经', brief: '在藏经阁抄录残破功法残页，老执事在旁打盹，字里行间偶有前人批注令人心头一震。', contribution: 11, stones: 3, cultivation: 12 },
  { title: '执法堂值守', brief: '替宁砚秋在执法堂值守一日：登记来往卷宗、看管堂前铜铃。长老只交代了一句——谁来探口风，都记下来。', contribution: 12, stones: 6, cultivation: 9 },
  { title: '后山封禁巡查', brief: '后山旧封禁近来灵光不稳，要沿着封印桩挨个巡查补固，祁照夜留下的那道暗痕就混在其中。', contribution: 13, stones: 8, cultivation: 7 },
] as const;

export const opponents = [
  { name: '铁背妖熊', kind: '妖兽', brief: '黑风岭的铁背妖熊，皮糙肉厚、力大无穷，獠牙上还挂着上个倒霉蛋的衣角。', moves: ['熊掌横扫', '裂地冲撞', '咆哮震慑'] },
  { name: '影爪豹', kind: '妖兽', brief: '迷雾林的影爪豹，快如鬼魅，专攻咽喉与后心，爪风未至先闻腥气。', moves: ['影袭扑杀', '连环爪影', '雾遁绕后'] },
  { name: '同门师兄周烈', kind: '切磋', brief: '演武场上入门更早的师兄周烈，抱剑而立，笑着说要讨教三招，围观同门已围成一圈。', moves: ['青云三叠', '回风落雁', '剑气纵横'] },
  { name: '蒙面劫修', kind: '魔修', brief: '山道转弯处拦路的蒙面劫修，袖中淬毒短刃，话不多说，出手就是杀招。', moves: ['毒刃穿心', '血影遁', '蚀骨掌'] },
  { name: '青铜守关傀儡', kind: '傀儡', brief: '秘境石门前的青铜傀儡，关节咔咔作响，巨剑拖地擦出火星——胜者过关。', moves: ['巨剑劈山', '铜臂横扫', '震地践踏'] },
  { name: '幽冥楼影卫', kind: '魔修', brief: '幽冥楼的影卫，半张银面、脚步无声，袖中锁喉索专取人咽喉。祁照夜曾说楼里的人出手只问价钱，不问缘由——眼前这位显然接了单。', moves: ['影遁突刺', '锁喉索', '烟遁换位'] },
  { name: '冰湖玄蛟', kind: '妖兽', brief: '极北冰湖里的玄蛟，鳞甲凝霜、一口寒息能冻住剑光。姜雪衣当年一式封湖，封的正是它的老巢——如今冰面裂了，它出来讨债。', moves: ['寒息喷吐', '蛟尾横扫', '破冰扑杀'] },
] as const;

export const recipes = [
  { id: 'juqi', name: '炼聚气丹', cost: 8, chance: 0.8, product: '聚气丹', desc: '8 灵石药材 → 聚气丹（自用涨修为，出售 12 灵石）' },
  { id: 'huichun', name: '炼回春丹', cost: 6, chance: 0.85, product: '回春丹', desc: '6 灵石药材 → 回春丹（疗伤，出售 9 灵石）' },
  { id: 'bichen', name: '制避尘符', cost: 5, chance: 0.85, product: '避尘符', desc: '5 灵石符纸 → 避尘符（保命，出售 7 灵石）' },
  { id: 'zhuji', name: '炼筑基丹', cost: 42, chance: 0.5, product: '筑基丹', desc: '42 灵石珍材 → 筑基丹（出售 48 灵石，炼成即赚）' },
  { id: 'ningying', name: '炼凝婴丹', cost: 70, chance: 0.5, product: '凝婴丹', desc: '70 灵石珍材 → 凝婴丹（出售 90 灵石，炼成即赚）' },
] as const;
