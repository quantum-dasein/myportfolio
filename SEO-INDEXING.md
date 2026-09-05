# Индексация rodionbelousov.studio

После публикации исправлений:

1. Открой [Google Search Console](https://search.google.com/search-console/) и выбери `rodionbelousov.studio`.
2. В разделе «Файлы Sitemap» отправь [sitemap.xml](https://rodionbelousov.studio/sitemap.xml). Он содержит все 22 адреса ниже; отправлять каждый вручную необязательно.
3. Через «Проверку URL» в первую очередь запроси индексацию главной, немецкого и английского профилей. Затем — трёх немецких страниц услуг и двух кейсов. Если Google ограничит число запросов, остальные страницы уже доступны через sitemap.
4. В [Bing Webmaster Tools](https://www.bing.com/webmasters/) добавь этот же sitemap; при наличии возможности можно импортировать подтверждённый сайт из Search Console.
5. В своём LinkedIn добавь сайт в контактные данные и Featured. Сохрани одинаковое написание имени Rodion Belousov и фактическое местоположение Vienna, Austria. Внешние профили не изменялись автоматически.

Подтверждение собственности: если домен уже подтверждён в Search Console, повторять это не нужно. Если нет — добавь предложенную Google TXT-запись в DNS домена. Для проверки через HTML-тег в проекте также поддерживаются переменные PUBLIC_GOOGLE_SITE_VERIFICATION и PUBLIC_BING_SITE_VERIFICATION.

Приоритетные адреса:

- [Главная](https://rodionbelousov.studio/)
- [Rodion Belousov in Wien — немецкий профиль](https://rodionbelousov.studio/de/rodion-belousov-wien/)
- [Rodion Belousov in Vienna — английский профиль](https://rodionbelousov.studio/en/rodion-belousov-vienna/)

Все конкретные адреса для индексации:

- [https://rodionbelousov.studio/en/rodion-belousov-vienna/](https://rodionbelousov.studio/en/rodion-belousov-vienna/)
- [https://rodionbelousov.studio/de/rodion-belousov-wien/](https://rodionbelousov.studio/de/rodion-belousov-wien/)
- [https://rodionbelousov.studio/en/digital-marketing-vienna/](https://rodionbelousov.studio/en/digital-marketing-vienna/)
- [https://rodionbelousov.studio/de/digital-marketing-wien/](https://rodionbelousov.studio/de/digital-marketing-wien/)
- [https://rodionbelousov.studio/en/technical-seo-vienna/](https://rodionbelousov.studio/en/technical-seo-vienna/)
- [https://rodionbelousov.studio/de/technical-seo-wien/](https://rodionbelousov.studio/de/technical-seo-wien/)
- [https://rodionbelousov.studio/en/creative-development-vienna/](https://rodionbelousov.studio/en/creative-development-vienna/)
- [https://rodionbelousov.studio/de/creative-development-wien/](https://rodionbelousov.studio/de/creative-development-wien/)
- [https://rodionbelousov.studio/en/insights/bridge-consult-seo-growth/](https://rodionbelousov.studio/en/insights/bridge-consult-seo-growth/)
- [https://rodionbelousov.studio/de/insights/bridge-consult-seo-wachstum/](https://rodionbelousov.studio/de/insights/bridge-consult-seo-wachstum/)
- [https://rodionbelousov.studio/en/insights/fidic-knowledge-platform/](https://rodionbelousov.studio/en/insights/fidic-knowledge-platform/)
- [https://rodionbelousov.studio/de/insights/fidic-wissensplattform/](https://rodionbelousov.studio/de/insights/fidic-wissensplattform/)
- [https://rodionbelousov.studio/en/insights/threejs-marketing-websites/](https://rodionbelousov.studio/en/insights/threejs-marketing-websites/)
- [https://rodionbelousov.studio/de/insights/threejs-marketing-websites/](https://rodionbelousov.studio/de/insights/threejs-marketing-websites/)
- [https://rodionbelousov.studio/en/insights/ai-assisted-creative-development/](https://rodionbelousov.studio/en/insights/ai-assisted-creative-development/)
- [https://rodionbelousov.studio/de/insights/ai-assisted-creative-development/](https://rodionbelousov.studio/de/insights/ai-assisted-creative-development/)
- [https://rodionbelousov.studio/](https://rodionbelousov.studio/)
- [https://rodionbelousov.studio/services/](https://rodionbelousov.studio/services/)
- [https://rodionbelousov.studio/work/bridge-consult/](https://rodionbelousov.studio/work/bridge-consult/)
- [https://rodionbelousov.studio/work/fidic/](https://rodionbelousov.studio/work/fidic/)
- [https://rodionbelousov.studio/work/studio/](https://rodionbelousov.studio/work/studio/)
- [https://rodionbelousov.studio/gallery/](https://rodionbelousov.studio/gallery/)

Адреса /en/ и /de/ — редиректы, отдельно индексировать их не нужно. /404.html и якоря вроде /#work тоже не отправляй.

Проверять результат: Search Console → «Эффективность» → запросы `rodion belousov`, `rodion belousov wien`, `rodion belousov vienna`, а также немецкие запросы по услугам. В «Индексировании страниц» следи за выбранным Google canonical и исключёнными страницами.

Google сам определяет сроки индексации и позиции. Технические изменения и отправка sitemap не гарантируют первое место. [Официальная инструкция Google](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

Проверки проекта: `npm run verify` собирает сайт и проверяет внутренние ссылки, canonical, языковые ссылки, метаданные, JSON-LD и картинки. Дополнительная проверка браузера: после запуска `node serve.mjs` выполни `node scripts/check-mobile.mjs` (нужен локально установленный Puppeteer). Скриншоты сохраняются в `artifacts/mobile/`.
