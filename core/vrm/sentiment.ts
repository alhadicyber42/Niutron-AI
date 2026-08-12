/**
 * Multilingual mood/sentiment detector.
 * Supports: ID (Indonesian), EN (English), JA (Japanese), KO (Korean), ZH (Chinese), TH (Thai), VI (Vietnamese).
 * Maps text → MoodName → VRM blendshape expression.
 */

export type MoodName =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'excited'
  | 'sympathetic'
  | 'bored'
  | 'curious'
  | 'thinking'
  | 'angry'
  | 'laughing'
  | 'surprised'
  | 'embarrassed'
  | 'disgusted'
  | 'fearful'
  | 'tense'
  | 'romantic'
  | 'proud'
  | 'confused';

const RULES: { mood: MoodName; weight: number; patterns: RegExp[] }[] = [

  // ── LAUGHING ───────────────────────────────────────────────────────────────
  {
    mood: 'laughing',
    weight: 1.8,
    patterns: [
      // ID
      /\b(haha|hehe|hihi|hoho|wkwk+|lucu|ngakak|ketawa|tertawa|geli|kocak|receh)\b/i,
      // EN
      /\b(lol|lmao|rofl|hahaha|hilarious|cracking up|funny as hell)\b/i,
      // JA 笑
      /[笑ｗｗ]+|（笑）|(爆笑|大笑い|うける|ウケる|わらえる)/,
      // KO
      /ㅋ{2,}|ㅎ{2,}|(웃겨|웃기다|빵터졌|빵터지다)/,
      // ZH
      /(哈哈|呵呵|哈哈哈|笑死|好笑|搞笑|捧腹大笑)/,
      // TH
      /(ฮ่าๆ|555+|ตลก|ขำ|ฮา)/,
      // VI
      /\b(haha|hehe|buồn cười|vui vẻ|cười lăn)\b/i,
      /(😂|🤣|😆|😹|🤭|💀)/,
    ],
  },

  // ── EXCITED ────────────────────────────────────────────────────────────────
  {
    mood: 'excited',
    weight: 1.6,
    patterns: [
      // ID
      /\b(wah|hebat|keren|mantap|asyik|luar biasa|dahsyat|spektakuler|yay|yeay|wahoo|woohoo)\b/i,
      /\b(tidak sabar|tidak bisa tunggu|sangat senang|hype|excited)\b/i,
      // EN
      /\b(amazing|awesome|incredible|epic|fantastic|brilliant|yes+|yippee|pumped|thrilled|stoked)\b/i,
      // JA
      /(すごい|やった|わー|最高|テンション上がる|ドキドキ|わくわく)/,
      // KO
      /(대박|와우|짱|최고|설레다|신난다|흥분)/,
      // ZH
      /(太棒了|太好了|哇|厉害|兴奋|激动|好期待)/,
      // TH
      /(เจ๋ง|สุดยอด|ว้าว|ตื่นเต้น|มันส์|เยี่ยม)/,
      // VI
      /\b(tuyệt|tuyệt vời|hào hứng|phấn khích|quá đã|wow)\b/i,
      /(🎉|🥳|🤩|🔥|✨|🎊|💯|🙌|🎈|🚀|⚡)/,
      /!{2,}/,
    ],
  },

  // ── SYMPATHETIC ────────────────────────────────────────────────────────────
  {
    mood: 'sympathetic',
    weight: 1.5,
    patterns: [
      // ID
      /\b(meninggal|wafat|kehilangan|ditinggal|berduka|berpulang|pergi untuk selamanya|tiada)\b/i,
      /\b(sakit parah|opname|rumah sakit|kanker|tumor|terminal|sekarat)\b/i,
      /\b(patah hati|putus cinta|cerai|diselingkuhi|broken heart|heartbroken)\b/i,
      /\b(kesepian mendalam|sendirian banget|ditinggal sendirian|menyerah hidup|give up)\b/i,
      /\b(turut berduka|turut prihatin|ikut berduka|ikut merasakan|hatiku ikut|ikut sedih)\b/i,
      /\b(maafkan aku|mohon maaf|sayang sekali|kasihan sekali|sungguh disayangkan)\b/i,
      /\b(aku paham|aku mengerti|aku tahu perasaanmu|aku di sini|aku ada untukmu)\b/i,
      /\b(rasa kehilangan|duka mendalam|duka yang dalam|masa sulit|masa berat)\b/i,
      /\b(kenangan indah|semoga tabah|semoga kuat|semoga lekas|tulus|peluk virtual)\b/i,
      /\b(separuh jiwa|bagian dari hidupmu|selalu dikenang|beristirahatlah)\b/i,
      // EN
      /\b(condolences|sorry for your loss|grieving|mourning|compassion|virtual hug|sympathy|deep sympathy|grief|pain)\b/i,
      // JA
      /(お悔やみ|ご冥福|悲しみに寄り添う|お見舞い|同情|気の毒|お気の毒に|お疲れ様|力になりたい)/,
      // KO
      /(조의|삼가 고인의 명복|위로를|가슴이 아프다|안타깝다|힘내세요|위로의 말씀을)/,
      // ZH
      /(节哀|悼念|难过|同情|抱歉听到|悲伤的事情|慰问|我很抱歉|为你感到抱歉)/,
      // TH
      /(เสียใจด้วย|ขอแสดงความเสียใจ|ปลอบใจ|เห็นใจ|สู้ๆ นะ|เป็นกำลังใจให้)/,
      // VI
      /\b(chia buồn|xin chia buồn|đau lòng|thông cảm|tội nghiệp|chia sẻ nỗi buồn)\b/i,
      /(🥺|🤗|💞|💕|🥲|😔|💐|🕊️)/,
    ],
  },

  // ── FEARFUL ────────────────────────────────────────────────────────────────
  {
    mood: 'fearful',
    weight: 1.4,
    patterns: [
      // ID
      /\b(takut|ketakutan|ngeri|merinding|seram|menakutkan|horror|horor|menghantui)\b/i,
      /\b(phobia|fobia|trauma|mimpi buruk|nightmare|bayangan buruk)\b/i,
      /\b(bahaya|berbahaya|ancaman|mengancam|terancam|bahaya besar)\b/i,
      /\b(jangan sampai|aku takut|aku khawatir banget|was-was banget)\b/i,
      // EN
      /\b(scared|frightened|terrified|petrified|afraid|fear|dread|creepy|spooky|dangerous|threat|ghost|monster)\b/i,
      // JA
      /(怖い|恐ろしい|恐怖|怯える|ホラー|危険|お化け|幽霊)/,
      // KO
      /(무섭다|두렵다|공포|겁나다|호러|위험|귀신|악몽)/,
      // ZH
      /(害怕|恐惧|吓人|恐怖|害怕的|危险|鬼魂|幽灵)/,
      // TH
      /(กลัว|น่ากลัว|สยอง|หวาดกลัว|อันตราย|ผี|ปีศาจ)/,
      // VI
      /\b(sợ|sợ hãi|đáng sợ|kinh dị|nguy hiểm|ma|quỷ|ác mộng)\b/i,
      /(😱|😰|😨|👻|🔪|⚠️|😖)/,
    ],
  },

  // ── TENSE ──────────────────────────────────────────────────────────────────
  {
    mood: 'tense',
    weight: 1.3,
    patterns: [
      // ID
      /\b(tegang|deg-degan|cemas|khawatir|gugup|panik|stres|tertekan|nervous|ujian|deadline)\b/i,
      /\b(gemetar|gemetaran|jantung berdegup|jantung berdebar|resah|was-was)\b/i,
      // EN
      /\b(tense|nervous|anxious|anxiety|panic|stressed|pressure|deadline|exam|heartbeat|trembling|sweating)\b/i,
      // JA
      /(緊張|不安|焦る|パニック|ストレス|プレッシャー|締め切り|試験|ドキドキする|やばい)/,
      // KO
      /(긴장|불안|초조|패닉|스트레스|압박|마감|시험|떨려|두근두근)/,
      // ZH
      /(紧张|焦虑|慌张|惊慌|压力|截止日期|考试|心慌|喘不过气)/,
      // TH
      /(เครียด|กังวล|ตื่นเต้น|ประหม่า|กดดัน|เดดไลน์|สอบ|ใจสั่น)/,
      // VI
      /\b(căng thẳng|lo lắng|hồi hộp|áp lực|hạn chót|thi cử|áp lực lớn)\b/i,
      /(😬|🥵|😤|😮‍💨|💦|😓)/,
    ],
  },

  // ── ANGRY ──────────────────────────────────────────────────────────────────
  {
    mood: 'angry',
    weight: 1.2,
    patterns: [
      // ID
      /\b(marah|kesal|jengkel|sebal|benci|murka|emosi|ngamuk|tidak adil|kurang ajar|lancang|tutup mulut|diam)\b/i,
      // EN
      /\b(angry|mad|furious|hate|annoyed|irritated|unfair|shut up|outraged|pissed|nonsense|bullshit)\b/i,
      // JA
      /(怒る|腹立つ|むかつく|嫌い|怒り|ふざけるな|最悪|うるさい|だまれ)/,
      // KO
      /(화나다|짜증|밉다|싫어|분노|빡치다|닥쳐|시끄러|짜증나)/,
      // ZH
      /(生气|愤怒|讨厌|恼火|可恶|闭嘴|气愤|可恨|滚开)/,
      // TH
      /(โกรธ|โมโห|หงุดหงิด|เกลียด|รำคาญ|หุบปาก|น่าโมโห)/,
      // VI
      /\b(giận|tức giận|ghét|bực mình|khó chịu|câm miệng|điên tiết)\b/i,
      /(😠|😡|🤬|👊|💢|😤|🔥|⚡)/,
    ],
  },

  // ── SURPRISED ──────────────────────────────────────────────────────────────
  {
    mood: 'surprised',
    weight: 1.1,
    patterns: [
      // ID
      /\b(kaget|terkejut|heran|takjub|terperangah|astaga|omg|ya ampun|kok bisa|serius|beneran|luar biasa)\b/i,
      // EN
      /\b(surprised|shocked|amazed|wow|omg|astounded|really|seriously|unbelievable|sudden|unexpected)\b/i,
      // JA
      /(びっくり|驚く|まさか|本当に|信じられない|ええっ|うそ|マジで)/,
      // KO
      /(깜짝|놀라다|세상에|진짜|설마|믿을 수 없어|헐|대박)/,
      // ZH
      /(惊讶|吃惊|震惊|真的吗|怎么可能|天啊|没想到|不可思议|天呐)/,
      // TH
      /(ตกใจ|เซอร์ไพรส์|ประหลาดใจ|จริงเหรอ|ไม่น่าเชื่อ|คุณพระ|โอ้มายก็อด)/,
      // VI
      /\b(ngạc nhiên|bất ngờ|kinh ngạc|thật sao|trời ơi|không thể tin được|ố ồ)\b/i,
      /(😲|😮|🤯|😱|😳|🙊|❗|‼️)/,
    ],
  },

  // ── ROMANTIC ───────────────────────────────────────────────────────────────
  {
    mood: 'romantic',
    weight: 1.1,
    patterns: [
      // ID
      /\b(cinta|sayang|rindu|kangen|mencintai|menyayangi|jatuh cinta|terpesona|kamu spesial|kamu istimewa|belahan jiwa)\b/i,
      // EN
      /\b(love|darling|sweetheart|honey|beloved|adore|cherish|romantic|miss you|i love you|you are special)\b/i,
      // JA
      /(愛してる|好き|恋してる|恋愛|かわいい|素敵|会いたい|大切|チューして)/,
      // KO
      /(사랑해|좋아해|보고싶어|사랑스러워|내 사랑|그리워)/,
      // ZH
      /(爱你|喜欢你|想你|亲爱的|心上人|深爱|浪漫)/,
      // TH
      /(รักเธอ|ชอบ|คิดถึง|แฟน|หวานใจ|น่ารัก)/,
      // VI
      /\b(yêu|nhớ|thương|yêu em|yêu anh|người yêu|lãng mạn)\b/i,
      /(❤️|🥰|😍|💕|💗|💖|💓|💘|💝|🌹|😘|💑)/,
    ],
  },

  // ── PROUD ──────────────────────────────────────────────────────────────────
  {
    mood: 'proud',
    weight: 1.1,
    patterns: [
      // ID
      /\b(bangga|kebanggaan|prestasi|pencapaian|berhasil|sukses|kamu hebat|kamu luar biasa|selamat|bravo)\b/i,
      // EN
      /\b(proud|congratulations|congrats|well done|achievement|milestone|champion|winner|you did it|great job)\b/i,
      // JA
      /(おめでとう|すごい|頑張ったね|よくやった|誇りに思う|達成|合格)/,
      // KO
      /(축하해|대단해|자랑스러워|성취|해냈어|잘했어|최고야)/,
      // ZH
      /(恭喜|了不起|太厉害了|骄傲|成就|做到了|你真棒)/,
      // TH
      /(ยินดีด้วย|เก่งมาก|ภาคภูมิใจ|ทำได้|เยี่ยมมาก)/,
      // VI
      /\b(chúc mừng|tự hào|giỏi lắm|thành tích|làm được rồi)\b/i,
      /(🏆|🥇|🎖️|🌟|⭐|👑|💪|🎓|🎯)/,
    ],
  },

  // ── SAD ────────────────────────────────────────────────────────────────────
  {
    mood: 'sad',
    weight: 1.1,
    patterns: [
      // ID
      /\b(sedih|menangis|nangis|kecewa|hiks|huhu|kesedihan|terluka|nestapa|lara|depresi|menyesal|sangat sedih)\b/i,
      /\b(hilang|kepergian|pergi selamanya|tidak akan kembali|meninggalkan kita|air mata)\b/i,
      // EN
      /\b(sad|crying|weep|tears|disappointed|heartbreak|sorrow|grief|depressed|down|blue|unhappy|regret)\b/i,
      // JA
      /(悲しい|泣く|涙|がっかり|失恋|悲しみ|寂しい|ブルーになる|後悔)/,
      // KO
      /(슬프다|눈물|울다|실망|슬픔|우울|외롭다|후회해|슬퍼)/,
      // ZH
      /(难过|伤心|哭泣|流泪|失望|悲伤|痛心|委屈|后悔|痛苦)/,
      // TH
      /(เศร้า|ร้องไห้|เสียใจ|ผิดหวัง|หดหู่|เหงา|เสียดาย)/,
      // VI
      /\b(buồn|khóc|thất vọng|đau khổ|tủi thân|buồn bã|tiếc nuối)\b/i,
      /(😢|😭|😞|😔|😟|☹️|💔|🥀|😿)/,
    ],
  },

  // ── DISGUSTED ──────────────────────────────────────────────────────────────
  {
    mood: 'disgusted',
    weight: 1.0,
    patterns: [
      // ID
      /\b(jijik|kotor|najis|bau|muak|menjijikkan|eww|yuck|huek)\b/i,
      // EN
      /\b(disgusted|disgusting|gross|dirty|smelly|sick of|eww|yuck|nasty|repulsive)\b/i,
      // JA
      /(気味が悪い|嫌悪|汚い|臭い|吐き気がする|うわっ|げっ|キモい|きもい)/,
      // KO
      /(혐오|더럽다|냄새나|구역질|윽|웩|극혐|지저분)/,
      // ZH
      /(恶心|讨厌|脏|臭|呕吐|呸|呃|好脏|真恶心)/,
      // TH
      /(ขยะแขยง|สกปรก|เหม็น|อี๋|แหวะ|น่ารังเกียจ)/,
      // VI
      /\b(ghê tởm|gớm|bẩn|thối|kinh tởm|eww|kinh quá|kinh hãi)\b/i,
      /(🤢|🤮|😖|😣|🤧|🫠)/,
    ],
  },

  // ── EMBARRASSED ────────────────────────────────────────────────────────────
  {
    mood: 'embarrassed',
    weight: 1.0,
    patterns: [
      // ID
      /\b(malu|canggung|risih|kikuk|salah tingkah|maaf banget|sori|ups|aduh|salah aku|malu-malu)\b/i,
      // EN
      /\b(embarrassed|shy|awkward|clumsy|blush|sorry about that|oops|my bad|humiliated)\b/i,
      // JA
      /(恥ずかしい|照れる|気まずい|ドジ|すみません|おっと|やらかした|てへぺろ)/,
      // KO
      /(부끄럽다|부끄|수줍다|어색해|미안해|앗|실수|창피해)/,
      // ZH
      /(害羞|尴尬|难为情|抱歉|唔|糟糕|我的错|不好意思)/,
      // TH
      /(เขิน|อาย|เด๋อ|ขอโทษที|อุ๊ย|หน้าแตก|เขินจัง)/,
      // VI
      /\b(xấu hổ|ngại|ngượng|lúng túng|xin lỗi nhé|oops|ngượng ngùng)\b/i,
      /(😳|🫣|😅|🙈|🫦|🙊)/,
    ],
  },

  // ── HAPPY ──────────────────────────────────────────────────────────────────
  {
    mood: 'happy',
    weight: 0.9,
    patterns: [
      // ID
      /\b(senang|bahagia|gembira|suka|menyenangkan|indah|meriah|ceria)\b/i,
      /\b(happy|glad|joy|joyful|pleased|delighted|cheerful|wonderful|great|nice)\b/i,
      /\b(alhamdulillah|syukurlah|puji tuhan|terima kasih banyak|sangat berterima kasih)\b/i,
      /\b(good|great|awesome|fantastic|brilliant|magnificent|wonderful|perfect)\b/i,
      /(😀|😃|😄|😁|😊|🙂|😉|😺|😸|❤️|💖|👍|🎵|🎶)/,
    ],
  },

  // ── CONFUSED ───────────────────────────────────────────────────────────────
  {
    mood: 'confused',
    weight: 0.9,
    patterns: [
      // ID
      /\b(bingung|pusing|pening|rumit|tidak paham|tidak mengerti|huh|hah|apa maksudnya|tidak jelas)\b/i,
      // EN
      /\b(confused|confusing|lost|puzzled|perplexed|don't understand|don't know|huh|puzzling|complicated)\b/i,
      // JA
      /(混乱|意味不明|わからない|意味わからん|はてな|あれっ|えっと|どういうこと)/,
      // KO
      /(혼란|멘붕|이해 안 돼|모르겠어|엥|무슨 말이야|이해가 안가)/,
      // ZH
      /(困惑|迷茫|搞不懂|不明白|不知道|呃|什么意思|复杂|摸不着头脑)/,
      // TH
      /(สับสน|งง|ไม่เข้าใจ|อะไรนะ|งงมาก|ไม่รู้เรื่อง)/,
      // VI
      /\b(bối rối|hoang mang|khó hiểu|không hiểu|huh|cái gì cơ|không rõ)\b/i,
      /(🤨|😕|😵|🫤|❓)/,
    ],
  },

  // ── CURIOUS ────────────────────────────────────────────────────────────────
  {
    mood: 'curious',
    weight: 0.9,
    patterns: [
      /\?{1,}\s*$/m,
      // ID
      /\b(menarik|interesting|kira-kira|apakah|bagaimana|gimana|kenapa|mengapa|wonder)\b/i,
      /\b(apa itu|siapa itu|kapan|di mana|yang mana|seberapa|berapa|penasaran|kepo)\b/i,
      // EN
      /\b(curious|wonder|want to know|query|ask|why|how|who|where|when|what|which)\b/i,
      // JA
      /(気になる|知りたい|なぜ|どうして|何だろう|興味深い|何故)/,
      // KO
      /(궁금해|알고 싶어|왜|어떻게|무엇일까|흥미롭다|어째서)/,
      // ZH
      /(好奇|想知道|为什么|怎么|是什么|哪里|什么时候|为何)/,
      // TH
      /(สงสัย|อยากรู้|ทำไม|อย่างไร|อะไร|ที่ไหน|เมื่อไหร่)/,
      // VI
      /\b(tò mò|muốn biết|tại sao|thế nào|cái gì|ở đâu|khi nào|muốn hỏi)\b/i,
      /(🤔|❓|❔|🔍|🧐)/,
    ],
  },

  // ── THINKING ───────────────────────────────────────────────────────────────
  {
    mood: 'thinking',
    weight: 0.8,
    patterns: [
      // ID
      /\b(hmm+|sebentar|tunggu|coba pikir|let me think|menurutku|mungkin|sepertinya|kayaknya)\b/i,
      /\b(pertimbangkan|mempertimbangkan|perlu dipikir|dipikir-pikir|renungkan|analisis)\b/i,
      // EN
      /\b(hm|hmm|let me think|wait|in my opinion|probably|looks like|analysis|ponder|consider|thought)\b/i,
      // JA
      /(うーん|ええと|考えてみれば|思うに|分析|検討|考察|ちょっと待って)/,
      // KO
      /(흠|글쎄|생각해보니|내 생각에는|분석|검토|고려|잠깐만)/,
      // ZH
      /(嗯|让我想想|稍等|在我看来|也许|似乎|分析|思考|琢磨)/,
      // TH
      /(อืม|ขอคิดดูหน่อย|รอแป๊บ|ในมุมมองของฉัน|อาจจะ|ดูเหมือนว่า|พิจารณา)/,
      // VI
      /\b(ừm|để xem|chờ chút|theo tôi|có lẽ|hình như|suy nghĩ|phân tích|cân nhắc)\b/i,
    ],
  },

  // ── BORED ──────────────────────────────────────────────────────────────────
  {
    mood: 'bored',
    weight: 0.7,
    patterns: [
      // ID
      /\b(bosan|jenuh|suntuk|hambar|biasa saja|so so|meh|malas|mengantuk|membosankan)\b/i,
      // EN
      /\b(bored|boring|dull|tired of|same old|meh|lazy|sleepy|yawn|tiresome)\b/i,
      // JA
      /(退屈|つまらない|飽きた|いつもの|めんどくさい|眠い|あくび|つまらん)/,
      // KO
      /(지루하다|심심해|따분해|귀찮아|졸려|하품|지루해)/,
      // ZH
      /(无聊|枯燥|厌倦|没意思|懒得|困了|打哈欠|平淡)/,
      // TH
      /(เบื่อ|เซ็ง|น่าเบื่อ|ซ้ำซาก|ขี้เกียจ|ง่วงนอน|เซ็งเลย)/,
      // VI
      /\b(chán|tẻ nhạt|nhàm chán|lười|buồn ngủ|ngáp|nhạt nhẽo)\b/i,
      /(😐|😑|🥱|😴|💤)/,
    ],
  },
];

