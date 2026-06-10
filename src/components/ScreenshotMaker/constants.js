// Constants extracted from the vanilla JS codebase for the React ScreenshotMaker component

// =============================================================================
// Language Flags - mapping of language codes to flag emojis
// =============================================================================
export const languageFlags = {
    'en': '\u{1F1FA}\u{1F1F8}', 'en-gb': '\u{1F1EC}\u{1F1E7}', 'de': '\u{1F1E9}\u{1F1EA}', 'fr': '\u{1F1EB}\u{1F1F7}', 'es': '\u{1F1EA}\u{1F1F8}',
    'it': '\u{1F1EE}\u{1F1F9}', 'pt': '\u{1F1F5}\u{1F1F9}', 'pt-br': '\u{1F1E7}\u{1F1F7}', 'nl': '\u{1F1F3}\u{1F1F1}', 'ru': '\u{1F1F7}\u{1F1FA}',
    'ja': '\u{1F1EF}\u{1F1F5}', 'ko': '\u{1F1F0}\u{1F1F7}', 'zh': '\u{1F1E8}\u{1F1F3}', 'zh-tw': '\u{1F1F9}\u{1F1FC}', 'ar': '\u{1F1F8}\u{1F1E6}',
    'hi': '\u{1F1EE}\u{1F1F3}', 'tr': '\u{1F1F9}\u{1F1F7}', 'pl': '\u{1F1F5}\u{1F1F1}', 'sv': '\u{1F1F8}\u{1F1EA}', 'da': '\u{1F1E9}\u{1F1F0}',
    'no': '\u{1F1F3}\u{1F1F4}', 'fi': '\u{1F1EB}\u{1F1EE}', 'th': '\u{1F1F9}\u{1F1ED}', 'vi': '\u{1F1FB}\u{1F1F3}', 'id': '\u{1F1EE}\u{1F1E9}',
    'uk': '\u{1F1FA}\u{1F1E6}', 'ms': '\u{1F1F2}\u{1F1FE}', 'fil': '\u{1F1F5}\u{1F1ED}', 'ro': '\u{1F1F7}\u{1F1F4}', 'el': '\u{1F1EC}\u{1F1F7}',
    'cs': '\u{1F1E8}\u{1F1FF}', 'hu': '\u{1F1ED}\u{1F1FA}', 'he': '\u{1F1EE}\u{1F1F1}', 'sk': '\u{1F1F8}\u{1F1F0}', 'bg': '\u{1F1E7}\u{1F1EC}',
    'hr': '\u{1F1ED}\u{1F1F7}', 'ca': '\u{1F3F4}'
};

// =============================================================================
// Language Names - mapping of language codes to display names
// =============================================================================
export const languageNames = {
    'en': 'English (US)', 'en-gb': 'English (UK)', 'de': 'German', 'fr': 'French',
    'es': 'Spanish', 'it': 'Italian', 'pt': 'Portuguese', 'pt-br': 'Portuguese (BR)',
    'nl': 'Dutch', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean',
    'zh': 'Chinese (Simplified)', 'zh-tw': 'Chinese (Traditional)', 'ar': 'Arabic',
    'hi': 'Hindi', 'tr': 'Turkish', 'pl': 'Polish', 'sv': 'Swedish',
    'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 'th': 'Thai',
    'vi': 'Vietnamese', 'id': 'Indonesian', 'uk': 'Ukrainian', 'ms': 'Malay',
    'fil': 'Filipino', 'ro': 'Romanian', 'el': 'Greek', 'cs': 'Czech',
    'hu': 'Hungarian', 'he': 'Hebrew', 'sk': 'Slovak', 'bg': 'Bulgarian',
    'hr': 'Croatian', 'ca': 'Catalan'
};

