const player = require('play-sound')();
player.play('./public/media/audio-snap.mp3', (err) => {
    if (err) console.log(`Could not play sound: ${err}`);
});

