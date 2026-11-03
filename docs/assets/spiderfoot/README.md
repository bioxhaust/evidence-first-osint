# SpiderFoot: оригинальные локальные страницы и фактические результаты

**SYNTHETIC / УЧЕБНЫЙ КОРПУС.** Страницы и все идентификаторы вымышлены. Дата подготовки — 3 ноября 2026 года. Оригинальные страницы и тексты — CC BY 4.0, launcher и сервер курса — MIT. Исходники SpiderFoot и зависимости не включены: они устанавливаются отдельно и сохраняют свои лицензии.

[Лабораторная](../../practice/tool-labs/spiderfoot.md) · [Решение](../../solutions/tool-labs/spiderfoot.md).

## Страницы

[Каталог](pages/index.html) · [Альфа](pages/alpha.html) · [Бета](pages/beta.html) · [Описание шаблона](pages/template.html).

На опубликованном сайте можно прочитать эти страницы, но настоящий запуск выполняется на собственном сервере `127.0.0.1:54371`, не на GitHub Pages. Комментарии содержат демонстрационные строки; ни аналитический скрипт, ни запросы к внешним сервисам не исполняются.

## Сохранённые запуски

- Полный набор трёх модулей: [events.json](all-events.json), [events.csv](all-events.csv), [edges.csv](all-edges.csv), [run.json](all-run.json).
- Без обработчика аналитики: [events.json](without-analytics-events.json), [events.csv](without-analytics-events.csv), [run.json](without-analytics-run.json).
- Обход одной страницы: [events.json](one-page-events.json), [events.csv](one-page-events.csv), [run.json](one-page-run.json).
- [Консоль трёх запусков](console.txt), [проверенные версии зависимостей](requirements-tested.txt), [commit и хеши используемых файлов upstream](upstream-lock.json).

В этих файлах события созданы настоящими модулями SpiderFoot, а упаковка JSON/CSV выполнена кодом курса. Это не штатные экспорты полного сканера. Хеши ID событий меняются при повторе. Поля `source_url` и `parent_id` сохраняют происхождение; `upstream_confidence` — поле программы, а не оценка личности.
