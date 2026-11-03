# Источники, инструменты и границы проверки

Дата исследования и проверки ссылок: **3 ноября 2026 года**. Ссылки ниже ведут к первичным документам, издателям методик и разработчикам. Основная практика остаётся доступной локально, даже если сервис изменит интерфейс или условия.

**HTTP 200 — проверка ответа сервера, не всех функций сервиса.** Чтение документации не означает испытание авторизованного API или доступность сервиса во всех странах. Внешние программы и интерфейсы, кроме явно названных запусков на [странице качества](quality.md), не испытывались. [Подробные заметки](https://github.com/bioxhaust/evidence-first-osint/blob/main/research/primary-sources.md) и [журналы запросов](https://github.com/bioxhaust/evidence-first-osint/tree/main/research/evidence) сохраняют неудачные проверки.

## Метод и права

- [Berkeley Protocol, страница проекта HRC](https://humanrights.berkeley.edu/projects/developing-the-berkeley-protocol-on-digital-open-source-investigations/) — идентификация, сбор, сохранение, проверка и анализ. Страница проекта прочитана; это не полный аудит протокола или гарантия судебной допустимости.
- [GDPR — Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng) — пример права ЕС. Статьи 3, 5, 6, 9 и 85 требуют проверки сферы действия, основания, минимизации, особых категорий и национальных правил свободы выражения. В этой среде EUR-Lex вернул пустой HTTP 202; действующий полный текст при этом запросе не подтверждён. Прочитано [официальное руководство EDPB](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en). Эти нормы нельзя автоматически переносить на любую юрисдикцию.
- [EFF Surveillance Self-Defense](https://ssd.eff.org/) — моделирование угроз и безопасная работа; рекомендации по отдельным устройствам не тестировались.
- [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html) — robots.txt не является механизмом авторизации и не выдаёт лицензию на данные.

## Поиск и архивы

[Google: уточнение поиска](https://support.google.com/websearch/answer/2466433?hl=en), [Bing: advanced search options](https://support.microsoft.com/en-us/bing/advanced-search-options) и [Wayback Machine: руководство](https://help.archive.org/help/using-the-wayback-machine/) описывают поиск и архивирование. Не все операторы поддерживаются одинаково. Google/Bing служат альтернативами друг другу, архив — дополнительным источником истории; отсутствие результата не доказывает отсутствие страницы.

Локальная замена: [поисковые фрагменты](../assets/case/search-corpus.json), [снимок до](../assets/case/archive/page-before.txt), [после](../assets/case/archive/page-after.txt). Фрагменты позволяют отработать план запроса, но не эмулируют выдачу поисковика.

## Фото, видео, карты

[ExifTool](https://exiftool.org/faq.html) помогает интерпретировать метаданные; поля редактируемы и часто удаляются платформой. [Обратный поиск Google](https://support.google.com/websearch/answer/1325808) — один из способов искать ранние появления; альтернативы — иной поисковик изображений и поиск по подписи/ориентирам. Внешние загрузки изображений не выполнялись; не передавайте чувствительные материалы сервису без оценки условий.

[OpenStreetMap: права](https://www.openstreetmap.org/copyright) и [документация сообщества о снимках](https://wiki.openstreetmap.org/wiki/Aerial_imagery) важны для понимания источника и даты. [Copernicus Browser](https://browser.dataspace.copernicus.eu/) позволяет изучать спутниковые продукты, но облачность, размер пикселя, время съёмки и регистрации ограничивают вывод. Актуальные условия аккаунта/загрузки проверяйте отдельно.

Локальная замена: [иллюстрации, клип и метаданные](../assets/case/README.md), [схематическая карта](../assets/case/map.svg). Они учат сравнению признаков и точности, но не заменяют опыт работы с реальными спутниковыми снимками.

## Компании, домены и публичные посты

[Companies House API](https://developer.company-information.service.gov.uk/) — официальный пример британского регистра. [Open Contracting Data Standard](https://standard.open-contracting.org/latest/en/) объясняет стадии закупок и структуру записей. Название компании, запись договора и исполненный платёж — разные типы сведений. Локальная замена: [реестр](../assets/case/companies.csv), [контракты](../assets/case/contracts.csv), [платежи](../assets/case/payments.csv). Для иных юрисдикций выбирайте их официальные реестры и учитывайте покрытие.

[ICANN RDAP](https://www.icann.org/en/contracted-parties/registry-operators/resources/registration-data-access-protocol), [Certificate Transparency](https://www.rfc-editor.org/rfc/rfc9162.html) и [crt.sh](https://crt.sh/?q=example.com) — регистрационные и сертификатные сведения. Один запрос crt.sh к example.com проверен без авторизации; он не подтверждает полноту сервиса. Локальная замена: [учебный JSON](../assets/case/domain-records.json). Нельзя выводить личность владельца из общего IP или дату запуска сайта из сертификата.

[YouTube Data API](https://developers.google.com/youtube/data/getting-started) и [Reddit API Terms](https://redditinc.com/policies/data-api-terms) показывают, почему публичный контент и разрешение автоматического сбора не тождественны. Ключи, квоты и авторизованные вызовы не тестировались. Локальная замена: [синтетические публикации](../assets/case/posts.csv), где можно проверить зависимости репостов без аккаунта.

## Данные и ИИ

[Python csv](https://docs.python.org/3/library/csv.html), [re](https://docs.python.org/3/library/re.html), [json](https://docs.python.org/3/library/json.html), [urllib.request](https://docs.python.org/3/library/urllib.request.html) — основа дополнительного маршрута. Основной ручной путь обходится текстовым или табличным редактором. Локальные программы курса проверены отдельно.

[C2PA explainer](https://spec.c2pa.org/specifications/specifications/2.2/explainer/Explainer.html) различает происхождение/целостность и истинность содержания. Отсутствие Content Credentials не доказывает генерацию ИИ. Ответ модели, детектор и красивая ссылка нуждаются в проверке оригинального источника. Для практики ИИ используется уже подготовленный вымышленный ответ; аккаунт модели не нужен.

## Как выбираем и обновляем инструмент

Сначала формулируем требуемый факт и тип источника; затем оцениваем покрытие, происхождение, время данных, стоимость, необходимость аккаунта, условия доступа, возможность экспорта, риски раскрытия запросов и локальную замену. Сбой ссылки фиксируем с датой и типом ошибки. Меняем обязательный инструмент только после повторной проверки задания и решения.

Сопоставление десяти курсов, каталогов и справочников: [исследование ландшафта](https://github.com/bioxhaust/evidence-first-osint/blob/main/research/landscape.md). Полные чужие страницы и активы не перепубликуются.
