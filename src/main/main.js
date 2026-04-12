import './bg.js'

setTimeout(() => {
    document.querySelector('.openanim').style.animation = 'fade 0.5s cubic-bezier(.01,1,.5,1) forwards';
    document.querySelector('.navbar').style.animation = 'navin 1s ease-in-out forwards';
}, 3000);

setTimeout(() => {
    document.querySelector('main').style.animation = 'navin 2s ease-in-out forwards';
}, 4000);