// =============================================================================
// Device Dimensions - mapping device IDs to {width, height}
// =============================================================================
export const deviceDimensions = {
    'iphone-6.9': { width: 1320, height: 2868 },
    'iphone-6.7': { width: 1290, height: 2796 },
    'iphone-6.5': { width: 1284, height: 2778 },
    'iphone-5.5': { width: 1242, height: 2208 },
    'ipad-12.9': { width: 2048, height: 2732 },
    'ipad-11': { width: 1668, height: 2388 },
    'android-phone': { width: 1080, height: 1920 },
    'android-phone-hd': { width: 1440, height: 2560 },
    'android-tablet-7': { width: 1200, height: 1920 },
    'android-tablet-10': { width: 1600, height: 2560 },
    'web-og': { width: 1200, height: 630 },
    'web-twitter': { width: 1200, height: 675 },
    'web-hero': { width: 1920, height: 1080 },
    'web-feature': { width: 1024, height: 500 },
};

// =============================================================================
// Device Configs - 3D device configurations (from three-renderer.js)
// =============================================================================
export const deviceConfigs = {
    iphone: {
        modelPath: '/appscreen/models/iphone-15-pro-max.glb',
        aspectRatio: 1290 / 2796,
        screenHeightFactor: 0.826,
        screenOffset: { x: 0.027, y: 0.745, z: 0.098 },
        positionOffsetFactor: 0.81,
        cornerRadiusFactor: 0.16,
        modelRotation: { x: 0, y: 0, z: 0 }
    },
    samsung: {
        modelPath: '/appscreen/models/samsung-galaxy-s25-ultra.glb',
        aspectRatio: 1440 / 3120,
        screenHeightFactor: 0.66,
        screenOffset: { x: 0, y: 0.0, z: 0.08 },
        positionOffsetFactor: 0.5,
        cornerRadiusFactor: 0.04,
        modelRotation: { x: 0, y: 0, z: 0 }
    }
};

