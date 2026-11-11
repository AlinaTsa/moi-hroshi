# Специфікація: Міжнародна підтримка профілів регіонів
**Версія**: 0.1  
**Дата**: 2026-11-11  
**Статус**: Готово до реалізації

## 1. Мета
Перетворити дані регіональних профілів на JSON-структури, які додаток завантажує під час першого запуску, щоб:
1. Налаштувати типові розділи, цілі й нагадування для кожного регіону
2. Встановити валюту, формат чисел/дат, джерело курсів
3. Поширити частоти зарплати, типи боргів, ліміти гарантії вкладів

## 2. Основна структура: `profiles/<code>.json`

Кожна країна отримує файл на кшталт `profiles/ua.json`, `profiles/ca.json` тощо.

### 2.1 Кореневі поля профілю

```json
{
  "code": "ua",
  "name": "Україна",
  "currency": "UAH",
  "locale": {
    "numberFormat": {
      "decimalSeparator": ",",
      "thousandsSeparator": " ",
      "currencyPosition": "suffix"
    },
    "dateFormat": "DD.MM.YYYY",
    "timeFormat": "HH:mm",
    "language": "uk"
  },
  "rateSource": {
    "type": "http",
    "url": "https://bank.gov.ua/ua/open-data/api-dev",
    "updateFrequency": "daily",
    "updateTime": "09:45",
    "baseCurrency": "UAH",
    "supportedPairs": ["UAH/USD", "UAH/EUR", "UAH/GBP"],
    "fallbackBehavior": "useLastKnownRate",
    "remark": "НБУ видає лише основні пари; крипта не включена"
  },
  "payFrequencies": [
    {
      "id": "monthly",
      "name": "Щомісяця",
      "timesPerYear": 12,
      "typicalDayOfMonth": 25,
      "description": "Один платіж на місяц"
    },
    {
      "id": "biweekly-avanso",
      "name": "Аванс (двічі на місяць)",
      "timesPerYear": 24,
      "typicalDayOfMonth": 10,
      "description": "Аванс видається ~ 10-15 числа; розрахунок ~ 25 числа"
    },
    {
      "id": "weekly",
      "name": "Щотижня",
      "timesPerYear": 52,
      "typicalDayOfWeek": "friday",
      "description": "Деякі роботодавці видають щотижня"
    }
  ],
  "groups": [
    {
      "id": "cash-uah",
      "name": "Готівка (гривні)",
      "type": "cash",
      "currencyOptions": ["UAH"],
      "defaultCurrency": "UAH",
      "hasInterestRate": false,
      "hasTermLength": false,
      "description": "Готівка в гривнях"
    },
    {
      "id": "cash-foreign",
      "name": "Готівка (іноземна)",
      "type": "cash",
      "currencyOptions": ["USD", "EUR"],
      "defaultCurrency": "USD",
      "hasInterestRate": false,
      "hasTermLength": false,
      "description": "Готівка в доларах або євро (часто як 'подушка')"
    },
    {
      "id": "card-uah",
      "name": "Карта (гривні)",
      "type": "card",
      "currencyOptions": ["UAH"],
      "defaultCurrency": "UAH",
      "hasInterestRate": false,
      "hasTermLength": false,
      "description": "Дебетова карта UAH"
    },
    {
      "id": "deposit-uah",
      "name": "Депозит (гривні)",
      "type": "deposit",
      "currencyOptions": ["UAH"],
      "defaultCurrency": "UAH",
      "hasInterestRate": true,
      "hasTermLength": true,
      "interestTermOptions": {
        "typical": ["3m", "6m", "12m", "24m"],
        "interestRateRange": [0.03, 0.12]
      },
      "description": "Строковий депозит UAH у банку; гарантований до 200 000 UAH"
    },
    {
      "id": "deposit-foreign",
      "name": "Депозит (іноземна)",
      "type": "deposit",
      "currencyOptions": ["USD", "EUR"],
      "defaultCurrency": "USD",
      "hasInterestRate": true,
      "hasTermLength": true,
      "interestTermOptions": {
        "typical": ["3m", "6m", "12m"],
        "interestRateRange": [0.01, 0.05]
      },
      "description": "Депозит в дол./євро; гарантований до 200 000 UAH еквівалента"
    },
    {
      "id": "fop-account",
      "name": "Рахунок ФОП",
      "type": "business",
      "currencyOptions": ["UAH"],
      "defaultCurrency": "UAH",
      "hasInterestRate": false,
      "hasTermLength": false,
      "description": "Розрахунковий рахунок фізичної особи – підприємця"
    },
    {
      "id": "bond-ovdp",
      "name": "ОВДП (облігації)",
      "type": "bond",
      "currencyOptions": ["UAH", "USD", "EUR"],
      "defaultCurrency": "UAH",
      "hasInterestRate": true,
      "hasTermLength": true,
      "description": "Облігації внутрішньої державної позики України"
    }
  ],
  "debtKinds": [
    {
      "id": "credit-card",
      "name": "Кредитна карта",
      "type": "credit-card",
      "typicalInterestRateRange": [0.20, 0.60],
      "description": "Крутильна карта; високі відсотки"
    },
    {
      "id": "personal-loan",
      "name": "Персональний кредит",
      "type": "personal-loan",
      "typicalInterestRateRange": [0.10, 0.25],
      "description": "Позика на особисті потреби"
    },
    {
      "id": "auto-loan",
      "name": "Кредит на авто",
      "type": "auto-loan",
      "typicalInterestRateRange": [0.10, 0.20],
      "description": "Позика на покупку автомобіля"
    },
    {
      "id": "mortgage",
      "name": "Іпотека",
      "type": "mortgage",
      "typicalInterestRateRange": [0.07, 0.12],
      "typicalTermYears": [5, 10, 15, 20, 30],
      "typicalAmortizationYears": 20,
      "description": "Іпотечний кредит на купівлю житла; гарантована іпотека видається також через державні програми",
      "specialCalculations": {
        "includeEscrow": false,
        "includePropertyTax": false,
        "typicalInsurancePercent": 0.005
      }
    }
  ],
  "depositGuarantee": {
    "provider": "ФГВФО (Фонд гарантування вкладів фізичних осіб)",
    "amountUAH": 200000,
    "amountCurrency": "UAH",
    "amountEquivalentUSD": 5500,
    "scope": "депозити, поточні рахунки, накопичувальні рахунки в банках України",
    "excludedTypes": ["цінні папери", "крипта"],
    "conversionCurrency": "UAH",
    "conversionRateSourceDate": "2026-11-11",
    "source": "https://www.fg.gov.ua/",
    "lastVerifiedDate": "2026-11-11",
    "note": "Ліміт 200 000 UAH з 2020 р.; іноземні депозити конвертуються за курсом НБУ на день оголошення про звільнення банку"
  },
  "goalTemplates": [
    {
      "id": "emergency-fund",
      "name": "Подушка безпеки",
      "category": "security",
      "description": "Резервний фонд на 3–6 місяців видатків",
      "suggestedAmountUAH": 15000,
      "suggestedCurrency": "USD",
      "suggestedTimeframeMonths": 0,
      "icon": "shield",
      "priority": 1
    },
    {
      "id": "housing-down-payment",
      "name": "Первий внесок на житло",
      "category": "housing",
      "description": "Накопичення на перший внесок при покупці житла",
      "suggestedAmountUAH": 500000,
      "suggestedCurrency": "UAH",
      "suggestedTimeframeMonths": 60,
      "icon": "home",
      "priority": 2
    },
    {
      "id": "tech-upgrade",
      "name": "Техніка / Бізнес",
      "category": "lifestyle",
      "description": "Накопичення на ноутбук, обладнання для роботи",
      "suggestedAmountUAH": 50000,
      "suggestedCurrency": "UAH",
      "suggestedTimeframeMonths": 24,
      "icon": "laptop",
      "priority": 3
    },
    {
      "id": "vacation",
      "name": "Відпустка / Подорож",
      "category": "leisure",
      "description": "Щорічна подорож чи відпустка за кордон",
      "suggestedAmountUAH": 20000,
      "suggestedCurrency": "USD",
      "suggestedTimeframeMonths": 12,
      "icon": "airplane",
      "priority": 4
    }
  ],
  "reminders": [
    {
      "id": "salary-advance",
      "name": "День авансу",
      "description": "Аванс видається близько цього дня",
      "frequency": "monthly",
      "dayOfMonth": 10,
      "timeOfDay": "09:00",
      "icon": "dollar",
      "importance": "high"
    },
    {
      "id": "salary-main",
      "name": "День зарплати",
      "description": "Основна зарплата видається близько цього дня",
      "frequency": "monthly",
      "dayOfMonth": 25,
      "timeOfDay": "09:00",
      "icon": "dollar",
      "importance": "high"
    },
    {
      "id": "tax-fop-payment",
      "name": "Платіж Єдиного податку (ФОП)",
      "description": "Сплата Єдиного податку для ФОП",
      "frequency": "monthly",
      "dayOfMonth": 25,
      "timeOfDay": "18:00",
      "icon": "document",
      "importance": "high"
    },
    {
      "id": "tax-filing-deadline",
      "name": "Подання податкової декларації",
      "description": "Крайній терміну для подання річної декларації про доходи",
      "frequency": "yearly",
      "monthDay": "12-25",
      "timeOfDay": "23:59",
      "icon": "document",
      "importance": "critical"
    },
    {
      "id": "deposit-maturity-check",
      "name": "Депозит на дозвіллі",
      "description": "Перевіриця термін депозиту; залишок може бути повернено",
      "frequency": "deposit-specific",
      "daysBeforeMaturity": 10,
      "icon": "calendar",
      "importance": "medium"
    }
  ],
  "meta": {
    "checkedAt": "2026-11-11T00:00:00Z",
    "sources": [
      {
        "title": "Національний банк України",
        "url": "https://nbu.ua/",
        "verifiedAt": "2026-11-11"
      },
      {
        "title": "ФГВФО",
        "url": "https://www.fg.gov.ua/",
        "verifiedAt": "2026-11-11"
      },
      {
        "title": "Податкова служба України",
        "url": "https://tax.gov.ua/",
        "verifiedAt": "2026-11-11"
      }
    ],
    "notVerifiedItems": [
      "Точна формула розрахунку військового збору",
      "Поточні ставки депозитів по банкам",
      "Деталі програм державного кредитування житла"
    ],
    "language": "uk",
    "version": "1.0"
  }
}
```

