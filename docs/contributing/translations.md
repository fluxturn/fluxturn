# Translation Guide

FluxTurn uses [i18next](https://i18next.com) for internationalization. This guide explains how translations work and how to contribute a new language.

## Current Supported Languages

| Code | Language |
|------|----------|
| `en` | English (default, fallback) |
| `ja` | Japanese |
| `zh` | Chinese (Simplified) |
| `ko` | Korean |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `it` | Italian |
| `ru` | Russian |
| `pt-BR` | Portuguese (Brazil) |
| `nl` | Dutch |
| `pl` | Polish |
| `uk` | Ukrainian |
| `vi` | Vietnamese |
| `id` | Indonesian |
| `ar` | Arabic |
| `hi` | Hindi |

## How i18n Works

The frontend uses three libraries together:

- **i18next** -- Core translation framework.
- **react-i18next** -- React bindings that provide the `useTranslation` hook and `<Trans>` component.
- **i18next-browser-languagedetector** -- Detects the user's preferred language from `localStorage`, then the browser's `navigator.language`, then the HTML `lang` attribute.

### File structure

```
frontend/src/i18n/
  index.ts              # i18next initialization and language registration
  locales/
    en.json             # English translations (source of truth)
    ja.json             # Japanese
    zh.json             # Chinese (Simplified)
    ko.json             # Korean
    es.json             # Spanish
    fr.json             # French
    de.json             # German
    ... and 10 more
```

### How it is used in code

Components access translations through the `useTranslation` hook:

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
}
```

The JSON files use a flat-ish nested structure:

```json
{
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back, {{name}}"
  }
}
```

The `{{name}}` syntax is an i18next interpolation placeholder. These must be kept as-is in translations.

### Language detection

The language is detected in this order:
1. `localStorage` key `fluxturn-language`
2. Browser `navigator.language`
3. HTML `lang` attribute

Users can also switch languages manually through the language switcher in the UI.

## How to Add a New Language

### 1. Create the translation file

Copy `frontend/src/i18n/locales/en.json` to a new file named with the language's ISO 639-1 code:

```bash
cp frontend/src/i18n/locales/en.json frontend/src/i18n/locales/fr.json
```

Translate all the **values** in the new file. Do not change the keys.

### 2. Register the locale in i18n/index.ts

Open `frontend/src/i18n/index.ts` and add your language:

```typescript
import en from './locales/en.json';
import ja from './locales/ja.json';
import fr from './locales/fr.json';  // Add import

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      fr: { translation: fr },  // Add resource
    },
    fallbackLng: 'en',
    // ...
  });
```

### 3. Add to the Language Switcher

The language switcher component (typically in `frontend/src/contexts/LanguageContext.tsx` or a dedicated component) maintains a list of available languages. Add your language there:

```typescript
const languages = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
  { code: 'fr', label: 'French' },  // Add entry
];
```

### 4. Test it

Start the frontend dev server and switch to your new language using the language switcher. Verify that:

- All strings display correctly.
- Interpolated values like `{{name}}` render properly.
- No keys are displayed raw (which indicates a missing translation).

## Translation Guidelines

**Keep translations natural.** Translate the meaning, not word-for-word. UI text should read as if it was originally written in the target language.

**Preserve placeholders.** Strings like `{{count}}`, `{{name}}`, or `{{date}}` are replaced at runtime. Keep them in your translation, repositioned as needed for natural grammar:

```json
// English
"welcome": "Welcome back, {{name}}"

// Japanese
"welcome": "{{name}}さん、おかえりなさい"
```

**Preserve HTML-like tags.** Some strings use `<bold>`, `<link>`, or similar tags for the `<Trans>` component. Keep these tags in place:

```json
"info": "Read the <link>documentation</link> for details."
```

**Match tone and formality.** FluxTurn uses a professional but approachable tone. Match this in your language -- avoid overly casual or overly formal phrasing.

**Keep it concise.** UI labels and button text should be short. If a translation is significantly longer than the English original, look for a shorter way to express it.

**Do not translate brand names.** "FluxTurn", connector names (Slack, Gmail, etc.), and technical terms like "webhook" or "API" should generally remain untranslated.

## How to Submit

1. Fork the repository and create a branch: `git checkout -b i18n/add-french`
2. Add your translation file and update `index.ts` and the language switcher.
3. Open a pull request against the `develop` branch.
4. In the PR description, mention which language you added and whether you are a native speaker.

Partial translations are welcome. If you cannot translate every key, submit what you have and note the gaps. Another contributor can fill them in later.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for general contribution guidelines.
