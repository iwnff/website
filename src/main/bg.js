import './mainstyle.css'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'
import { TTFLoader } from 'three/examples/jsm/Addons.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { UnrealBloomPass } from 'three/examples/jsm/Addons.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BokehPass } from 'three/examples/jsm/Addons.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { OutputPass } from 'three/examples/jsm/Addons.js'
import { gsap } from 'gsap/gsap-core'
import { LensFlareEffect, LensFlareParams } from './lensflare.js'
import { ShaderPass } from 'three/examples/jsm/Addons.js'
import { vector2 } from 'maath'
import { color, js } from 'three/src/nodes/TSL.js'
import { HeightFog } from './heightfog.js'
import { depth } from 'three/tsl'

function waitcanvas() {
    const canvas = document.querySelector('#bgmain');
      if (!canvas) {
    setTimeout(() => {
      requestAnimationFrame(waitcanvas);
      console.warn("canvas not loaded! grrrrr")
    }, 500);
    return;
  }

  // Varible stuff
  let iscameraAnimating = false;
  let lastScrollTimeDelay = 0;
  let isEnglishLanguange = false;


  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  const clickableObjects = []
  const clock = new THREE.Clock()
  let hoveredObject = null

  console.log(document.querySelector('#bgmain'))

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x6678fa, 0.0008)
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
    });

    console.log("renderer: ", renderer)
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    camera.position.set(-50, 16.9, 11.8)
    camera.rotation.set(-1, -8.8, -0.9)

    renderer.render(scene, camera)
    const renderPass = new RenderPass(scene, camera);
    const bloompass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85,
    )
    bloompass.threshold = 0.22;
    bloompass.strength = 0.22;
    bloompass.radius = 0.5;
    bloompass.exposure = 0.5;

    const bokehpass = new BokehPass(scene, camera, {
        focus: 10000,
        aperture: 0.5,
        maxblur: 0.01,
    });

    const ChromaticAberrationShader = {
      uniforms: {
        tDiffuse: { value: true },
        offset: { value: new THREE.Vector2(0.002, 0.002) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 offset;
        varying vec2 vUv;
        void main() {
          vec4 color;
          color.r = texture2D(tDiffuse, vUv + offset).r;
          color.g = texture2D(tDiffuse, vUv).g;
          color.b = texture2D(tDiffuse, vUv - offset).b;
          color.a = 1.0;
          gl_FragColor = color;
        }
      `
    };
    const caPass = new ShaderPass(ChromaticAberrationShader);

    const fog = new HeightFog(scene, {
      color: 0xaaaaaa,
      radius: 800,
      fogTop: 1.5,
      fogDepth: 3.5,
      opacity: 0.55,
      noiseScale: 0.08,
      noiseStrength: 0.25,
      windDirX: 0.5,
      windDirY: 0.2,
      windSpeed: 0.8,
      innerRadius: 30,
      innerFade: 150
    })

    const outputpass = new OutputPass();
    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    // composer pass layers from bottom to top
    composer.addPass(bokehpass);
    composer.addPass(bloompass);
    composer.addPass(caPass);
    composer.addPass(outputpass);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(window.devicePixelRatio);
    composer.renderToScreen = true;
    // will work on this soon
    // update: it works all the time, i just forgot to add the composer.render() in the animate function
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.physicallyCorrectLights = true;

    const isMobile = window.innerWidth <= 900;

    if (isMobile) {
      bokehpass.enabled = false;
      bloompass.strength = 0.1;
    }

    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1000, 3, 1000, 100),
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissiveIntensity: 0.1,
            metalness: 0.5,
            roughness: 0.5,
        })
    );
    cube.position.set(0, -5, 0);

    cube.receiveShadow = true;
    scene.add(cube);
    fog.patchScene()

    const amblight = new THREE.AmbientLight(0x26537d, 0.8);
    scene.add(amblight);

    const directlight = new THREE.DirectionalLight(0x7878ab, 1)
    directlight.position.set(20, 25, 50);
    directlight.castShadow = true;
    directlight.shadow.mapSize.width = 256;
    directlight.shadow.mapSize.height = 256;
    directlight.shadow.camera.near = 0.5;
    directlight.shadow.camera.far = 50;
    directlight.shadow.camera.left = -50;
    directlight.shadow.camera.right = 50;
    directlight.shadow.camera.top = 50;
    directlight.shadow.camera.bottom = -50;
    directlight.receiveShadow = true;
    scene.add(directlight);
    // const directhelp = new THREE.DirectionalLightHelper(directlight, 5)
    // scene.add(directhelp);

    // scene.fog = new THREE.Fog(0x4287f5, 30, 200)
    // scene.fog = new THREE.FogExp2(0x4287f5, 0.0025)
    // const box1 = new THREE.Mesh(
    //   new THREE.BoxGeometry(5, 20, 5),
    //   new THREE.MeshStandardMaterial({
    //     color: 0x7878ab,
    //     emissiveIntensity: 0.1,
    //     metalness: 0.5,
    //     roughness: 0.5,
    //   })
    // )
    // box1.position.set(-10, 3, 10)
    // box1.castShadow = true;
    // box1.receiveShadow = true;
    // scene.add(box1)

    // const ball = new THREE.Mesh(
    //   new THREE.SphereGeometry(5, 100, 100),
    //   new THREE.MeshStandardMaterial({
    //     color: 0xffffff,
    //   })
    // )
    // scene.add(ball)
    // ball.receiveShadow = true;
    // ball.castShadow = true;
    // ball.position.set(0, 6.5, 0)

    const loaders = new THREE.TextureLoader();
    const bg = loaders.load('../../bg.png')
    const peraihHisno = loaders.load('../../peraihhisno.jpeg')
    const peraihLKSJuara2 = loaders.load('../../peraihlksjuara2.jpeg')

    const sertifikatconstruct = loaders.load('../../sertifikatconstruct.jpeg')
    const sertifikatcpp = loaders.load('../../sertifikatcpp.jpeg')
    const sertifikatcsharp = loaders.load('../../sertifikatcsharp.jpeg')
    const sertifikatgamelab = loaders.load('../../sertifikatgamelab.jpeg')
    const sertifikatpesertalks = loaders.load('../../sertifikatpesertalks.jpeg')
    const sertifikatpython = loaders.load('../../sertifikatpython.jpeg')
    const beatdashpreview = loaders.load('../../beatdash.png')
    const unitypreview = loaders.load('../../unity.png')
    const godotpreview = loaders.load('../../godot.png')



    // const skyTexture = new THREE.TextureLoader().load('../../bg.png')
    // skyTexture.colorSpace = THREE.SRGBColorSpace

    // const skyGeo = new THREE.SphereGeometry(2000, 64, 64)

    // const skyMat = new THREE.MeshBasicMaterial({
    //   map: skyTexture,
    //   side: THREE.BackSide,
    //   depthWrite: false
    // })

    // const skyDome = new THREE.Mesh(skyGeo, skyMat)
    // scene.add(skyDome)
    // fog.patchScene()

    function roundedRectShape(width, height, radius) {
      const shape = new THREE.Shape()

      shape.moveTo(-width/2 + radius, -height/2)
      shape.lineTo(width/2 - radius, -height/2)
      shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius)
      shape.lineTo(width/2, height/2 - radius)
      shape.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2)
      shape.lineTo(-width/2 + radius, height/2)
      shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius)
      shape.lineTo(-width/2, -height/2 + radius)
      shape.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2)

      return shape
    }

    const frostedGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xDBE9F4,
      transmission: 1,
      roughness: 0.4,
      metalness: 0,
      ior: 1.4,
      thickness: 0.7,
      specularIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 1,
      transparent: true,
      envMapIntensity: 1,
      reflectivity: 0.8,
      envMap: bg,
    })
    const glassCircle = new THREE.Mesh(
      new THREE.SphereGeometry(3, 32, 32),
      frostedGlassMaterial.clone()
    )
    glassCircle.position.set(-20, 4, 0);
    glassCircle.castShadow = true;
    clickableObjects.push(glassCircle)
    glassCircle.name = "glassSphere"
    glassCircle.userData.baseX = glassCircle.position.x
    glassCircle.userData.baseY = glassCircle.position.y
    glassCircle.userData.baseZ = glassCircle.position.z
    scene.add(glassCircle)
    fog.patchScene()


    // const glassPanel = new THREE.Mesh(
    //   new THREE.PlaneGeometry(26, 12),
    //   frostedGlassMaterial
    // )

    // glassPanel.position.set(-9, 0, 1)
    // glassPanel.rotation.y = 4.3
    // scene.add(glassPanel)
    function createCustomPanel(pos = {x: 0, y: 0, z: 0}, options = {}) {
        const {
            width = 1,
            height = 1,
            radius = 1,
            depth = 0.5,
            rotation = { x: 0, y: 0, z: 0 },
            material = frostedGlassMaterial
        } = options;

        const shape = roundedRectShape(width, height, radius);
        
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: depth,
            bevelEnabled: true
        });

        const mesh = new THREE.Mesh(geometry, material);    
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.rotation.set(rotation.x, rotation.y, rotation.z);

        scene.add(mesh);
        if (window.fog?.patchScene) fog.patchScene();

        return mesh;
    }
    
    createCustomPanel({x: -10, y: 5.5, z: -10}, {
      width: 26,
      height: 16,
      depth: 0.5,
      rotation: {x: 0, y: 4.7, z: 0}
    })

    createCustomPanel({x: 45, y: 14, z: -33}, {
      width: 19.5,
      height: 16,
      depth: 0.5,
      rotation: {x: 0, y: 2, z: 0}
    })

    createCustomPanel({x: 54, y: 13, z: 6}, {
      width: 18,
      height: 25,
      depth: 0.5,
      rotation: {x: 0, y: 1.3, z: 0}
    })

    createCustomPanel({x: 48, y: 10, z: 57}, {
      width: 12,
      height: 20,
      depth: 0.5,
      rotation: {x: 0, y: 0.5, z: 0}
    })

    createCustomPanel({x: -7, y: 8, z: 56}, {
      width: 10,
      height: 17,
      depth: 0.5,
      rotation: {x: 0, y: -1, z: 0}
    })

    createCustomPanel({x: -88, y: 8, z: 5}, {
      width: 26,
      height: 16,
      depth: 0.5,
      rotation: {x: 0, y: 4, z: 0}
    })

    const loader = new THREE.TextureLoader()

    bg.mapping = THREE.EquirectangularReflectionMapping
    scene.background = bg
    // loader.load('../../bg.png', (texture) => {
    //   texture.mapping = THREE.EquirectangularReflectionMapping

    //   const pmrem = new THREE.PMREMGenerator(renderer)
    //   const envMap = pmrem.fromEquirectangular(texture).texture
    //   scene.background = texture
    //   scene.environment = envMap
    // })
    
    // const plane = new THREE.Mesh(
    //     new THREE.BoxGeometry(1, 20, 10),
    //     new THREE.MeshStandardMaterial({
    //         color: 0xffffff,
    //         emissiveIntensity: 1.1,
    //         emissive: 0xffffff,
    //     })
    // );
    // plane.position.set(20, 10, 30);
    // plane.rotation.y = 90
    // plane.receiveShadow = true;
    // scene.add(plane);

    // const controls = new OrbitControls( camera, renderer.domElement );
    
    // const planelight = new THREE.RectAreaLight(0xffffff, 1, 20, 10);
    // planelight.position.set(20, 10, 30)
    // planelight.rotation.y = Math.PI / 7
    // scene.add(planelight);


    
    const gltfLoader = new GLTFLoader()
    gltfLoader.load('../../park_bench.glb', 
      function (gltf) {
        console.log(gltf)
        const park = gltf.scene;
        park.scale.set(3, 3, 3)
        park.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        park.position.set(35, -3.5, -14);
        park.rotation.y = 2.8;
        scene.add(park);
        fog.patchScene()
      },
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.error(error);
      }
    )
    gltfLoader.load('../../circular_table.glb', 
      function (gltf) {
        console.log(gltf)
        const table = gltf.scene;
        table.scale.set(3, 3, 3)
        table.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        table.position.set(60, -3.5, -14);
        table.rotation.y = 2.8;
        scene.add(table);
        fog.patchScene()
      },
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.error(error);
      }
    )

    gltfLoader.load('../../living_room.glb', 
    function (gltf) {
      console.log(gltf)
      const living = gltf.scene;
      living.scale.set(3, 3, 3)
      living.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      living.position.set(70, -3.5, 54);
      living.rotation.y = 1.9;
      scene.add(living);
      fog.patchScene()
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error(error);
    }
  )

    gltfLoader.load('../../computer_desk.glb', 
    function (gltf) {
      console.log(gltf)
      const desk = gltf.scene;
      desk.scale.set(3, 3, 3)
      desk.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      desk.position.set(-55, -3.5, -30);
      desk.rotation.y = 3.7;
      scene.add(desk);
      fog.patchScene()
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error(error);
    }
  )

    gltfLoader.load('../../lamp.glb', 
    function (gltf) {
      console.log(gltf)
      const lamp = gltf.scene;
      lamp.scale.set(3, 3, 3)
      lamp.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      lamp.position.set(-80, -3.5, 4);
      lamp.rotation.y = 1.9;
      scene.add(lamp);
      fog.patchScene()
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error(error);
    }
  )

  const modelCache = {}

function loadModel(path, callback) {
  if (modelCache[path]) {
    callback(modelCache[path].clone())
    return
  }

  gltfLoader.load(path, (gltf) => {
    modelCache[path] = gltf.scene
    callback(gltf.scene.clone())
  })
}

  // const lampsphere = new THREE.Mesh(
  //   new THREE.SphereGeometry(2.5, 100, 100),
  //   new THREE.MeshStandardMaterial({
  //     color: 0xffffff,
  //     emissive: 0xffffff,
  //     emissiveIntensity: 1.5,
  //     transparent: true,
  //   })
  // )
  // lampsphere.position.set(0, 19, -13.2)
  // scene.add(lampsphere)
  
  const lampLight = new THREE.PointLight(0xffffff, 1, 100);
  lampLight.position.set(7, 20.3, -10.2);
  lampLight.intensity = 300;
  lampLight.decay = 2;
  lampLight.distance = 300;
  lampLight.castShadow = true;
  scene.add(lampLight);
  fog.patchScene()
  
  // const lamplighthelp = new THREE.PointLightHelper(lampLight, 1);
  // scene.add(lamplighthelp);

  const lensFlareEffect = LensFlareEffect();
  scene.add(lensFlareEffect)
  
  let text1;
  let text2;
  let text3;
  let text4;
  let text5;
  let text2light;

  const fontloader = new FontLoader();
  const ttfloader = new TTFLoader();
  let font

  const createImage = (texture, width, height) => {
      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({ 
          map: texture, 
          transparent: true
      });
      return new THREE.Mesh(geometry, material);
  };

  function createText(text, font, size, lineheight) {
    const group = new THREE.Group();
    const lines = text.split("\n");

    lines.forEach((line, i) => {

      const geo = new TextGeometry(line, {
        font: font,
        size: size,
        depth: 0,
        height: 0,
        curveSegments: 12,
        bevelEnabled: false
      })

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true})
      )
      mesh.position.y = -i * lineheight
      group.add(mesh)
    })
    return group
  }

  //banner
  ttfloader.load('../InterTightRegular.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Welcome to my website",
    font,
    1.3,
    4
  )
  text.position.set(-12, 11, -21)
  text.rotation.set(0, -1.6, 0)
  scene.add(text)
  })

  ttfloader.load('../InterTightLight.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Perkenalkan Saya Iwan Firmansyah, Seorang\nprogammer dengan pengalaman dalam beberapa \nbidang salah satunya game development, website\ndevelopment dan 3D models. untuk melihat bagian\nlainnya anda bisa Scroll halaman website ini\n\n(Bagi Pengguna Mobile bisa menggunakan\nkontrol arah panah)",
    font,
    0.7,
    1
  )
  text.position.set(-12, 9, -21)
  text.rotation.set(0, -1.6, 0)
  scene.add(text)
  })

  //about
  ttfloader.load('../InterTightRegular.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "About me",
    font,
    1.3,
    4
  )
  text.position.set(41, 19, -40)
  text.rotation.set(0,-1.15, 0)
  scene.add(text)
  })


  ttfloader.load('../InterTightLight.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Saya berumur 17 tahun yang mempunyai\nentusiasme tinggi dalam pengembangan\ndi bidang seperti Programming, 3D, &\nGame Development, Salah satunya\nPenggunaan Game engine seperti godot,\nUnity, Dan Construct 3, Dan Pembuatan\nGame Asset 3D menggunakan Program \nBlender. Dan pengembangan website\nyang memiliki aspek kreativitas\nseperti website portfolio saya",
    font,
    0.7,
    1
  )
  text.position.set(41, 17, -40)
  text.rotation.set(0,-1.15, 0)
  scene.add(text)
  })

    //about2
  ttfloader.load('../InterTightRegular.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Achivements",
    font,
    1.3,
    4
  )
  text.position.set(55, 22, -2)
  text.rotation.set(0,-1.9, 0)
  scene.add(text)
  })

  ttfloader.load('../InterTightLight.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Disini adalah bagian untuk\nmemperlihatkan pencapaian saya\n\nPemenang Olimpiade Bahasa Inggris\nTingkat Nasional HISNO 2023\n\nPemenang LKS Tingkat Kota bidang\n'IT Software Solution For\nBusiness'\n\n(Pencet Gambar untuk melihatnya)",
    font,
    0.7,
    1
  )
  text.position.set(55, 20, -2)
  text.rotation.set(0,-1.9, 0)
  scene.add(text)
  })

  const hisno = createImage(peraihHisno, 7, 7)
  hisno.position.set(55, 6, 1)
  hisno.rotation.set(0,-1.9, 0)
  scene.add(hisno)
  hisno.name = "hisno"
  clickableObjects.push(hisno)
  hisno.userData.baseX = hisno.position.x
  hisno.userData.baseY = hisno.position.y
  hisno.userData.baseZ = hisno.position.z

  const lks2 = createImage(peraihLKSJuara2, 7, 7)
  lks2.position.set(50, 6, 8)
  lks2.rotation.set(0,-1.9, 0)
  scene.add(lks2)
  lks2.name = "lks2"
  clickableObjects.push(lks2)
  lks2.userData.baseX = lks2.position.x
  lks2.userData.baseY = lks2.position.y
  lks2.userData.baseZ = lks2.position.z
  //projects
  ttfloader.load('../InterTightRegular.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "My projects",
    font,
    1.3,
    4
  )
  text.position.set(52, 17, 54)
  text.rotation.set(0,-2.6, 0)
  scene.add(text)
  })

  ttfloader.load('../InterTightLight.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Berikut adalah Proyek\nYang saya buat, saya\ntelah memilih 3 proyek\nyang saya pilih sebagai\npaling terbaik dari\nkarir saya.\n\nJika ingin mengetahui\nlagi mengenai proyek-\nproyek yang saya buat\nbisa kontak saya.\n\n(klik gambar untuk\nmelihat videonya)",
    font,
    0.7,
    1
  )
  text.position.set(52, 15, 54)
  text.rotation.set(0,-2.6, 0)
  scene.add(text)
  })

  const beatdash = createImage(beatdashpreview, 15, 10)
  beatdash.position.set(40, 18, 70)
  beatdash.rotation.set(0,-2.8, 0)
  scene.add(beatdash)
  beatdash.name = "beatdash"
  clickableObjects.push(beatdash)
  beatdash.userData.baseX = beatdash.position.x
  beatdash.userData.baseY = beatdash.position.y
  beatdash.userData.baseZ = beatdash.position.z

  const unity = createImage(unitypreview, 15, 10)
  unity.position.set(24, 18, 75)
  unity.rotation.set(0,-2.8, 0)
  scene.add(unity)
  unity.name = "unity"
  clickableObjects.push(unity)
  unity.userData.baseX = unity.position.x
  unity.userData.baseY = unity.position.y
  unity.userData.baseZ = unity.position.z

  const godot = createImage(godotpreview, 15, 10)
  godot.position.set(8, 18, 80)
  godot.rotation.set(0,-2.8, 0)
  scene.add(godot)
  godot.name = "godot"
  clickableObjects.push(godot)
  godot.userData.baseX = godot.position.x
  godot.userData.baseY = godot.position.y
  godot.userData.baseZ = godot.position.z

  //Certificates
  ttfloader.load('../InterTightRegular.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Certificates",
    font,
    1.1,
    4
  )
  text.position.set(-11, 14, 53)
  text.rotation.set(0,-1, 0)
  scene.add(text)
  })

  ttfloader.load('../InterTightLight.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Sertifikat-sertifikat\nyang saya raih dari\nberbagai sumber\nPerusahaan, Kursus\nonline, & Lomba\nAtau Kompetisi\nLainnya\n\n(Klik gambar\nuntuk melihat\nSertifikat)",
    font,
    0.6,
    1
  )
  text.position.set(-11, 12, 53)
  text.rotation.set(0,-1, 0)
  scene.add(text)
  })

  const construct = createImage(sertifikatconstruct, 10, 6)
  construct.position.set(-22, 2, 35)
  construct.rotation.set(0,-1, 0)
  scene.add(construct)
  construct.name = "construct"
  clickableObjects.push(construct)
  construct.userData.baseX = construct.position.x
  construct.userData.baseY = construct.position.y
  construct.userData.baseZ = construct.position.z

  const gamelab = createImage(sertifikatgamelab, 10, 6)
  gamelab.position.set(-15, 2, 45)
  gamelab.rotation.set(0,-1, 0)
  scene.add(gamelab)
  gamelab.name = "gamelab"
  clickableObjects.push(gamelab)
  gamelab.userData.baseX = gamelab.position.x
  gamelab.userData.baseY = gamelab.position.y
  gamelab.userData.baseZ = gamelab.position.z

  const pesertalks = createImage(sertifikatpesertalks, 10, 6)
  pesertalks.position.set(-22, 9, 35)
  pesertalks.rotation.set(0,-1, 0)
  scene.add(pesertalks)
  pesertalks.name = "pesertalks"
  clickableObjects.push(pesertalks)
  pesertalks.userData.baseX = pesertalks.position.x
  pesertalks.userData.baseY = pesertalks.position.y
  pesertalks.userData.baseZ = pesertalks.position.z

  const python = createImage(sertifikatpython, 10, 6)
  python.position.set(-15, 9, 45)
  python.rotation.set(0,-1, 0)
  scene.add(python)
  python.name = "python"
  clickableObjects.push(python)
  python.userData.baseX = python.position.x
  python.userData.baseY = python.position.y
  python.userData.baseZ = python.position.z

  const csharp = createImage(sertifikatcsharp, 10, 6)
  csharp.position.set(-22, 16, 35)
  csharp.rotation.set(0,-1, 0)
  scene.add(csharp)
  csharp.name = "csharp"
  clickableObjects.push(csharp)
  csharp.userData.baseX = csharp.position.x
  csharp.userData.baseY = csharp.position.y
  csharp.userData.baseZ = csharp.position.z

  const cpp = createImage(sertifikatcpp, 10, 6)
  cpp.position.set(-15, 16, 45)
  cpp.rotation.set(0,-1, 0)
  scene.add(cpp)
  cpp.name = "cpp"
  clickableObjects.push(cpp)
  cpp.userData.baseX = cpp.position.x
  cpp.userData.baseY = cpp.position.y
  cpp.userData.baseZ = cpp.position.z

  //Contact
  ttfloader.load('../InterTightRegular.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Contact",
    font,
    1.3,
    4
  )
  text.position.set(-88, 12, -7)
  text.rotation.set(0,-2.3, 0)
  scene.add(text)
  })

  ttfloader.load('../InterTightLight.ttf', (json) => {
    font = fontloader.parse(json)
    const text = createText(
    "Anda bisa menghubungi saya melewati\nNomer HP: 088989909211\nEmail: firmansyahiwan0438@gmail.com\n\nTerima kasih sudah mengunjungi website\nSaya!",
    font,
    0.7,
    1
  )
  text.position.set(-88, 10, -7)
  text.rotation.set(0,-2.3, 0)
  scene.add(text)
  })

  window.addEventListener("click", onclick)
  function onclick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(clickableObjects)
    if (intersects.length > 0) {
      const object = intersects[0].object

      if (object.name == "glassSphere") {
        const material = object.material
        gsap.to(material.emissive, {
          r: 0.839,
          g: 0.561,
          b: 1,
          duration: 0.3,
          yoyo: true,
          repeat: 1
        })
      }

      if (object.name == "glassButton") {
        isEnglishLanguange = (isEnglishLanguange == false) ? true : false
        console.log(isEnglishLanguange)
      }

      if (object.name == "hisno") {
        window.open('../../peraihhisno.jpeg', '_blank')
      }
      if (object.name == "lks2") {
        window.open('../../peraihlksjuara2.jpeg', '_blank')
      }
      if (object.name == "construct") {
        window.open('../../sertifikatconstruct.jpeg', '_blank')
      }
      if (object.name == "cpp") {
        window.open('../../sertifikatcpp.jpeg', '_blank')
      }
      if (object.name == "csharp") {
        window.open('../../sertifikatcsharp.jpeg', '_blank')
      }
      if (object.name == "gamelab") {
        window.open('../../sertifikatgamelab.jpeg', '_blank')
      }
      if (object.name == "pesertalks") {
        window.open('../../sertifikatpesertalks.jpeg', '_blank')
      }
      if (object.name == "python") {
        window.open('../../sertifikatpython.jpeg', '_blank')
      }
      if (object.name == "beatdash") {
        window.open('../../beatdash.mp4', '_blank')
      }
      if (object.name == "unity") {
        window.open('../../unity.mp4', '_blank')
      }
      if (object.name == "godot") {
        window.open('../../godot.mp4  ', '_blank')
      }
    }
  }

  let lastRaycast = 0;

  window.addEventListener("mousemove", onHover)
  function onHover(event) {

    const now = performance.now();
    if (now - lastRaycast < 50) return;
    lastRaycast = now;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(clickableObjects)
    if (intersects.length > 0) {
      document.body.style.cursor = "pointer"
      
      const object = intersects[0].object
      if (hoveredObject !== object) {
        hoveredObject = object

        if (object.name == "glassSphere") {
          gsap.to(object.position, {
            y: object.userData.baseY + 1,
            duration: 0.3,
            ease: "power2.out"
          })
        }
      }
    } else {
      document.body.style.cursor = "default"

      if (hoveredObject) {
        gsap.to(hoveredObject.position, {
          x: hoveredObject.userData.baseX,
          y: hoveredObject.userData.baseY,
          z: hoveredObject.userData.baseZ,
          duration: 0.3
        })
        hoveredObject = null
      }
    }
  }


  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
  stats.dom.style.display = 'none';

  const gui = new GUI();
  gui.domElement.style.display = 'none';
  gui.close();
  const guiParams = {
    focusDistance: 50,
    aperture: 0.0001,
    blurAmount: 0.006,
    bokehenabled: true,
    bloomStrength: 0.4,
    bloomThreshold: 1,
    bloomRadius: 0.5,
    bloomExposure: 0.5,
    bloomenabled: true,
  };


  const bokehFolder = gui.addFolder('Bokeh Settings');
  bokehFolder.add(guiParams, 'focusDistance', 10, 80);
  bokehFolder.add(guiParams, 'aperture', 0.0001, 0.001);
  bokehFolder.add(guiParams, 'blurAmount', 0, 0.1);
  bokehFolder.add(guiParams, 'bokehenabled').onChange((value) => {
      bokehpass.enabled = value;
  })

  const bloomFolder = gui.addFolder('Bloom Settings');
  bloomFolder.add(guiParams, 'bloomStrength', 0, 2);
  bloomFolder.add(guiParams, 'bloomThreshold', 0, 1);
  bloomFolder.add(guiParams, 'bloomRadius', 0, 1);
  bloomFolder.add(guiParams, 'bloomExposure', 0, 1);
  bloomFolder.add(guiParams, 'bloomenabled').onChange((value) => {
      bloompass.enabled = value;
  });

  const caFolder = gui.addFolder('Chromatic Aberration Settings');
  caFolder.add(caPass.uniforms.offset.value, 'x', 0, 0.02).name('Offset X').step(0.0001);
  caFolder.add(caPass.uniforms.offset.value, 'y', 0, 0.02).name('Offset Y').step(0.0001);
  caFolder.add(caPass, 'enabled').name("Enabled");

  const cameraFolder = gui.addFolder('Camera Settings');
  cameraFolder.add(camera.position, 'x', -50, 50).name('Camera X').onChange(updateCameraHome);
  cameraFolder.add(camera.position, 'y', -50, 50).name('Camera Y').onChange(updateCameraHome);
  cameraFolder.add(camera.position, 'z', -50, 50).name('Camera Z').onChange(updateCameraHome);
  cameraFolder.add(camera.rotation, 'x', -50, 50).name('Camera Rotation X').onChange(updateCameraHome);
  cameraFolder.add(camera.rotation, 'y', -50, 50).name('Camera Rotation Y').onChange(updateCameraHome);
  cameraFolder.add(camera.rotation, 'z', -50, 50).name('Camera Rotation Z').onChange(updateCameraHome);

  const lensflareFolder = gui.addFolder('Lens Flare Settings');
  lensflareFolder.add(lensFlareEffect.material.uniforms.enabled, 'value').name('Enabled?')
  lensflareFolder.add(lensFlareEffect.material.uniforms.followMouse, 'value').name('Follow Mouse?')
  lensflareFolder.add(lensFlareEffect.material.uniforms.lensPosition.value, 'x', -50, 50).name('Lens X Pos')
  lensflareFolder.add(lensFlareEffect.material.uniforms.lensPosition.value, 'y', -50, 50).name('Lens Y Pos')
  lensflareFolder.add(lensFlareEffect.material.uniforms.starPoints, 'value').name('starPoints').min(0).max(9)
  lensflareFolder.add(lensFlareEffect.material.uniforms.glareSize, 'value').name('glareSize').min(0).max(2)
  lensflareFolder.add(lensFlareEffect.material.uniforms.flareSize, 'value').name('flareSize').min(0).max(0.1).step(0.001)
  lensflareFolder.add(lensFlareEffect.material.uniforms.flareSpeed, 'value').name('flareSpeed').min(0).max(4).step(0.01)
  lensflareFolder.add(lensFlareEffect.material.uniforms.flareShape, 'value').name('flareShape').min(0).max(2).step(0.01)
  lensflareFolder.add(lensFlareEffect.material.uniforms.haloScale, 'value').name('haloScale').min(-0.5).max(1).step(0.01)
  lensflareFolder.add(LensFlareParams, 'opacity').name('opacity').min(0).max(1).step(0.01)
  lensflareFolder.add(lensFlareEffect.material.uniforms.ghostScale, 'value').name('ghostScale').min(0).max(2).step(0.01)
  lensflareFolder.add(lensFlareEffect.material.uniforms.animated, 'value').name('animated')
  lensflareFolder.add(lensFlareEffect.material.uniforms.anamorphic, 'value').name('anamorphic')
  lensflareFolder.add(lensFlareEffect.material.uniforms.secondaryGhosts, 'value').name('secondaryGhosts')
  lensflareFolder.add(lensFlareEffect.material.uniforms.starBurst, 'value').name('starBurst')
  lensflareFolder.add(lensFlareEffect.material.uniforms.aditionalStreaks, 'value').name('aditionalStreaks')

  const fogFolder = gui.addFolder('Height Ground FBM Fog')
  fogFolder.add(fog, "enabled").name("Enabled").onChange(v => fog.setEnabled(v))
  fogFolder.add(fog, "radius", 0, 1000).name("Fog Radius")
  fogFolder.addColor({ color: fog.color.getHex() }, 'color').name('Fog Color').onChange(v => fog.color.set(v))  
  fogFolder.add(fog, "fogTop", -10, 40).name("Fog Top")
  fogFolder.add(fog, "fogDepth", 0.1, 40).name("Fog Depth")
  fogFolder.add(fog, "opacity", 0, 1).name("Opacity")
  fogFolder.add(fog, "exponent", 0.1, 6).name("Exponent")
  fogFolder.add(fog, "innerRadius", 0, 200).name("Inner Radius")
  fogFolder.add(fog, "innerFade", 0, 200).name("Inner Fade")
  fogFolder.add(fog, "noiseScale", 0.01, 1).name("Noise Scale")
  fogFolder.add(fog, "noiseStrength", 0, 1).name("Noise Strength")
  fogFolder.add(fog, "noiseOctaves", 1, 8, 1).name("Noise Octaves")
  fogFolder.add(fog.windDir, "x", -1, 1).name("Wind Dir X")
  fogFolder.add(fog.windDir, "y", -1, 1).name("Wind Dir Z")
  fogFolder.add(fog, "windSpeed", 0, 5).name("Wind Speed")
  fogFolder.add(fog, "verticalBillow", 0, 2).name("Verical Billow")

  function updateparams() {
    bloompass.strength = guiParams.bloomStrength;
    bloompass.threshold = guiParams.bloomThreshold;
    bloompass.radius = guiParams.bloomRadius;
    bloompass.exposure = guiParams.bloomExposure;
    bokehpass.materialBokeh.uniforms.focus.value = guiParams.focusDistance;
    bokehpass.materialBokeh.uniforms.aperture.value = guiParams.aperture;
    bokehpass.materialBokeh.uniforms.maxblur.value = guiParams.blurAmount;
  }


  document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.altKey && event.key === 'c') {
      if (gui.domElement.style.display === 'none') {
              gui.domElement.style.display = 'block';
              gui.show();
              console.log("gui shown")
          } else {
              gui.domElement.style.display = 'none';
              gui.hide();
              console.log("gui hidden")
          }
    }
  });

  document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.altKey && event.key === 'f') {
      if (stats.dom.style.display === 'none') {
              stats.dom.style.display = 'block';
              console.log("stats shown")
          } else {
              stats.dom.style.display = 'none';
              console.log("stats hidden")
          }
    }

  })


  let mouseX = 0, mouseY = 0;
  let windowHalfX = window.innerWidth / 2;
	let windowHalfY = window.innerHeight / 2;

  function onPointerMove( event ) {

				if ( event.isPrimary === false ) return;

				mouseX = event.clientX;
				mouseY = event.clientY;

			}

    document.addEventListener( 'pointermove', onPointerMove );

  // Store the camera's initial position as the "home" position
  const cameraHome = {
    position: camera.position.clone(),
    rotation: camera.rotation.clone(),
  }

  function updateCameraHome() {
    cameraHome.position.copy(camera.position);
    cameraHome.rotation.copy(camera.rotation);
    mouseX = windowHalfX;
    mouseY = windowHalfY;
  }

  const right = new THREE.Vector3();
  const up = new THREE.Vector3();

  // Extract local axes from camera's matrixWorld
  camera.updateMatrixWorld();
  right.setFromMatrixColumn(camera.matrixWorld, 0); // X axis (right)
  up.setFromMatrixColumn(camera.matrixWorld, 1);    // Y axis (up)

  let rafId
  function animate() {
    rafId = requestAnimationFrame(animate)
    updateparams();
    stats.begin();
    stats.end();
    composer.render();
    
    // Normalize mouse position to [-1, 1]
    const normX = ((mouseX - windowHalfX) / windowHalfX);
    const normY = ((windowHalfY - mouseY) / windowHalfY);

      // Parallax strength (how far camera can move from home)
    const parallaxStrength = 5; // Adjust for desired effect
    if (!iscameraAnimating) {
      camera.position.copy(cameraHome.position); // Reset camera position to home
      camera.rotation.copy(cameraHome.rotation); // Reset camera rotation to home

    }
      // Calculate target offset in camera's local space
    camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0); // right (local X)
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);    // up (local Y)

      // Calculate the target position
    const targetPosition = cameraHome.position.clone()
        .addScaledVector(right, normX * parallaxStrength)
        .addScaledVector(up, normY * parallaxStrength);

      // Smoothly interpolate camera position toward target
    camera.position.lerp(targetPosition, 0.1); // 0.1 = smoothing factor
    
    const t = performance.now() * 0.001
    fog.updateTime(t)

    // skyDome.position.copy(camera.position)
  }

  document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(rafId);
  } else {
    animate();
  }
});
    
    animate();
    
    window.addEventListener('resize', () => {
      const width = window.innerWidth
      const height = window.innerHeight
    
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      composer.setSize(width, height);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      bloompass.setSize(width, height);
      if (bokehpass.setSize) {
        bokehpass.setSize(width, height);
      }
    })

    let arrayPos = [
      {
        id: 'banner',
        position: {x: -28, y: 10, z: -10},
        rotation: {x: 1, y: -8.2, z: 1}
      },
      {
        id: 'about',
        position: {x: 23.8, y: 9.3, z: -8},
        rotation: {x: 0.3, y: -7.64, z: 0.29}
      }, 
      {
        id: 'desc',
        position: {x: 27.1, y: 14.4, z: 41.1},
        rotation: {x: 0.2, y: -9.2, z: 0.05}
      },
      {
        id: 'videogames',
        position: {x: -25.1, y: 9, z: 57},
        rotation: {x: 0, y: -7.17, z: 0}
      },
      {
        id: 'projects',
        position: {x: -107, y: 9, z: -13.4},
        rotation: {x: 0, y: -8.6, z: 0}
      }
    ]
    let lastSectionId = null;
    const moveState = () => {
      const sections = document.querySelectorAll('.section');

      let closestSection = null;
      let closestDistance = Infinity;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const screenCenter = window.innerHeight / 2;

        const distance = Math.abs(sectionCenter - screenCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestSection = section.id;
        }
      });

      if (closestSection && closestSection !== lastSectionId) {
        lastSectionId = closestSection;

        let currentPos = arrayPos.findIndex(
          (val) => val.id == closestSection
        );

        if (currentPos >= 0) {
          let new_pos = arrayPos[currentPos];

          iscameraAnimating = true;

          gsap.to(camera.position, {
            x: new_pos.position.x,
            y: new_pos.position.y,
            z: new_pos.position.z,
            duration: 1,
            ease: 'sine.inOut',
            onComplete: updateCameraHome,
          });

          gsap.to(camera.rotation, {
            x: new_pos.rotation.x,
            y: new_pos.rotation.y,
            z: new_pos.rotation.z,
            duration: 1,
            ease: 'sine.inOut',
            onComplete: () => {
              updateCameraHome();
              iscameraAnimating = false;
            },
          });
        }
      }
    };

    window.addEventListener('scroll', () => {
        const now = Date.now();
        if (iscameraAnimating) return;
        lastScrollTimeDelay = now;
        moveState();
    })
    setInterval(() => {
      moveState();
    }, 1000);

  function cleanup() {
    console.log("Cleaning WebGL resources...")
    if (rafId) cancelAnimationFrame(rafId)

    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose())
        } else {
          obj.material?.dispose()
        }
      }
    })

    composer?.dispose()
    renderer?.dispose()
    renderer?.forceContextLoss()
  }
  window.addEventListener("beforeunload", cleanup)
  }

waitcanvas();
