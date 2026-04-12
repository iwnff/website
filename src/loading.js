import './load.css'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as THREE from 'three'
import { element } from 'three/tsl';
import { Mesh } from 'three/webgpu';

document.querySelector('.loading').style.opacity = '1';
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1000)

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#loading'),
  alpha: true,
  antialias: true,
})
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(150, 150)
camera.position.setZ(6)
camera.position.setY(-2)
camera.rotation.x = 0.2

// scene.background = new THREE.Color(0xffffff)

renderer.render(scene, camera)

const cube = new THREE.Mesh(
  new THREE.ConeGeometry(2, 3, 4, 100),
  new THREE.MeshStandardMaterial({ 
  color: 0xffffff,
  flatShading: true,
  emissive: 0xfff,
  emissiveIntensity: 0.1,
  metalness: 0.5,
  roughness: 0.5,
  })
)
cube.position.set(0, 0, 0)
scene.add(cube)



const pointLight = new THREE.PointLight(0xbd66ff)
pointLight.position.set(-3, 8, 1)
pointLight.intensity = 100
scene.add(pointLight)

const pointLight2 = new THREE.PointLight(0xfffa61)
pointLight2.position.set(-13, -6, 1)
pointLight2.intensity = 100
scene.add(pointLight2)

// const hemislight = new THREE.HemisphereLight(0xffffff, 0x000000, 1)
// scene.add(hemislight)

// const lightHelper = new THREE.PointLightHelper(pointLight, 1)
// scene.add(lightHelper)

// const ambientLight = new THREE.AmbientLight(0xffffff)
// ambientLight.intensity = 0.1
// scene.add(ambientLight)

const loading = document.querySelector('.load');

function animate() {
  requestAnimationFrame(animate)

  cube.rotation.y += 0.05
  cube.position.y = Math.sin(cube.rotation.y) * 1
  cube.rotation.x = Math.sinh(cube.position.y) * 0.5

  renderer.render(scene, camera)
}
animate()

// window.addEventListener('resize', () => {
//   const width = window.innerWidth
//   const height = window.innerHeight

//   renderer.setSize(width, height)
//   camera.aspect = width / height
//   camera.updateProjectionMatrix()
// })



document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.loading').style.animation = 'loaded 1s ease-in-out forwards';

    setTimeout(() => {

      const enterBtn = document.getElementById('enter');
      const rotateHint = document.getElementById('rotate-hint');
      const iconRotate = document.getElementById('icon-rotate-hint');
      const warning = document.querySelector('.warning');

      async function startMainApp() {
        const loadingEl = document.querySelector('.loading');

        loadingEl.style.display = 'flex';
        loadingEl.style.opacity = '1';

        await new Promise(r => setTimeout(r, 1000));

        const res = await fetch("./main.html");
        const html = await res.text();
        loadingEl.style.animation = 'loaded 1s ease-in-out forwards';
        await new Promise(r => setTimeout(r, 1000));
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        document.querySelector('#loading').remove();

        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
          document.head.appendChild(link.cloneNode(true));
        });

        document.body.innerHTML = doc.body.innerHTML;
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto'; 

        doc.querySelectorAll('script').forEach(script => {
          const newscript = document.createElement('script');
          if (script.src) {
            newscript.src = script.src;
            newscript.type = 'module';
          } else {
            newscript.textContent = script.textContent;
          }
          document.body.appendChild(newscript);
        });
      }

      function isMobileDevice() {
        return /Mobi|Android|iPhone/i.test(navigator.userAgent);
      }

      function isLandscape() {
        return window.innerWidth > window.innerHeight;
      }

      function isReady() {
        const isMobile = isMobileDevice();
        if (!isMobile) return true;
        return isLandscape();
      }

      if (window.innerWidth > 900) {
        startMainApp();
        return;
      }
      warning.style.display = 'flex';

      

      function updateUI() {
        const isMobile = isMobileDevice();

        if (isMobile && !isLandscape()) {
          rotateHint.style.display = 'block';
          iconRotate.style.display = 'block';
          enterBtn.style.display = 'none';
        } else {
          rotateHint.style.display = 'none';
          iconRotate.style.display = 'none';
          enterBtn.style.display = 'block';
        }
      }

      updateUI();

      window.addEventListener('resize', updateUI);
      window.visualViewport?.addEventListener('resize', updateUI);

      window.addEventListener('orientationchange', () => {
        setTimeout(updateUI, 300);
      });

      enterBtn.addEventListener('click', async () => {
        if (!isReady()) return;
        window.scrollTo(0, 1);
        try {
          if (window.innerWidth <= 900) {
            await document.documentElement.requestFullscreen();

            if (screen.orientation?.lock) {
              await screen.orientation.lock('landscape');
            }
          }
        } catch (e) {
          console.warn(e);
        }

        startMainApp();
      });

    }, 100);
});


// window.addEventListener('load', () => {
//   document.querySelector('.loading').style.animation = 'loaded 1s ease-in-out forwards';
//   setTimeout(() => {
//     document.querySelector('.loading').style.display = 'none';
//     fetch("/main.html")
//     .then(res => res.text())
//     .then(html => document.body.innerHTML = html);
//     doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
//     document.head.appendChild(link.cloneNode(true));
//   });
//   }, 1000);
// })