## 3. Об'єднана структура в `profiles.json`

Додаток завантажує основний файл `profiles.json`, який міст список всіх профілів:

```json
{
  "profiles": [
    {
      "code": "ua",
      "name": "Україна",
      "path": "/profiles/ua.json",
      "currency": "UAH",
      "language": "uk",
      "version": "1.0",
      "supported": true
    },
    {
      "code": "ca",
      "name": "Канада",
      "path": "/profiles/ca.json",
      "currency": "CAD",
      "language": "en",
      "version": "1.0",
      "supported": true
    },
    {
      "code": "us",
      "name": "США",
      "path": "/profiles/us.json",
      "currency": "USD",
      "language": "en",
      "version": "1.0",
      "supported": true
    },
    {
      "code": "au",
      "name": "Австралія",
      "path": "/profiles/au.json",
      "currency": "AUD",
      "language": "en",
      "version": "1.0",
      "supported": true
    },
    {
      "code": "eu",
      "name": "Європа (загальна)",
      "path": "/profiles/eu.json",
      "currency": "EUR",
      "language": "en",
      "version": "1.0",
      "supported": true,
      "subRegions": ["de", "pl", "es", "it", "fr"]
    },
    {
      "code": "de",
      "name": "Німеччина",
      "path": "/profiles/de.json",
      "currency": "EUR",
      "language": "de",
      "version": "1.0",
      "supported": true,
      "parentRegion": "eu"
    }
  ],
  "meta": {
    "lastUpdated": "2026-11-11T00:00:00Z",
    "version": "1.0"
  }
}
```

