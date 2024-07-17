// ThreeJS and Third-party deps
import * as THREE from "three";
import * as dat from "dat.gui";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Core boilerplate code deps
import {
  createCamera,
  createRenderer,
  runApp,
  updateLoadingProgressBar,
} from "./core-utils";

// Other deps
import { loadTexture } from "./common-utils";
import Albedo from "./assets/Albedo.png";
import Bump from "./assets/Bump.jpg";
import Clouds from "./assets/Clouds.png";

global.THREE = THREE;
THREE.ColorManagement.enabled = true;

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  sunIntensity: 1.8,
  speedFactor: 2.0,
  bumpScale: 0.03,
};

/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
let scene = new THREE.Scene();
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  _renderer.outputColorSpace = THREE.SRGBColorSpace;
});
let camera = createCamera(45, 1, 1000, { x: 0, y: 0, z: 30 });

/**************************************************
 * 2. Build your scene in this threejs app
 *************************************************/
let app = {
  async initScene() {
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;

    this.dirLight = new THREE.DirectionalLight(0xffffff, params.sunIntensity);
    this.dirLight.position.set(-50, 0, 30);
    scene.add(this.dirLight);

    await updateLoadingProgressBar(0.1);

    const albedoMap = await loadTexture(Albedo);
    albedoMap.colorSpace = THREE.SRGBColorSpace;
    await updateLoadingProgressBar(0.2);

    const bumpMap = await loadTexture(Bump);
    await updateLoadingProgressBar(0.3);

    const cloudsMap = await loadTexture(Clouds);
    await updateLoadingProgressBar(0.4);

    this.group = new THREE.Group();
    this.group.rotation.z = (23.5 / 360) * 2 * Math.PI;

    let earthGeo = new THREE.SphereGeometry(10, 64, 64);
    let earthMat = new THREE.MeshStandardMaterial({
      map: albedoMap,
      bumpMap: bumpMap,
      bumpScale: params.bumpScale,
    });
    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.group.add(this.earth);

    let cloudGeo = new THREE.SphereGeometry(10.05, 64, 64);
    let cloudsMat = new THREE.MeshStandardMaterial({
      alphaMap: cloudsMap,
      transparent: true,
    });
    this.clouds = new THREE.Mesh(cloudGeo, cloudsMat);
    this.group.add(this.clouds);

    this.earth.rotateY(-0.3);
    this.clouds.rotateY(-0.3);

    scene.add(this.group);

    earthMat.onBeforeCompile = function (shader) {
      shader.uniforms.tClouds = { value: cloudsMap };
      shader.uniforms.tClouds.value.wrapS = THREE.RepeatWrapping;
      shader.uniforms.uv_xOffset = { value: 0 };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
        #include <common>
        uniform sampler2D tClouds;
        uniform float uv_xOffset;
      `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `
        #include <emissivemap_fragment>

        float cloudsMapValue = texture2D(tClouds, vec2(vMapUv.x - uv_xOffset, vMapUv.y)).r;
        
        diffuseColor.rgb *= max(1.0 - cloudsMapValue, 0.2);
      `
      );

      earthMat.userData.shader = shader;
    };

    const gui = new dat.GUI();
    gui
      .add(params, "sunIntensity", 0.0, 5.0, 0.1)
      .onChange((val) => {
        this.dirLight.intensity = val;
      })
      .name("Sun Intensity");
    gui.add(params, "speedFactor", 0.1, 20.0, 0.1).name("Rotation Speed");
    gui
      .add(params, "bumpScale", 0, 0.1, 0.001)
      .onChange((val) => {
        this.earth.material.bumpScale = val;
      })
      .name("Bump Scale");

    this.stats1 = new Stats();
    this.stats1.showPanel(0);
    this.stats1.domElement.style.cssText =
      "position:absolute;top:0px;left:0px;";
    this.container.appendChild(this.stats1.domElement);

    await updateLoadingProgressBar(1.0, 100);
  },

  updateScene(interval, elapsed) {
    this.controls.update();
    this.stats1.update();

    this.earth.rotateY(interval * 0.005 * params.speedFactor);
    this.clouds.rotateY(interval * 0.01 * params.speedFactor);

    const shader = this.earth.material.userData.shader;
    if (shader) {
      let offset = (interval * 0.005 * params.speedFactor) / (2 * Math.PI);
      shader.uniforms.uv_xOffset.value += offset % 1;
    }
  },
};

/**************************************************
 * 3. Run the app
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, undefined);