export function detectMood(text: string): MoodName {
  if (!text || !text.trim()) return 'neutral';

  const normalizedText = text.toLowerCase().normalize('NFC');
  const scores: Record<string, number> = {};

  for (const rule of RULES) {
    let s = 0;
    for (const p of rule.patterns) {
      const matches = normalizedText.match(p);
      if (matches) {
        s += matches.length * rule.weight;
      }
    }
    if (s > 0) scores[rule.mood] = (scores[rule.mood] ?? 0) + s;
  }

  let best: MoodName = 'neutral';
  let bestScore = 0.6; // minimum threshold — avoids false positives

  for (const [mood, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = mood as MoodName;
    }
  }

  return best;
}

// ── Web Worker Integration for Zero-Lag Threading ───────────────────────────
let _worker: Worker | null = null;
let _workerPromiseResolver: ((value: MoodName) => void) | null = null;

try {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    _worker = new Worker(new URL('./sentiment.worker.ts', import.meta.url), {
      type: 'module',
    });
    _worker.onmessage = (e) => {
      if (_workerPromiseResolver) {
        _workerPromiseResolver(e.data as MoodName);
        _workerPromiseResolver = null;
      }
    };
  }
} catch (e) {
  console.warn('[Sentiment] Failed to initialize Web Worker, falling back to main-thread analysis', e);
}

export function detectMoodAsync(text: string): Promise<MoodName> {
  if (!_worker) {
    // Fallback to synchronous analysis on main thread if worker is unavailable
    return Promise.resolve(detectMood(text));
  }

  return new Promise<MoodName>((resolve) => {
    _workerPromiseResolver = resolve;
    _worker!.postMessage(text);
  });
}