## 4. Зміни в структурі даних додатка

### 4.1 Поле `payFrequencies`
**Додається до**: User profile / Settings

Поле має містити масив допустимих частот зарплати для вибору:
```typescript
payFrequencies: Array<{
  id: string;           // "monthly", "biweekly", "weekly"
  name: string;         // "Щомісяця", "Раз на два тижні"
  timesPerYear: number; // 12, 26, 52
  typicalDayOfMonth?: number;
  typicalDayOfWeek?: string;
}>;
```

### 4.2 Поле `groups` (Розділи)
**Додається до**: Додаток має дозволити користувачу видалити/додати розділи, замість того щоб мати фіксований набір

Структура розділу:
```typescript
group: {
  id: string;
  name: string;
  type: "cash" | "card" | "deposit" | "bond" | "business" | "crypto";
  currencyOptions: string[];        // ["UAH", "USD", "EUR"]
  defaultCurrency: string;
  hasInterestRate: boolean;
  hasTermLength: boolean;
  interestTermOptions?: {
    typical: string[];              // ["3m", "6m", "12m"]
    interestRateRange: [number, number];
  };
  description?: string;
};
```

### 4.3 Поле `debtKinds` (Типи боргів)
**Додається до**: Додаток має дозволити користувачу вибрати тип боргу при створенні

