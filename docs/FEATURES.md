# Функции, обнаруженные в клиентском коде

Ниже — инвентаризация реализации, а не обещание доступности внешних сервисов. Полные списки файлов и публичных объявлений генерируются отдельно в `SOURCE_INDEX.md`.

| Область | Возможности | Где смотреть |
| --- | --- | --- |
| Голосовой помощник | Захват микрофона, realtime-диалог, транскрипция, голосовой ответ, обработка экранного контекста | `Core.Voice`, `Core.Brain` |
| Диктовка | Горячая клавиша, вставка текста в приложение, очистка текста, словарь, обучение исправлениям, архив транскрипций; каталог 50 языков и мультиязычный режим | `Core.Dictation` |
| Управление компьютером | Захват экрана, курсор и подсветка, ввод мышью/клавиатурой, буфер обмена, открытие URL и файлов | `Platform`, `Core.Platform`, `Contracts` |
| Фоновые агенты | Запуск и продолжение сессий, статусы, interruption/yield, ответы на запросы пользователя, история и результаты | `Agents`, `Core.Tools.AgentTools` |
| Задания и артефакты | Рабочие папки, карточки задач, прогресс, заметки, файлы результатов, открытие и показ в проводнике | `Agents.Jobs`, `Agents.Clickys`, `App.Dock` |
| Расписания | Создание, изменение, пауза и запуск routines; интервалы, время суток, дни недели, wake/keep-awake | `Agents.Routines` |
| Работа в браузере | Вкладки, чтение страниц, формы, клики, прокрутка, загрузки, screenshots, JS, Chromium extension | `Core.Browser`, `ClickyBrowserExtension` |
| Локальные инструменты | PowerShell, чтение/запись/список файлов в контексте рабочего каталога | `Core.Tools.LocalRootTools` |
| Документы | Извлечение текста из текстовых и кодовых файлов, PDF, DOCX/DOCM/DOTX, ODT, RTF, PPTX, XLSX | `Core.Documents` |
| Просмотр результатов | Markdown, табличные данные, карточки и ссылки на результаты | `Core.Documents.Markdown`, `Core.Documents.Spreadsheet`, `App.Documents` |
| 2D и заметки | Рисование поверх экрана, фигуры, текст, изображения, анимации, карточки, live notes, dashboards | `Drawing`, `Core.Ink`, `App.Ink` |
| 3D | Геометрия, объекты, сцены, камера, освещение и GPU-отрисовка | `Drawing3D` |
| Подключения | OAuth discovery/регистрация/токены, проверка MCP-инструментов; календарь, Spotify и прочие серверные интеграции | `Core.Connectors`, `Core.Tools.WorkerTools` |
| Память и контекст | Клиент сохранения памяти, контекст сессии, скриншоты, сжатие истории, learned how-tos | `Core.Brain`, `Agents.Turns`, `Agents.Jobs` |
| Проактивность | Утренние предложения, ближайшие встречи, история предложений и периодичность | `Core.Proactive`, `App.Proactive` |
| Интерфейс | Домашнее окно, док, плавающая панель/notch, чат, карточки, настройки, onboarding, демонстрационные состояния | `App.*` |
| Учётная запись | Вход и сессия Supabase, регистрация устройства, настройки подключений | `Core.Auth`, `Core.Identity`, `Core.Worker` |
| Подписка | Тариф, лимиты использования, paywall, checkout и portal API | `Core.Billing`, `Core.Worker` |
| Обслуживание | Автообновления Velopack, single instance, crash reporting Sentry, аналитика, диагностика памяти/зависаний | `App.Services`, `Core.Telemetry` |

## Имена локальных AI-инструментов

`open_url`, `copy_to_clipboard`, `insert_text`, `shell_exec`, `file_read`, `file_write`, `file_list`, `google_calendar_find_events`, `google_calendar_create_event`, `save_memory`, `play_on_spotify`, `sessions_spawn`, `sessions_send`, `session_status`, `sessions_interrupt`, `sessions_yield`, `sessions_answer_request`, `clicky_memory`, `clicky_artifacts`, `open_artifact`, `reveal_artifact`, `open_agent_dashboard`, `skip_onboarding_interview`, `save_drawing`, `show_result`, `routines`.

Серверные инструменты, подписка, реальная генерация AI и синхронизация аккаунта требуют соответствующего backend и действующих пользовательских прав. Их работу нельзя подтвердить компиляцией клиента.