// =============================================================================
// Google Fonts Configuration
// =============================================================================
export const googleFontsConfig = {
    // Popular fonts commonly used for marketing/app store
    popular: [
        'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Raleway',
        'Nunito', 'Playfair Display', 'Oswald', 'Merriweather', 'Source Sans Pro',
        'PT Sans', 'Ubuntu', 'Rubik', 'Work Sans', 'Quicksand', 'Mulish', 'Barlow',
        'DM Sans', 'Manrope', 'Space Grotesk', 'Plus Jakarta Sans', 'Outfit', 'Sora',
        'Lexend', 'Figtree', 'Albert Sans', 'Urbanist', 'Satoshi', 'General Sans',
        'Bebas Neue', 'Anton', 'Archivo', 'Bitter', 'Cabin', 'Crimson Text',
        'Dancing Script', 'Fira Sans', 'Heebo', 'IBM Plex Sans', 'Josefin Sans',
        'Karla', 'Libre Franklin', 'Lora', 'Noto Sans', 'Nunito Sans', 'Pacifico',
        'Permanent Marker', 'Roboto Condensed', 'Roboto Mono', 'Roboto Slab',
        'Shadows Into Light', 'Signika', 'Slabo 27px', 'Source Code Pro', 'Titillium Web',
        'Varela Round', 'Zilla Slab', 'Arimo', 'Barlow Condensed', 'Catamaran',
        'Comfortaa', 'Cormorant Garamond', 'Dosis', 'EB Garamond', 'Exo 2',
        'Fira Code', 'Hind', 'Inconsolata', 'Indie Flower', 'Jost', 'Kanit',
        'Libre Baskerville', 'Maven Pro', 'Mukta', 'Nanum Gothic', 'Noticia Text',
        'Oxygen', 'Philosopher', 'Play', 'Prompt', 'Rajdhani', 'Red Hat Display',
        'Righteous', 'Saira', 'Sen', 'Spectral', 'Teko', 'Vollkorn', 'Yanone Kaffeesatz',
        'Zeyada', 'Amatic SC', 'Archivo Black', 'Asap', 'Assistant', 'Bangers',
        'BioRhyme', 'Cairo', 'Cardo', 'Chivo', 'Concert One', 'Cormorant',
        'Cousine', 'DM Serif Display', 'DM Serif Text', 'Dela Gothic One',
        'El Messiri', 'Encode Sans', 'Eczar', 'Fahkwang', 'Gelasio'
    ],
    // System fonts that don't need loading
    system: [
        { name: 'SF Pro Display', value: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'" },
        { name: 'SF Pro Rounded', value: "'SF Pro Rounded', -apple-system" },
        { name: 'Helvetica Neue', value: "'Helvetica Neue', Helvetica" },
        { name: 'Avenir Next', value: "'Avenir Next', Avenir" },
        { name: 'Georgia', value: "Georgia, serif" },
        { name: 'Arial', value: "Arial, sans-serif" },
        { name: 'Times New Roman', value: "'Times New Roman', serif" },
        { name: 'Courier New', value: "'Courier New', monospace" },
        { name: 'Verdana', value: "Verdana, sans-serif" },
        { name: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" }
    ]
};

// =============================================================================
// LLM Provider Configuration (from llm.js)
// =============================================================================
export const llmProviders = {
    anthropic: {
        name: 'Anthropic (Claude)',
        keyPrefix: 'sk-ant-',
        storageKey: 'claudeApiKey',
        modelStorageKey: 'anthropicModel',
        models: [
            { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 ($)' },
            { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 ($$)' },
            { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5 ($$$)' },
        ],
        defaultModel: 'claude-sonnet-4-6'
    },
    openai: {
        name: 'OpenAI (GPT)',
        keyPrefix: 'sk-',
        storageKey: 'openaiApiKey',
        modelStorageKey: 'openaiModel',
        models: [
            { id: 'gpt-5.1-2025-11-13', name: 'GPT-5.1 ($$$)' },
            { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini ($$)' },
            { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano ($)' }
        ],
        defaultModel: 'gpt-5-mini-2025-08-07'
    },
    azure: {
        name: 'Azure OpenAI',
        keyPrefix: '',
        storageKey: 'azureApiKey',
        modelStorageKey: 'azureModel',
        endpointStorageKey: 'azureEndpoint',
        models: [
            { id: 'gpt-5-nano', name: 'GPT-5 Nano ($)' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini ($$)' }
        ],
        defaultModel: 'gpt-5-nano',
        needsEndpoint: true
    },
    google: {
        name: 'Google (Gemini)',
        keyPrefix: 'AIza',
        storageKey: 'googleApiKey',
        modelStorageKey: 'googleModel',
        models: [
            { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite ($)' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash ($$)' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro ($$$)' }
        ],
        defaultModel: 'gemini-2.5-flash'
    },
    github: {
        name: 'GitHub Models',
        keyPrefix: 'ghp_',
        storageKey: 'githubApiKey',
        modelStorageKey: 'githubModel',
        models: [
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini ($)' },
            { id: 'gpt-4o', name: 'GPT-4o ($$)' },
            { id: 'gpt-4.1', name: 'GPT-4.1 ($$$)' }
        ],
        defaultModel: 'gpt-4o'
    },
    bedrock: {
        name: 'AWS Bedrock',
        keyPrefix: '',
        storageKey: 'bedrockApiKey',
        modelStorageKey: 'bedrockModel',
        regionStorageKey: 'bedrockRegion',
        models: [
            { id: 'anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5 ($)' },
            { id: 'anthropic.claude-sonnet-4-6', name: 'Claude Sonnet 4.6 ($$)' },
            { id: 'anthropic.claude-opus-4-5-20251101-v1:0', name: 'Claude Opus 4.5 ($$$)' }
        ],
        defaultModel: 'anthropic.claude-haiku-4-5-20251001-v1:0',
        needsRegion: true
    },
    deepseek: {
        name: 'DeepSeek',
        keyPrefix: 'sk-',
        storageKey: 'deepseekApiKey',
        modelStorageKey: 'deepseekModel',
        models: [
            { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash ($)' },
            { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro ($$)' }
        ],
        defaultModel: 'deepseek-v4-flash'
    },
    cloudflare: {
        name: 'Cloudflare Workers AI',
        keyPrefix: '',
        storageKey: 'cloudflareApiKey',
        modelStorageKey: 'cloudflareModel',
        models: [
            { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Llama 3.3 70B (fast)' },
            { id: '@cf/openai/gpt-oss-120b', name: 'GPT-OSS 120B' },
            { id: '@cf/mistralai/mistral-small-3.1-24b-instruct', name: 'Mistral Small 3.1 24B' }
        ],
        defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        needsEndpoint: true
    }
};

// =============================================================================
// Gradient Presets - array of gradient CSS strings (from appscreen.html)
// =============================================================================
export const gradientPresets = [
    // Blues
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(135deg, #09203f 0%, #537895 100%)',
    // Pinks/Reds
    'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
    // Greens
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #96deda 0%, #50c9c3 100%)',
    'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)',
    'linear-gradient(135deg, #B7F8DB 0%, #50A7C2 100%)',
    // Warm
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)',
    'linear-gradient(135deg, #c79081 0%, #dfa579 100%)',
    // Dark/Neutral
    'linear-gradient(135deg, #434343 0%, #000000 100%)',
    'linear-gradient(135deg, #29323c 0%, #485563 100%)',
    'linear-gradient(135deg, #868f96 0%, #596164 100%)',
    'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
];

// =============================================================================
// Position Presets - mapping preset names to screenshot positioning values
// =============================================================================
export const positionPresets = {
    'centered': { scale: 70, x: 50, y: 50, rotation: 0, perspective: 0 },
    'bleed-bottom': { scale: 85, x: 50, y: 120, rotation: 0, perspective: 0 },
    'bleed-top': { scale: 85, x: 50, y: -20, rotation: 0, perspective: 0 },
    'float-center': { scale: 60, x: 50, y: 50, rotation: 0, perspective: 0 },
    'tilt-left': { scale: 65, x: 50, y: 55, rotation: -8, perspective: 0 },
    'tilt-right': { scale: 65, x: 50, y: 55, rotation: 8, perspective: 0 },
    'perspective': { scale: 65, x: 50, y: 50, rotation: 0, perspective: 15 },
    'float-bottom': { scale: 55, x: 50, y: 70, rotation: 0, perspective: 0 }
};

// =============================================================================
// Default State - the initial application state (from app.js lines 1-90)
// =============================================================================
export const DEFAULT_STATE = {
    screenshots: [],
    selectedIndex: 0,
    transferTarget: null,
    outputDevice: 'iphone-6.9',
    currentLanguage: 'en',
    projectLanguages: ['en'],
    customWidth: 1290,
    customHeight: 2796,
    defaults: {
        background: {
            type: 'gradient',
            gradient: {
                angle: 135,
                stops: [
                    { color: '#667eea', position: 0 },
                    { color: '#764ba2', position: 100 }
                ]
            },
            solid: '#1a1a2e',
            image: null,
            imageFit: 'cover',
            imageBlur: 0,
            overlayColor: '#000000',
            overlayOpacity: 0,
            noise: false,
            noiseIntensity: 10
        },
        screenshot: {
            scale: 70,
            y: 55,
            x: 50,
            rotation: 0,
            perspective: 0,
            cornerRadius: 24,
            use3D: false,
            device3D: 'iphone',
            rotation3D: { x: 0, y: 0, z: 0 },
            shadow: {
                enabled: true,
                color: '#000000',
                blur: 40,
                opacity: 30,
                x: 0,
                y: 20
            },
            frame: {
                enabled: false,
                color: '#1d1d1f',
                width: 12,
                opacity: 100
            }
        },
        text: {
            headlineEnabled: true,
            headlines: { en: '' },
            headlineLanguages: ['en'],
            currentHeadlineLang: 'en',
            headlineFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
            headlineSize: 100,
            headlineWeight: '600',
            headlineItalic: false,
            headlineUnderline: false,
            headlineStrikethrough: false,
            headlineColor: '#ffffff',
            highlightEnabled: false,
            highlightWords: '',
            highlightColor: '#ffd166',
            textAlign: 'center',
            position: 'top',
            offsetY: 12,
            offsetX: 0,
            lineHeight: 110,
            subheadlineEnabled: false,
            subheadlines: { en: '' },
            subheadlineLanguages: ['en'],
            currentSubheadlineLang: 'en',
            subheadlineFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Display'",
            subheadlineSize: 50,
            subheadlineWeight: '400',
            subheadlineItalic: false,
            subheadlineUnderline: false,
            subheadlineStrikethrough: false,
            subheadlineColor: '#ffffff',
            subheadlineOpacity: 70
        },
        overlay: {
            enabled: false,
            image: null,
            imageSrc: null,
            scale: 20,
            x: 50,
            y: 85,
            opacity: 100,
            rotation: 0,
        }
    }
};
