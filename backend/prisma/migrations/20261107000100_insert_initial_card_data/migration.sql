BEGIN;

INSERT INTO professional_links (name, url)
VALUES ('GitHub', 'https://github.com/yrigantimurov');

INSERT INTO skills (name)
VALUES
    ('JavaScript'),
    ('TypeScript'),
    ('Python'),
    ('Go'),
    ('SQL'),
    ('React'),
    ('Vue'),
    ('HTML'),
    ('CSS'),
    ('Tailwind CSS'),
    ('Node.js'),
    ('Express'),
    ('FastAPI'),
    ('API'),
    ('PostgreSQL'),
    ('MongoDB'),
    ('Docker'),
    ('Nginx'),
    ('CI/CD'),
    ('Git'),
    ('Figma'),
    ('Claude'),
    ('Codex');

INSERT INTO work_experience (company, position, start_date, end_date, achievements)
VALUES
    (
        'Яндекс',
        'Стажёр-разработчик интерфейсов',
        '2026-09',
        NULL,
        ARRAY[
            'Доработал платёжный виджет с поддержкой на сервере, в интерфейсе и SDK. Подготовил метрики для контроля работы сценария при развёртывании.',
            'Участвовал в разработке сервиса, позволяющего показывать коммерческое предложение Яндекса на стороне мерчанта с помощью нейросети.'
        ]
    ),
    (
        'Цифровые технологии и платформы',
        'Fullstack-разработчик',
        '2023-06',
        '2026-03',
        ARRAY[
            'Разработал и довёл до продакшена Forms-server — веб-сервис для загрузки Excel-файлов через браузер и работы со структурами баз данных без написания SQL-запросов.',
            'Отвечал за фронтенд, бэкенд, UI/UX, контейнеризацию и сопровождение развёртывания на нескольких площадках.',
            'За полторы рабочие недели разработал и развернул автономный сервис интерактивных карт. Сервис помог защитить проект перед заказчиком; позднее карты использовались в Superset для отображения данных.'
        ]
    ),
    (
        'Диалог',
        'Программист-стажёр',
        '2022-06',
        '2022-09',
        ARRAY[
            'Разработал скрипт автоматизации регистрации пользователей в CryptoPro DSS: загрузка информации из базы данных и передача через API сервиса.'
        ]
    );

INSERT INTO projects (name, url)
VALUES
    ('Киберщит', 'https://159.194.250.163/'),
    ('Научиться учиться', 'https://github.com/yrigantimurov/how-to-learn'),
    ('Путешествия по России', 'https://github.com/yrigantimurov/russian-travel');

COMMIT;
