export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

// Voices recommended for each language (less English accent)
// Voices not in this list will be filtered out for that language
export const RECOMMENDED_VOICES_BY_LANGUAGE: Record<string, TtsVoice[]> = {
  // Portuguese - exclude fable (British accent) and echo (English accent)
  pt: ['alloy', 'nova', 'shimmer', 'onyx'],
  // Spanish - similar to Portuguese
  es: ['alloy', 'nova', 'shimmer', 'onyx'],
  // French
  fr: ['alloy', 'nova', 'shimmer', 'onyx'],
  // German
  de: ['alloy', 'nova', 'shimmer', 'onyx', 'echo'],
  // Italian
  it: ['alloy', 'nova', 'shimmer', 'onyx'],
  // English - all voices work well
  en: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  // Default - all voices
  default: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
};

export function getRecommendedVoices(lang: string): TtsVoice[] {
  return RECOMMENDED_VOICES_BY_LANGUAGE[lang] || RECOMMENDED_VOICES_BY_LANGUAGE.default;
}

export const VOICE_DESCRIPTIONS: Record<string, Record<TtsVoice, string>> = {
  en: {
    alloy: 'Neutral and balanced',
    echo: 'Warm male voice',
    fable: 'Expressive storyteller',
    onyx: 'Deep and authoritative',
    nova: 'Friendly female voice',
    shimmer: 'Soft and gentle',
  },
  pt: {
    alloy: 'Neutra e equilibrada',
    echo: 'Voz masculina calorosa',
    fable: 'Contador de historias expressivo',
    onyx: 'Profunda e autoritaria',
    nova: 'Voz feminina amigavel',
    shimmer: 'Suave e gentil',
  },
  es: {
    alloy: 'Neutral y equilibrada',
    echo: 'Voz masculina calida',
    fable: 'Narrador expresivo',
    onyx: 'Profunda y autoritaria',
    nova: 'Voz femenina amigable',
    shimmer: 'Suave y gentil',
  },
  fr: {
    alloy: 'Neutre et equilibree',
    echo: 'Voix masculine chaleureuse',
    fable: 'Conteur expressif',
    onyx: 'Profonde et autoritaire',
    nova: 'Voix feminine amicale',
    shimmer: 'Douce et delicate',
  },
  de: {
    alloy: 'Neutral und ausgewogen',
    echo: 'Warme maennliche Stimme',
    fable: 'Ausdrucksstarker Erzaehler',
    onyx: 'Tief und autoritaer',
    nova: 'Freundliche weibliche Stimme',
    shimmer: 'Sanft und zart',
  },
  it: {
    alloy: 'Neutra ed equilibrata',
    echo: 'Voce maschile calda',
    fable: 'Narratore espressivo',
    onyx: 'Profonda e autorevole',
    nova: 'Voce femminile amichevole',
    shimmer: 'Morbida e gentile',
  },
  ja: {
    alloy: 'ニュートラルでバランスの取れた',
    echo: '温かみのある男性の声',
    fable: '表現力豊かな語り手',
    onyx: '深く威厳のある',
    nova: 'フレンドリーな女性の声',
    shimmer: '柔らかく優しい',
  },
  zh: {
    alloy: '中性且平衡',
    echo: '温暖的男声',
    fable: '富有表现力的讲述者',
    onyx: '深沉而权威',
    nova: '友好的女声',
    shimmer: '柔和温柔',
  },
  ko: {
    alloy: '중립적이고 균형 잡힌',
    echo: '따뜻한 남성 목소리',
    fable: '표현력 있는 이야기꾼',
    onyx: '깊고 권위 있는',
    nova: '친근한 여성 목소리',
    shimmer: '부드럽고 온화한',
  },
  ar: {
    alloy: 'محايد ومتوازن',
    echo: 'صوت ذكوري دافئ',
    fable: 'راوي معبر',
    onyx: 'عميق وموثوق',
    nova: 'صوت انثوي ودود',
    shimmer: 'ناعم ولطيف',
  },
  ru: {
    alloy: 'Нейтральный и сбалансированный',
    echo: 'Тёплый мужской голос',
    fable: 'Выразительный рассказчик',
    onyx: 'Глубокий и авторитетный',
    nova: 'Дружелюбный женский голос',
    shimmer: 'Мягкий и нежный',
  },
  hi: {
    alloy: 'तटस्थ और संतुलित',
    echo: 'गर्म पुरुष आवाज',
    fable: 'अभिव्यंजक कथाकार',
    onyx: 'गहरी और आधिकारिक',
    nova: 'मित्रवत महिला आवाज',
    shimmer: 'कोमल और सौम्य',
  },
};

