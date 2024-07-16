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
import Albedo from "./assets/Albedo.jpg";

global.THREE = THREE;
// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
THREE.ColorManagement.enabled = true;

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  sunIntensity: 1.8, // brightness of the sun
  speedFactor: 2.0, // rotation speed of the earth
};

/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene();

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
  // https://threejs.org/docs/#manual/en/introduction/Color-management
  _renderer.outputColorSpace = THREE.SRGBColorSpace;
});

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(45, 1, 1000, { x: 0, y: 0, z: 30 });

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;

    // adding a virtual sun using directional light
    this.dirLight = new THREE.DirectionalLight(0xffffff, params.sunIntensity);
    this.dirLight.position.set(-50, 0, 30);
    scene.add(this.dirLight);

    // updates the progress bar to 10% on the loading UI
    await updateLoadingProgressBar(0.1);

    // loads earth's color map, the basis of how our earth looks like
    const albedoMap = await loadTexture(Albedo);
    albedoMap.colorSpace = THREE.SRGBColorSpace;
    await updateLoadingProgressBar(0.2);

    // create group for easier manipulation of objects(ie later with clouds and atmosphere added)
    this.group = new THREE.Group();
    // earth's axial tilt is 23.5 degrees
    this.group.rotation.z = (23.5 / 360) * 2 * Math.PI;

    let earthGeo = new THREE.SphereGeometry(10, 64, 64);
    let earthMat = new THREE.MeshStandardMaterial({
      map: albedoMap,
    });
    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.group.add(this.earth);

    // set initial rotational position of earth to get a good initial angle
    this.earth.rotateY(-0.3);

    scene.add(this.group);

    // GUI controls
    const gui = new dat.GUI();
    gui
      .add(params, "sunIntensity", 0.0, 5.0, 0.1)
      .onChange((val) => {
        this.dirLight.intensity = val;
      })
      .name("Sun Intensity");
    gui.add(params, "speedFactor", 0.1, 20.0, 0.1).name("Rotation Speed");

    // Stats - show fps
    this.stats1 = new Stats();
    this.stats1.showPanel(0); // Panel 0 = fps
    this.stats1.domElement.style.cssText =
      "position:absolute;top:0px;left:0px;";
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement);

    await updateLoadingProgressBar(1.0, 100);
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update();
    this.stats1.update();

    // use rotateY instead of rotation.y so as to rotate by axis Y local to each mesh
    this.earth.rotateY(interval * 0.005 * params.speedFactor);
  },
};

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, undefined);
