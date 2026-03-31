window.appConfig = {
    portal: {
        title: "Portal para mi Girasol Hermosa",
        intro: "Valentina, si eres tu, mira a la camara y deja que este portal confirme que llegaste al lugar que prepare solo para ti. Si el reconocimiento no coopera, usa la clave secreta que solo nosotros entenderiamos.",
        secretPhrase: "girasol",
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
        message: "Valentina, queria regalarte algo distinto: un lugarcito hecho por mi, con codigo, carino y un poquito de locura bonita, para recordarte que incluso a distancia sigues siendo de las cosas mas hermosas que me han pasado.",
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
            eyebrow: "Sala de nuestros viernes",
            title: "La sala privada de Fucknews",
            message: "No quise dejar todos los capitulos tirados en la portada. Preferi abrir una entrada aparte, como si nuestros viernes merecieran su propia cartelera elegante.",
            frequencyLabel: "Todos los viernes",
            frequencyNote: "Como ritual fijo, no como lista cualquiera.",
            yearsLabel: "3 anos",
            yearsNote: "Y contando, viernes por viernes.",
            seriesLabel: "Fucknews Fridays",
            source: "fucknews_links.txt",
            defaultNote: "Otro viernes guardado en nuestro museo.",
            ctaLabel: "Entrar a la sala",
            previewTitle: "La cartelera completa nos espera adentro",
            previewMessage: "Quise que esto se sintiera mas como una puerta al recuerdo que como una lista infinita en la misma pantalla.",
            pageEyebrow: "Cartelera privada",
            pageTitle: "La sala de nuestros viernes con Fucknews",
            pageMessage: "Todos los capitulos que hemos visto juntos viven aqui, en orden, como una cartelera intima de todo lo que nos ha hecho reir a traves de estos anos.",
            pageStatLabel: "Capitulos en cartelera",
            pageStatNote: "Cada titulo sale del archivo que me compartiste.",
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
                body: "Yo tambien te extrano, Valentina. Muchisimo. Pero intento pensar que cada dia que pasa no es tiempo perdido, sino una cuenta regresiva hacia el proximo abrazo, la proxima mirada y ese momento en que por fin la pantalla deje de estorbar."
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
        finalMessage: "Gracias por existir en mi vida como existes, Valentina. Esta pagina no intenta competir con un abrazo tuyo, pero si queria recordarte que incluso en la distancia sigo pensando en ti con amor, admiracion y unas ganas inmensas de seguir construyendo contigo."
    }
};