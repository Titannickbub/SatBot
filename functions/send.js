async function text(
    platform,
    chatId,
    threadId,
    text
) {

    const target =
        global.platformRegistry?.[
            platform
        ];

    if (!target) {

        throw new Error(
            `Plataforma ${platform} não carregada.`
        );

    }

    return await target.sendText(
        chatId,
        threadId,
        text
    );

}

async function image(
    platform,
    chatId,
    threadId,
    image,
    caption
) {

    const target =
        global.platformRegistry?.[
            platform
        ];

    if (!target) {

        throw new Error(
            `Plataforma ${platform} não carregada.`
        );

    }

    return await target.sendImg(
        chatId,
        threadId,
        image,
        caption
    );

}

async function video(
    platform,
    chatId,
    threadId,
    videoData,
    caption
) {

    const target =
        global.platformRegistry?.[
            platform
        ];

    if (!target) {

        throw new Error(
            `Plataforma ${platform} não carregada.`
        );

    }

    return await target.sendVideo(
        chatId,
        threadId,
        videoData,
        caption
    );

}

async function audio(
    platform,
    chatId,
    threadId,
    audioData,
    caption
) {

    const target =
        global.platformRegistry?.[
            platform
        ];

    if (!target) {

        throw new Error(
            `Plataforma ${platform} não carregada.`
        );

    }

    return await target.sendAudio(
        chatId,
        threadId,
        audioData,
        caption
    );

}

async function send(
    platform,
    chatId,
    threadId,
    messageText
) {
    return await text(
        platform,
        chatId,
        threadId,
        messageText
    );
}

async function sendImg(
    platform,
    chatId,
    threadId,
    imageData,
    caption
) {
    return await image(
        platform,
        chatId,
        threadId,
        imageData,
        caption
    );
}

async function sendVideo(
    platform,
    chatId,
    threadId,
    videoData,
    caption
) {
    return await video(
        platform,
        chatId,
        threadId,
        videoData,
        caption
    );
}

async function sendAudio(
    platform,
    chatId,
    threadId,
    audioData,
    caption
) {
    return await audio(
        platform,
        chatId,
        threadId,
        audioData,
        caption
    );
}

module.exports = {

    text,

    image,

    video,

    audio,

    send,

    sendImg,

    sendVideo,

    sendAudio

};