export function getVoiceDescription(voice: TtsVoice, lang: string): string {
  const langDescriptions = VOICE_DESCRIPTIONS[lang] || VOICE_DESCRIPTIONS.en;
  return langDescriptions[voice] || VOICE_DESCRIPTIONS.en[voice];
}

export const VOICE_PREVIEWS: Record<string, Record<TtsVoice, string>> = {
  en: {
    alloy: 'Hello! I am Alloy, a neutral and balanced voice.',
    echo: 'Hello! I am Echo, with a warm and friendly tone.',
    fable: 'Hello! I am Fable, an expressive storyteller voice.',
    onyx: 'Hello! I am Onyx, with a deep and authoritative sound.',
    nova: 'Hello! I am Nova, a friendly and approachable voice.',
    shimmer: 'Hello! I am Shimmer, with a soft and gentle tone.',
  },
  pt: {
    alloy: 'Ola! Eu sou Alloy, uma voz neutra e equilibrada.',
    echo: 'Ola! Eu sou Echo, com um tom caloroso e amigavel.',
    fable: 'Ola! Eu sou Fable, uma voz expressiva de contador de historias.',
    onyx: 'Ola! Eu sou Onyx, com um som profundo e autoritario.',
    nova: 'Ola! Eu sou Nova, uma voz amigavel e acessivel.',
    shimmer: 'Ola! Eu sou Shimmer, com um tom suave e gentil.',
  },
  es: {
    alloy: 'Hola! Soy Alloy, una voz neutral y equilibrada.',
    echo: 'Hola! Soy Echo, con un tono calido y amigable.',
    fable: 'Hola! Soy Fable, una voz expresiva de narrador.',
    onyx: 'Hola! Soy Onyx, con un sonido profundo y autoritario.',
    nova: 'Hola! Soy Nova, una voz amigable y accesible.',
    shimmer: 'Hola! Soy Shimmer, con un tono suave y gentil.',
  },
  fr: {
    alloy: 'Bonjour! Je suis Alloy, une voix neutre et equilibree.',
    echo: 'Bonjour! Je suis Echo, avec un ton chaleureux et amical.',
    fable: 'Bonjour! Je suis Fable, une voix expressive de conteur.',
    onyx: 'Bonjour! Je suis Onyx, avec un son profond et autoritaire.',
    nova: 'Bonjour! Je suis Nova, une voix amicale et accessible.',
    shimmer: 'Bonjour! Je suis Shimmer, avec un ton doux et delicat.',
  },
  de: {
    alloy: 'Hallo! Ich bin Alloy, eine neutrale und ausgewogene Stimme.',
    echo: 'Hallo! Ich bin Echo, mit einem warmen und freundlichen Ton.',
    fable: 'Hallo! Ich bin Fable, eine ausdrucksstarke Erzaehlerstimme.',
    onyx: 'Hallo! Ich bin Onyx, mit einem tiefen und autoritaeren Klang.',
    nova: 'Hallo! Ich bin Nova, eine freundliche und zugaengliche Stimme.',
    shimmer: 'Hallo! Ich bin Shimmer, mit einem sanften und zarten Ton.',
  },
  it: {
    alloy: 'Ciao! Sono Alloy, una voce neutra ed equilibrata.',
    echo: 'Ciao! Sono Echo, con un tono caldo e amichevole.',
    fable: 'Ciao! Sono Fable, una voce espressiva da narratore.',
    onyx: 'Ciao! Sono Onyx, con un suono profondo e autorevole.',
    nova: 'Ciao! Sono Nova, una voce amichevole e accessibile.',
    shimmer: 'Ciao! Sono Shimmer, con un tono morbido e gentile.',
  },
  ja: {
    alloy: 'こんにちは！私はAlloyです。ニュートラルでバランスの取れた声です。',
    echo: 'こんにちは！私はEchoです。温かくフレンドリーな声です。',
    fable: 'こんにちは！私はFableです。表現力豊かな語り手の声です。',
    onyx: 'こんにちは！私はOnyxです。深く威厳のある声です。',
    nova: 'こんにちは！私はNovaです。親しみやすい声です。',
    shimmer: 'こんにちは！私はShimmerです。柔らかく優しい声です。',
  },
  zh: {
    alloy: '你好！我是Alloy，一个中性且平衡的声音。',
    echo: '你好！我是Echo，有着温暖友好的声音。',
    fable: '你好！我是Fable，一个富有表现力的讲故事的声音。',
    onyx: '你好！我是Onyx，有着深沉而权威的声音。',
    nova: '你好！我是Nova，一个友好而亲切的声音。',
    shimmer: '你好！我是Shimmer，有着柔和温柔的声音。',
  },
  ko: {
    alloy: '안녕하세요! 저는 Alloy입니다. 중립적이고 균형 잡힌 목소리예요.',
    echo: '안녕하세요! 저는 Echo입니다. 따뜻하고 친근한 목소리예요.',
    fable: '안녕하세요! 저는 Fable입니다. 표현력 있는 이야기꾼 목소리예요.',
    onyx: '안녕하세요! 저는 Onyx입니다. 깊고 권위 있는 목소리예요.',
    nova: '안녕하세요! 저는 Nova입니다. 친근하고 다가가기 쉬운 목소리예요.',
    shimmer: '안녕하세요! 저는 Shimmer입니다. 부드럽고 온화한 목소리예요.',
  },
  ar: {
    alloy: 'مرحبا! انا Alloy، صوت محايد ومتوازن.',
    echo: 'مرحبا! انا Echo، بنبرة دافئة وودية.',
    fable: 'مرحبا! انا Fable، صوت راوي معبر.',
    onyx: 'مرحبا! انا Onyx، بصوت عميق وموثوق.',
    nova: 'مرحبا! انا Nova، صوت ودود وسهل المنال.',
    shimmer: 'مرحبا! انا Shimmer، بنبرة ناعمة ولطيفة.',
  },
  ru: {
    alloy: 'Привет! Я Alloy, нейтральный и сбалансированный голос.',
    echo: 'Привет! Я Echo, с тёплым и дружелюбным тоном.',
    fable: 'Привет! Я Fable, выразительный голос рассказчика.',
    onyx: 'Привет! Я Onyx, с глубоким и авторитетным звучанием.',
    nova: 'Привет! Я Nova, дружелюбный и доступный голос.',
    shimmer: 'Привет! Я Shimmer, с мягким и нежным тоном.',
  },
  hi: {
    alloy: 'नमस्ते! मैं Alloy हूं, एक तटस्थ और संतुलित आवाज।',
    echo: 'नमस्ते! मैं Echo हूं, गर्म और मैत्रीपूर्ण स्वर के साथ।',
    fable: 'नमस्ते! मैं Fable हूं, एक अभिव्यंजक कथाकार की आवाज।',
    onyx: 'नमस्ते! मैं Onyx हूं, गहरी और आधिकारिक ध्वनि के साथ।',
    nova: 'नमस्ते! मैं Nova हूं, मित्रवत और सुलभ आवाज।',
    shimmer: 'नमस्ते! मैं Shimmer हूं, कोमल और सौम्य स्वर के साथ।',
  },
};

export function getPreviewText(voice: TtsVoice, lang: string): string {
  const langPreviews = VOICE_PREVIEWS[lang] || VOICE_PREVIEWS.en;
  return langPreviews[voice] || langPreviews.alloy;
}