```typescript
debtKind: {
  id: string;
  name: string;
  type: "credit-card" | "personal-loan" | "auto-loan" | "mortgage" | "student-loan";
  typicalInterestRateRange: [number, number];
  typicalTermYears?: number[];
  typicalAmortizationYears?: number;
  specialCalculations?: {
    includeEscrow?: boolean;        // Для іпотеки (США)
    includePropertyTax?: boolean;
    typicalInsurancePercent?: number;
  };
};
```

### 4.4 Поле `depositGuarantee`
**Додається до**: Region profile / Meta

При завантаженні профілю додаток показує користувачу інформацію про гарантію вкладів й напомінає про ліміт при створенні депозиту:
```typescript
depositGuarantee: {
  provider: string;
  amountCurrency: string;           // "UAH", "CAD", "USD" тощо
  amountValue: number;              // 200000, 100000
  scope: string;
  excludedTypes: string[];
  source: string;
  lastVerifiedDate: string;
  note?: string;
};
```

### 4.5 Поле `goalTemplates`
**Додається до**: Region profile

Додаток пропонує користувачу готові шаблони цілей при першому запуску й дозволяє легко налаштувати суму/термін:
```typescript
goalTemplate: {
  id: string;
  name: string;
  category: "security" | "housing" | "education" | "leisure" | "health";
  description: string;
  suggestedAmountCurrency: string;
  suggestedAmountValue: number;
  suggestedTimeframeMonths?: number;
  icon: string;
  priority: number;
};
```

### 4.6 Поле `reminders`
**Додається до**: Region profile

Користувач може вибрати, які нагадування йому потрібні:
```typescript
reminder: {
  id: string;
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "deposit-specific";
  dayOfMonth?: number;
  dayOfWeek?: string;
  monthDay?: string;                // "12-25" для дня/місяця
  daysBeforeMaturity?: number;      // Для депозитів
  timeOfDay: string;                // "09:00"
  icon: string;
  importance: "low" | "medium" | "high" | "critical";
};
```

## 5. Логіка завантаження & використання

### 5.1 Під час першого запуску
1. Додаток запитує користувача: **"Виберіть вашу країну / регіон"**
2. Завантажує `profiles.json` → показує список доступних регіонів
3. Користувач обирає регіон (наприклад, `ua`)
4. Додаток завантажує `profiles/ua.json`
5. Заповнює типові розділи, цілі й нагадування з профілю
6. Встановлює валюту, локаль, джерело курсів

