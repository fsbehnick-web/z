# CODEMAP — z

Короткая карта для ИИ-агентов: прочитай её вместо index.html (~6200 строк) и z.html (~2200 строк).
Искать по именам функций, номера строк — примерные.

## Что это
Расписания Андрея (МПГУ, группа 107) и Ани (МИЭТ, УТС-11) рядом, чтобы видеть общие свободные окна.
GitHub Pages из `main`: https://fsbehnick-web.github.io/z/ (основной сайт) и `/z/z.html` («табло» с меню электричек).

**Правила данных:**
- Расписание Ани не менять никогда (если явно не попросили).
- Расписание Андрея = группа 107 из репозитория `106_107`; при расхождении прав 106_107.

## Файлы
| Файл | Что внутри |
|---|---|
| `index.html` | Основное приложение — **форк `106_107/index.html`** (те же функции и CSS, см. `106_107/CODEMAP.md`). Внутри «группы» `g106/g107` переиспользованы: g106 = Андрей, g107 = Аня |
| `data.json` | Данные для index.html |
| `z.html` | Отдельная лёгкая страница «Андрей и Аня» + меню электричек. **Не читает data.json — расписания вшиты в её JS** |
| `sw.js` | Service worker. **При изменении index.html или z.html поднять `CACHE_VERSION`** (`'v6'` → `'v7'`) |
| `расписание Ани/` | Исходные HTML-выгрузки недель УТС-11 (только справка) |

## data.json (для index.html)
```
holidays   {ISO: "название"}
dayChanges {andrey|anya: {ISO: правило}}   — правила как в 106_107: cancel / add / set / cancelAll
schedules:
  andreyWeekly   {0..6: [пара]}   — регулярная неделя Андрея, пары с week:"all"|1|2 и until
  andreyOneOffs  {ISO: [пара]}    — разовые пары
  anyaWeek1, anyaWeek2 {0..6: [пара]}  — до 07.09 и 07–13.09
  anyaЧ, anyaЗ   {0..6: [пара]}   — с 14.09 цикл из 4 недель Ч/З/Ч/З
constants  OVERALL_START 2026-09-01, REGULAR_START 2026-09-14, OVERALL_END 2026-12-30
```
Формат пары как в 106_107: `{t:"09:00–10:30", w, d, week?, until?, sub?}`, 0 = Вс.

## Где что в коде
**index.html**: `loadData` раскладывает `data.schedules` по переменным `andreyWeekly`, `anyaЧ`… Расписание Андрея на дату строится около `andreyWeekly[weekdayIndex(...)]`, Ани — по комментарию «До 14 сентября — недели anyaWeek1 / anyaWeek2». Остальное (рендер, панели, поиск, темы, SW) — как в 106_107.

**z.html** (разделы помечены комментариями `// ===`):
- `anyaWeek1 / anyaWeek2 / anyaЧ / anyaЗ / anyaCycle` + `anyaSchedule(iso)` — раздел «Расписание Ани»
- `andreyWeekly` + `andreySchedule(iso)` — раздел «Расписание Андрея»
- `HOLIDAYS`, `weekTypeFor` — «Общие правила»
- лента дней: `dateList buildRail select goToDate jumpToToday`
- рендер: `render renderSlots computeLiveIndices liveTick`, общий вывод «оба свободны» строится в `render`
- меню электричек: `setMenu renderMenu trainType durationText` (данные поездов — в JS рядом с ними)
- панель пары: `openSlot closeSheet`; темы: `applyTheme buildThemeSwitcher`; старт: `initBoard`

Правку расписания Андрея делать в **трёх** местах: `data.json` (index.html), JS в `z.html` и сверить с `106_107/data.json` (g107).

## Стиль (после чистки 2026-11-01)
Как в 106_107: Manrope 400/500/600, иконки — SVG lucide `.ico`, без эмодзи, без капса, закрытые панели без тени.
