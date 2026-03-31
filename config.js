window.appConfig = {
    portal: {
        title: "Portal para mi Girasol Hermosa",
        intro: "Mi vida, si eres tu, mira a la camara y deja que este portal confirme que llegaste al lugar que prepare solo para ti. Si el reconocimiento no coopera, usa la clave secreta que solo nosotros entenderiamos.",
        secretPhrases: [
            {
                phrase: "girasol",
                accessLabel: "Valentina"
            },
            {
                phrase: "mauricio",
                accessLabel: "Mauricio"
            }
        ],
        secretHint: "Pista: el apodo bonito con el que te guardo en el corazon.",
        recognitionThreshold: 0.52,
        soundtrack: {
            enabled: true,
            onlyForLabel: "Valentina",
            src: "assets/audio/valentina-theme.mp3",
            volume: 0.16,
            loop: true
        },
        authorizedProfiles: [
            {
                label: "Valentina",
                displayName: "mi Girasol Hermosa",
                experienceMode: "museum-only",
                welcomeTitle: "Bienvenida, mi Girasol Hermosa",
                welcomeMessage: "Prepare este lugarcito para ti, para que cada click te recuerde lo especial que eres para mi.",
                images: [
                    "assets/references/persona-1-a.jpeg",
                    "assets/references/persona-1-b.jpeg",
                    "assets/references/persona-1-c.jpeg",
                    "assets/references/persona-1-d.jpeg"
                ]
            },
            {
                label: "Mauricio",
                displayName: "Mauricio",
                experienceMode: "full",
                welcomeTitle: "Bienvenido, Mauricio",
                welcomeMessage: "Puedes entrar tambien para seguir puliendo cada detalle antes de compartirlo con ella.",
                images: [
                    "assets/references/persona-2-a.jpeg",
                    "assets/references/persona-2-b.jpeg",
                    "assets/references/persona-2-c.jpeg",
                    "assets/references/persona-2-d.jpeg"
                ]
            }
        ]
    },
    story: {
        eyebrow: "De mi para ti, mi Girasol Hermosa",
        title: "Un rincon hecho para ti, mi Girasol Hermosa",
        message: "Mi vida, queria regalarte algo distinto: un lugarcito hecho por mi, con codigo, carino y un poquito de locura bonita, para recordarte que incluso a distancia sigues siendo de las cosas mas hermosas que me han pasado.",
        relationshipStart: "2024-06-01",
        nextMeeting: "2026-07-15",
        distanceKm: 1260,
        metrics: [
            {
                label: "Videollamadas que me arreglan el alma",
                value: "Infinitas",
                note: "Porque escucharte siempre hace que la distancia pese menos."
            },
            {
                label: "Planes que quiero cumplir contigo",
                value: "Demasiados",
                note: "Y quiero vivirlos contigo, uno por uno, sin saltarme ninguno."
            }
        ],
        museum: {
            eyebrow: "Nuestros viernes",
            title: "Los Fucknews que he visto contigo",
            message: "Te deje esta parte aparte porque estos viernes contigo ya se volvieron muy nuestros, y me gustaba la idea de guardarlos en un solo lugar.",
            reverseOrder: true,
            autoFeed: {
                enabled: false,
                channelId: "UCc8o0cT4aD3n1Bw3k5GIdQQ",
                limit: 80
            },
            frequencyLabel: "Todos los viernes",
            frequencyNote: "Ya es costumbre tuya y mia.",
            yearsLabel: "3 anos",
            yearsNote: "Y espero que sigan siendo muchisimos mas.",
            seriesLabel: "Nuestros viernes",
            source: "fucknews_links.txt",
            defaultNote: "Otro viernes contigo que quise guardar aqui.",
            ctaLabel: "Entrar",
            previewTitle: "Aqui te deje todos nuestros Fucknews",
            previewMessage: "Preferi dejar esto aparte para que se sintiera mas nuestro.",
            introEyebrow: "Te deje esto aqui",
            introTitle: "Mi Girasol Hermosa, entra",
            introMessage: "Queria que esta parte se sintiera bonita desde el principio, porque estos viernes contigo ya son de mis cosas favoritas.",
            introTicketLabel: "Entrada para ti",
            introTicketName: "Mi Girasol Hermosa",
            introTicketMeta: "Nuestros viernes con Fucknews",
            introEnterLabel: "Entrar",
            introSkipLabel: "Ir de una",
            pageEyebrow: "Solo nosotros",
            pageTitle: "Nuestros viernes con Fucknews",
            pageMessage: "Te quise dejar todo esto aqui porque cada capitulo que vimos juntos me gusta mucho y no queria que se perdiera.",
            pageStatLabel: "Capitulos guardados",
            pageStatNote: "Cada uno me acuerda de ti y de uno de nuestros viernes.",
            stripEyebrow: "Lo nuestro",
            stripTitle: "Todos esos viernes que ya son muy nuestros",
            galleryEyebrow: "Todo lo que hemos visto",
            galleryTitle: "Todos los capitulos que he visto contigo",
            backButtonLabel: "Volver",
            galleryButtonLabel: "Ver capitulos",
            galleryBackLabel: "Volver",
            premiereEyebrow: "El mas reciente",
            premiereButtonLabel: "Ver aqui",
            premiereExternalLabel: "Ver en YouTube",
            entries: [
                // Ejemplo de tarjeta:
                // {
                //     title: "Fucknews - episodio 001",
                //     series: "Fucknews Fridays",
                //     note: "Ese viernes nos reiamos de tal chiste y terminamos hablando media hora mas.",
                //     url: "https://www.youtube.com/watch?v=XXXXXXXXXXX"
                // }
            ]
        },
        timeline: [
            {
                date: "El primer mensaje",
                title: "Cuando empezaste a volverte importante para mi",
                description: "Hubo un momento en que hablar contigo dejo de sentirse normal y empezo a sentirse especial. Desde ahi, algo en mi ya no quiso soltarte."
            },
            {
                date: "Las llamadas largas",
                title: "Aprender a quererte incluso desde lejos",
                description: "Con cada llamada fui conociendo tu voz, tu risa, tus silencios y esa forma tan tuya de hacerme sentir acompanado aunque no estuvieras al lado."
            },
            {
                date: "Lo que viene",
                title: "Todo lo que sueno vivir contigo",
                description: "Abrazos sin pantalla, canciones en el mismo cuarto, salidas simples, viajes bonitos y muchos dias comunes que contigo se sentirian extraordinarios."
            }
        ],
        reasons: [
            "Porque conviertes cualquier rato del dia en algo que de verdad espero.",
            "Porque incluso lejos, sigues siendo refugio para mi cabeza y mi corazon.",
            "Porque contigo el futuro se siente bonito en vez de incierto.",
            "Porque tu risa tiene la capacidad real de acomodarme el dia.",
            "Porque eres dulce, inteligente, hermosa y profundamente especial para mi.",
            "Porque aun con kilometros de por medio, sigues siendo la persona que quiero elegir."
        ],
        letters: [
            {
                title: "Para un dia pesado",
                body: "Si hoy el mundo se puso duro contigo, quiero que recuerdes esto: creo profundamente en ti. Eres mucho mas fuerte, valiosa y luminosa de lo que a veces alcanzas a ver, y aunque la distancia moleste, aqui sigo queriendo sostenerte en todo lo que pueda."
            },
            {
                title: "Para cuando me extranes",
                body: "Yo tambien te extrano, mi vida. Muchisimo. Pero intento pensar que cada dia que pasa no es tiempo perdido, sino una cuenta regresiva hacia el proximo abrazo, la proxima mirada y ese momento en que por fin la pantalla deje de estorbar."
            },
            {
                title: "Para despues",
                body: "Cuando por fin estemos en el mismo lugar, quiero volver contigo a esta pagina y sonreir por todo lo que fuimos capaces de construir incluso en la distancia. Ese dia, espero poder decirte esto mismo pero mirandote cerquita."
            }
        ],
        playlist: [
            {
                title: "Una cancion para mi Girasol Hermosa",
                artist: "Pon aqui el artista",
                url: "https://open.spotify.com/"
            },
            {
                title: "La que te dedicaria hoy",
                artist: "Pon aqui el artista",
                url: "https://open.spotify.com/"
            },
            {
                title: "La que quiero escuchar contigo en persona",
                artist: "Pon aqui el artista",
                url: "https://open.spotify.com/"
            }
        ],
        finalTitle: "Siempre voy a encontrar una forma de llegar a ti",
        finalMessage: "Gracias por existir en mi vida como existes, mi vida. Esta pagina no intenta competir con un abrazo tuyo, pero si queria recordarte que incluso en la distancia sigo pensando en ti con amor, admiracion y unas ganas inmensas de seguir construyendo contigo."
    }
};