### 5.2 Під час роботи
- При створенні нового депозиту: показує гарантію вкладів для регіону
- При створенні боргу: запропонує типові типи боргів для регіону
- При створенні цілі: запропонує шаблони цілей
- При виборі частоти зарплати: показує типові частоти для регіону

### 5.3 Оновлення профілів
Якщо ліміти гарантій, ставки або правила змінються:
1. Оновлюємо `profiles/<code>.json`
2. Оновлюємо дату в `meta.checkedAt` & `meta.sources[].verifiedAt`
3. Додаток запитує користувача про оновлення при синхронізації

## 6. Міграція: збереження даних користувача

**Важливо**: Нові профілі не повинні ламати існуючі дані. Стара структура залишається в `migr ate()`.

Приклад:
```typescript
function migrate(oldData) {
  // Якщо немає поля region, встановити "ua" за замовчуванням
  if (!oldData.region) {
    oldData.region = "ua";
  }
  // Якщо є старі розділи без ID, генерувати ID автоматично
  if (oldData.groups && !oldData.groups[0].id) {
    oldData.groups = oldData.groups.map((g, i) => ({
      ...g,
      id: `group-${i}`,
      type: detectGroupType(g.name)
    }));
  }
  return oldData;
}
```

## 7. Файлова структура проєкту

```
moi-hroshi/
├── docs/
│   ├── profiles/
│   │   ├── ua.md               (аналітичний профіль)
│   │   ├── ca.md
│   │   ├── us.md
│   │   ├── au.md
│   │   ├── eu.md
│   │   ├── ua.json             (для додатка) — ГЕНЕРУВАТИ ОД ua.md
│   │   ├── ca.json
│   │   ├── us.json
│   │   ├── au.json
│   │   ├── eu.json
│   │   ├── de.json
│   │   ├── pl.json
│   │   ├── es.json
│   │   ├── it.json
│   │   └── fr.json
│   ├── profiles.json           (індекс усіх профілів)
│   ├── spec.md                 (цей документ)
│   ├── golden-cases.md
│   ├── open-questions.md
│   ├── ANALYST_BRIEF.md        (існуючий)
│   └── ...
├── src/
│   ├── data/
│   │   └── profiles/           (копія .json файлів під час білда)
│   ├── services/
│   │   ├── profileLoader.ts    (завантажує профіль за кодом)
│   │   ├── currencyFormatter.ts (форматує числа за локаллю профілю)
│   │   └── reminderScheduler.ts (планує нагадування за регіоном)
│   └── ...
└── ...
```

## 8. Приклад інтеграції: компонент вибору регіону

```typescript
// Component: CountrySelector.tsx
import { profiles } from "@/data/profiles.json";

function CountrySelector() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const handleSelectRegion = async (code: string) => {
    // Завантажити профіль
    const profile = await fetch(`/profiles/${code}.json`).then(r => r.json());
    
    // Зберегти в localStorage
    localStorage.setItem("region", code);
    localStorage.setItem("profile", JSON.stringify(profile));
    
    // Налаштувати додаток: часи, розділи, нагадування тощо
    applyProfile(profile);
    
    // Перейти до основного інтерфейсу
    navigate("/dashboard");
  };

  return (
    <div>
      <h1>Виберіть вашу країну</h1>
      {profiles.map(p => (
        <button key={p.code} onClick={() => handleSelectRegion(p.code)}>
          {p.name} ({p.currency})
        </button>
      ))}
    </div>
  );
}
```

## 9. Критерії завершення

- [ ] Всі 5 профілів конвертовані в JSON
- [ ] `profiles.json` індекс створений
- [ ] Компонент вибору регіону реалізований
- [ ] Міграція старих даних протестована
- [ ] Розділи, борги, цілі й нагадування завантажуються з профілю
- [ ] Валюта, локаль, джерело курсів змінюються на основі регіону
- [ ] Усі комбінації регіон + дія протестовані (мінімум по одній на кожний регіон)
