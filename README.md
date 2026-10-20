# «Ликование» — новый сайт

Рабочая версия V2: [открыть сайт в GitHub Pages](https://wadim0041.github.io/likovanie-spb-v2/).
Все правки и проверки сначала выполняются здесь. Перенос на хостинг — отдельным проверенным выпуском для ручной загрузки владельцем. [Согласованный порядок работы](docs/working-workflow.md).

Исследование и предложения от 13 октября 2026.

- [План и состояние проекта](docs/project-plan.md)
- [Аудит исходного сайта](docs/site-audit.md)
- [Прямые конкуренты](docs/competitor-research.md)
- [Структура, дизайн-концепция и SEO](docs/design-and-seo-proposal.md)
- [Визуальный прототип главной](design/index.html), [описание и проверки](design/README.md)
- [Полный перенос материалов донора и проверки](docs/content-transfer.md)
- [Установка Framer Motion из GitHub](docs/framer-motion-installation.md)
- Исходные страницы и тексты: `research/source/`
- Скачанные изображения: `research/assets/`
- Реестр изображений: `research/source/assets-manifest.json`

Сайт-источник: https://likovanie-spb.ru/
GitHub: https://github.com/WaDIM0041/likovanie-spb-v2

Для продолжения работы в Codex на ПК: [инструкция и контекст проекта](docs/codex-handoff.md).

Новая версия с материалами донора открывается через корневой `index.html`. Автоматическая отправка форм пока заменена подготовкой письма и прямыми контактами. Предпросмотр закрыт от индексации; действующий домен пока не перенесён.

## Воспроизведение сборки motion

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-motion.ps1
npm ci --ignore-scripts
npm run build:motion
npm run check:motion
node scripts/build-site-motion.cjs
```

Исходники Framer Motion скачиваются из зафиксированного коммита; локальная поправка типов хранится в `patches/motion-webview-types.patch`. `vendor/motion` и `node_modules` исключены из репозитория. Готовый `design/motion-bundle.js` включён: макет `design/index.html` можно открыть без установки зависимостей.
