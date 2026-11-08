// Adapted from github.com/Xiexe/WoWLoginScreens for the Windows XP desktop:
// three expansions, music starts at launch, Quit/Esc return to the desktop.
var expansion = 1;

var expansionMap = [
    'Vanilla',
    'WrathOfTheLichKing',
    'Shadowlands',
]

// Video file names keep the source repo casing.
var videoFileMap = [
    'Vanilla.mp4',
    'Wrathofthelichking.mp4',
    'Shadowlands.mp4',
];

var audioPath = './assets/audio';
var videoPath = './assets/img/bg';
var logoPath = './assets/img/ui/logos';

var verMap = [
    'Version 1.12.1 (5875) (Release)',
    'Version 3.3.5 (12340) (Release)',
    'Version 9.0.1 (35944) (Release x64)'
];

var dateMap = [
    'Sept 19 2006',
    'Jun 24 2010',
    'Oct 13 2020'
];

var buttonColorMap = [0, 1, 0];

var copyMap = [2006, 2010, 2020];

var cursor;
var audio = new Audio();
var buttonAudio = new Audio();
var audioInitialPlayback = false;
var queuePos = null;
var disconnected = false;

// play() rejects when the browser blocks autoplay; never let that surface as an error.
function safePlay(media)
{
    var p = media.play();
    return p && p.then ? p.then(function () { return true; }, function () { return false; }) : Promise.resolve(true);
}

function init()
{
    switchExpansion();
    // Launched from the desktop: the double-click already counts as interaction, so start music now.
    waitForInteractionToPlayAudio();
    window.addEventListener('click', waitForInteractionToPlayAudio);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') quitGame();
    });

    getPositionInQueue();
    setInterval(determineIfDisconnect, 8000);
}

function waitForInteractionToPlayAudio()
{
    if(!audioInitialPlayback)
    {
        buttonAudio.volume = 0.5;
        audio.volume = 0.5;
        audio.loop = true;
        audioInitialPlayback = true;
        safePlay(audio).then(function (ok) { if (!ok) audioInitialPlayback = false; });
    }
}

function quitGame()
{
    if (window.parent !== window && typeof window.parent.closeWoW === 'function')
        window.parent.closeWoW();
    else
        location.href = '/';
}

function determineIfDisconnect()
{
    if(!disconnected)
    {
        var rand = Math.random();
        if(rand < 0.75)
            getPositionInQueue();
    }
}

function getPositionInQueue()
{
    var number;
    if(queuePos === null)
    {    
        number = Math.floor(Math.random() * Math.floor(10000));
        queuePos = number;
    }
    else
    {
        number = Math.floor(queuePos - (Math.random() * Math.floor(15)));
        queuePos = number;

        if(queuePos < 3)
        {
            number = 0;
            queuePos = 0;
            doDisconnect();
        }
    }

    document.getElementById('queuePosition').innerHTML = 'Position in Queue: ' + number;
    getEstimatedTime(number)
}

function getEstimatedTime(qPos)
{
    var time = Math.floor(Math.floor(qPos*2*3*2 + ((qPos*2*3*3) - (qPos*2*3*2)) * Math.random()) * 0.01);
    document.getElementById('queueTime').innerHTML = 'Estimated time: ' + time + ' min';
}

function doDisconnect()
{
    hideQueue();
    showDisconnect();
    playButtonAudio(1);
    disconnected = true;
    console.log("DC'd")
}

function manualChangeExpac()
{
    console.log("Changing xpac to: ");
    expansion += 1;
    if(expansion > expansionMap.length - 1)
        expansion = 0;
    
    var bg = document.getElementById('background');
    bg.muted = false;
    switchExpansion();
}

function switchExpansion()
{
    if(disconnected)
    {
        disconnected = false;
        hideQueue();
        showDisconnect();
    }
    queuePos = null;
    getPositionInQueue();
    var bg = document.getElementById('background');
    var bgMp4 = bg.querySelector('source');
    var logo = document.getElementById('logo');
    var version = document.getElementById('buildVersion');
    var date = document.getElementById('buildDate');
    var copyright = document.getElementById('copyrightText');
    
    bg.pause();
    audio.pause();
    var expName = expansionMap[expansion];
    console.log(expName);
    audio.src = `${audioPath}/${expName}.ogg`;
    bgMp4.setAttribute('src', `${videoPath}/${videoFileMap[expansion]}`);
    logo.style.background = `url(${logoPath}/${expName}.png)`;
    version.textContent = verMap[expansion];
    date.textContent = dateMap[expansion];
    copyright.textContent = `Copyright 2004-${copyMap[expansion]} Blizzard Entertainment. All Right Reserved.`;
    setButtonColors(buttonColorMap[expansion]);
    
    bg.load();
    safePlay(bg);
    if (audioInitialPlayback) safePlay(audio);
    
}

function playButtonAudio(index)
{
    buttonAudio.pause();
    buttonAudio.time = 0;

    if(index === 0)
        buttonAudio.src = './assets/audio/ui/button_click.ogg';
    else
        buttonAudio.src = './assets/audio/ui/button_click_big.ogg';
    
    safePlay(buttonAudio);
}

function hideQueue()
{
    var x = document.getElementById("queue");
    if(x.style.display === "none")
        x.style.display = "flex";
    else
        x.style.display = "none";
}

function showDisconnect()
{
    var x = document.getElementById("disconnectBox");
    if(x.style.display === "none")
        x.style.display = "flex";
    else
        x.style.display = "none";
}

function resetQueue()
{
    disconnected = false;
    showDisconnect();
    hideQueue();
}

function showSettings()
{
    var opt = document.getElementById("options");
    if(opt.style.display == "none")
    {
        opt.style.display = "flex";
    }
    else
    {
        opt.style.display = "none";
    }
}

function adjustVolume()
{
    var slider = document.getElementById("volumeSlider");
    var val = slider.value * 0.01;
    audio.volume = val;
    buttonAudio.volume = val;
    document.getElementById('background').volume = val;
}

function setButtonColors(index)
{
    var quitButton = document.getElementById("quitButton");
    var optButton = document.getElementById("optButton");
    var realmListButton = document.getElementById("realmListButton");
    var disconButton = document.getElementById("disconButton");
    switch(index)
    {
        case 0:
            quitButton.className = "button";
            optButton.className = "button";
            realmListButton.className = "button";
            disconButton.className = "button";
        break;

        case 1:
            quitButton.className = "button_b";
            optButton.className = "button_b";
            realmListButton.className = "button_b";
            disconButton.className = "button_b";
        break;
    }
}